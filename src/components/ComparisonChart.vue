<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Comparison Chart</h3>
      <div class="flex items-center space-x-2">
        <button
          @click="refreshChart"
          class="btn btn-secondary text-sm"
          :disabled="isCalculating"
        >
          <svg v-if="isCalculating" class="w-4 h-4 mr-2 spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span v-if="isCalculating">Calculating...</span>
          <span v-else>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="relative">
      <!-- Chart Canvas -->
      <div v-if="canAnalyze && enabledStreams.length > 0" class="bg-white rounded-lg border border-gray-200 p-4">
        <canvas
          ref="chartCanvas"
          class="w-full"
          style="height: 400px;"
        ></canvas>
      </div>

      <!-- Placeholder States -->
      <div v-else class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div v-if="!canAnalyze" class="text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h4 class="text-lg font-medium text-gray-900 mb-2">No Data to Display</h4>
          <p class="text-gray-600">Select a baseline and comparison laps to view the chart</p>
        </div>

        <div v-else-if="enabledStreams.length === 0" class="text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 class="text-lg font-medium text-gray-900 mb-2">No Data Streams Selected</h4>
          <p class="text-gray-600">Enable data streams below to view comparisons</p>
        </div>
      </div>
    </div>

    <!-- Data Stream Controls -->
    <div v-if="canAnalyze" class="mt-4 border-t border-gray-200 pt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium text-gray-700">Data Streams</h4>
        <div class="flex items-center space-x-2">
          <button
            @click="enableCommonStreams"
            class="text-xs text-gray-500 hover:text-gray-700"
          >
            Common
          </button>
          <span class="text-gray-300">|</span>
          <button
            @click="enableAllStreams"
            class="text-xs text-gray-500 hover:text-gray-700"
          >
            All
          </button>
          <span class="text-gray-300">|</span>
          <button
            @click="disableAllStreams"
            class="text-xs text-gray-500 hover:text-gray-700"
          >
            None
          </button>
        </div>
      </div>
      
      <!-- Stream Toggle Controls -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <label
          v-for="(config, stream) in dataStreamSettings"
          :key="stream"
          class="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          :class="{ 'bg-gray-50 border-gray-300': config.enabled }"
        >
          <input
            type="checkbox"
            :checked="config.enabled"
            @change="toggleDataStream(stream as DataStream)"
            class="sr-only"
          >
          <div
            class="w-3 h-3 rounded-full border-2"
            :style="{ 
              backgroundColor: config.enabled ? config.color : 'transparent',
              borderColor: config.color
            }"
          ></div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-gray-900 truncate">{{ config.label }}</div>
            <div class="text-xs text-gray-500">{{ config.unit }}</div>
          </div>
        </label>
      </div>
    </div>

    <!-- Chart Legend -->
    <div v-if="canAnalyze && enabledStreams.length > 0" class="mt-4">
      <div class="flex flex-wrap justify-center gap-4 mb-4">
        <div class="flex items-center space-x-2">
          <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span class="text-sm">{{ baseline?.filename }} - Lap {{ baseline?.lapNumber }} (Baseline)</span>
        </div>
        <div
          v-for="(comparison, index) in comparisons"
          :key="comparison.id"
          class="flex items-center space-x-2"
        >
          <div 
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: getComparisonColor(index) }"
          ></div>
          <span class="text-sm">{{ comparison.filename }} - Lap {{ comparison.lapNumber }}</span>
        </div>
      </div>

      <!-- Enabled Streams -->
      <div class="flex flex-wrap justify-center gap-2 mb-4">
        <span
          v-for="stream in enabledStreams"
          :key="stream"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          :style="{
            backgroundColor: dataStreamSettings[stream].color + '20',
            color: dataStreamSettings[stream].color
          }"
        >
          {{ dataStreamSettings[stream].label }}
        </span>
      </div>
    </div>

    <!-- Chart Controls -->
    <div v-if="canAnalyze && enabledStreams.length > 0" class="mt-4 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <label class="flex items-center space-x-2">
          <input
            v-model="showTimeAxis"
            type="checkbox"
            class="checkbox"
            @change="updateChart"
          >
          <span class="text-sm text-gray-700">Time-based X-axis</span>
        </label>
        <label class="flex items-center space-x-2">
          <input
            v-model="normalizeData"
            type="checkbox"
            class="checkbox"
            @change="updateChart"
          >
          <span class="text-sm text-gray-700">Normalize data</span>
        </label>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          @click="exportChart"
          class="btn btn-secondary text-sm"
        >
          Export
        </button>
        <button
          @click="toggleFullscreen"
          class="btn btn-secondary text-sm"
        >
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, shallowRef } from 'vue';
import { useComparisonStore } from '@/stores/comparison';
import type { DataStream } from '@/types/fitData';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  type ChartConfiguration,
  type ChartData,
  type ChartOptions
} from 'chart.js';


// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Store
const comparisonStore = useComparisonStore();

// Refs
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartInstance = shallowRef<Chart | null>(null);

// Local state
const showTimeAxis = ref(true);
const normalizeData = ref(false);
const isFullscreen = ref(false);

// Computed properties
const canAnalyze = computed(() => comparisonStore.canAnalyze);
const baseline = computed(() => comparisonStore.selection.baseline);
const comparisons = computed(() => comparisonStore.selection.comparisons);
const enabledStreams = computed(() => comparisonStore.enabledStreams);
const dataStreamSettings = computed(() => comparisonStore.dataStreamSettings);
const isCalculating = computed(() => comparisonStore.isCalculating);

// Chart data preparation
const chartData = computed((): ChartData<'line'> => {
  if (!baseline.value || comparisons.value.length === 0 || enabledStreams.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const datasets: any[] = [];
  const allLaps = [baseline.value, ...comparisons.value];
  
  // Find the maximum number of records to create consistent x-axis
  const maxRecords = Math.max(...allLaps.map(lap => lap.records.length));
  const labels = Array.from({ length: maxRecords }, (_, i) => {
    if (showTimeAxis.value) {
      return `${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')}`;
    }
    return i.toString();
  });

  // Create datasets for each enabled stream
  enabledStreams.value.forEach(streamKey => {
    const streamSettings = dataStreamSettings.value[streamKey as keyof typeof dataStreamSettings.value];
    if (!streamSettings) return;
    
    // Baseline dataset
    if (baseline.value) {
      const baselineData = prepareStreamData(baseline.value, streamKey, maxRecords);
      datasets.push({
        label: `${streamSettings.label} - ${baseline.value.filename} Lap ${baseline.value.lapNumber} (Baseline)`,
        data: baselineData,
        borderColor: '#eab308', // yellow-500
        backgroundColor: '#eab30820',
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false
      });
    }

    // Comparison datasets
    comparisons.value.forEach((comparison, index) => {
      const comparisonData = prepareStreamData(comparison, streamKey, maxRecords);
      const color = getComparisonColor(index);
      
      datasets.push({
        label: `${streamSettings.label} - ${comparison.filename} Lap ${comparison.lapNumber}`,
        data: comparisonData,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false
      });
    });
  });

  return { labels, datasets };
});

// Chart options
const chartOptions = computed((): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    title: {
      display: true,
      text: 'Lap Comparison Analysis',
      font: {
        size: 16,
        weight: 'bold'
      }
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 6,
      displayColors: true,
      callbacks: {
        title: (context) => {
          const index = context[0].dataIndex;
          if (showTimeAxis.value) {
            return `Time: ${context[0].label}`;
          }
          return `Point: ${index + 1}`;
        },
        label: (context) => {
          const value = context.parsed.y;
          const streamKey = getStreamKeyFromDatasetLabel(context.dataset.label || '');
          const unit = dataStreamSettings.value[streamKey]?.unit || '';
          return `${context.dataset.label}: ${value?.toFixed(1)} ${unit}`;
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: showTimeAxis.value ? 'Time' : 'Data Points',
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)'
      }
    },
    y: {
      display: true,
      title: {
        display: true,
        text: 'Values',
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      grid: {
        display: true,
        color: 'rgba(0, 0, 0, 0.1)'
      },
      beginAtZero: false
    }
  },
  elements: {
    line: {
      tension: 0.1
    },
    
  }
}));

// Methods
function prepareStreamData(lap: any, streamKey: string, maxLength: number): (number | null)[] {
  const data: (number | null)[] = new Array(maxLength).fill(null);
  
  lap.records.forEach((record: any, index: number) => {
    if (index < maxLength) {
      let value = record[streamKey];
      
      // Handle missing or invalid data
      if (value === undefined || value === null || isNaN(value)) {
        value = null;
      } else if (normalizeData.value && enabledStreams.value.length > 1) {
        // Simple normalization (0-100 scale) - could be enhanced
        const streamSettings = dataStreamSettings.value[streamKey as keyof typeof dataStreamSettings.value];
        if (streamSettings && 'normalizeRange' in streamSettings) {
          const [min, max] = streamSettings.normalizeRange as [number, number];
          value = ((value - min) / (max - min)) * 100;
        }
      }
      
      data[index] = value;
    }
  });
  
  return data;
}

