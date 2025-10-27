// Strava API Types
export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  max_watts?: number;
  average_cadence?: number;
  has_heartrate: boolean;
  has_kudoed: boolean;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  gear_id?: string;
  from_accepted_tag: boolean;
  upload_id?: number;
  external_id?: string;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  achievement_count: number;
  pr_count: number;
  total_photo_count: number;
  workout_type?: number;
}

export interface StravaDetailedActivity extends StravaActivity {
  description?: string;
  photos: {
    primary?: {
      id: number;
      unique_id: string;
      urls: Record<string, string>;
      source: number;
    };
    use_primary_photo: boolean;
    count: number;
  };
  gear?: {
    id: string;
    primary: boolean;
    name: string;
    resource_state: number;
    distance: number;
  };
  calories?: number;
  device_watts?: boolean;
  embed_token?: string;
  splits_metric?: Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    pace_zone: number;
  }>;
  splits_standard?: Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    pace_zone: number;
  }>;
  laps?: StravaLap[];
  best_efforts?: Array<{
    id: number;
    resource_state: number;
    name: string;
    activity: {
      id: number;
      resource_state: number;
    };
    athlete: {
      id: number;
      resource_state: number;
    };
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    start_date_local: string;
    distance: number;
    start_index: number;
    end_index: number;
    pr_rank?: number;
    achievements: Array<{
      type_id: number;
      type: string;
      rank: number;
    }>;
  }>;
}

export interface StravaLap {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  lap_index: number;
  split: number;
  pace_zone: number;
}

export interface StravaStream {
  type: string;
  data: number[];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaStreamSet {
  time?: StravaStream;
  distance?: StravaStream;
  latlng?: StravaStream;
  altitude?: StravaStream;
  velocity_smooth?: StravaStream;
  heartrate?: StravaStream;
  cadence?: StravaStream;
  watts?: StravaStream;
  temp?: StravaStream;
  moving?: StravaStream;
  grade_smooth?: StravaStream;
}

export interface StravaAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

export interface StravaAuthResponse extends StravaAuthTokens {
  athlete: StravaAthlete;
}

// Configuration
export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

// Error types
export interface StravaError {
  message: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

// Stream types for our internal use
export type StravaStreamType = 
  | 'time'
  | 'distance' 
  | 'latlng'
  | 'altitude'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'watts'
  | 'temp'
  | 'moving'
  | 'grade_smooth';
