import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { FitFileParser } from '../src/utils/fitParser';

describe('FitFileParser', () => {
  let parser: FitFileParser;

  beforeEach(() => {
    parser = new FitFileParser();
  });

  it('should examine raw FIT parser output', async () => {
    // Read the sample FIT file
    const filePath = resolve(__dirname, '../sample_fit_file.fit');
    const fileBuffer = readFileSync(filePath);
    
    // Test the raw fit-file-parser library directly
    const FitParser = require('fit-file-parser');
    const fitParser = new FitParser.default({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    });
    
    return new Promise((resolve, reject) => {
      fitParser.parse(fileBuffer, (error: any, data: any) => {
        if (error) {
          console.error('FIT parsing error:', error);
          reject(error);
          return;
        }
        
        console.log('Raw FIT parser output:');
        console.log('Data keys:', Object.keys(data));
        
        // Log a subset of the data to avoid overwhelming output
        const summary = {
          sessions: data.sessions ? data.sessions.length : 0,
          laps: data.laps ? data.laps.length : 0,
          records: data.records ? data.records.length : 0,
          activities: data.activities ? data.activities.length : 0,
          events: data.events ? data.events.length : 0,
          device_infos: data.device_infos ? data.device_infos.length : 0,
          file_ids: data.file_ids ? data.file_ids.length : 0,
        };
        
        console.log('Data summary:', summary);
        
        // If there are laps, show the first one
        if (data.laps && data.laps.length > 0) {
          console.log('First lap:', data.laps[0]);
        }
        
        resolve(data);
      });
    });
  });

  it('should parse the sample FIT file correctly', async () => {
    // Read the sample FIT file
    const filePath = resolve(__dirname, '../sample_fit_file.fit');
    const fileBuffer = readFileSync(filePath);
    
    // Create a File object from the buffer
    const file = new File([fileBuffer], 'sample_fit_file.fit', { type: 'application/octet-stream' });
    
    // Parse the file
    const result = await parser.parseFile(file);
    
    // Basic structure checks
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.filename).toBe('sample_fit_file.fit');
    expect(result.uploadedAt).toBeInstanceOf(Date);
    expect(result.data).toBeDefined();
    expect(result.metadata).toBeDefined();
    
    // Check data structure
    expect(result.data.sessions).toBeDefined();
    expect(result.data.laps).toBeDefined();
    expect(result.data.records).toBeDefined();
    
    // Log the actual data to understand the structure
    console.log('Parsed FIT file structure:');
    console.log('Sessions:', result.data.sessions.length);
    console.log('Laps:', result.data.laps.length);
    console.log('Records:', result.data.records.length);
    
    // Let's examine the raw data structure to understand what the parser is returning
    console.log('Raw data keys:', Object.keys(result.data));
    
    if (result.data.laps.length > 0) {
      console.log('First lap data:', result.data.laps[0]);
    }
    
    if (result.data.sessions.length > 0) {
      console.log('Session data:', result.data.sessions[0]);
    }
    
    // Metadata checks
    expect(result.metadata.lapCount).toBe(result.data.laps.length);
    expect(result.metadata.recordCount).toBe(result.data.records.length);
    
    // Check if laps are present
    expect(result.data.laps.length).toBeGreaterThan(0);
  });

  it('should extract laps correctly from parsed file', async () => {
    // Read and parse the sample FIT file
    const filePath = resolve(__dirname, '../sample_fit_file.fit');
    const fileBuffer = readFileSync(filePath);
    const file = new File([fileBuffer], 'sample_fit_file.fit', { type: 'application/octet-stream' });
    
    const parsedFile = await parser.parseFile(file);
    
    // Extract laps
    const laps = parser.extractLaps(parsedFile);
    
    console.log('Extracted laps:');
    console.log('Number of laps:', laps.length);
    
    laps.forEach((lap, index) => {
      console.log(`Lap ${index + 1}:`, {
        id: lap.id,
        lapNumber: lap.lapNumber,
        duration: lap.duration,
        distance: lap.distance,
        recordCount: lap.records.length,
        metadata: lap.metadata
      });
      
      // Log first few records to verify data streams
      if (lap.records.length > 0) {
        console.log(`  First record:`, {
          timestamp: lap.records[0].timestamp,
          heart_rate: lap.records[0].heart_rate,
          power: lap.records[0].power,
          cadence: lap.records[0].cadence,
          speed: lap.records[0].speed,
          altitude: lap.records[0].altitude
        });
      }
    });
    
    // Verify lap structure
    expect(laps.length).toBeGreaterThan(0);
    
    laps.forEach((lap, index) => {
      expect(lap.id).toBeDefined();
      expect(lap.fileId).toBe(parsedFile.id);
      expect(lap.filename).toBe('sample_fit_file.fit');
      expect(lap.lapNumber).toBe(index + 1);
      expect(lap.duration).toBeGreaterThan(0);
      expect(lap.records).toBeDefined();
      expect(lap.lapData).toBeDefined();
      expect(lap.metadata).toBeDefined();
    });
  });

  it('should handle file parsing errors gracefully', async () => {
    // Create an invalid file
    const invalidFile = new File(['invalid content'], 'invalid.fit', { type: 'application/octet-stream' });
    
    // Should throw an error
    await expect(parser.parseFile(invalidFile)).rejects.toThrow();
  });

  it('should format time correctly', () => {
    expect(parser.formatTime(0)).toBe('0:00');
    expect(parser.formatTime(30)).toBe('0:30');
    expect(parser.formatTime(60)).toBe('1:00');
    expect(parser.formatTime(90)).toBe('1:30');
    expect(parser.formatTime(3600)).toBe('1:00:00');
    expect(parser.formatTime(3661)).toBe('1:01:01');
  });

  it('should format distance correctly', () => {
    expect(parser.formatDistance(undefined)).toBe('N/A');
    expect(parser.formatDistance(500)).toBe('500 m');
    expect(parser.formatDistance(1000)).toBe('1.00 km');
    expect(parser.formatDistance(1500)).toBe('1.50 km');
    expect(parser.formatDistance(5000)).toBe('5.00 km');
  });

  it('should format pace correctly', () => {
    expect(parser.formatPace(undefined)).toBe('N/A');
    expect(parser.formatPace(0)).toBe('N/A');
    expect(parser.formatPace(2.78)).toBe('5:59/km'); // ~10 km/h (actual calculation)
    expect(parser.formatPace(3.33)).toBe('5:00/km'); // ~12 km/h
  });
});
