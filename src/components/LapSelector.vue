<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Lap Selection</h3>
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-500">
          {{ selectedCount }} selected
        </span>
        <button
          v-if="selectedCount > 0"
          @click="clearSelection"
          class="text-xs text-red-600 hover:text-red-700"
        >
          Clear All
        </button>
      </div>
    </div>

    <!-- Selection Instructions -->
    <div v-if="selectedCount === 0" class="text-center py-6 text-gray-500">
      <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <p class="text-sm">Select laps from the files above to start comparing</p>
      <p class="text-xs text-gray-400 mt-1">First selection becomes the baseline</p>
    </div>

    <!-- Baseline Selection -->
    <div v-if="hasBaseline" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span class="font-medium text-yellow-800">Baseline</span>
        </div>
        <button
          @click="clearBaseline"
          class="text-yellow-600 hover:text-yellow-700"
          title="Remove baseline"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="mt-2">
        <div class="text-sm text-yellow-800">
          <span class="font-medium">{{ baseline?.filename }}</span> - Lap {{ baseline?.lapNumber }}
        </div>
        <div class="text-xs text-yellow-700 mt-1">
          {{ formatTime(baseline?.duration || 0) }} • {{ formatDistance(baseline?.distance) }}
          <span v-if="baseline?.metadata.avgHeartRate">
            • {{ Math.round(baseline.metadata.avgHeartRate) }} bpm avg
          </span>
        </div>
      </div>
    </div>

    <!-- Comparison Laps -->
    <div v-if="hasComparisons" class="mb-4">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Comparison Laps</h4>
      <div class="space-y-2">
        <div
          v-for="lap in comparisons"
          :key="lap.id"
          class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div>
            <div class="text-sm text-blue-800">
              <span class="font-medium">{{ lap.filename }}</span> - Lap {{ lap.lapNumber }}
            </div>
            <div class="text-xs text-blue-700 mt-1">
              {{ formatTime(lap.duration) }} • {{ formatDistance(lap.distance) }}
              <span v-if="lap.metadata.avgHeartRate">
                • {{ Math.round(lap.metadata.avgHeartRate) }} bpm avg
              </span>
            </div>
          </div>
          <button
            @click="removeComparison(lap.id)"
            class="text-blue-600 hover:text-blue-700"
            title="Remove from comparison"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div v-if="totalLaps > 0" class="border-t border-gray-200 pt-4">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
      <div class="grid grid-cols-1 gap-2">
        <button
          @click="selectBestLaps"
          class="btn btn-secondary text-sm py-2"
          :disabled="totalLaps < 2"
        >
          Compare Best Laps
        </button>
        <button
          @click="selectAllLapsFromFirstFile"
          class="btn btn-secondary text-sm py-2"
          :disabled="files.length === 0"
        >
          Select All Laps (First File)
        </button>
        <button
          @click="selectRandomLaps"
          class="btn btn-secondary text-sm py-2"
          :disabled="totalLaps < 3"
        >
          Select Random Sample
        </button>
      </div>
    </div>

    <!-- Analysis Status -->
    <div v-if="canAnalyze" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium text-green-800">Ready for Analysis</span>
      </div>
      <p class="text-xs text-green-700 mt-1">
        Comparing {{ comparisons.length }} lap{{ comparisons.length !== 1 ? 's' : '' }} against baseline
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFitFilesStore } from '@/stores/fitFiles';
import { useComparisonStore } from '@/stores/comparison';
import { fitParser } from '@/utils/fitParser';

// Stores
const fitFilesStore = useFitFilesStore();
const comparisonStore = useComparisonStore();

// Computed properties
const files = computed(() => fitFilesStore.files);
const totalLaps = computed(() => fitFilesStore.totalLaps);
const baseline = computed(() => comparisonStore.selection.baseline);
const comparisons = computed(() => comparisonStore.selection.comparisons);
const hasBaseline = computed(() => comparisonStore.hasBaseline);
const hasComparisons = computed(() => comparisonStore.hasComparisons);
const canAnalyze = computed(() => comparisonStore.canAnalyze);
const selectedCount = computed(() => {
  let count = 0;
  if (hasBaseline.value) count++;
  count += comparisons.value.length;
  return count;
});

// Methods
function clearSelection() {
  comparisonStore.clearSelection();
}

function clearBaseline() {
  comparisonStore.setBaseline(null);
}

function removeComparison(lapId: string) {
  comparisonStore.removeComparison(lapId);
}

function selectBestLaps() {
  // Find the fastest lap from each file based on duration
  const bestLaps = files.value.map(file => {
    const fileLaps = fitFilesStore.getLapsByFileId(file.id);
    return fileLaps.reduce((best, current) => 
      current.duration < best.duration ? current : best
    );
  }).filter(Boolean);

  if (bestLaps.length >= 2) {
    clearSelection();
    comparisonStore.setBaseline(bestLaps[0]);
    bestLaps.slice(1).forEach(lap => {
      comparisonStore.addComparison(lap);
    });
  }
}

function selectAllLapsFromFirstFile() {
  if (files.value.length === 0) return;
  
  const firstFile = files.value[0];
  const fileLaps = fitFilesStore.getLapsByFileId(firstFile.id);
  
  if (fileLaps.length >= 2) {
    clearSelection();
    comparisonStore.setBaseline(fileLaps[0]);
    fileLaps.slice(1).forEach(lap => {
      comparisonStore.addComparison(lap);
    });
  }
}

function selectRandomLaps() {
  const allLaps = fitFilesStore.laps;
  if (allLaps.length < 3) return;

  // Shuffle and select 3-5 random laps
  const shuffled = [...allLaps].sort(() => Math.random() - 0.5);
  const selectedLaps = shuffled.slice(0, Math.min(5, shuffled.length));

  clearSelection();
  comparisonStore.setBaseline(selectedLaps[0]);
  selectedLaps.slice(1).forEach(lap => {
    comparisonStore.addComparison(lap);
  });
}

function formatTime(seconds: number): string {
  return fitParser.formatTime(seconds);
}

function formatDistance(meters?: number): string {
  return fitParser.formatDistance(meters);
}
</script>
