import FitParser from 'fit-file-parser';
import type { ParsedFitFile, FitFileData, LapSegment, FitRecord } from '@/types/fitData';

export class FitFileParser {
  private parser: any;

  constructor() {
    this.parser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    });
  }

  async parseFile(file: File): Promise<ParsedFitFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        
        this.parser.parse(buffer, (error: any, data: any) => {
          if (error) {
            reject(new Error(`Failed to parse FIT file: ${error}`));
            return;
          }

          try {
            const parsedFile = this.transformParsedData(file.name, data);
            resolve(parsedFile);
          } catch (transformError) {
            reject(new Error(`Failed to transform FIT data: ${transformError}`));
          }
        });
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private transformParsedData(filename: string, rawData: any): ParsedFitFile {
    const fileId = this.generateFileId(filename);
    
    // Extract and clean the data - check for activity structure first
    let sessions = rawData.sessions || [];
    let laps = rawData.laps || [];
    let records = rawData.records || [];
    
    // If no direct data, check if it's in an activity structure
    if (rawData.activity) {
      sessions = rawData.activity.sessions || [];
      laps = rawData.activity.laps || [];
      records = rawData.activity.records || [];
    }
    
    // If laps are nested inside sessions, extract them
    if (laps.length === 0 && sessions.length > 0) {
      // Flatten laps from all sessions
      laps = sessions.reduce((allLaps: any[], session: any) => {
        if (session.laps && Array.isArray(session.laps)) {
          return allLaps.concat(session.laps);
        }
        return allLaps;
      }, []);
      
      // Also extract records from sessions if available
      if (records.length === 0) {
        records = sessions.reduce((allRecords: any[], session: any) => {
          if (session.records && Array.isArray(session.records)) {
            return allRecords.concat(session.records);
          }
          return allRecords;
        }, []);
      }
    }
    
    // Extract records from laps if they're nested there and we still don't have records
    if (records.length === 0 && laps.length > 0) {
      records = laps.reduce((allRecords: any[], lap: any) => {
        if (lap.records && Array.isArray(lap.records)) {
          return allRecords.concat(lap.records);
        }
        return allRecords;
      }, []);
    }

    // Calculate metadata
    const startTimeSeconds = records.length > 0 ? this.getTimestampSeconds(records[0].timestamp) : null;
    const startTime = startTimeSeconds !== null ? new Date(startTimeSeconds * 1000) : new Date();
    const totalTime = sessions.length > 0 ? sessions[0].total_elapsed_time || 0 : 0;
    const totalDistance = sessions.length > 0 ? sessions[0].total_distance : undefined;
    const sport = sessions.length > 0 ? sessions[0].sport : undefined;

    const fitFileData: FitFileData = {
      sessions,
      laps,
      records,
    };

    return {
      id: fileId,
      filename,
      uploadedAt: new Date(),
      data: fitFileData,
      metadata: {
        totalTime,
        totalDistance,
        lapCount: laps.length,
        recordCount: records.length,
        sport,
        startTime,
      },
    };
  }

  extractLaps(parsedFile: ParsedFitFile): LapSegment[] {
    const { data, id: fileId, filename } = parsedFile;
    
    return data.laps.map((lap, index) => {
      // Convert Date objects to timestamps for comparison
      const lapStartTime = this.getTimestampSeconds(lap.start_time) ?? 0;
      const lapDuration = typeof lap.total_elapsed_time === 'number' ? lap.total_elapsed_time : 0;
      const lapEndTime = lapStartTime + lapDuration;
      
      // Filter records for this lap
      const lapRecords = this.filterRecordsByTimeRange(
        data.records,
        lapStartTime,
        lapEndTime
      );

      return {
        id: `${fileId}-lap-${index + 1}`,
        fileId,
        filename,
        lapNumber: index + 1,
        startTime: lapStartTime,
        endTime: lapEndTime,
        duration: lapDuration,
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

  private filterRecordsByTimeRange(
    records: FitRecord[],
    startTime: number,
    endTime: number
  ): FitRecord[] {
    return records.filter((record) => {
      const recordTime = this.getTimestampSeconds(record.timestamp);
      if (recordTime === null) return false;
      return recordTime >= startTime && recordTime <= endTime;
    });
  }

  private getTimestampSeconds(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (value instanceof Date) {
      return value.getTime() / 1000;
    }
    if (typeof value === 'object' && value && 'getTime' in value) {
      const timeValue = (value as Date).getTime();
      return Number.isFinite(timeValue) ? timeValue / 1000 : null;
    }
    return null;
  }

  private generateFileId(filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    return `${cleanName}-${timestamp}-${random}`;
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  formatDistance(meters?: number): string {
    if (!meters) return 'N/A';
    
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  formatPace(metersPerSecond?: number): string {
    if (!metersPerSecond || metersPerSecond === 0) return 'N/A';
    
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }
}

export const fitParser = new FitFileParser();
