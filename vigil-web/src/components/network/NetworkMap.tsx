import { useEffect } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { NetworkNode } from '../../models/network'
import { groupNodes, nodeStatusLabels, nodeTypeIcons, nodeTypeLabels } from '../../services/networkData'
import { Icon } from '../Icon'

interface NetworkMapProps {
  nodes: NetworkNode[]
  onEdit(node: NetworkNode): void
}

function NodeMarkers({ nodes, onEdit }: NetworkMapProps) {
  const map = useMap()
  useEffect(() => {
    if (nodes.length > 0) {
      const bounds = latLngBounds(nodes.map((node) => [node.latitude, node.longitude]))
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16, animate: false })
    }
  }, [map, nodes])

  return groupNodes(nodes).map(function (group) {
    const first = group[0]
    let iconName = nodeTypeIcons[first.nodeType]
    if (group.length > 1) iconName = 'layers'
    // Keep marker creation here so a custom SVG can replace the icon later.
    const icon = divIcon({
      className: 'network-marker network-marker-' + first.nodeType.toLowerCase(),
      html: renderToStaticMarkup(<><Icon name={iconName} size={21} />
        {group.length > 1 && <span>{group.length}</span>}</>),
      iconSize: [38, 38], iconAnchor: [19, 19]
    })
    return (
      <Marker key={first.latitude + ',' + first.longitude}
        position={[first.latitude, first.longitude]} icon={icon}
        title={group.map((node) => node.code + ': ' + node.name).join('; ')}>
        <Popup minWidth={230} maxHeight={300}>
          {group.map((node) => (
            <div className="network-popup" key={node.id}>
              <strong>{node.name}</strong><span>{node.code}</span>
              <p>{nodeTypeLabels[node.nodeType]} · {nodeStatusLabels[node.status]}</p>
              <p>{node.location}</p><p>{node.customerServiceCount} customer services</p>
              <button type="button" className="user-save-button" onClick={() => onEdit(node)}>Edit node</button>
            </div>
          ))}
        </Popup>
      </Marker>
    )
  })
}

export function NetworkMap(props: NetworkMapProps) {
  return (
    <section className="dashboard-panel network-map-panel" aria-label="Registered network nodes map">
      <MapContainer center={[44.8, 20.45]} zoom={6} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <NodeMarkers {...props} />
      </MapContainer>
      <div className="network-map-legend">
        <span><Icon name="server" size={16} /> GPON OLT</span>
        <span><Icon name="router" size={16} /> Router</span>
        <span><Icon name="network" size={16} /> Switch</span>
        <span><Icon name="radio" size={16} /> Wireless base station</span>
        <span>Shared positions open a list of nodes.</span>
      </div>
    </section>
  )
}
