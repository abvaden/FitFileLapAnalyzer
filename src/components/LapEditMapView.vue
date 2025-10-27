<template>
  <div class="lap-edit-map-view w-full h-full">
    <div ref="mapContainer" class="w-full h-full min-h-[300px]"></div>
    
    <!-- Map Controls -->
    <div class="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2 z-10">
      <div class="text-xs font-medium text-gray-700">Lap Colors</div>
      <div class="space-y-1">
        <div
          v-for="lap in editedLaps"
          :key="lap.id"
          :class="[
            'flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors',
            selectedLap?.id === lap.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
          ]"
          @click="selectLap(lap)"
        >
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: lap.color }"
          />
          <span class="text-xs text-gray-700">{{ lap.name }}</span>
        </div>
      </div>
      
      <div v-if="clickPosition" class="border-t pt-2 mt-2">
        <div class="text-xs text-gray-600">
          Click position: {{ clickPosition.lat.toFixed(6) }}, {{ clickPosition.lng.toFixed(6) }}
        </div>
        <div v-if="clickPosition.time" class="text-xs text-gray-600">
          Time: {{ formatTime(clickPosition.time) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ParsedFitFile, FitRecord } from '@/types/fitData';
import { fitParser } from '@/utils/fitParser';

// Props
interface Props {
  fitFile: ParsedFitFile;
  editedLaps: EditableLap[];
  selectedLap: EditableLap | null;
  hoverTime?: number | null;
  selectedTimeRange?: { startTime: number; endTime: number } | null;
}

// Types
interface EditableLap {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  color: string;
  records: FitRecord[];
  isNew: boolean;
  isDeleted: boolean;
}

interface ClickPosition {
  lat: number;
  lng: number;
  time?: number;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'lap-boundary-click': [position: ClickPosition];
}>();

// Refs
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<L.Map | null>(null);
const lapPaths = ref<Map<string, L.Polyline>>(new Map());
const lapMarkers = ref<Map<string, { start: L.Marker; end: L.Marker }>>(new Map());
const clickPosition = ref<ClickPosition | null>(null);
const hoverMarker = ref<L.Marker | null>(null);
const previewPath = ref<L.Polyline | null>(null);

// Methods
function isValidGPSCoordinate(lat?: number, lng?: number): boolean {
  return lat !== undefined && lng !== undefined && 
         lat !== 0 && lng !== 0 && 
         !isNaN(lat) && !isNaN(lng) &&
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
}

function initializeMap() {
  if (!mapContainer.value) return;

  // Create map
  map.value = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true
  });

  // Add tile layer
  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  });
  tileLayer.addTo(map.value as any);

  // Add click handler for map
  map.value.on('click', (e: L.LeafletMouseEvent) => {
    const position: ClickPosition = {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    };

    // Find the closest record to determine time
    const closestRecord = findClosestRecord(e.latlng.lat, e.latlng.lng);
    if (closestRecord) {
      position.time = closestRecord.timestamp;
    }

    clickPosition.value = position;
    emit('lap-boundary-click', position);
  });
}

