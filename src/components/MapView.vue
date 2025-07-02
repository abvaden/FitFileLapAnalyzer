<template>
  <div class="map-container">
    <div ref="mapContainer" class="map" style="height: 400px; width: 100%;"></div>
    
    <!-- Map Controls -->
    <div class="absolute top-2 right-2 bg-white rounded-lg shadow-lg p-2 space-y-2">
      <div class="text-xs text-gray-600">
        <div v-if="currentPosition.baseline">
          <span class="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-1"></span>
          Baseline: {{ formatTime(currentPosition.elapsedTime) }}
        </div>
        <div v-if="currentPosition.comparison">
          <span class="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
          Comparison: {{ formatTime(currentPosition.elapsedTime) }}
        </div>
        <div v-if="currentPosition.spatialDistance !== undefined">
          Distance: {{ currentPosition.spatialDistance.toFixed(1) }}m
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LapSegment, FitRecord } from '@/types/fitData';
import type { TimeDifference } from '@/types/comparison';
import { isValidGPSCoordinate } from '@/utils/gpsUtils';

// Props
interface Props {
  baseline: LapSegment | null;
  comparison: LapSegment | null;
  currentDataPoint?: TimeDifference | null;
}

const props = withDefaults(defineProps<Props>(), {
  currentDataPoint: null
});

// Emits
const emit = defineEmits<{
  positionClick: [{ lat: number; lng: number; elapsedTime?: number }];
}>();

// Refs
const mapContainer = ref<HTMLDivElement | null>(null);
const map = ref<L.Map | null>(null);
const baselinePath = ref<L.Polyline | null>(null);
const baselineMarker = ref<L.Marker | null>(null);
const comparisonMarker = ref<L.Marker | null>(null);
const markersGroup = ref<L.LayerGroup | null>(null);

// State
const currentPosition = ref<{
  baseline: { lat: number; lng: number } | null;
  comparison: { lat: number; lng: number } | null;
  elapsedTime: number;
  spatialDistance?: number;
}>({
  baseline: null,
  comparison: null,
  elapsedTime: 0
});

// Methods
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
}

function createCustomIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">${label}</div>
    `,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
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

  // Create markers group
  markersGroup.value = L.layerGroup();
  markersGroup.value.addTo(map.value as any);

  // Add click handler for map
  map.value.on('click', (e: L.LeafletMouseEvent) => {
    emit('positionClick', {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    });
  });
}

function updateBaselinePath() {
  if (!map.value || !props.baseline) return;

  // Remove existing path
  if (baselinePath.value) {
    map.value.removeLayer(baselinePath.value as any);
  }

  // Extract GPS coordinates from baseline records
  const coordinates: [number, number][] = [];
  
  props.baseline.records.forEach((record: FitRecord) => {
    if (isValidGPSCoordinate(record.position_lat, record.position_long)) {
      coordinates.push([record.position_lat!, record.position_long!]);
    }
  });

  if (coordinates.length > 0) {
    // Create polyline for baseline path
    baselinePath.value = L.polyline(coordinates, {
      color: '#eab308', // yellow-500 (baseline color)
      weight: 3,
      opacity: 0.8
    });
    baselinePath.value.addTo(map.value as any);

    // Fit map to show the entire path
    map.value.fitBounds(baselinePath.value.getBounds(), {
      padding: [20, 20]
    });
  }
}

function updateMarkers() {
  if (!map.value || !markersGroup.value) return;

  // Clear existing markers
  markersGroup.value.clearLayers();

  // Add baseline marker
  if (currentPosition.value.baseline) {
    baselineMarker.value = L.marker(
      [currentPosition.value.baseline.lat, currentPosition.value.baseline.lng],
      { icon: createCustomIcon('#eab308', 'B') }
    );
    baselineMarker.value.addTo(markersGroup.value as any);

    baselineMarker.value.bindTooltip(
      `Baseline<br>Time: ${formatTime(currentPosition.value.elapsedTime)}`,
      { permanent: false, direction: 'top' }
    );
  }

  // Add comparison marker
  if (currentPosition.value.comparison) {
    comparisonMarker.value = L.marker(
      [currentPosition.value.comparison.lat, currentPosition.value.comparison.lng],
      { icon: createCustomIcon('#3b82f6', 'C') }
    );
    comparisonMarker.value.addTo(markersGroup.value as any);

    comparisonMarker.value.bindTooltip(
      `Comparison<br>Time: ${formatTime(currentPosition.value.elapsedTime)}`,
      { permanent: false, direction: 'top' }
    );

    // Add line between markers if both exist
    if (currentPosition.value.baseline) {
      const connectionLine = L.polyline([
        [currentPosition.value.baseline.lat, currentPosition.value.baseline.lng],
        [currentPosition.value.comparison.lat, currentPosition.value.comparison.lng]
      ], {
        color: '#6b7280', // gray-500
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 5'
      });
      connectionLine.addTo(markersGroup.value as any);
    }
  }
}

function updateCurrentPosition() {
  if (!props.currentDataPoint || !props.baseline || !props.comparison) {
    currentPosition.value = {
      baseline: null,
      comparison: null,
      elapsedTime: 0
    };
    updateMarkers();
    return;
  }

  const dataPoint = props.currentDataPoint;
  let baselineCoords = null;
  let comparisonCoords = null;

  // Get baseline coordinates
  if (dataPoint.baselineRecordIndex !== undefined) {
    const baselineRecord = props.baseline.records[dataPoint.baselineRecordIndex];
    if (isValidGPSCoordinate(baselineRecord.position_lat, baselineRecord.position_long)) {
      baselineCoords = {
        lat: baselineRecord.position_lat!,
        lng: baselineRecord.position_long!
      };
    }
  }

  // Get comparison coordinates
  if (dataPoint.comparisonRecordIndex !== undefined) {
    const comparisonRecord = props.comparison.records[dataPoint.comparisonRecordIndex];
    if (isValidGPSCoordinate(comparisonRecord.position_lat, comparisonRecord.position_long)) {
      comparisonCoords = {
        lat: comparisonRecord.position_lat!,
        lng: comparisonRecord.position_long!
      };
    }
  }

  currentPosition.value = {
    baseline: baselineCoords,
    comparison: comparisonCoords,
    elapsedTime: dataPoint.elapsedTime,
    spatialDistance: dataPoint.spatialDistance
  };

  updateMarkers();
}

// Watchers
watch(() => props.baseline, () => {
  nextTick(() => {
    updateBaselinePath();
  });
}, { deep: true });

watch(() => props.currentDataPoint, () => {
  updateCurrentPosition();
}, { deep: true });

// Lifecycle
onMounted(() => {
  nextTick(() => {
    initializeMap();
    if (props.baseline) {
      updateBaselinePath();
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
.map-container {
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.map {
  border-radius: 0.5rem;
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

:deep(.custom-marker) {
  background: none !important;
  border: none !important;
}
</style>
