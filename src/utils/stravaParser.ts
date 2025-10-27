import type { 
  StravaDetailedActivity, 
  StravaStreamSet, 
  StravaLap 
} from '@/types/strava';
import type { 
  ParsedFitFile, 
  LapSegment, 
  FitRecord,
  FitSession,
  FitLap
} from '@/types/fitData';
import { format } from 'date-fns';

export class StravaParser {
  /**
   * Convert a Strava activity to our internal ParsedFitFile format
   */
  static async convertStravaActivity(
    activity: StravaDetailedActivity,
    streams: StravaStreamSet
  ): Promise<ParsedFitFile> {
    const activityId = `strava_${activity.id}`;
    const startTime = new Date(activity.start_date);
    const startTimeTimestamp = Math.floor(startTime.getTime() / 1000);
    
    // Convert stream data to FIT records
    const records = this.convertStreamsToRecords(streams, startTime);
    
    // Create session data
    const session: FitSession = {
      message_index: 0,
      timestamp: startTimeTimestamp,
      start_time: startTimeTimestamp,
      total_elapsed_time: activity.elapsed_time,
      total_timer_time: activity.moving_time,
      total_distance: activity.distance,
      total_ascent: activity.total_elevation_gain,
      avg_speed: activity.average_speed,
      max_speed: activity.max_speed,
      avg_heart_rate: activity.average_heartrate,
      max_heart_rate: activity.max_heartrate,
      avg_power: activity.average_watts,
      max_power: activity.max_watts,
      avg_cadence: activity.average_cadence,
      sport: this.mapStravaActivityType(activity.sport_type),
      sub_sport: activity.type,
      total_calories: activity.calories || 0,
    };

    // Convert Strava laps to our lap format
    const laps = activity.laps ? 
      this.convertStravaLaps(activity.laps, activityId, activity.name) : 
      this.createDefaultLap(activity, activityId, activity.name);

    return {
      id: activityId,
      filename: `${activity.name}.strava`,
      uploadedAt: startTime,
      data: {
        sessions: [session],
        laps: laps.map(lap => lap.lapData),
        records
      },
      metadata: {
        totalTime: activity.elapsed_time,
        totalDistance: activity.distance,
        lapCount: laps.length,
        recordCount: records.length,
        sport: this.mapStravaActivityType(activity.sport_type),
        startTime
      }
    };
  }

  /**
   * Convert Strava stream data to FIT records
   */
  private static convertStreamsToRecords(
    streams: StravaStreamSet, 
    startTime: Date
  ): FitRecord[] {
    const records: FitRecord[] = [];
    
    if (!streams.time?.data) {
      return records;
    }

    const timeData = streams.time.data;
    const length = timeData.length;

    for (let i = 0; i < length; i++) {
      const timestamp = Math.floor((startTime.getTime() + (timeData[i] * 1000)) / 1000);
      
      const latlng = streams.latlng?.data[i];
      const record: FitRecord = {
        timestamp,
        position_lat: Array.isArray(latlng) ? latlng[0] : undefined,
        position_long: Array.isArray(latlng) ? latlng[1] : undefined,
        distance: streams.distance?.data[i],
        enhanced_altitude: streams.altitude?.data[i],
        altitude: streams.altitude?.data[i],
        enhanced_speed: streams.velocity_smooth?.data[i],
        speed: streams.velocity_smooth?.data[i],
        heart_rate: streams.heartrate?.data[i],
        cadence: streams.cadence?.data[i],
        power: streams.watts?.data[i],
        temperature: streams.temp?.data[i],
      };

      // Only include defined values
      Object.keys(record).forEach(key => {
        if (record[key as keyof FitRecord] === undefined) {
          delete record[key as keyof FitRecord];
        }
      });

      records.push(record);
    }

    return records;
  }

  /**
   * Convert Strava laps to our lap format
   */
  private static convertStravaLaps(
    stravaLaps: StravaLap[], 
    fileId: string, 
    filename: string
  ): LapSegment[] {
    return stravaLaps.map((lap, index) => {
      const startTime = Math.floor(new Date(lap.start_date).getTime() / 1000);
      const endTime = startTime + lap.elapsed_time;

      const lapData: FitLap = {
        message_index: index,
        timestamp: startTime,
        start_time: startTime,
        total_elapsed_time: lap.elapsed_time,
        total_timer_time: lap.moving_time,
        total_distance: lap.distance,
        total_ascent: lap.total_elevation_gain,
        avg_speed: lap.average_speed,
        max_speed: lap.max_speed,
        avg_heart_rate: lap.average_heartrate,
        max_heart_rate: lap.max_heartrate,
        avg_power: lap.average_watts,
        avg_cadence: lap.average_cadence,
      };

      return {
        id: `${fileId}_lap_${lap.lap_index || index + 1}`,
        fileId,
        filename,
        lapNumber: lap.lap_index || index + 1,
        startTime,
        endTime,
        duration: lap.elapsed_time,
        distance: lap.distance,
        records: [], // Will be populated later if needed
        lapData,
        metadata: {
          avgHeartRate: lap.average_heartrate,
          maxHeartRate: lap.max_heartrate,
          avgPower: lap.average_watts,
          avgCadence: lap.average_cadence,
          avgSpeed: lap.average_speed,
          maxSpeed: lap.max_speed,
        }
      };
    });
  }

