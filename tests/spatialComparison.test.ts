import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useComparisonStore } from '@/stores/comparison';
import { calculateHaversineDistance, isValidGPSCoordinate } from '@/utils/gpsUtils';
import type { LapSegment, FitRecord } from '@/types/fitData';

describe('Spatial Comparison Algorithm', () => {
  let comparisonStore: ReturnType<typeof useComparisonStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    comparisonStore = useComparisonStore();
  });

  describe('GPS Utilities', () => {
    it('should calculate Haversine distance correctly', () => {
      // Test with known coordinates (approximately 1km apart)
      const lat1 = 40.7128; // New York City
      const lon1 = -74.0060;
      const lat2 = 40.7589; // Central Park
      const lon2 = -73.9851;

      const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 5.8km
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(7000);
    });

    it('should validate GPS coordinates correctly', () => {
      expect(isValidGPSCoordinate(40.7128, -74.0060)).toBe(true);
      expect(isValidGPSCoordinate(0, 0)).toBe(false); // Invalid null island
      expect(isValidGPSCoordinate(undefined, -74.0060)).toBe(false);
      expect(isValidGPSCoordinate(40.7128, undefined)).toBe(false);
      expect(isValidGPSCoordinate(91, -74.0060)).toBe(false); // Invalid latitude
      expect(isValidGPSCoordinate(40.7128, 181)).toBe(false); // Invalid longitude
    });
  });

  describe('Spatial Comparison', () => {
    it('should perform spatial comparison when GPS data is available', async () => {
      // Create mock baseline lap with GPS data
      const baselineRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          position_lat: 40.7128,
          position_long: -74.0060,
          distance: 0,
          heart_rate: 120,
          power: 200
        },
        {
          timestamp: 30,
          elapsed_time: 30,
          position_lat: 40.7138,
          position_long: -74.0050,
          distance: 100,
          heart_rate: 125,
          power: 210
        },
        {
          timestamp: 60,
          elapsed_time: 60,
          position_lat: 40.7148,
          position_long: -74.0040,
          distance: 200,
          heart_rate: 130,
          power: 220
        }
      ];

      const baseline: LapSegment = {
        id: 'baseline-1',
        fileId: 'file-1',
        filename: 'baseline.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 60,
        duration: 60,
        distance: 200,
        records: baselineRecords,
        lapData: {} as any,
        metadata: {}
      };

      // Create comparison lap with slightly different GPS coordinates (within 10m)
      // Using much smaller coordinate differences to ensure they're within 10m
      const comparisonRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          position_lat: 40.7128001, // ~0.1m difference
          position_long: -74.0060001,
          distance: 0,
          heart_rate: 118,
          power: 195
        },
        {
          timestamp: 32,
          elapsed_time: 32,
          position_lat: 40.7138001,
          position_long: -74.0050001,
          distance: 100,
          heart_rate: 128,
          power: 215
        },
        {
          timestamp: 65,
          elapsed_time: 65,
          position_lat: 40.7148001,
          position_long: -74.0040001,
          distance: 200,
          heart_rate: 135,
          power: 225
        }
      ];

      const comparison: LapSegment = {
        id: 'comparison-1',
        fileId: 'file-2',
        filename: 'comparison.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 65,
        duration: 65,
        distance: 200,
        records: comparisonRecords,
        lapData: {} as any,
        metadata: {}
      };

      // Set up comparison
      comparisonStore.setBaseline(baseline);
      comparisonStore.addComparison(comparison);

      // Wait for calculation to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const comparisons = comparisonStore.comparisons;
      expect(comparisons).toHaveLength(1);

      const lapComparison = comparisons[0];
      expect(lapComparison.timeDifferences).toBeDefined();
      expect(lapComparison.timeDifferences.length).toBeGreaterThan(0);

      // Check that only exact matches are included (≤5m distance)
      const exactMatches = lapComparison.timeDifferences.filter(td => 
        td.matchQuality === 'exact'
      );
      const interpolatedPoints = lapComparison.timeDifferences.filter(td => 
        td.matchQuality === 'interpolated'
      );
      
      // Should have exact matches or interpolated points, but no approximate/distant
      expect(exactMatches.length + interpolatedPoints.length).toBe(lapComparison.timeDifferences.length);
      
      // Verify exact matches are within 5m
      exactMatches.forEach(point => {
        expect(point.spatialDistance).toBeLessThanOrEqual(5); // Exact match threshold
        expect(point.baselineRecordIndex).toBeDefined();
        expect(point.comparisonRecordIndex).toBeDefined();
      });
      
      // Should not have any approximate or distant matches
      const nonExactSpatialMatches = lapComparison.timeDifferences.filter(td => 
        td.matchQuality === 'approximate' || td.matchQuality === 'distant'
      );
      expect(nonExactSpatialMatches.length).toBe(0);
    });

    it('should fall back to time-based comparison when GPS data is missing', async () => {
      // Create baseline without GPS data
      const baselineRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          distance: 0,
          heart_rate: 120,
          power: 200
        },
        {
          timestamp: 30,
          elapsed_time: 30,
          distance: 100,
          heart_rate: 125,
          power: 210
        }
      ];

      const baseline: LapSegment = {
        id: 'baseline-1',
        fileId: 'file-1',
        filename: 'baseline.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 60,
        duration: 60,
        distance: 200,
        records: baselineRecords,
        lapData: {} as any,
        metadata: {}
      };

      const comparisonRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          distance: 0,
          heart_rate: 118,
          power: 195
        },
        {
          timestamp: 32,
          elapsed_time: 32,
          distance: 100,
          heart_rate: 128,
          power: 215
        }
      ];

      const comparison: LapSegment = {
        id: 'comparison-1',
        fileId: 'file-2',
        filename: 'comparison.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 65,
        duration: 65,
        distance: 200,
        records: comparisonRecords,
        lapData: {} as any,
        metadata: {}
      };

      comparisonStore.setBaseline(baseline);
      comparisonStore.addComparison(comparison);

      await new Promise(resolve => setTimeout(resolve, 100));

      const comparisons = comparisonStore.comparisons;
      expect(comparisons).toHaveLength(1);

      const lapComparison = comparisons[0];
      expect(lapComparison.timeDifferences).toBeDefined();
      expect(lapComparison.timeDifferences.length).toBeGreaterThan(0);

      // All points should be interpolated since no GPS data
      lapComparison.timeDifferences.forEach(point => {
        expect(point.matchQuality).toBe('interpolated');
        expect(point.spatialDistance).toBeUndefined();
      });
    });

    it('should handle mixed GPS data quality', async () => {
      // Create baseline with some GPS data
      const baselineRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          position_lat: 40.7128,
          position_long: -74.0060,
          distance: 0
        },
        {
          timestamp: 30,
          elapsed_time: 30,
          // Missing GPS data
          distance: 100
        },
        {
          timestamp: 60,
          elapsed_time: 60,
          position_lat: 40.7148,
          position_long: -74.0040,
          distance: 200
        }
      ];

      const baseline: LapSegment = {
        id: 'baseline-1',
        fileId: 'file-1',
        filename: 'baseline.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 60,
        duration: 60,
        distance: 200,
        records: baselineRecords,
        lapData: {} as any,
        metadata: {}
      };

      const comparisonRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          position_lat: 40.7128001, // Very close to baseline point
          position_long: -74.0060001,
          distance: 0
        },
        {
          timestamp: 65,
          elapsed_time: 65,
          position_lat: 40.7148001, // Very close to baseline point
          position_long: -74.0040001,
          distance: 200
        }
      ];

      const comparison: LapSegment = {
        id: 'comparison-1',
        fileId: 'file-2',
        filename: 'comparison.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 65,
        duration: 65,
        distance: 200,
        records: comparisonRecords,
        lapData: {} as any,
        metadata: {}
      };

      comparisonStore.setBaseline(baseline);
      comparisonStore.addComparison(comparison);

      await new Promise(resolve => setTimeout(resolve, 100));

      const comparisons = comparisonStore.comparisons;
      expect(comparisons).toHaveLength(1);

      const lapComparison = comparisons[0];
      expect(lapComparison.timeDifferences).toBeDefined();

      // Should have both spatial and interpolated points
      const spatialPoints = lapComparison.timeDifferences.filter(td => 
        td.matchQuality === 'exact' || td.matchQuality === 'approximate' || td.matchQuality === 'distant'
      );
      const interpolatedPoints = lapComparison.timeDifferences.filter(td => 
        td.matchQuality === 'interpolated'
      );

      expect(spatialPoints.length).toBeGreaterThan(0);
      expect(interpolatedPoints.length).toBeGreaterThan(0);
    });

    it('should reject outliers beyond 20 meters', async () => {
      // Create baseline with GPS data
      const baselineRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          position_lat: 40.7128,
          position_long: -74.0060,
          distance: 0,
          heart_rate: 120,
          power: 200
        },
        {
          timestamp: 30,
          elapsed_time: 30,
          position_lat: 40.7138,
          position_long: -74.0050,
          distance: 100,
          heart_rate: 125,
          power: 210
        }
      ];

      const baseline: LapSegment = {
        id: 'baseline-1',
        fileId: 'file-1',
        filename: 'baseline.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 60,
        duration: 60,
        distance: 200,
        records: baselineRecords,
        lapData: {} as any,
        metadata: {}
      };

      // Create comparison with GPS coordinates that are far away (outliers)
      const comparisonRecords: FitRecord[] = [
        {
          timestamp: 0,
          elapsed_time: 0,
          position_lat: 40.7128001, // Close match - should be included
          position_long: -74.0060001,
          distance: 0,
          heart_rate: 118,
          power: 195
        },
        {
          timestamp: 32,
          elapsed_time: 32,
          position_lat: 40.7200, // ~800m away - should be rejected as outlier
          position_long: -74.0000,
          distance: 100,
          heart_rate: 128,
          power: 215
        }
      ];

      const comparison: LapSegment = {
        id: 'comparison-1',
        fileId: 'file-2',
        filename: 'comparison.fit',
        lapNumber: 1,
        startTime: 0,
        endTime: 65,
        duration: 65,
        distance: 200,
        records: comparisonRecords,
        lapData: {} as any,
        metadata: {}
      };

      comparisonStore.setBaseline(baseline);
      comparisonStore.addComparison(comparison);

      await new Promise(resolve => setTimeout(resolve, 100));

      const comparisons = comparisonStore.comparisons;
      expect(comparisons).toHaveLength(1);

      const lapComparison = comparisons[0];
      expect(lapComparison.timeDifferences).toBeDefined();

      // Check that outliers are filtered out
      const spatialPoints = lapComparison.timeDifferences.filter(td => 
        td.spatialDistance !== undefined && td.matchQuality !== 'interpolated'
      );

      // Should have fewer spatial points due to outlier filtering
      // The far-away point should be rejected, leaving only the close match
      spatialPoints.forEach(point => {
        expect(point.spatialDistance).toBeLessThanOrEqual(20); // Within 20m hard limit
      });

      // Verify that we have some interpolated points to fill gaps
      const interpolatedPoints = lapComparison.timeDifferences.filter(td => 
        td.matchQuality === 'interpolated'
      );
      expect(interpolatedPoints.length).toBeGreaterThan(0);
    });
  });
});
