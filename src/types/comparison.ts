import type { LapSegment, DataStream } from './fitData';

export interface ComparisonSelection {
  baseline: LapSegment | null;
  comparisons: LapSegment[];
}

export interface TimeDifference {
  timestamp: number;
  elapsedTime: number;
  difference: number; // seconds ahead (+) or behind (-)
  percentage: number; // percentage through the lap
  // Spatial comparison data
  baselineRecordIndex?: number; // index in baseline.records[]
  comparisonRecordIndex?: number; // index in comparison.records[]
  spatialDistance?: number; // meters between matched points
  baselineDistance?: number; // cumulative distance on baseline
  comparisonDistance?: number; // cumulative distance on comparison
  matchQuality?: 'exact' | 'interpolated' | 'approximate' | 'distant'; // quality of spatial match
}

export interface LapComparison {
  id: string;
  baselineLap: LapSegment;
  comparisonLap: LapSegment;
  timeDifferences: TimeDifference[];
  finalTimeDifference: number;
  averageGap: number;
  maxGap: number;
  minGap: number;
  crossoverPoints: number[]; // timestamps where comparison overtakes baseline
}

export interface ComparisonAnalysis {
  baseline: LapSegment;
  comparisons: LapComparison[];
  selectedStreams: DataStream[];
  createdAt: Date;
}

export interface SplitAnalysis {
  distance: number; // meters
  baselineTime: number;
  comparisonTimes: { lapId: string; time: number; difference: number }[];
}

export interface ComparisonStats {
  totalComparisons: number;
  averageTimeDifference: number;
  bestLap: LapSegment;
  worstLap: LapSegment;
  mostConsistentLap: LapSegment;
  splits: SplitAnalysis[];
}