  /**
   * Create a default lap when Strava activity doesn't have lap data
   */
  private static createDefaultLap(
    activity: StravaDetailedActivity, 
    fileId: string, 
    filename: string
  ): LapSegment[] {
    const startTime = Math.floor(new Date(activity.start_date).getTime() / 1000);
    const endTime = startTime + activity.elapsed_time;

    const lapData: FitLap = {
      message_index: 0,
      timestamp: startTime,
      start_time: startTime,
      total_elapsed_time: activity.elapsed_time,
      total_timer_time: activity.moving_time,
      total_distance: activity.distance,
      total_ascent: activity.total_elevation_gain,
      avg_speed: activity.average_speed,
      max_speed: activity.max_speed,
      avg_heart_rate: activity.average_heartrate,
      max_heart_rate: activity.max_heartrate,
      avg_power: activity.average_watts,
      max_power: activity.max_watts,
      avg_cadence: activity.average_cadence,
      total_calories: activity.calories,
    };

    return [{
      id: `${fileId}_lap_1`,
      fileId,
      filename,
      lapNumber: 1,
      startTime,
      endTime,
      duration: activity.elapsed_time,
      distance: activity.distance,
      records: [], // Will be populated later if needed
      lapData,
      metadata: {
        avgHeartRate: activity.average_heartrate,
        maxHeartRate: activity.max_heartrate,
        avgPower: activity.average_watts,
        maxPower: activity.max_watts,
        avgCadence: activity.average_cadence,
        avgSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        calories: activity.calories,
      }
    }];
  }

  /**
   * Map Strava activity types to FIT sport types
   */
  private static mapStravaActivityType(stravaType: string): string {
    const typeMap: Record<string, string> = {
      'Ride': 'cycling',
      'Run': 'running',
      'Swim': 'swimming',
      'Hike': 'hiking',
      'Walk': 'walking',
      'AlpineSki': 'alpine_skiing',
      'BackcountrySki': 'backcountry_skiing',
      'Canoeing': 'canoeing',
      'Crossfit': 'training',
      'EBikeRide': 'cycling',
      'Elliptical': 'elliptical',
      'Golf': 'golf',
      'Handcycle': 'cycling',
      'IceSkate': 'ice_skating',
      'InlineSkate': 'inline_skating',
      'Kayaking': 'kayaking',
      'Kitesurf': 'kitesurfing',
      'NordicSki': 'cross_country_skiing',
      'RockClimbing': 'rock_climbing',
      'RollerSki': 'cross_country_skiing',
      'Rowing': 'rowing',
      'Sail': 'sailing',
      'Skateboard': 'skateboarding',
      'Snowboard': 'snowboarding',
      'Snowshoe': 'snowshoeing',
      'Soccer': 'soccer',
      'StairStepper': 'stair_climbing',
      'StandUpPaddling': 'stand_up_paddleboarding',
      'Surfing': 'surfing',
      'VirtualRide': 'cycling',
      'VirtualRun': 'running',
      'WeightTraining': 'strength_training',
      'Windsurf': 'windsurfing',
      'Workout': 'training',
      'Yoga': 'yoga'
    };

    return typeMap[stravaType] || 'generic';
  }

  /**
   * Generate a display name for a Strava activity
   */
  static generateDisplayName(activity: StravaDetailedActivity): string {
    const date = format(new Date(activity.start_date_local), 'MMM d, yyyy');
    return `${activity.name} (${date})`;
  }

  /**
   * Check if activity has the required data streams for analysis
   */
  static hasRequiredStreams(streams: StravaStreamSet): boolean {
    return !!(streams.time?.data && streams.time.data.length > 0);
  }

  /**
   * Get available data streams from a stream set
   */
  static getAvailableStreams(streams: StravaStreamSet): string[] {
    const available: string[] = [];
    
    if (streams.heartrate?.data?.length) available.push('Heart Rate');
    if (streams.watts?.data?.length) available.push('Power');
    if (streams.cadence?.data?.length) available.push('Cadence');
    if (streams.velocity_smooth?.data?.length) available.push('Speed');
    if (streams.altitude?.data?.length) available.push('Altitude');
    if (streams.temp?.data?.length) available.push('Temperature');
    
    return available;
  }
}

export default StravaParser;
