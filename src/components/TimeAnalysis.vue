<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Time Analysis</h3>
    </div>    

    <!-- Time Gaps Analysis -->
    <div class="space-y-4">
      <div v-if="comparisons.length > 0">
        <!-- View Toggle -->

        <!-- Chart View -->
        <div class="space-y-4">
          <!-- Chart and Map Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Chart -->
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <canvas
                ref="timeGapCanvas"
                class="w-full"
                style="height: 400px;"
              ></canvas>
            </div>
            
            <!-- Map -->
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">Track Position</h4>
                <button
                  @click="showMap = !showMap"
                  class="text-xs text-gray-500 hover:text-gray-700"
                >
                  {{ showMap ? 'Hide Map' : 'Show Map' }}
                </button>
              </div>
              
              <div v-if="showMap">
                <MapView
                  :baseline="baseline"
                  :comparison="currentComparison"
                  :current-data-point="hoveredDataPoint"
                  @position-click="onMapPositionClick"
                />
              </div>
              <div v-else class="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded">
                <div class="text-center">
                  <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p class="text-sm">Click "Show Map" to view track position</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Table View -->
        <div class="space-y-4">
          <div
            v-for="comparison in comparisons"
            :key="comparison.id"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="font-medium">
                {{ comparison.comparisonLap.filename }} - Lap {{ comparison.comparisonLap.lapNumber }}
              </div>
              <div
                :class="[
                  'text-sm px-2 py-1 rounded-full font-medium',
                  comparison.finalTimeDifference < 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ formatTimeDifference(comparison.finalTimeDifference) }}
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4 text-sm">
              <div class="text-center">
                <div class="text-xs text-gray-500">Max Gap</div>
                <div
                  :class="[
                    'font-medium',
                    comparison.maxGap < 0 ? 'text-green-600' : 'text-red-600'
                  ]"
                >
                  {{ formatTimeDifference(comparison.maxGap) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500">Min Gap</div>
                <div
                  :class="[
                    'font-medium',
                    comparison.minGap < 0 ? 'text-green-600' : 'text-red-600'
                  ]"
                >
                  {{ formatTimeDifference(comparison.minGap) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500">Avg Gap</div>
                <div
                  :class="[
                    'font-medium',
                    comparison.averageGap < 0 ? 'text-green-600' : 'text-red-600'
                  ]"
                >
                  {{ formatTimeDifference(comparison.averageGap) }}
                </div>
              </div>
            </div>

            <!-- Crossover Points -->
            <div v-if="comparison.crossoverPoints.length > 0" class="mt-3 pt-3 border-t border-gray-100">
              <div class="text-xs text-gray-500 mb-1">Crossover Points</div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="point in comparison.crossoverPoints.slice(0, 5)"
                  :key="point"
                  class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                >
                  {{ formatTime(point) }}
                </span>
                <span
                  v-if="comparison.crossoverPoints.length > 5"
                  class="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  +{{ comparison.crossoverPoints.length - 5 }} more
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary Statistics (shown in both views) -->
        <div class="border-t border-gray-200 pt-4">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Gap Analysis Summary</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="text-xs text-gray-500">Largest Lead</div>
              <div class="font-medium text-green-600">{{ formatTimeDifference(largestLead) }}</div>
              <div class="text-xs text-gray-600">Maximum advantage</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="text-xs text-gray-500">Largest Deficit</div>
              <div class="font-medium text-red-600">{{ formatTimeDifference(largestDeficit) }}</div>
              <div class="text-xs text-gray-600">Maximum disadvantage</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="text-xs text-gray-500">Total Crossovers</div>
              <div class="font-medium">{{ totalCrossovers }}</div>
              <div class="text-xs text-gray-600">Position changes</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="text-xs text-gray-500">Most Volatile</div>
              <div class="font-medium">{{ mostVolatileLap?.filename || 'N/A' }}</div>
              <div class="text-xs text-gray-600">Biggest swings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, shallowRef } from 'vue';
import { useComparisonStore } from '@/stores/comparison';
import { fitParser } from '@/utils/fitParser';
import type { LapSegment } from '@/types/fitData';
import type { TimeDifference } from '@/types/comparison';
import MapView from './MapView.vue';
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
  Title,
  Tooltip,
  Legend,
  Filler
);

