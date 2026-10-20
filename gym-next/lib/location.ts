export const SEARCH_RADII_KM = [1, 5, 10] as const;

export type Coordinates = { latitude: number; longitude: number };

export function parseCoordinates(latitude?: string | number | null, longitude?: string | number | null): Coordinates | null {
  const lat = typeof latitude === "number" ? latitude : Number(latitude);
  const lng = typeof longitude === "number" ? longitude : Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function normalizeRadiusKm(value?: string | number | null) {
  const radius = Number(value);
  return SEARCH_RADII_KM.includes(radius as (typeof SEARCH_RADII_KM)[number]) ? radius : 10;
}

export function distanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinCoachServiceRadius(distance: number | undefined, searchRadiusKm: number, serviceRadiusKm?: number) {
  if (distance == null || !Number.isFinite(distance)) return false;
  const coachRadius = serviceRadiusKm == null || !Number.isFinite(serviceRadiusKm) ? searchRadiusKm : serviceRadiusKm;
  return distance <= Math.min(searchRadiusKm, coachRadius);
}
