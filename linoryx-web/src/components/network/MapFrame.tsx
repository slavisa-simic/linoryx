import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { latLngBounds } from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { mapAttribution } from '../../services/locationData'

function MapBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 0) map.fitBounds(latLngBounds(points), { padding: [36, 36], maxZoom: 16, animate: false })
  }, [map, points])
  return null
}

export function MapFrame({ label, points, children, legend }: {
  label: string
  points: [number, number][]
  children: ReactNode
  legend?: ReactNode
}) {
  return <section className="dashboard-panel network-map-panel" aria-label={label}>
    <MapContainer center={[44.8, 20.45]} zoom={6} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution={mapAttribution} />
      <MapBounds points={points} />
      {children}
    </MapContainer>
    {legend && <div className="network-map-legend">{legend}</div>}
  </section>
}
