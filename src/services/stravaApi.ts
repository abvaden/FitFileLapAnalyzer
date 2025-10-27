import axios, { AxiosInstance } from 'axios';
import type {
  StravaActivity,
  StravaDetailedActivity,
  StravaStreamSet,
  StravaStreamType,
  StravaAuthTokens,
  StravaAuthResponse,
  StravaConfig,
  StravaError
} from '@/types/strava';

class StravaApiService {
  private api: AxiosInstance;
  private config: StravaConfig;
  private tokens: StravaAuthTokens | null = null;

  constructor() {
    // Default configuration - these should be set via environment variables
    this.config = {
      clientId: import.meta.env.VITE_STRAVA_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_STRAVA_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_STRAVA_REDIRECT_URI || `${window.location.origin}/strava-callback`,
      scope: 'read,activity:read_all'
    };

    this.api = axios.create({
      baseURL: 'https://www.strava.com/api/v3',
      timeout: 10000,
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.tokens?.access_token) {
          config.headers.Authorization = `Bearer ${this.tokens.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.tokens?.refresh_token) {
          try {
            await this.refreshToken();
            // Retry the original request
            return this.api.request(error.config);
          } catch (refreshError) {
            // Refresh failed, clear tokens and throw error
            this.clearTokens();
            throw refreshError;
          }
        }
        throw error;
      }
    );

    // Load tokens from localStorage on initialization
    this.loadTokensFromStorage();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.tokens?.access_token && this.tokens.expires_at > Date.now() / 1000);
  }

  /**
   * Get the Strava OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scope,
      state: 'strava_auth'
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<StravaAuthResponse> {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code'
      });

      const authResponse: StravaAuthResponse = response.data;
      this.tokens = {
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
        expires_at: authResponse.expires_at,
        expires_in: authResponse.expires_in,
        token_type: authResponse.token_type
      };

      this.saveTokensToStorage();
      return authResponse;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<StravaAuthTokens> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokens.refresh_token,
        grant_type: 'refresh_token'
      });

      const newTokens: StravaAuthTokens = response.data;
      this.tokens = newTokens;
      this.saveTokensToStorage();
      return newTokens;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get athlete's activities
   */
  async getActivities(page = 1, perPage = 30): Promise<StravaActivity[]> {
    try {
      const response = await this.api.get('/athlete/activities', {
        params: {
          page,
          per_page: perPage
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get detailed activity information
   */
  async getActivity(activityId: number): Promise<StravaDetailedActivity> {
    try {
      const response = await this.api.get(`/activities/${activityId}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get activity streams (time series data)
   */
  async getActivityStreams(
    activityId: number,
    streamTypes: StravaStreamType[] = ['time', 'heartrate', 'watts', 'cadence', 'velocity_smooth', 'altitude']
  ): Promise<StravaStreamSet> {
    try {
      const response = await this.api.get(`/activities/${activityId}/streams`, {
        params: {
          keys: streamTypes.join(','),
          key_by_type: true
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Logout and clear tokens
   */
  logout(): void {
    this.clearTokens();
  }

  /**
   * Save tokens to localStorage
   */
  private saveTokensToStorage(): void {
    if (this.tokens) {
      localStorage.setItem('strava_tokens', JSON.stringify(this.tokens));
    }
  }

  /**
   * Load tokens from localStorage
   */
  private loadTokensFromStorage(): void {
    const stored = localStorage.getItem('strava_tokens');
    if (stored) {
      try {
        this.tokens = JSON.parse(stored);
        // Check if token is expired
        if (this.tokens && this.tokens.expires_at <= Date.now() / 1000) {
          this.clearTokens();
        }
      } catch (error) {
        console.error('Failed to parse stored Strava tokens:', error);
        this.clearTokens();
      }
    }
  }

  /**
   * Clear tokens from memory and storage
   */
  private clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem('strava_tokens');
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const stravaError = error.response?.data as StravaError;
      if (stravaError?.message) {
        return new Error(`Strava API Error: ${stravaError.message}`);
      }
      return new Error(`Strava API Error: ${error.response?.status} ${error.response?.statusText}`);
    }
    return error instanceof Error ? error : new Error('Unknown Strava API error');
  }

  /**
   * Update configuration (useful for testing or dynamic config)
   */
  updateConfig(config: Partial<StravaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): StravaConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const stravaApi = new StravaApiService();
export default stravaApi;
