<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Strava Activities</h3>
      <div class="flex items-center space-x-2">
        <button
          v-if="isConnected"
          @click="refreshActivities"
          :disabled="isLoading"
          class="btn btn-secondary btn-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Not Connected State -->
    <div v-if="!isConnected" class="text-center py-8">
      <div class="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.008 13.828h4.172"/>
        </svg>
      </div>
      <p class="text-gray-500">Connect to Strava to view your activities</p>
    </div>

    <!-- Activity ID Input -->
    <div v-else class="space-y-4">
      <div class="border border-gray-200 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3">Load Activity by ID</h4>
        <div class="space-y-3">
          <div>
            <label for="activityId" class="block text-xs font-medium text-gray-700 mb-1">
              Strava Activity ID
            </label>
            <input
              id="activityId"
              v-model="activityIdInput"
              type="text"
              placeholder="e.g., 12345678901"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              :disabled="isLoadingActivity !== null"
            >
            <p class="mt-1 text-xs text-gray-500">
              Find the activity ID in the Strava URL: strava.com/activities/<strong>12345678901</strong>
            </p>
          </div>
          <button
            @click="loadActivityById"
            :disabled="!activityIdInput.trim() || isLoadingActivity !== null"
            class="w-full btn btn-primary"
          >
            <span v-if="isLoadingActivity !== null" class="flex items-center justify-center">
              <div class="spinner w-4 h-4 mr-2"></div>
              Loading Activity...
            </span>
            <span v-else>Load Activity</span>
          </button>
        </div>
      </div>
    </div>


    <!-- Error Display -->
    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start">
        <svg class="w-5 h-5 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <p class="text-sm text-red-800">{{ error }}</p>
          <button
            @click="clearError"
            class="mt-1 text-xs text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStravaStore } from '@/stores/strava';
import { format } from 'date-fns';

// Store
const stravaStore = useStravaStore();

// Local state
const isLoadingActivity = ref<number | null>(null);
const activityIdInput = ref('');

// Computed properties
const isConnected = computed(() => stravaStore.isConnected);
const isLoading = computed(() => stravaStore.isLoading);
const error = computed(() => stravaStore.error);

// Methods
async function loadActivityById() {
  const activityId = parseInt(activityIdInput.value.trim());
  if (isNaN(activityId)) {
    return;
  }
  
  try {
    isLoadingActivity.value = activityId;
    await stravaStore.loadActivityToAnalyzer(activityId);
    // Clear the input on successful load
    activityIdInput.value = '';
  } catch (err) {
    console.error('Failed to load activity:', err);
  } finally {
    isLoadingActivity.value = null;
  }
}

function refreshActivities() {
  // Placeholder for future functionality
}

function clearError() {
  stravaStore.clearError();
}
</script>