function getStreamKeyFromDatasetLabel(label: string): keyof typeof dataStreamSettings.value {
  for (const [key, settings] of Object.entries(dataStreamSettings.value)) {
    if (label.includes(settings.label)) {
      return key as keyof typeof dataStreamSettings.value;
    }
  }
  return 'heart_rate'; // fallback
}

function getComparisonColor(index: number): string {
  const colors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f97316', // orange-500
  ];
  return colors[index % colors.length];
}

function createChart() {
  if (!chartCanvas.value) return;
  
  // Destroy existing chart
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  
  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: chartData.value,
    options: chartOptions.value
  };
  
  chartInstance.value = new Chart(chartCanvas.value, config);
}

function updateChart() {
  if (isUpdatingChart.value) return;
  
  isUpdatingChart.value = true;
  try {
    if (chartInstance.value) {
      chartInstance.value.data = chartData.value;
      chartInstance.value.options = chartOptions.value;
      chartInstance.value.update('active');
    } else {
      nextTick(() => createChart());
    }
  } catch (error) {
    console.error('Error updating comparison chart:', error);
  } finally {
    isUpdatingChart.value = false;
  }
}

function refreshChart() {
  if (canAnalyze.value) {
    comparisonStore.calculateComparisons();
    nextTick(() => updateChart());
  }
}

function exportChart() {
  if (chartInstance.value) {
    const url = chartInstance.value.toBase64Image('image/png', 1.0);
    const link = document.createElement('a');
    link.download = 'lap-comparison-chart.png';
    link.href = url;
    link.click();
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  
  if (isFullscreen.value) {
    // Add fullscreen styles
    const chartContainer = chartCanvas.value?.parentElement;
    if (chartContainer) {
      chartContainer.style.position = 'fixed';
      chartContainer.style.top = '0';
      chartContainer.style.left = '0';
      chartContainer.style.width = '100vw';
      chartContainer.style.height = '100vh';
      chartContainer.style.zIndex = '9999';
      chartContainer.style.backgroundColor = 'white';
    }
  } else {
    // Remove fullscreen styles
    const chartContainer = chartCanvas.value?.parentElement;
    if (chartContainer) {
      chartContainer.style.position = '';
      chartContainer.style.top = '';
      chartContainer.style.left = '';
      chartContainer.style.width = '';
      chartContainer.style.height = '';
      chartContainer.style.zIndex = '';
      chartContainer.style.backgroundColor = '';
    }
  }
  
  // Resize chart after fullscreen toggle
  setTimeout(() => {
    if (chartInstance.value) {
      chartInstance.value.resize();
    }
  }, 100);
}

// Data stream control methods
function toggleDataStream(stream: DataStream) {
  comparisonStore.toggleDataStream(stream);
}

function enableAllStreams() {
  Object.keys(dataStreamSettings.value).forEach(stream => {
    if (!dataStreamSettings.value[stream as DataStream].enabled) {
      comparisonStore.toggleDataStream(stream as DataStream);
    }
  });
}

function disableAllStreams() {
  Object.keys(dataStreamSettings.value).forEach(stream => {
    if (dataStreamSettings.value[stream as DataStream].enabled) {
      comparisonStore.toggleDataStream(stream as DataStream);
    }
  });
}

function enableCommonStreams() {
  // Enable heart rate, speed, and cadence (most common streams)
  disableAllStreams();
  const commonStreams: DataStream[] = ['heart_rate', 'speed', 'cadence'];
  commonStreams.forEach(stream => {
    if (!dataStreamSettings.value[stream].enabled) {
      comparisonStore.toggleDataStream(stream);
    }
  });
}

// Add update guard to prevent circular updates
const isUpdatingChart = ref(false);

// Watchers - Fixed to prevent circular reactivity
watch(
  () => [canAnalyze.value, enabledStreams.value.length, baseline.value?.id, comparisons.value.length],
  () => {
    if (canAnalyze.value && enabledStreams.value.length > 0 && !isUpdatingChart.value) {
      nextTick(() => updateChart());
    }
  }
);

watch([showTimeAxis, normalizeData], () => {
  if (!isUpdatingChart.value) {
    updateChart();
  }
});

// Lifecycle
onMounted(() => {
  if (canAnalyze.value && enabledStreams.value.length > 0) {
    nextTick(() => createChart());
  }
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
});

// Handle escape key for fullscreen
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
