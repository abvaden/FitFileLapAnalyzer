<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 overflow-y-auto"
    @click.self="handleBackdropClick"
  >
    <div class="flex min-h-screen items-center justify-center p-4">
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      <div class="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Lap Editor</h2>
            <p class="text-sm text-gray-500">{{ fitFile?.filename }}</p>
          </div>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex flex-col h-[80vh]">
          <!-- Map Section -->
          <div class="flex-1 p-4 border-b border-gray-200">
            <div class="h-full bg-gray-50 rounded-lg overflow-hidden">
              <LapEditMapView
                v-if="fitFile"
                :fitFile="fitFile"
                :editedLaps="editedLaps"
                :selectedLap="selectedLap"
                :hoverTime="hoverTime"
                :selectedTimeRange="selectedTimeRange"
                @lap-boundary-click="handleLapBoundaryClick"
              />
            </div>
          </div>

          <!-- Timeline Section -->
          <div class="p-4 border-b border-gray-200" style="height: 200px;">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Timeline</h3>
            <TimelineEditor
              v-if="fitFile"
              :fitFile="fitFile"
              :editedLaps="editedLaps"
              :selectedTimeRange="selectedTimeRange"
              :selectedLap="selectedLap"
              @lap-select="handleLapSelect"
              @time-range-select="handleTimeRangeSelect"
              @lap-boundary-drag="handleLapBoundaryDrag"
              @timeline-hover="handleTimelineHover"
            />
          </div>

          <!-- Lap Management Section -->
          <div class="p-4 max-h-64 overflow-y-auto">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-gray-700">Laps ({{ editedLaps.length }})</h3>
              <button
                v-if="selectedTimeRange"
                @click="createLapFromSelection"
                class="btn btn-primary btn-sm"
              >
                Create Lap
              </button>
            </div>
            
            <div class="space-y-2">
              <div
                v-for="(lap, index) in editedLaps"
                :key="lap.id"
                :class="[
                  'flex items-center justify-between p-3 rounded-lg border-2 transition-colors cursor-pointer',
                  selectedLap?.id === lap.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                ]"
                @click="handleLapSelect(lap)"
              >
                <div class="flex items-center space-x-3">
                  <div
                    class="w-4 h-4 rounded"
                    :style="{ backgroundColor: lap.color }"
                  />
                  <div>
                    <input
                      v-if="editingLapId === lap.id"
                      v-model="editingLapName"
                      @keyup.enter="saveLapName(lap)"
                      @keyup.escape="cancelLapEdit"
                      @blur="saveLapName(lap)"
                      class="text-sm font-medium bg-transparent border-none outline-none"
                      ref="lapNameInput"
                    />
                    <span v-else class="text-sm font-medium text-gray-900">
                      {{ lap.name }}
                    </span>
                    <div class="text-xs text-gray-500">
                      {{ formatTime(lap.startTime) }} - {{ formatTime(lap.endTime) }}
                      ({{ formatTime(lap.duration) }})
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  <button
                    @click.stop="startLapEdit(lap)"
                    class="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Rename lap"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteLap(lap)"
                    class="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete lap"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div class="text-sm text-gray-600">
              {{ hasChanges ? 'You have unsaved changes' : 'No changes made' }}
            </div>
            <div class="flex space-x-3">
              <button
                @click="closeModal"
                class="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                @click="saveChanges"
                :disabled="!hasChanges"
                class="btn btn-primary"
                :class="{ 'opacity-50 cursor-not-allowed': !hasChanges }"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import type { ParsedFitFile, LapSegment } from '@/types/fitData';
import { useFitFilesStore } from '@/stores/fitFiles';
import { fitParser } from '@/utils/fitParser';
import TimelineEditor from './TimelineEditor.vue';
import LapEditMapView from './LapEditMapView.vue';

// Props
interface Props {
  isOpen: boolean;
  fitFile: ParsedFitFile | null;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  close: [];
  save: [laps: EditableLap[]];
}>();

// Types
interface EditableLap extends LapSegment {
  name: string;
  color: string;
  isNew: boolean;
  isDeleted: boolean;
}

interface TimeRange {
  startTime: number;
  endTime: number;
}

// Store
const fitFilesStore = useFitFilesStore();

// Refs
const lapNameInput = ref<HTMLInputElement | null>(null);

// State
const editedLaps = ref<EditableLap[]>([]);
const originalLaps = ref<EditableLap[]>([]);
const selectedLap = ref<EditableLap | null>(null);
const selectedTimeRange = ref<TimeRange | null>(null);
const editingLapId = ref<string | null>(null);
const editingLapName = ref('');
const hoverTime = ref<number | null>(null);

// Colors for lap visualization
const lapColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

// Computed
const hasChanges = computed(() => {
  if (editedLaps.value.length !== originalLaps.value.length) return true;
  
  return editedLaps.value.some((lap, index) => {
    const original = originalLaps.value[index];
    return !original || 
           lap.name !== original.name ||
           lap.startTime !== original.startTime ||
           lap.endTime !== original.endTime ||
           lap.isDeleted !== original.isDeleted ||
           lap.isNew !== original.isNew;
  });
});

// Methods
function initializeLaps() {
  if (!props.fitFile) return;
  
  const fileLaps = fitFilesStore.getLapsByFileId(props.fitFile.id);
  const lapsWithMetadata = fileLaps.map((lap, index) => ({
    ...lap,
    name: `Lap ${lap.lapNumber}`,
    color: lapColors[index % lapColors.length],
    isNew: false,
    isDeleted: false
  }));
  
  editedLaps.value = [...lapsWithMetadata];
  originalLaps.value = JSON.parse(JSON.stringify(lapsWithMetadata));
}

function handleLapSelect(lap: EditableLap) {
  selectedLap.value = lap;
  selectedTimeRange.value = null;
}

