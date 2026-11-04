export interface LocationData {
  formattedAddress: string
  city: string
  countryCode: string
  latitude: number
  longitude: number
}

export interface LocationSuggestion {
  location: LocationData
  placeId: string
  resultType: string
}

export interface LocationSelection extends LocationSuggestion {
  positionConfirmed: boolean
}

export interface LocationRequest {
  placeId: string
  latitude: number
  longitude: number
  positionConfirmed: boolean
}
