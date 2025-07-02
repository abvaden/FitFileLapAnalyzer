export interface FitRecord {
  timestamp: number;
  position_lat?: number;
  position_long?: number;
  distance?: number;
  enhanced_altitude?: number;
  altitude?: number;
  enhanced_speed?: number;
  speed?: number;
  heart_rate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  elapsed_time?: number;
  timer_time?: number;
}

export interface FitLap {
  message_index: number;
  timestamp: number;
  start_time: number;
  start_position_lat?: number;
  start_position_long?: number;
  end_position_lat?: number;
  end_position_long?: number;
  total_elapsed_time: number;
  total_timer_time: number;
  total_distance?: number;
  total_ascent?: number;
  total_descent?: number;
  total_calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  max_cadence?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_temperature?: number;
  max_temperature?: number;
  lap_trigger?: string;
}

export interface FitSession {
  message_index: number;
  timestamp: number;
  start_time: number;
  total_elapsed_time: number;
  total_timer_time: number;
  total_distance?: number;
  total_ascent?: number;
  total_descent?: number;
  total_calories?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  max_cadence?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  sport?: string;
  sub_sport?: string;
}

export interface FitFileData {
  sessions: FitSession[];
  laps: FitLap[];
  records: FitRecord[];
}

export interface ParsedFitFile {
  id: string;
  filename: string;
  uploadedAt: Date;
  data: FitFileData;
  metadata: {
    totalTime: number;
    totalDistance?: number;
    lapCount: number;
    recordCount: number;
    sport?: string;
    startTime: Date;
  };
}

export interface LapSegment {
  id: string;
  fileId: string;
  filename: string;
  lapNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  distance?: number;
  records: FitRecord[];
  lapData: FitLap;
  metadata: {
    avgHeartRate?: number;
    maxHeartRate?: number;
    avgPower?: number;
    maxPower?: number;
    avgCadence?: number;
    maxCadence?: number;
    avgSpeed?: number;
    maxSpeed?: number;
    calories?: number;
  };
}

export type DataStream = 'heart_rate' | 'power' | 'cadence' | 'speed' | 'altitude';

export interface DataStreamConfig {
  enabled: boolean;
  color: string;
  unit: string;
  label: string;
}

export type DataStreamSettings = Record<DataStream, DataStreamConfig>;
