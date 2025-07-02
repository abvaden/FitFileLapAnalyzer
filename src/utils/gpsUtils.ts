/**
 * GPS utility functions for spatial calculations
 */

/**
 * Calculate the Haversine distance between two GPS coordinates
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate the simple Euclidean distance between two GPS coordinates
 * This is faster but less accurate than Haversine for short distances
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters (approximate)
 */
export function calculateEuclideanDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  // For small distances, we can use a simpler calculation
  const x = Δλ * Math.cos((φ1 + φ2) / 2);
  const y = Δφ;
  
  return Math.sqrt(x * x + y * y) * R;
}

/**
 * Check if a GPS coordinate is valid
 * @param lat Latitude in degrees
 * @param lon Longitude in degrees
 * @returns True if coordinates are valid
 */
export function isValidGPSCoordinate(lat?: number, lon?: number): boolean {
  return (
    lat !== undefined &&
    lon !== undefined &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    lat !== 0 &&
    lon !== 0
  );
}

/**
 * Find the closest point in a set of GPS coordinates
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @param points Array of points with lat/lon properties
 * @param maxDistance Maximum search distance in meters
 * @returns Object with closest point info or null if none found
 */
export function findClosestGPSPoint<T extends { position_lat?: number; position_long?: number }>(
  targetLat: number,
  targetLon: number,
  points: T[],
  maxDistance: number = Infinity
): { point: T; index: number; distance: number } | null {
  let closestPoint = null;
  let minDistance = Infinity;
  let closestIndex = -1;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    
    if (!isValidGPSCoordinate(point.position_lat, point.position_long)) {
      continue;
    }

    const distance = calculateHaversineDistance(
      targetLat,
      targetLon,
      point.position_lat!,
      point.position_long!
    );

    if (distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
      closestIndex = i;
    }
  }

  return closestPoint
    ? { point: closestPoint, index: closestIndex, distance: minDistance }
    : null;
}

/**
 * Calculate the bearing between two GPS points
 * @param lat1 Start latitude in degrees
 * @param lon1 Start longitude in degrees
 * @param lat2 End latitude in degrees
 * @param lon2 End longitude in degrees
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees and normalize
}
