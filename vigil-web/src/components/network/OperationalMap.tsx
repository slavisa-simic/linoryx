import { divIcon } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { Marker, Popup } from 'react-leaflet'
import type { ReactNode } from 'react'
import { MapFrame } from './MapFrame'
import { Icon } from '../Icon'

export interface OperationalMarker {
  id: number
  latitude: number
  longitude: number
  title: string
  content: ReactNode
}

export function OperationalMap({ markers, label, legend }: { markers: OperationalMarker[]; label: string; legend: string }) {
  const groups: OperationalMarker[][] = []
  for (const marker of markers) {
    const group = groups.find(items => items[0].latitude === marker.latitude && items[0].longitude === marker.longitude)
    if (group) group.push(marker)
    else groups.push([marker])
  }
  const icon = divIcon({ className: 'network-marker', html: renderToStaticMarkup(<Icon name="map-pin" size={21} />),
    iconSize: [38, 38], iconAnchor: [19, 19] })
  return <MapFrame label={label} points={markers.map(marker => [marker.latitude, marker.longitude])} legend={<span>{legend}</span>}>
    {groups.map(group => <Marker key={group[0].id} position={[group[0].latitude, group[0].longitude]} icon={icon}
      title={group.map(marker => marker.title).join('; ')}>
      <Popup minWidth={250} maxHeight={300}>{group.map(marker => <div className="network-popup" key={marker.id}>{marker.content}</div>)}</Popup>
    </Marker>)}
  </MapFrame>
}
