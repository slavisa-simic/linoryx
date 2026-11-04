import type { AuthSession } from '../models/auth'
import type { LocationSuggestion } from '../models/locations'
import { apiRequest } from './apiRequest'

export async function searchLocations(session: AuthSession, query: string): Promise<LocationSuggestion[]> {
  return apiRequest('/locations/search?query=' + encodeURIComponent(query), session.token)
}
