export type Point = { x: number; y: number };
export type PathPoint = Point & { dist: number }; // distance from start of path

function distSq(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function distance(a: Point, b: Point): number {
  return Math.sqrt(distSq(a, b));
}

function closestPointOnSegment(A: PathPoint, B: PathPoint, P: PathPoint): PathPoint {
  const ABx = B.x - A.x;
  const ABy = B.y - A.y;
  const APx = P.x - A.x;
  const APy = P.y - A.y;

  const ab2 = ABx * ABx + ABy * ABy;
  const ap_ab = APx * ABx + APy * ABy;
  const t = clamp(ap_ab / ab2, 0, 1);

  return {
    x: A.x + ABx * t,
    y: A.y + ABy * t,
    dist: A.dist + t * (B.dist - A.dist), // interpolate lap distance
  };
}

function accumulatePath(path: Point[]): PathPoint[] {
  let dist = 0;
  const result: PathPoint[] = [{ ...path[0], dist: 0 }];
  for (let i = 1; i < path.length; i++) {
    const d = distance(path[i], path[i - 1]);
    dist += d;
    result.push({ ...path[i], dist });
  }
  return result;
}

function closestPointsBetweenSegments(
  A: PathPoint,
  B: PathPoint,
  C: PathPoint,
  D: PathPoint,
  weightProgression = 10
): { pointA: PathPoint; pointB: PathPoint; score: number } {
  const c1 = closestPointOnSegment(C, D, A);
  const s1 = distSq(A, c1) + weightProgression * Math.pow(A.dist - c1.dist, 2);

  const c2 = closestPointOnSegment(C, D, B);
  const s2 = distSq(B, c2) + weightProgression * Math.pow(B.dist - c2.dist, 2);

  const c3 = closestPointOnSegment(A, B, C);
  const s3 = distSq(C, c3) + weightProgression * Math.pow(c3.dist - C.dist, 2);

  const c4 = closestPointOnSegment(A, B, D);
  const s4 = distSq(D, c4) + weightProgression * Math.pow(c4.dist - D.dist, 2);

  const candidates = [
    { pointA: A, pointB: c1, score: s1 },
    { pointA: B, pointB: c2, score: s2 },
    { pointA: c3, pointB: C, score: s3 },
    { pointA: c4, pointB: D, score: s4 },
  ];

  return candidates.reduce((min, curr) => (curr.score < min.score ? curr : min));
}

export function findClosestPointBetweenPaths(pathA: Point[], pathB: Point[]): {
  pointA: Point;
  pointB: Point;
  spatialDistance: number;
  lapDistanceDifference: number;
} {
  const aPoints = accumulatePath(pathA);
  const bPoints = accumulatePath(pathB);

  let i = 0;
  let j = 0;

  let bestScore = Infinity;
  let closestA: PathPoint = aPoints[0];
  let closestB: PathPoint = bPoints[0];

  while (i < aPoints.length - 1 && j < bPoints.length - 1) {
    const A1 = aPoints[i], A2 = aPoints[i + 1];
    const B1 = bPoints[j], B2 = bPoints[j + 1];

    const { pointA, pointB, score } = closestPointsBetweenSegments(A1, A2, B1, B2);

    if (score < bestScore) {
      bestScore = score;
      closestA = pointA;
      closestB = pointB;
    }

    const nextA = A2.dist < B2.dist;
    if (nextA) i++; else j++;
  }

  return {
    pointA: closestA,
    pointB: closestB,
    spatialDistance: distance(closestA, closestB),
    lapDistanceDifference: Math.abs(closestA.dist - closestB.dist),
  };
}

// Additional utility functions for GPS-based path matching
export function convertGPSToPath(records: Array<{ position_lat?: number; position_long?: number }>): Point[] {
  return records
    .filter(record => record.position_lat !== undefined && record.position_long !== undefined)
    .map(record => ({
      x: record.position_long!,
      y: record.position_lat!
    }));
}

// Enhanced version that returns both path and index mapping
export function convertGPSToPathWithIndices(records: Array<{ position_lat?: number; position_long?: number }>): {
  path: Point[];
  indices: number[];
} {
  const path: Point[] = [];
  const indices: number[] = [];
  
  records.forEach((record, index) => {
    if (record.position_lat !== undefined && record.position_long !== undefined) {
      path.push({
        x: record.position_long!,
        y: record.position_lat!
      });
      indices.push(index);
    }
  });
  
  return { path, indices };
}

// Enhanced GPS path matching with distance accumulation
export function findBestGPSPathMatch(
  baselinePath: Point[],
  comparisonPath: Point[],
  searchRadiusDegrees: number = 0.0001 // ~10 meters at equator
): {
  baselinePoint: Point;
  comparisonPoint: Point;
  distance: number;
  baselineIndex: number;
  comparisonIndex: number;
  lapDistanceDifference: number;
} | null {
  if (baselinePath.length === 0 || comparisonPath.length === 0) {
    return null;
  }

  // Use the enhanced path matching algorithm
  const result = findClosestPointBetweenPaths(baselinePath, comparisonPath);
  
  // Find the closest actual points in the original paths
  let bestBaselineIndex = 0;
  let bestComparisonIndex = 0;
  let minBaselineDistance = Infinity;
  let minComparisonDistance = Infinity;

  // Find closest baseline point
  for (let i = 0; i < baselinePath.length; i++) {
    const dist = distance(baselinePath[i], result.pointA);
    if (dist < minBaselineDistance) {
      minBaselineDistance = dist;
      bestBaselineIndex = i;
    }
  }

  // Find closest comparison point
  for (let i = 0; i < comparisonPath.length; i++) {
    const dist = distance(comparisonPath[i], result.pointB);
    if (dist < minComparisonDistance) {
      minComparisonDistance = dist;
      bestComparisonIndex = i;
    }
  }

  // Check if within search radius
  if (result.spatialDistance <= searchRadiusDegrees) {
    return {
      baselinePoint: result.pointA,
      comparisonPoint: result.pointB,
      distance: result.spatialDistance,
      baselineIndex: bestBaselineIndex,
      comparisonIndex: bestComparisonIndex,
      lapDistanceDifference: result.lapDistanceDifference
    };
  }

  return null;
}

// Find multiple matching points along the paths for comprehensive analysis
export function findMultiplePathMatches(
  baselinePath: Point[],
  comparisonPath: Point[],
  searchRadiusDegrees: number = 0.0001,
  sampleCount: number = 100
): Array<{
  baselinePoint: Point;
  comparisonPoint: Point;
  distance: number;
  baselineIndex: number;
  comparisonIndex: number;
  lapDistanceDifference: number;
  progressionPercentage: number;
}> {
  if (baselinePath.length === 0 || comparisonPath.length === 0) {
    return [];
  }

  const matches: Array<{
    baselinePoint: Point;
    comparisonPoint: Point;
    distance: number;
    baselineIndex: number;
    comparisonIndex: number;
    lapDistanceDifference: number;
    progressionPercentage: number;
  }> = [];

  const baselinePathPoints = accumulatePath(baselinePath);
  const comparisonPathPoints = accumulatePath(comparisonPath);
  
  const maxBaselineDist = baselinePathPoints[baselinePathPoints.length - 1].dist;
  const maxComparisonDist = comparisonPathPoints[comparisonPathPoints.length - 1].dist;

  // Sample points along the comparison path
  for (let i = 0; i < sampleCount; i++) {
    const progressionPercentage = i / (sampleCount - 1);
    const targetDist = maxComparisonDist * progressionPercentage;
    
    // Find the point at this distance along the comparison path
    let comparisonPoint: PathPoint | null = null;
    let comparisonIndex = 0;
    
    for (let j = 0; j < comparisonPathPoints.length - 1; j++) {
      const p1 = comparisonPathPoints[j];
      const p2 = comparisonPathPoints[j + 1];
      
      if (targetDist >= p1.dist && targetDist <= p2.dist) {
        const t = (targetDist - p1.dist) / (p2.dist - p1.dist);
        comparisonPoint = {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          dist: targetDist
        };
        comparisonIndex = j;
        break;
      }
    }
    
    if (!comparisonPoint) continue;

    // Find the best matching point in the baseline path
    let bestMatch: {
      point: PathPoint;
      index: number;
      distance: number;
    } | null = null;
    let minScore = Infinity;

    for (let j = 0; j < baselinePathPoints.length - 1; j++) {
      const p1 = baselinePathPoints[j];
      const p2 = baselinePathPoints[j + 1];
      
      const closestPoint = closestPointOnSegment(p1, p2, comparisonPoint);
      const spatialDist = distance(closestPoint, comparisonPoint);
      const progressionDiff = Math.abs(closestPoint.dist - comparisonPoint.dist);
      
      // Score combines spatial distance and progression difference
      const score = spatialDist + 0.1 * progressionDiff;
      
      if (score < minScore && spatialDist <= searchRadiusDegrees) {
        minScore = score;
        bestMatch = {
          point: closestPoint,
          index: j,
          distance: spatialDist
        };
      }
    }

    if (bestMatch) {
      matches.push({
        baselinePoint: bestMatch.point,
        comparisonPoint: comparisonPoint,
        distance: bestMatch.distance,
        baselineIndex: bestMatch.index,
        comparisonIndex: comparisonIndex,
        lapDistanceDifference: Math.abs(bestMatch.point.dist - comparisonPoint.dist),
        progressionPercentage: progressionPercentage
      });
    }
  }

  return matches;
}
