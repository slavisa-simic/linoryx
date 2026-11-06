import { useEffect } from 'react'
import { divIcon } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LocationData } from '../../models/locations'
import { Icon } from '../Icon'
import { mapAttribution } from '../../services/locationData'

const pin = divIcon({
  className: 'location-marker',
  html: renderToStaticMarkup(<Icon name="map-pin" size={25} />),
  iconSize: [36, 36], iconAnchor: [18, 36]
})

interface LocationMapProps {
  location: LocationData | null
  editable: boolean
  onMove(latitude: number, longitude: number): void
}

function MapPosition({ location, editable, onMove }: LocationMapProps) {
  const map = useMap()
  const latitude = location?.latitude
  const longitude = location?.longitude
  useEffect(() => {
    map.invalidateSize()
    if (latitude !== undefined && longitude !== undefined) {
      map.setView([latitude, longitude], 16, { animate: false })
    }
  }, [map, latitude, longitude])
  useMapEvents({
    click(event) {
      if (editable) onMove(event.latlng.lat, event.latlng.lng)
    }
  })
  if (!location) return null
  return <Marker position={[location.latitude, location.longitude]} icon={pin}
    title="Selected location. Drag to adjust the position." draggable={editable}
    eventHandlers={{
      dragend(event) {
        const position = event.target.getLatLng()
        onMove(position.lat, position.lng)
      }
    }} />
}

export function LocationMap(props: LocationMapProps) {
  return (
    <div className="location-map" aria-label="Location map">
      <MapContainer center={[44.8, 20.45]} zoom={6} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={mapAttribution} />
        <MapPosition {...props} />
      </MapContainer>
    </div>
  )
}