function handleTimeRangeSelect(range: TimeRange) {
  selectedTimeRange.value = range;
  selectedLap.value = null;
}

function handleLapBoundaryDrag(lapId: string, newStartTime: number, newEndTime: number) {
  const lapIndex = editedLaps.value.findIndex(lap => lap.id === lapId);
  if (lapIndex === -1) return;
  
  const lap = editedLaps.value[lapIndex];
  
  // Update lap times
  lap.startTime = newStartTime;
  lap.endTime = newEndTime;
  lap.duration = newEndTime - newStartTime;
  
  // Filter records for the new time range
  if (props.fitFile) {
    lap.records = props.fitFile.data.records.filter(record => {
      return record.timestamp >= newStartTime && record.timestamp <= newEndTime;
    });
  }
}

function handleLapBoundaryClick(position: { lat: number; lng: number; time?: number }) {
  if (position.time && selectedTimeRange.value) {
    // Update time range based on map click
    if (Math.abs(position.time - selectedTimeRange.value.startTime) < 
        Math.abs(position.time - selectedTimeRange.value.endTime)) {
      selectedTimeRange.value.startTime = position.time;
    } else {
      selectedTimeRange.value.endTime = position.time;
    }
  }
}

function handleTimelineHover(time: number | null) {
  hoverTime.value = time;
}

function createLapFromSelection() {
  if (!selectedTimeRange.value || !props.fitFile) return;
  
  const newLapNumber = editedLaps.value.length + 1;
  const colorIndex = editedLaps.value.length % lapColors.length;
  
  // Get the actual start time from the first record (more reliable than metadata)
  const firstRecord = props.fitFile.data.records[0];
  const fileStartTime = typeof firstRecord.timestamp === 'object' && 
    firstRecord.timestamp !== null && 'getTime' in firstRecord.timestamp
    ? (firstRecord.timestamp as any).getTime() / 1000 
    : firstRecord.timestamp as number;
  
  const absoluteStartTime = fileStartTime + selectedTimeRange.value.startTime;
  const absoluteEndTime = fileStartTime + selectedTimeRange.value.endTime;
  
  // Filter records for the selected time range using absolute timestamps
  const lapRecords = props.fitFile.data.records.filter(record => {
    const recordTimeInSeconds = typeof record.timestamp === 'object' && 
      record.timestamp !== null && 'getTime' in record.timestamp
      ? (record.timestamp as any).getTime() / 1000 
      : record.timestamp as number;
    return recordTimeInSeconds >= absoluteStartTime && 
           recordTimeInSeconds <= absoluteEndTime;
  });
  
  // Calculate distance from records
  let totalDistance = 0;
  if (lapRecords.length > 1) {
    const lastRecord = lapRecords[lapRecords.length - 1];
    const firstRecord = lapRecords[0];
    totalDistance = (lastRecord.distance || 0) - (firstRecord.distance || 0);
  }
  
  const newLap: EditableLap = {
    id: `${props.fitFile.id}-lap-new-${Date.now()}`,
    fileId: props.fitFile.id,
    filename: props.fitFile.filename,
    lapNumber: newLapNumber,
    startTime: absoluteStartTime,  // Use absolute time
    endTime: absoluteEndTime,      // Use absolute time
    duration: selectedTimeRange.value.endTime - selectedTimeRange.value.startTime,
    distance: totalDistance,
    records: lapRecords,
    lapData: {} as any, // This would need proper lap data structure
    metadata: {},
    name: `Custom Lap ${newLapNumber}`,
    color: lapColors[colorIndex],
    isNew: true,
    isDeleted: false
  };
  
  editedLaps.value.push(newLap);
  selectedTimeRange.value = null;
  selectedLap.value = newLap;
  
  // Force reactivity update to ensure map shows the new lap immediately
  nextTick(() => {
    // Trigger a re-render by updating the reference
    editedLaps.value = [...editedLaps.value];
  });
}

function startLapEdit(lap: EditableLap) {
  editingLapId.value = lap.id;
  editingLapName.value = lap.name;
  
  nextTick(() => {
    lapNameInput.value?.focus();
  });
}

function saveLapName(lap: EditableLap) {
  if (editingLapName.value.trim()) {
    lap.name = editingLapName.value.trim();
  }
  cancelLapEdit();
}

function cancelLapEdit() {
  editingLapId.value = null;
  editingLapName.value = '';
}

function deleteLap(lap: EditableLap) {
  if (confirm(`Are you sure you want to delete "${lap.name}"?`)) {
    const index = editedLaps.value.findIndex(l => l.id === lap.id);
    if (index !== -1) {
      editedLaps.value.splice(index, 1);
      if (selectedLap.value?.id === lap.id) {
        selectedLap.value = null;
      }
    }
  }
}

function handleBackdropClick() {
  if (!hasChanges.value || confirm('You have unsaved changes. Are you sure you want to close?')) {
    closeModal();
  }
}

function closeModal() {
  emit('close');
}

function saveChanges() {
  emit('save', editedLaps.value);
  closeModal();
}

function formatTime(seconds: number): string {
  return fitParser.formatTime(seconds);
}

// Watchers
watch(() => props.fitFile, (newFile) => {
  if (newFile) {
    initializeLaps();
  }
}, { immediate: true });

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.fitFile) {
    // Reset state completely when opening modal
    selectedLap.value = null;
    selectedTimeRange.value = null;
    editingLapId.value = null;
    editingLapName.value = '';
    
    // Re-initialize laps from store
    initializeLaps();
    
    // Force map to update on next tick
    nextTick(() => {
      // Trigger reactivity update for map
      if (editedLaps.value.length > 0) {
        editedLaps.value = [...editedLaps.value];
      }
    });
  }
});
</script>
