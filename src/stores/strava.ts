import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  StravaActivity, 
  StravaDetailedActivity, 
  StravaStreamSet,
  StravaAthlete 
} from '@/types/strava';
import { stravaApi } from '@/services/stravaApi';
import { StravaParser } from '@/utils/stravaParser';
import { useFitFilesStore } from '@/stores/fitFiles';

export const useStravaStore = defineStore('strava', () => {
  // State
  const isAuthenticated = ref(false);
  const athlete = ref<StravaAthlete | null>(null);
  const activities = ref<StravaActivity[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentPage = ref(1);
  const hasMoreActivities = ref(true);

  // Getters
  const activityCount = computed(() => activities.value.length);
  const isConnected = computed(() => isAuthenticated.value && athlete.value !== null);

  // Actions
  async function initialize(): Promise<void> {
    try {
      isAuthenticated.value = stravaApi.isAuthenticated();
      if (isAuthenticated.value) {
        // Try to load athlete info if we have a valid token
        await loadAthleteInfo();
      }
    } catch (err) {
      console.error('Failed to initialize Strava store:', err);
      isAuthenticated.value = false;
      athlete.value = null;
    }
  }

  async function authenticate(): Promise<void> {
    try {
      error.value = null;
      
      // Open Strava OAuth in a popup window
      const authUrl = stravaApi.getAuthUrl();
      const popup = window.open(
        authUrl,
        'strava-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open authentication popup. Please allow popups for this site.');
      }

      // Wait for the popup to complete authentication
      const authResult = await waitForAuthCompletion(popup);
      console.log(authResult);
      
      if (authResult.success && authResult.code) {
        // Exchange code for tokens
        const authResponse = await stravaApi.exchangeCodeForToken(authResult.code);
        
        isAuthenticated.value = true;
        athlete.value = authResponse.athlete;
        
        // Load initial activities
        await loadActivities(true);
      } else {
        throw new Error(authResult.error || 'Authentication failed');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Authentication failed';
      throw err;
    }
  }

  async function loadAthleteInfo(): Promise<void> {
    try {
      // This would require an additional API call to get athlete info
      // For now, we'll skip this since we get athlete info during auth
    } catch (err) {
      console.error('Failed to load athlete info:', err);
    }
  }

  async function loadActivities(reset = false): Promise<void> {
    if (isLoading.value) return;

    try {
      isLoading.value = true;
      error.value = null;

      if (reset) {
        activities.value = [];
        currentPage.value = 1;
        hasMoreActivities.value = true;
      }

      if (!hasMoreActivities.value) return;

      const newActivities = await stravaApi.getActivities(currentPage.value, 30);
      
      if (newActivities.length === 0) {
        hasMoreActivities.value = false;
      } else {
        activities.value.push(...newActivities);
        currentPage.value++;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load activities';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadActivityToAnalyzer(activityId: number): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      // Get detailed activity data
      const activity = await stravaApi.getActivity(activityId);
      
      // Get activity streams
      const streams = await stravaApi.getActivityStreams(activityId);
      
      // Check if we have the required data
      if (!StravaParser.hasRequiredStreams(streams)) {
        throw new Error('This activity does not have the required data streams for analysis');
      }

      // Convert to our internal format
      const parsedActivity = await StravaParser.convertStravaActivity(activity, streams);
      
      // Add to the fit files store
      const fitFilesStore = useFitFilesStore();
      await fitFilesStore.addStravaActivity(parsedActivity);

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load activity';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function logout(): void {
    stravaApi.logout();
    isAuthenticated.value = false;
    athlete.value = null;
    activities.value = [];
    currentPage.value = 1;
    hasMoreActivities.value = true;
    error.value = null;
  }

  function clearError(): void {
    error.value = null;
  }

  // Helper function to wait for auth completion
  function waitForAuthCompletion(popup: Window): Promise<{ success: boolean; code?: string; error?: string }> {
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve({ success: false, error: 'Authentication cancelled' });
        }
      }, 1000);

      // Listen for messages from the popup
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'STRAVA_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();
          resolve({ success: true, code: event.data.code });
        } else if (event.data.type === 'STRAVA_AUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();
          resolve({ success: false, error: event.data.error });
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  return {
    // State
    isAuthenticated,
    athlete,
    activities,
    isLoading,
    error,
    hasMoreActivities,
    
    // Getters
    activityCount,
    isConnected,
    
    // Actions
    initialize,
    authenticate,
    loadActivities,
    loadActivityToAnalyzer,
    logout,
    clearError,
  };
});
