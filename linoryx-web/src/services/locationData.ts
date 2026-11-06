import type { LocationSelection, LocationRequest } from '../models/locations'

export const mapAttribution = 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function locationRequest(selection: LocationSelection | null): LocationRequest | null {
  if (!selection) {
    return null
  }
  return {
    placeId: selection.placeId,
    latitude: selection.location.latitude,
    longitude: selection.location.longitude,
    positionConfirmed: selection.positionConfirmed
  }
}
