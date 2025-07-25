<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-gray-900">Lap Analyzer</h1>
            <div class="ml-4 flex items-center space-x-4 text-sm text-gray-500">
              <span>{{ fileCount }} files</span>
              <span>{{ totalLaps }} laps</span>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <button
              v-if="fileCount > 0"
              @click="clearAll"
              class="btn btn-secondary"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Left Sidebar - File Management -->
        <div class="lg:col-span-1 space-y-6">
          <!-- File Upload -->
          <FileUploader />
          
          <!-- File List -->
          <FileList v-if="fileCount > 0" />
        </div>

        <!-- Main Content Area -->
        <div class="lg:col-span-3 space-y-6">
          <!-- Welcome Message -->
          <div v-if="fileCount === 0" class="card text-center py-12">
            <div class="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Welcome to Lap Analyzer</h3>
            <p class="text-gray-500 mb-6">Upload your FIT files to start analyzing and comparing lap data</p>
            <div class="text-sm text-gray-400">
              <p>Supported features:</p>
              <ul class="mt-2 space-y-1">
                <li>• Multiple FIT file loading</li>
                <li>• Lap-by-lap comparison</li>
                <li>• Heart rate, power, cadence analysis</li>
                <li>• Time difference calculations</li>
              </ul>
            </div>
          </div>

          <!-- Lap Selection -->
          <LapSelector v-if="fileCount > 0" />

          <!-- Comparison Chart -->
          <ComparisonChart v-if="canAnalyze" />

          <!-- Time Analysis -->
          <TimeAnalysis v-if="canAnalyze && comparisons.length > 0" />
        </div>
      </div>
    </main>

    <!-- Error Toast -->
    <ErrorToast v-if="error" :message="error" @close="clearError" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFitFilesStore } from '@/stores/fitFiles';
import { useComparisonStore } from '@/stores/comparison';

// Components
import FileUploader from '@/components/FileUploader.vue';
import FileList from '@/components/FileList.vue';
import LapSelector from '@/components/LapSelector.vue';
import ComparisonChart from '@/components/ComparisonChart.vue';
import TimeAnalysis from '@/components/TimeAnalysis.vue';
import ErrorToast from '@/components/ErrorToast.vue';

// Stores
const fitFilesStore = useFitFilesStore();
const comparisonStore = useComparisonStore();

// Computed properties
const fileCount = computed(() => fitFilesStore.fileCount);
const totalLaps = computed(() => fitFilesStore.totalLaps);
const error = computed(() => fitFilesStore.error);
const canAnalyze = computed(() => comparisonStore.canAnalyze);
const comparisons = computed(() => comparisonStore.comparisons);

// Methods
function clearAll() {
  fitFilesStore.clearAll();
  comparisonStore.clearSelection();
}

function clearError() {
  fitFilesStore.clearError();
}
</script>
