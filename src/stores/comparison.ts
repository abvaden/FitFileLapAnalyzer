import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  ComparisonSelection, 
  LapComparison, 
  TimeDifference,
  ComparisonAnalysis 
} from '@/types/comparison';
import type { LapSegment, DataStream, DataStreamSettings, FitRecord } from '@/types/fitData';
import { 
  calculateHaversineDistance, 
  isValidGPSCoordinate
} from '@/utils/gpsUtils';
import { 
  convertGPSToPathWithIndices,
  findMultiplePathMatches
} from '@/utils/pathUtils';

export const useComparisonStore = defineStore('comparison', () => {
  // State
  const selection = ref<ComparisonSelection>({
    baseline: null,
    comparisons: [],
  });

  const dataStreamSettings = ref<DataStreamSettings>({
    heart_rate: {
      enabled: true,
      color: '#ef4444',
      unit: 'bpm',
      label: 'Heart Rate',
    },
    power: {
      enabled: true,
      color: '#f59e0b',
      unit: 'W',
      label: 'Power',
    },
    cadence: {
      enabled: true,
      color: '#10b981',
      unit: 'rpm',
      label: 'Cadence',
    },
    speed: {
      enabled: true,
      color: '#3b82f6',
      unit: 'm/s',
      label: 'Speed',
    },
    altitude: {
      enabled: false,
      color: '#8b5cf6',
      unit: 'm',
      label: 'Altitude',
    },
  });

  const comparisons = ref<LapComparison[]>([]);
  const isCalculating = ref(false);

  // Getters
  const hasBaseline = computed(() => selection.value.baseline !== null);
  const hasComparisons = computed(() => selection.value.comparisons.length > 0);
  const canAnalyze = computed(() => hasBaseline.value && hasComparisons.value);
  const enabledStreams = computed(() => 
    Object.entries(dataStreamSettings.value)
      .filter(([_, config]) => config.enabled)
      .map(([stream]) => stream as DataStream)
  );

  const selectedLapIds = computed(() => {
    const ids: string[] = [];
    if (selection.value.baseline) {
      ids.push(selection.value.baseline.id);
    }
    ids.push(...selection.value.comparisons.map(lap => lap.id));
    return ids;
  });

  // Actions
  function setBaseline(lap: LapSegment | null): void {
    selection.value.baseline = lap;
    
    // Remove from comparisons if it was there
    if (lap) {
      selection.value.comparisons = selection.value.comparisons.filter(
        comp => comp.id !== lap.id
      );
    }
    
    // Recalculate comparisons
    if (canAnalyze.value) {
      calculateComparisons();
    }
  }

  function addComparison(lap: LapSegment): void {
    // Don't add if it's already the baseline
    if (selection.value.baseline?.id === lap.id) {
      return;
    }

    // Don't add if it's already in comparisons
    if (selection.value.comparisons.some(comp => comp.id === lap.id)) {
      return;
    }

    selection.value.comparisons.push(lap);
    
    // Recalculate comparisons
    if (canAnalyze.value) {
      calculateComparisons();
    }
  }

  function removeComparison(lapId: string): void {
    selection.value.comparisons = selection.value.comparisons.filter(
      comp => comp.id !== lapId
    );
    
    // Remove from calculated comparisons
    comparisons.value = comparisons.value.filter(
      comp => comp.comparisonLap.id !== lapId
    );
  }

  function toggleLapSelection(lap: LapSegment): void {
    const isBaseline = selection.value.baseline?.id === lap.id;
    const isInComparisons = selection.value.comparisons.some(comp => comp.id === lap.id);

    if (isBaseline) {
      // Remove as baseline
      setBaseline(null);
    } else if (isInComparisons) {
      // Remove from comparisons
      removeComparison(lap.id);
    } else {
      // Add to comparisons (or set as baseline if none exists)
      if (!selection.value.baseline) {
        setBaseline(lap);
      } else {
        addComparison(lap);
      }
    }
  }

  function toggleDataStream(stream: DataStream): void {
    dataStreamSettings.value[stream].enabled = !dataStreamSettings.value[stream].enabled;
  }

  function clearSelection(): void {
    selection.value = {
      baseline: null,
      comparisons: [],
    };
    comparisons.value = [];
  }

  async function calculateComparisons(): Promise<void> {
    if (!canAnalyze.value) {
      comparisons.value = [];
      return;
    }

    isCalculating.value = true;

    try {
      const baseline = selection.value.baseline!;
      const newComparisons: LapComparison[] = [];

      for (const comparisonLap of selection.value.comparisons) {
        const comparison = await calculateLapComparison(baseline, comparisonLap);
        newComparisons.push(comparison);
      }

      comparisons.value = newComparisons;
    } catch (error) {
      console.error('Error calculating comparisons:', error);
    } finally {
      isCalculating.value = false;
    }
  }

  async function calculateLapComparison(
    baseline: LapSegment,
    comparison: LapSegment
  ): Promise<LapComparison> {
    // Check if both laps have GPS data for spatial comparison
    const hasBaselineGPS = baseline.records.some(r => isValidGPSCoordinate(r.position_lat, r.position_long));
    const hasComparisonGPS = comparison.records.some(r => isValidGPSCoordinate(r.position_lat, r.position_long));

    let timeDifferences: TimeDifference[] = [];

    if (hasBaselineGPS && hasComparisonGPS) {
      // Use spatial comparison algorithm
      timeDifferences = await calculateSpatialComparison(baseline, comparison);
    } else {
      // Fall back to time-based comparison
      timeDifferences = await calculateTimeBasedComparison(baseline, comparison);
    }

    const finalTimeDifference = comparison.duration - baseline.duration;
    const averageGap = timeDifferences.length > 0 
      ? timeDifferences.reduce((sum, td) => sum + td.difference, 0) / timeDifferences.length 
      : finalTimeDifference;
    const maxGap = timeDifferences.length > 0 
      ? Math.max(...timeDifferences.map(td => td.difference)) 
      : finalTimeDifference;
    const minGap = timeDifferences.length > 0 
      ? Math.min(...timeDifferences.map(td => td.difference)) 
      : finalTimeDifference;

    // Find crossover points (where comparison overtakes baseline)
    const crossoverPoints: number[] = [];
    for (let i = 1; i < timeDifferences.length; i++) {
      const prev = timeDifferences[i - 1];
      const curr = timeDifferences[i];
      
      if ((prev.difference > 0 && curr.difference <= 0) || 
          (prev.difference <= 0 && curr.difference > 0)) {
        crossoverPoints.push(curr.timestamp);
      }
    }

    return {
      id: `${baseline.id}-vs-${comparison.id}`,
      baselineLap: baseline,
      comparisonLap: comparison,
      timeDifferences,
      finalTimeDifference,
      averageGap,
      maxGap,
      minGap,
      crossoverPoints,
    };
  }

  /**
   * Calculate spatial comparison using pathUtils functions
   */
  async function calculateSpatialComparison(
    baseline: LapSegment,
    comparison: LapSegment
  ): Promise<TimeDifference[]> {
    const timeDifferences: TimeDifference[] = [];
    const searchRadius = 10; // ±10 meters as specified
    const searchRadiusDegrees = 0.0001; // ~10 meters in GPS degrees

    // Convert GPS records to paths with index mapping for reliable record lookup
    const baselineData = convertGPSToPathWithIndices(baseline.records);
    const comparisonData = convertGPSToPathWithIndices(comparison.records);

    if (baselineData.path.length === 0 || comparisonData.path.length === 0) {
      // Fall back to time-based comparison if no GPS data
      return await calculateTimeBasedComparison(baseline, comparison);
    }

    // Use the enhanced multiple path matching algorithm
    const pathMatches = findMultiplePathMatches(
      baselineData.path,
      comparisonData.path,
      searchRadiusDegrees,
      100 // Target 100 sample points
    );

    for (const match of pathMatches) {
      // Use the indices to directly access the original records
      const baselineRecordIndex = baselineData.indices[match.baselineIndex];
      const comparisonRecordIndex = comparisonData.indices[match.comparisonIndex];
      
      const baselineRecord = baseline.records[baselineRecordIndex];
      const comparisonRecord = comparison.records[comparisonRecordIndex];

      if (baselineRecord && comparisonRecord) {
        // Calculate actual distance in meters using Haversine
        const distanceMeters = calculateHaversineDistance(
          match.comparisonPoint.y,
          match.comparisonPoint.x,
          match.baselinePoint.y,
          match.baselinePoint.x
        );

        // Only include matches within our search radius
        if (distanceMeters <= searchRadius) {
          // Calculate time from start of each lap
          const comparisonTimeFromStart = (comparisonRecord.elapsed_time || comparisonRecord.timer_time || 0) - 
                                         (comparison.records[0]?.elapsed_time || comparison.records[0]?.timer_time || 0);
          const baselineTimeFromStart = (baselineRecord.elapsed_time || baselineRecord.timer_time || 0) - 
                                       (baseline.records[0]?.elapsed_time || baseline.records[0]?.timer_time || 0);
          
          // Time difference: positive means comparison is behind baseline at this position
          const timeDiff = comparisonTimeFromStart - baselineTimeFromStart;

          timeDifferences.push({
            timestamp: comparisonTimeFromStart,
            elapsedTime: comparisonTimeFromStart,
            difference: timeDiff,
            percentage: match.progressionPercentage,
            baselineRecordIndex: baselineRecordIndex,
            comparisonRecordIndex: comparisonRecordIndex,
            spatialDistance: distanceMeters,
            baselineDistance: baselineRecord.distance,
            comparisonDistance: comparisonRecord.distance,
            matchQuality: distanceMeters <= 5 ? 'exact' : 
                         distanceMeters <= 10 ? 'approximate' : 
                         distanceMeters <= 20 ? 'distant' : 'interpolated'
          });
        }
      }
    }

    // If we don't have enough matches, fall back to time-based comparison
    if (timeDifferences.length < 20) {
      console.log('Spatial matching yielded insufficient results, falling back to time-based comparison');
      return await calculateTimeBasedComparison(baseline, comparison);
    }

    // Sort by elapsed time and return results
    timeDifferences.sort((a, b) => a.elapsedTime - b.elapsedTime);
    return timeDifferences;
  }


  /**
   * Fallback time-based comparison for laps without GPS data
   */
  async function calculateTimeBasedComparison(
    baseline: LapSegment,
    comparison: LapSegment
  ): Promise<TimeDifference[]> {
    const timeDifferences: TimeDifference[] = [];
    const sampleCount = 100;

    for (let i = 0; i <= sampleCount; i++) {
      const percentage = i / sampleCount;
      
      const baselineTime = baseline.duration * percentage;
      const comparisonTime = comparison.duration * percentage;
      
      const difference = comparisonTime - baselineTime;
      
      timeDifferences.push({
        timestamp: baselineTime,
        elapsedTime: baselineTime,
        difference,
        percentage,
        matchQuality: 'interpolated'
      });
    }

    return timeDifferences;
  }

  function getComparisonAnalysis(): ComparisonAnalysis | null {
    if (!canAnalyze.value) return null;

    return {
      baseline: selection.value.baseline!,
      comparisons: comparisons.value,
      selectedStreams: enabledStreams.value,
      createdAt: new Date(),
    };
  }

  return {
    // State
    selection,
    dataStreamSettings,
    comparisons,
    isCalculating,
    
    // Getters
    hasBaseline,
    hasComparisons,
    canAnalyze,
    enabledStreams,
    selectedLapIds,
    
    // Actions
    setBaseline,
    addComparison,
    removeComparison,
    toggleLapSelection,
    toggleDataStream,
    clearSelection,
    calculateComparisons,
    getComparisonAnalysis,
  };
});
