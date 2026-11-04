import type { LocationSelection, LocationRequest } from '../models/locations'

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
