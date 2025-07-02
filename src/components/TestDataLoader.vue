<template>
  <div class="card">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Test Data Loader</h3>
    <p class="text-sm text-gray-600 mb-4">
      Load mock FIT file data for testing the UI components
    </p>
    <button
      @click="loadMockData"
      class="btn btn-primary"
      :disabled="isLoading"
    >
      <span v-if="isLoading">Loading...</span>
      <span v-else>Load Mock FIT File</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFitFilesStore } from '@/stores/fitFiles';
import type { ParsedFitFile, LapSegment } from '@/types/fitData';

const fitFilesStore = useFitFilesStore();
const isLoading = ref(false);

function loadMockData() {
  isLoading.value = true;
  
  // Create mock FIT file data
  const mockFitFile: ParsedFitFile = {
    id: 'mock-file-123',
    filename: 'test_workout.fit',
    uploadedAt: new Date(),
    data: {
      sessions: [{
        message_index: 0,
        timestamp: Date.now() / 1000,
        start_time: Date.now() / 1000,
        total_elapsed_time: 1800, // 30 minutes
        total_timer_time: 1800,
        total_distance: 5000, // 5km
        avg_speed: 2.78, // ~10 km/h
        max_speed: 4.17, // ~15 km/h
        avg_heart_rate: 150,
        max_heart_rate: 180,
        avg_power: 200,
        max_power: 350,
        sport: 'running'
      }],
      laps: [
        {
          message_index: 0,
          timestamp: Date.now() / 1000,
          start_time: Date.now() / 1000,
          total_elapsed_time: 360, // 6 minutes
          total_timer_time: 360,
          total_distance: 1000, // 1km
          avg_speed: 2.78,
          max_speed: 3.33,
          avg_heart_rate: 145,
          max_heart_rate: 160,
          avg_power: 180,
          max_power: 220,
          avg_cadence: 85,
          max_cadence: 95,
          total_calories: 80,
          lap_trigger: 'manual'
        },
        {
          message_index: 1,
          timestamp: Date.now() / 1000 + 360,
          start_time: Date.now() / 1000 + 360,
          total_elapsed_time: 350, // 5:50
          total_timer_time: 350,
          total_distance: 1000,
          avg_speed: 2.86,
          max_speed: 3.57,
          avg_heart_rate: 155,
          max_heart_rate: 175,
          avg_power: 210,
          max_power: 280,
          avg_cadence: 88,
          max_cadence: 98,
          total_calories: 85,
          lap_trigger: 'manual'
        },
        {
          message_index: 2,
          timestamp: Date.now() / 1000 + 710,
          start_time: Date.now() / 1000 + 710,
          total_elapsed_time: 345, // 5:45
          total_timer_time: 345,
          total_distance: 1000,
          avg_speed: 2.90,
          max_speed: 3.70,
          avg_heart_rate: 160,
          max_heart_rate: 180,
          avg_power: 220,
          max_power: 300,
          avg_cadence: 90,
          max_cadence: 100,
          total_calories: 90,
          lap_trigger: 'manual'
        }
      ],
      records: generateMockRecords()
    },
    metadata: {
      totalTime: 1800,
      totalDistance: 5000,
      lapCount: 3,
      recordCount: 180, // 1 record per 10 seconds
      sport: 'running',
      startTime: new Date()
    }
  };

  // Simulate async loading
  setTimeout(() => {
    try {
      // Add the mock file to the store
      fitFilesStore.files.push(mockFitFile);
      
      // Extract and add laps
      const mockLaps = extractMockLaps(mockFitFile);
      fitFilesStore.laps.push(...mockLaps);
      
      console.log('Mock data loaded successfully');
      console.log('Files in store:', fitFilesStore.files.length);
      console.log('Laps in store:', fitFilesStore.laps.length);
    } catch (error) {
      console.error('Error loading mock data:', error);
    } finally {
      isLoading.value = false;
    }
  }, 1000);
}

function generateMockRecords() {
  const records = [];
  const startTime = Date.now() / 1000;
  
  for (let i = 0; i < 180; i++) {
    const timestamp = startTime + (i * 10); // Every 10 seconds
    const progress = i / 180;
    
    records.push({
      timestamp,
      heart_rate: Math.floor(140 + Math.sin(progress * Math.PI * 4) * 20 + Math.random() * 10),
      power: Math.floor(180 + Math.sin(progress * Math.PI * 3) * 40 + Math.random() * 20),
      cadence: Math.floor(85 + Math.sin(progress * Math.PI * 2) * 10 + Math.random() * 5),
      speed: 2.5 + Math.sin(progress * Math.PI * 2) * 0.5 + Math.random() * 0.2,
      distance: i * 27.8, // Roughly 1km every 36 records
      enhanced_speed: 2.5 + Math.sin(progress * Math.PI * 2) * 0.5 + Math.random() * 0.2,
      enhanced_altitude: 100 + Math.sin(progress * Math.PI) * 20,
      elapsed_time: i * 10,
      timer_time: i * 10
    });
  }
  
  return records;
}

function extractMockLaps(parsedFile: ParsedFitFile): LapSegment[] {
  const { data, id: fileId, filename } = parsedFile;
  
  return data.laps.map((lap, index) => {
    const lapStartTime = lap.start_time;
    const lapEndTime = lapStartTime + lap.total_elapsed_time;
    
    // Filter records for this lap
    const lapRecords = data.records.filter(
      (record) => record.timestamp >= lapStartTime && record.timestamp <= lapEndTime
    );

    return {
      id: `${fileId}-lap-${index + 1}`,
      fileId,
      filename,
      lapNumber: index + 1,
      startTime: lapStartTime,
      endTime: lapEndTime,
      duration: lap.total_elapsed_time,
      distance: lap.total_distance,
      records: lapRecords,
      lapData: lap,
      metadata: {
        avgHeartRate: lap.avg_heart_rate,
        maxHeartRate: lap.max_heart_rate,
        avgPower: lap.avg_power,
        maxPower: lap.max_power,
        avgCadence: lap.avg_cadence,
        maxCadence: lap.max_cadence,
        avgSpeed: lap.avg_speed,
        maxSpeed: lap.max_speed,
        calories: lap.total_calories,
      },
    };
  });
}
</script>
