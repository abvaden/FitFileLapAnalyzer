<template>
  <div class="card">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Data Streams</h3>
    
    <div class="space-y-3">
      <div
        v-for="(config, stream) in dataStreamSettings"
        :key="stream"
        class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
      >
        <div class="flex items-center space-x-3">
          <!-- Color indicator -->
          <div
            class="w-4 h-4 rounded-full border-2 border-gray-300"
            :style="{ backgroundColor: config.color }"
          ></div>
          
          <!-- Stream info -->
          <div>
            <div class="font-medium text-gray-900">{{ config.label }}</div>
            <div class="text-xs text-gray-500">{{ config.unit }}</div>
          </div>
        </div>
        
        <!-- Toggle switch -->
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            :checked="config.enabled"
            @change="toggleStream(stream as DataStream)"
            class="sr-only peer"
          >
          <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>
    </div>
    
    <!-- Stream Statistics -->
    <div v-if="hasEnabledStreams" class="mt-4 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Enabled Streams</h4>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="stream in enabledStreams"
          :key="stream"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          :style="{
            backgroundColor: dataStreamSettings[stream].color + '20',
            color: dataStreamSettings[stream].color
          }"
        >
          <div
            class="w-2 h-2 rounded-full mr-1"
            :style="{ backgroundColor: dataStreamSettings[stream].color }"
          ></div>
          {{ dataStreamSettings[stream].label }}
        </span>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="mt-4 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
      <div class="grid grid-cols-2 gap-2">
        <button
          @click="enableAll"
          class="btn btn-secondary text-xs py-2"
        >
          Enable All
        </button>
        <button
          @click="disableAll"
          class="btn btn-secondary text-xs py-2"
        >
          Disable All
        </button>
        <button
          @click="enableCommon"
          class="btn btn-secondary text-xs py-2"
        >
          Common Only
        </button>
        <button
          @click="enablePower"
          class="btn btn-secondary text-xs py-2"
        >
          Power Focus
        </button>
      </div>
    </div>
    
    <!-- Data Availability Info -->
    <div v-if="canAnalyze" class="mt-4 pt-4 border-t border-gray-200">
      <h4 class="text-sm font-medium text-gray-700 mb-2">Data Availability</h4>
      <div class="space-y-1 text-xs">
        <div
          v-for="stream in enabledStreams"
          :key="stream"
          class="flex items-center justify-between"
        >
          <span class="text-gray-600">{{ dataStreamSettings[stream].label }}</span>
          <span
            :class="[
              'px-2 py-1 rounded-full text-xs',
              getDataAvailability(stream) > 80
                ? 'bg-green-100 text-green-800'
                : getDataAvailability(stream) > 50
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            ]"
          >
            {{ getDataAvailability(stream) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useComparisonStore } from '@/stores/comparison';
import type { DataStream } from '@/types/fitData';

// Store
const comparisonStore = useComparisonStore();

// Computed properties
const dataStreamSettings = computed(() => comparisonStore.dataStreamSettings);
const enabledStreams = computed(() => comparisonStore.enabledStreams);
const canAnalyze = computed(() => comparisonStore.canAnalyze);
const hasEnabledStreams = computed(() => enabledStreams.value.length > 0);

// Methods
function toggleStream(stream: DataStream) {
  comparisonStore.toggleDataStream(stream);
}

function enableAll() {
  Object.keys(dataStreamSettings.value).forEach(stream => {
    if (!dataStreamSettings.value[stream as DataStream].enabled) {
      comparisonStore.toggleDataStream(stream as DataStream);
    }
  });
}

function disableAll() {
  Object.keys(dataStreamSettings.value).forEach(stream => {
    if (dataStreamSettings.value[stream as DataStream].enabled) {
      comparisonStore.toggleDataStream(stream as DataStream);
    }
  });
}

function enableCommon() {
  // Enable heart rate, speed, and cadence (most common streams)
  disableAll();
  const commonStreams: DataStream[] = ['heart_rate', 'speed', 'cadence'];
  commonStreams.forEach(stream => {
    if (!dataStreamSettings.value[stream].enabled) {
      comparisonStore.toggleDataStream(stream);
    }
  });
}

function enablePower() {
  // Enable power-focused streams: power, heart rate, cadence
  disableAll();
  const powerStreams: DataStream[] = ['power', 'heart_rate', 'cadence'];
  powerStreams.forEach(stream => {
    if (!dataStreamSettings.value[stream].enabled) {
      comparisonStore.toggleDataStream(stream);
    }
  });
}

function getDataAvailability(stream: DataStream): number {
  // Calculate what percentage of selected laps have data for this stream
  if (!canAnalyze.value) return 0;
  
  const selection = comparisonStore.selection;
  const allSelectedLaps = [
    ...(selection.baseline ? [selection.baseline] : []),
    ...selection.comparisons
  ];
  
  if (allSelectedLaps.length === 0) return 0;
  
  let lapsWithData = 0;
  
  allSelectedLaps.forEach(lap => {
    const hasData = lap.records.some(record => {
      switch (stream) {
        case 'heart_rate':
          return record.heart_rate !== undefined && record.heart_rate > 0;
        case 'power':
          return record.power !== undefined && record.power > 0;
        case 'cadence':
          return record.cadence !== undefined && record.cadence > 0;
        case 'speed':
          return (record.enhanced_speed !== undefined && record.enhanced_speed > 0) ||
                 (record.speed !== undefined && record.speed > 0);
        case 'altitude':
          return (record.enhanced_altitude !== undefined) ||
                 (record.altitude !== undefined);
        default:
          return false;
      }
    });
    
    if (hasData) lapsWithData++;
  });
  
  return Math.round((lapsWithData / allSelectedLaps.length) * 100);
}
</script>
