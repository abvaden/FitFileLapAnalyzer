<template>
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Strava Integration</h3>
      <div class="flex items-center space-x-2">
        <div v-if="isConnected" class="flex items-center text-sm text-green-600">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          Connected
        </div>
      </div>
    </div>

    <!-- Not Connected State -->
    <div v-if="!isConnected" class="text-center py-6">
      <div class="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.008 13.828h4.172"/>
        </svg>
      </div>
      <h4 class="text-lg font-medium text-gray-900 mb-2">Connect to Strava</h4>
      <p class="text-gray-500 mb-6">
        Connect your Strava account to load activities directly into the lap analyzer
      </p>
      
      <button
        @click="handleConnect"
        :disabled="isLoading"
        class="btn btn-primary"
      >
        <span v-if="isLoading" class="flex items-center">
          <div class="spinner w-4 h-4 mr-2"></div>
          Connecting...
        </span>
        <span v-else class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7.008 13.828h4.172"/>
          </svg>
          Connect with Strava
        </span>
      </button>

      <div class="mt-4 text-xs text-gray-500">
        <p>We'll only access your activity data for analysis</p>
      </div>
    </div>

    <!-- Connected State -->
    <div v-else class="space-y-4">
      <!-- Athlete Info -->
      <div v-if="athlete" class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        <img 
          :src="athlete.profile_medium" 
          :alt="athlete.firstname + ' ' + athlete.lastname"
          class="w-10 h-10 rounded-full"
        >
        <div class="flex-1">
          <p class="font-medium text-gray-900">
            {{ athlete.firstname }} {{ athlete.lastname }}
          </p>
          <p class="text-sm text-gray-500">@{{ athlete.username }}</p>
        </div>
        <button
          @click="handleDisconnect"
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          Disconnect
        </button>
      </div>

      <!-- Activity Count -->
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-600">Available Activities:</span>
        <span class="font-medium">{{ activityCount }}</span>
      </div>

      <!-- Load More Activities Button -->
      <button
        v-if="hasMoreActivities"
        @click="loadMoreActivities"
        :disabled="isLoading"
        class="w-full btn btn-secondary"
      >
        <span v-if="isLoading" class="flex items-center justify-center">
          <div class="spinner w-4 h-4 mr-2"></div>
          Loading...
        </span>
        <span v-else>Load More Activities</span>
      </button>
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
import { computed, onMounted } from 'vue';
import { useStravaStore } from '@/stores/strava';

// Store
const stravaStore = useStravaStore();

// Computed properties
const isConnected = computed(() => stravaStore.isConnected);
const athlete = computed(() => stravaStore.athlete);
const activityCount = computed(() => stravaStore.activityCount);
const isLoading = computed(() => stravaStore.isLoading);
const error = computed(() => stravaStore.error);
const hasMoreActivities = computed(() => stravaStore.hasMoreActivities);

// Methods
async function handleConnect() {
  try {
    await stravaStore.authenticate();
  } catch (err) {
    console.error('Failed to connect to Strava:', err);
  }
}

function handleDisconnect() {
  stravaStore.logout();
}

async function loadMoreActivities() {
  try {
    await stravaStore.loadActivities();
  } catch (err) {
    console.error('Failed to load activities:', err);
  }
}

function clearError() {
  stravaStore.clearError();
}

// Initialize on mount
onMounted(async () => {
  await stravaStore.initialize();
});
</script>