// Store
const comparisonStore = useComparisonStore();

// Refs
const timeGapCanvas = ref<HTMLCanvasElement | null>(null);
const timeGapChart = shallowRef<Chart | null>(null);

// Local state
const chartXAxisMode = ref<'percentage' | 'time'>('percentage');

// Map integration state
const showMap = ref(true);
const hoveredDataPoint = ref<TimeDifference | null>(null);

// Computed properties
const baseline = computed(() => comparisonStore.selection.baseline);
const comparisons = computed(() => comparisonStore.comparisons);

// Current comparison for map (use first comparison for now)
const currentComparison = computed(() => {
  return comparisons.value.length > 0 ? comparisons.value[0].comparisonLap : null;
});

const allLaps = computed(() => {
  const laps: LapSegment[] = [];
  if (baseline.value) laps.push(baseline.value);
  laps.push(...comparisonStore.selection.comparisons);
  return laps;
});

const fastestLap = computed(() => {
  if (allLaps.value.length === 0) return null;
  return allLaps.value.reduce((fastest, current) => 
    current.duration < fastest.duration ? current : fastest
  );
});

const slowestLap = computed(() => {
  if (allLaps.value.length === 0) return null;
  return allLaps.value.reduce((slowest, current) => 
    current.duration > slowest.duration ? current : slowest
  );
});

const timeSpread = computed(() => {
  if (!fastestLap.value || !slowestLap.value) return 0;
  return slowestLap.value.duration - fastestLap.value.duration;
});

const averageGap = computed(() => {
  if (comparisons.value.length === 0) return 0;
  const totalGap = comparisons.value.reduce((sum, comp) => sum + comp.finalTimeDifference, 0);
  return totalGap / comparisons.value.length;
});

// Time gap analysis computed properties
const largestLead = computed(() => {
  if (comparisons.value.length === 0) return 0;
  return Math.min(...comparisons.value.map(comp => comp.minGap));
});

const largestDeficit = computed(() => {
  if (comparisons.value.length === 0) return 0;
  return Math.max(...comparisons.value.map(comp => comp.maxGap));
});

const totalCrossovers = computed(() => {
  return comparisons.value.reduce((total, comp) => total + comp.crossoverPoints.length, 0);
});

const mostVolatileLap = computed(() => {
  if (comparisons.value.length === 0) return null;
  return comparisons.value.reduce((mostVolatile, current) => {
    const currentVolatility = current.maxGap - current.minGap;
    const mostVolatileVolatility = mostVolatile.maxGap - mostVolatile.minGap;
    return currentVolatility > mostVolatileVolatility ? current : mostVolatile;
  }).comparisonLap;
});