function findClosestRecord(lat: number, lng: number): FitRecord | null {
  let closestRecord: FitRecord | null = null;
  let minDistance = Infinity;

  for (const record of props.fitFile.data.records) {
    if (isValidGPSCoordinate(record.position_lat, record.position_long)) {
      const distance = calculateDistance(
        lat, lng,
        record.position_lat!, record.position_long!
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestRecord = record;
      }
    }
  }

  return closestRecord;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function updateLapPaths() {
  if (!map.value) return;

  // Clear existing paths and markers
  lapPaths.value.forEach(path => (map.value as any).removeLayer(path));
  lapMarkers.value.forEach(markers => {
    (map.value as any).removeLayer(markers.start);
    (map.value as any).removeLayer(markers.end);
  });
  lapPaths.value.clear();
  lapMarkers.value.clear();

  // Create bounds for fitting the map
  const allBounds: L.LatLng[] = [];
  const validPolylines: L.Polyline[] = [];

  // If no laps exist, show all GPS data from the original file
  if (props.editedLaps.length === 0) {
    showFullActivityTrack();
    return;
  }

  // Create paths for each lap
  props.editedLaps.forEach((lap) => {
    const coordinates: [number, number][] = [];

    // Always try to get records from the original file based on time range
    // This ensures we have GPS data even if lap.records is missing or corrupted
    const recordsToUse = props.fitFile.data.records.filter(record => {
      // Convert record timestamp to seconds for comparison
      const recordTimeInSeconds = typeof record.timestamp === 'object' && record.timestamp !== null && 'getTime' in record.timestamp
        ? (record.timestamp as any).getTime() / 1000 
        : record.timestamp as number;
      return recordTimeInSeconds >= lap.startTime && recordTimeInSeconds <= lap.endTime;
    });

    recordsToUse.forEach((record) => {
      if (isValidGPSCoordinate(record.position_lat, record.position_long)) {
        const coord: [number, number] = [record.position_lat!, record.position_long!];
        coordinates.push(coord);
        allBounds.push(L.latLng(coord[0], coord[1]));
      }
    });

    // Create polyline even with single coordinate (show as point)
    if (coordinates.length >= 1) {
      // Create polyline for lap path
      const opacity = props.selectedLap?.id === lap.id ? 0.9 : 0.7;
      const weight = props.selectedLap?.id === lap.id ? 5 : 3;
      
      const polyline = L.polyline(coordinates, {
        color: lap.color,
        weight: weight,
        opacity: opacity
      });
      
      polyline.addTo(map.value as any);
      lapPaths.value.set(lap.id, polyline);
      validPolylines.push(polyline);

      // Add lap markers at start and end (or just start if only one coordinate)
      const startCoord = coordinates[0];
      const endCoord = coordinates.length > 1 ? coordinates[coordinates.length - 1] : startCoord;

      const startMarker = L.marker([startCoord[0], startCoord[1]], {
        icon: createLapMarker(lap.color, 'S', props.selectedLap?.id === lap.id)
      });
      
      startMarker.bindTooltip(`${lap.name} - Start<br>${formatTime(lap.startTime)}`, {
        direction: 'top',
        offset: [0, -10]
      });

      startMarker.addTo(map.value as any);

      // Only add end marker if we have multiple coordinates
      if (coordinates.length > 1) {
        const endMarker = L.marker([endCoord[0], endCoord[1]], {
          icon: createLapMarker(lap.color, 'E', props.selectedLap?.id === lap.id)
        });
        
        endMarker.bindTooltip(`${lap.name} - End<br>${formatTime(lap.endTime)}`, {
          direction: 'top',
          offset: [0, -10]
        });

        endMarker.addTo(map.value as any);
        lapMarkers.value.set(lap.id, { start: startMarker, end: endMarker });
      } else {
        // Store just the start marker for single-point laps
        lapMarkers.value.set(lap.id, { start: startMarker, end: startMarker });
      }
    }
  });

  // Fit map to show all valid paths
  if (validPolylines.length > 0) {
    const group = L.featureGroup(validPolylines as any);
    (map.value as any).fitBounds(group.getBounds(), { padding: [20, 20] });
  } else if (allBounds.length > 0) {
    // Fallback to fitting bounds based on coordinates
    const bounds = L.latLngBounds(allBounds);
    (map.value as any).fitBounds(bounds, { padding: [20, 20] });
  } else {
    // Last resort: show full activity track
    showFullActivityTrack();
  }
}

function showFullActivityTrack() {
  if (!map.value || !props.fitFile) return;
  
  const allCoordinates: [number, number][] = [];
  
  props.fitFile.data.records.forEach((record) => {
    if (isValidGPSCoordinate(record.position_lat, record.position_long)) {
      const coord: [number, number] = [record.position_lat!, record.position_long!];
      allCoordinates.push(coord);
    }
  });
  
  if (allCoordinates.length > 1) {
    const fullTrackPath = L.polyline(allCoordinates, {
      color: '#9ca3af', // gray color for full track
      weight: 2,
      opacity: 0.5
    });
    
    fullTrackPath.addTo(map.value as any);
    lapPaths.value.set('full-track', fullTrackPath);
    
    // Fit map to show full track
    (map.value as any).fitBounds(fullTrackPath.getBounds(), { padding: [20, 20] });
  }
}

function createLapMarker(color: string, label: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 24 : 18;
  const borderWidth = isSelected ? 3 : 2;
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${borderWidth}px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${Math.floor(size * 0.5)}px;
        font-weight: bold;
        color: white;
        font-family: Arial, sans-serif;
      ">${label}</div>
    `,
    className: 'custom-lap-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

function selectLap(lap: EditableLap) {
  emit('lap-boundary-click', { lat: 0, lng: 0 }); // Clear position
  // The parent component will handle lap selection and update the selectedLap prop
}

function updateHoverMarker() {
  if (!map.value || !props.fitFile) return;

  // Clear existing hover marker
  if (hoverMarker.value) {
    (map.value as any).removeLayer(hoverMarker.value);
    hoverMarker.value = null;
  }

  if (props.hoverTime !== null && props.hoverTime !== undefined) {
    // Convert relative hover time to absolute time
    const firstRecord = props.fitFile.data.records[0];
    const fileStartTime = typeof firstRecord.timestamp === 'object' && 
      firstRecord.timestamp !== null && 'getTime' in firstRecord.timestamp
      ? (firstRecord.timestamp as any).getTime() / 1000 
      : firstRecord.timestamp as number;
    
    const absoluteHoverTime = fileStartTime + props.hoverTime;
    
    // Find the record closest to this time
    let closestRecord: FitRecord | null = null;
    let minTimeDiff = Infinity;
    
    for (const record of props.fitFile.data.records) {
      const recordTime = typeof record.timestamp === 'object' && 
        record.timestamp !== null && 'getTime' in record.timestamp
        ? (record.timestamp as any).getTime() / 1000 
        : record.timestamp as number;
      
      const timeDiff = Math.abs(recordTime - absoluteHoverTime);
      if (timeDiff < minTimeDiff && isValidGPSCoordinate(record.position_lat, record.position_long)) {
        minTimeDiff = timeDiff;
        closestRecord = record;
      }
    }
    
    if (closestRecord) {
      // Create a pulsing marker at the hover position
      const hoverIcon = L.divIcon({
        html: `
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #3b82f6;
            border: 3px solid white;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
              100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
            }
          </style>
        `,
        className: 'hover-position-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      
      hoverMarker.value = L.marker([closestRecord.position_lat!, closestRecord.position_long!], {
        icon: hoverIcon,
        zIndexOffset: 1000
      });
      
      hoverMarker.value.addTo(map.value as any);
    }
  }
}

function updateLapPreview() {
  if (!map.value || !props.fitFile) return;

  // Clear existing preview
  if (previewPath.value) {
    (map.value as any).removeLayer(previewPath.value);
    previewPath.value = null;
  }

  if (props.selectedTimeRange) {
    // Convert relative times to absolute times
    const firstRecord = props.fitFile.data.records[0];
    const fileStartTime = typeof firstRecord.timestamp === 'object' && 
      firstRecord.timestamp !== null && 'getTime' in firstRecord.timestamp
      ? (firstRecord.timestamp as any).getTime() / 1000 
      : firstRecord.timestamp as number;
    
    const absoluteStartTime = fileStartTime + props.selectedTimeRange.startTime;
    const absoluteEndTime = fileStartTime + props.selectedTimeRange.endTime;
    
    // Get records for the preview range
    const previewRecords = props.fitFile.data.records.filter(record => {
      const recordTime = typeof record.timestamp === 'object' && 
        record.timestamp !== null && 'getTime' in record.timestamp
        ? (record.timestamp as any).getTime() / 1000 
        : record.timestamp as number;
      return recordTime >= absoluteStartTime && recordTime <= absoluteEndTime;
    });
    
    const previewCoordinates: [number, number][] = [];
    previewRecords.forEach(record => {
      if (isValidGPSCoordinate(record.position_lat, record.position_long)) {
        previewCoordinates.push([record.position_lat!, record.position_long!]);
      }
    });
    
    if (previewCoordinates.length > 0) {
      // Create preview path with dashed line
      previewPath.value = L.polyline(previewCoordinates, {
        color: '#22c55e',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      });
      
      previewPath.value.addTo(map.value as any);
    }
  }
}

function formatTime(seconds: number): string {
  return fitParser.formatTime(seconds);
}

// Watchers
watch(() => props.editedLaps, () => {
  nextTick(() => {
    updateLapPaths();
  });
}, { deep: true, immediate: true });

watch(() => props.selectedLap, () => {
  nextTick(() => {
    updateLapPaths(); // Redraw to update highlighting
  });
}, { deep: true });

// Watch for changes in editedLaps length to ensure new laps are rendered
watch(() => props.editedLaps.length, () => {
  nextTick(() => {
    updateLapPaths();
  });
});

// Watch for hover time changes to update hover marker
watch(() => props.hoverTime, () => {
  nextTick(() => {
    updateHoverMarker();
  });
});

// Watch for selected time range changes to update preview
watch(() => props.selectedTimeRange, () => {
  nextTick(() => {
    updateLapPreview();
  });
}, { deep: true });

// Lifecycle
onMounted(() => {
  nextTick(() => {
    initializeMap();
    if (props.editedLaps.length > 0) {
      updateLapPaths();
    }
  });
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
  }
});
</script>

<style scoped>
.lap-edit-map-view {
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

/* Override Leaflet default styles */
:deep(.leaflet-control-attribution) {
  font-size: 10px;
  background-color: rgba(255, 255, 255, 0.8);
}

:deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.leaflet-control-zoom a) {
  background-color: white;
  border: 1px solid #e5e7eb;
  color: #374151;
}

:deep(.leaflet-control-zoom a:hover) {
  background-color: #f9fafb;
}

:deep(.custom-lap-marker) {
  background: none !important;
  border: none !important;
}
</style>
