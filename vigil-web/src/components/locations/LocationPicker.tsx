import { useEffect, useId, useRef, useState } from 'react'
import { searchLocations } from '../../api/locationsApi'
import { useUser } from '../../context/UserContext'
import type { LocationData, LocationSelection, LocationSuggestion } from '../../models/locations'
import { FormMessage } from '../auth/FormMessage'
import { RefreshButton } from '../workspace/RefreshButton'
import { LocationMap } from './LocationMap'

interface LocationPickerProps {
  value: LocationSelection | null
  initialLocation?: LocationData
  disabled: boolean
  onChange(value: LocationSelection | null): void
}

interface CoordinateFieldsProps {
  id: string
  location: LocationData | null
  disabled: boolean
  onApply(latitude: number, longitude: number): void
  onError(message: string): void
}

function CoordinateFields({ id, location, disabled, onApply, onError }: CoordinateFieldsProps) {
  const [latitude, setLatitude] = useState(location ? String(location.latitude) : '')
  const [longitude, setLongitude] = useState(location ? String(location.longitude) : '')
  function apply() {
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (latitude.trim() === '' || longitude.trim() === '' || !Number.isFinite(lat)
      || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      onError('Enter a latitude from -90 to 90 and longitude from -180 to 180.')
      return
    }
    onApply(lat, lon)
  }
  return <>
    <div className="incident-form-row">
      <label htmlFor={id + '-latitude'}>Latitude
        <input id={id + '-latitude'} className="field-input" type="number" step="any" min="-90" max="90"
          disabled={disabled} value={latitude} onChange={(event) => setLatitude(event.target.value)} />
      </label>
      <label htmlFor={id + '-longitude'}>Longitude
        <input id={id + '-longitude'} className="field-input" type="number" step="any" min="-180" max="180"
          disabled={disabled} value={longitude} onChange={(event) => setLongitude(event.target.value)} />
      </label>
    </div>
    <button className="dashboard-button button-neutral" type="button" disabled={disabled} onClick={apply}>Apply coordinates</button>
  </>
}

export function LocationPicker({ value, initialLocation, disabled, onChange }: LocationPickerProps) {
  const { session, onSessionExpired } = useUser()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialLocation?.formattedAddress ?? '')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [searchRequested, setSearchRequested] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [changed, setChanged] = useState(false)
  let location: LocationData | null = null
  if (value) location = value.location
  else if (!changed && initialLocation) location = initialLocation

  useEffect(() => {
    if (!searchRequested || query.trim().length < 3 || disabled) return
    let active = true
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const results = await searchLocations(session, query.trim())
        if (active) {
          setSuggestions(results)
          setSearched(true)
        }
      } catch (error) {
        if (active) {
          if (error instanceof Error) setError(error.message)
          else setError('Addresses could not be loaded. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [query, session, searchRequested, attempt, disabled])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  function select(suggestion: LocationSuggestion) {
    setQuery(suggestion.location.formattedAddress)
    setSuggestions([])
    setSearchRequested(false)
    setLoading(false)
    setSearched(false)
    setError('')
    onChange({ ...suggestion, positionConfirmed: false })
    input.current?.focus()
  }

  function move(latitude: number, longitude: number) {
    if (!value || disabled) return
    setError('')
    onChange({ ...value, location: { ...value.location, latitude, longitude }, positionConfirmed: false })
  }

  return (
    <div className="location-picker">
      <label className="field-label" htmlFor={id + '-address'}>Location</label>
      <input ref={input} id={id + '-address'} className="field-input" type="search"
        value={query} disabled={disabled} autoComplete="off" maxLength={300}
        placeholder="Search for an address…" aria-describedby={id + '-hint'}
        aria-controls={suggestions.length > 0 ? id + '-results' : undefined}
        onChange={(event) => {
          setQuery(event.target.value)
          setChanged(true)
          setSearchRequested(true)
          setSuggestions([])
          setSearched(false)
          setLoading(false)
          setError('')
          onChange(null)
        }} />
      <p className="field-hint" id={id + '-hint'}>
        Select a suggestion, then check the marker. You can drag it or click the map to adjust it.
      </p>
      {loading && <p className="field-hint" role="status">Searching addresses…</p>}
      {suggestions.length > 0 && (
        <ul className="location-suggestions" id={id + '-results'} aria-label="Matching addresses">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <button type="button" disabled={disabled} onClick={() => select(suggestion)}>
                {suggestion.location.formattedAddress}
                <span>{suggestion.resultType}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && !loading && suggestions.length === 0 && searchRequested && !error && (
        <p className="field-hint" role="status">No matching addresses. Try a more specific street or city.</p>
      )}
      {error && error !== 'SESSION_EXPIRED' && (
        <div className="location-error">
          <FormMessage message={error} />
          {searchRequested && <RefreshButton label="Try again"
            disabled={disabled || loading} onClick={() => setAttempt(attempt + 1)} />}
        </div>
      )}
      <LocationMap location={location} editable={Boolean(value) && !disabled} onMove={move} />
      {value && (
        <>
          <p className="field-hint">
            Result precision: {value.resultType}. Address results can be approximate; check the precise position.
          </p>
          <label className="location-confirmation">
            <input type="checkbox" checked={value.positionConfirmed} disabled={disabled}
              onChange={(event) => onChange({ ...value, positionConfirmed: event.target.checked })} />
            I confirm that the marker shows the precise location.
          </label>
        </>
      )}
      {!value && initialLocation && !changed && (
        <p className="field-hint">The saved location is kept. Select a suggestion to change its address or marker.</p>
      )}
      <details className="location-advanced">
        <summary>Advanced coordinates</summary>
        <CoordinateFields key={location?.latitude + ',' + location?.longitude} id={id} location={location}
          disabled={disabled || !value} onApply={move} onError={setError} />
      </details>
      <p className="location-attribution">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a>
        {' · '}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
    </div>
  )
}
