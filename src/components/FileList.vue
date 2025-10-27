<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Loaded Files</h3>
      <span class="badge badge-primary">{{ files.length }}</span>
    </div>
    
    <div class="space-y-3">
      <div
        v-for="file in files"
        :key="file.id"
        class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
        @click="openLapEditor(file)"
      >
        <!-- File Header -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="font-medium text-gray-900 truncate">{{ file.filename }}</span>
            <button
              @click.stop="openLapEditor(file)"
              class="text-gray-400 hover:text-blue-600 transition-colors duration-200"
              title="Edit laps"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
          <button
            @click.stop="removeFile(file.id)"
            class="text-gray-400 hover:text-red-600 transition-colors duration-200"
            title="Remove file"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- File Metadata -->
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ formatTime(file.metadata.totalTime) }}</span>
          </div>
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{{ formatDistance(file.metadata.totalDistance) }}</span>
          </div>
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{{ file.metadata.lapCount }} laps</span>
          </div>
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{{ file.metadata.recordCount }} records</span>
          </div>
        </div>
        
        <!-- Sport Badge -->
        <div v-if="file.metadata.sport" class="mb-3">
          <span class="badge badge-success">{{ file.metadata.sport }}</span>
        </div>
        
        <!-- Laps Preview -->
          <div class="border-t border-gray-100 pt-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">Laps</span>
            <button
              @click.stop="toggleLapsExpanded(file.id)"
              class="text-xs text-primary-600 hover:text-primary-700"
            >
              {{ expandedFiles.has(file.id) ? 'Hide' : 'Show' }} Details
            </button>
          </div>
          
          <!-- Collapsed View -->
          <div v-if="!expandedFiles.has(file.id)" class="flex flex-wrap gap-1">
            <span
              v-for="lap in getFileLaps(file.id).slice(0, 5)"
              :key="lap.id"
              :class="[
                'inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors duration-200',
                isLapSelected(lap.id)
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click.stop="toggleLapSelection(lap)"
            >
              Lap {{ lap.lapNumber }}
            </span>
            <span
              v-if="getFileLaps(file.id).length > 5"
              class="inline-flex items-center px-2 py-1 rounded text-xs text-gray-500"
            >
              +{{ getFileLaps(file.id).length - 5 }} more
            </span>
          </div>
          
          <!-- Expanded View -->
          <div v-else class="space-y-2">
            <div
              v-for="lap in getFileLaps(file.id)"
              :key="lap.id"
              :class="[
                'flex items-center justify-between p-2 rounded border cursor-pointer transition-colors duration-200',
                isLapSelected(lap.id)
                  ? 'bg-primary-50 border-primary-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              ]"
              @click.stop="toggleLapSelection(lap)"
            >
              <div class="flex items-center space-x-3">
                <span class="font-medium text-sm">Lap {{ lap.lapNumber }}</span>
                <div class="flex items-center space-x-2 text-xs text-gray-600">
                  <span>{{ formatTime(lap.duration) }}</span>
                  <span>•</span>
                  <span>{{ formatDistance(lap.distance) }}</span>
                  <span v-if="lap.metadata.avgHeartRate">•</span>
                  <span v-if="lap.metadata.avgHeartRate">{{ Math.round(lap.metadata.avgHeartRate) }} bpm</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span
                  v-if="isBaseline(lap.id)"
                  class="badge badge-warning text-xs"
                >
                  Baseline
                </span>
                <div
                  :class="[
                    'w-4 h-4 rounded border-2 transition-colors duration-200',
                    isLapSelected(lap.id)
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300'
                  ]"
                >
                  <svg
                    v-if="isLapSelected(lap.id)"
                    class="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFitFilesStore } from '@/stores/fitFiles';
import { useComparisonStore } from '@/stores/comparison';
import { fitParser } from '@/utils/fitParser';
import type { LapSegment, ParsedFitFile } from '@/types/fitData';

// Emits
const emit = defineEmits<{
  'open-lap-editor': [file: ParsedFitFile];
}>();

// Stores
const fitFilesStore = useFitFilesStore();
const comparisonStore = useComparisonStore();

// Local state
const expandedFiles = ref(new Set<string>());

// Computed properties
const files = computed(() => fitFilesStore.files);

// Methods
function removeFile(fileId: string) {
  fitFilesStore.removeFile(fileId);
  expandedFiles.value.delete(fileId);
}

function toggleLapsExpanded(fileId: string) {
  if (expandedFiles.value.has(fileId)) {
    expandedFiles.value.delete(fileId);
  } else {
    expandedFiles.value.add(fileId);
  }
}

function getFileLaps(fileId: string): LapSegment[] {
  return fitFilesStore.getLapsByFileId(fileId);
}

function toggleLapSelection(lap: LapSegment) {
  comparisonStore.toggleLapSelection(lap);
}

function isLapSelected(lapId: string): boolean {
  return comparisonStore.selectedLapIds.includes(lapId);
}

function isBaseline(lapId: string): boolean {
  return comparisonStore.selection.baseline?.id === lapId;
}

function formatTime(seconds: number): string {
  return fitParser.formatTime(seconds);
}

function formatDistance(meters?: number): string {
  return fitParser.formatDistance(meters);
}

function openLapEditor(file: ParsedFitFile) {
  emit('open-lap-editor', file);
}
</script>