// Time gap chart data
const timeGapChartData = computed((): ChartData<'line'> => {
  if (comparisons.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const datasets: any[] = [];
  
  // Use the first comparison to get the labels (all should have same length)
  const firstComparison = comparisons.value[0];
  const labels = firstComparison.timeDifferences.map((td, index) => formatTime(td.elapsedTime));

  // Create a dataset for each comparison
  comparisons.value.forEach((comparison, index) => {
    const color = getComparisonColor(index);
    
    datasets.push({
      label: `${comparison.comparisonLap.filename} - Lap ${comparison.comparisonLap.lapNumber}`,
      data: comparison.timeDifferences.map(td => td.difference),
      borderColor: color,
      backgroundColor: color + '20',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
      fill: {
        target: 'origin',
        above: color + '10',
        below: color + '10'
      }
    });
  });

  return { labels, datasets };
});

// Time gap chart options
const timeGapChartOptions = computed((): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  onHover: (event, activeElements) => {
    // Update map position when hovering over chart
    if (activeElements.length > 0 && comparisons.value.length > 0) {
      const dataIndex = activeElements[0].index;
      const firstComparison = comparisons.value[0];
      
      if (dataIndex < firstComparison.timeDifferences.length) {
        hoveredDataPoint.value = firstComparison.timeDifferences[dataIndex];
      }
    } else {
      hoveredDataPoint.value = null;
    }
  },
  plugins: {
    title: {
      display: true,
      text: 'Time Gap Analysis - Time Ahead/Behind Baseline',
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
          const comparison = comparisons.value[0];
          const td = comparison.timeDifferences[index];
          if (chartXAxisMode.value === 'time') {
            return `Time: ${formatTime(td.elapsedTime)}`;
          } else {
            return `Progress: ${(td.percentage * 100).toFixed(1)}%`;
          }
        },
        label: (context) => {
          const value = context.parsed.y;
          const status = value < 0 ? 'ahead' : 'behind';
          return `${context.dataset.label}: ${formatTimeDifference(value)} ${status}`;
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: chartXAxisMode.value === 'time' ? 'Elapsed Time' : 'Progress (%)',
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
        text: 'Time Difference (seconds)',
        font: {
          size: 14,
          weight: 'bold'
        }
      },
      grid: {
        display: true,
        drawOnChartArea: true,
        lineWidth: (context) => {
          return context.tick.value === 0 ? 2 : 1;
        },
        color: (context) => {
          return context.tick.value === 0 ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)';
        }
      }
    }
  },
  elements: {
    line: {
      tension: 0.1
    },
    point: {
      radius: 0,
      hoverRadius: 4,
      pointStyle: false
    }
  }
}));

// Methods
function formatTime(seconds: number): string {
  return fitParser.formatTime(seconds);
}

function formatTimeDifference(seconds: number): string {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? '-' : '+';
  
  if (abs < 60) {
    return `${sign}${abs.toFixed(1)}s`;
  }
  
  const minutes = Math.floor(abs / 60);
  const remainingSeconds = abs % 60;
  return `${sign}${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
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

function createTimeGapChart() {
  if (!timeGapCanvas.value || comparisons.value.length === 0) return;
  
  // Destroy existing chart
  if (timeGapChart.value) {
    timeGapChart.value.destroy();
  }
  
  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: timeGapChartData.value,
    options: timeGapChartOptions.value
  };
  
  timeGapChart.value = new Chart(timeGapCanvas.value, config);
}

function updateTimeGapChart() {
  if (isUpdatingChart.value) return;
  
  isUpdatingChart.value = true;
  try {
    if (timeGapChart.value) {
      timeGapChart.value.data = timeGapChartData.value;
      timeGapChart.value.options = timeGapChartOptions.value;
      timeGapChart.value.update('active');
    } else {
      nextTick(() => createTimeGapChart());
    }
  } catch (error) {
    console.error('Error updating time gap chart:', error);
  } finally {
    isUpdatingChart.value = false;
  }
}

function exportTimeGapChart() {
  if (timeGapChart.value) {
    const url = timeGapChart.value.toBase64Image('image/png', 1.0);
    const link = document.createElement('a');
    link.download = 'time-gap-analysis.png';
    link.href = url;
    link.click();
  }
}

// Map integration methods
function onMapPositionClick(position: { lat: number; lng: number; elapsedTime?: number }) {
  console.log('Map position clicked:', position);
  // TODO: Implement chart navigation to clicked position
  // This could jump the chart to the corresponding time/percentage
}

// Add update guard to prevent circular updates
const isUpdatingChart = ref(false);

// Watchers - Fixed to prevent circular reactivity
watch(
  () => [comparisons.value.length, chartXAxisMode.value],
  () => {
    nextTick(() => updateTimeGapChart());
  }
);

// Lifecycle
onMounted(() => {
  nextTick(() => createTimeGapChart());
});

onUnmounted(() => {
  if (timeGapChart.value) {
    timeGapChart.value.destroy();
  }
});
</script>
