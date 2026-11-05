export function coordinateError(latitude: string, longitude: string): string {
  const hasLatitude = latitude.trim() !== ''
  const hasLongitude = longitude.trim() !== ''
  if (hasLatitude !== hasLongitude) return 'Provide both latitude and longitude, or clear both.'
  if (!hasLatitude) return ''
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.'
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return 'Longitude must be between -180 and 180.'
  return ''
}

export function hasCoordinates(latitude: number | null, longitude: number | null): boolean {
  return latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}
