import { divIcon } from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { Marker, Popup } from 'react-leaflet'
import { MapFrame } from './MapFrame'
import type { NetworkNode } from '../../models/network'
import { groupNodes, nodeStatusLabels, nodeTypeIcons, nodeTypeLabels } from '../../services/networkData'
import { Icon } from '../Icon'

interface NetworkMapProps {
  nodes: NetworkNode[]
  onEdit(node: NetworkNode): void
}

function NodeMarkers({ nodes, onEdit }: NetworkMapProps) {
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
    <MapFrame label="Registered network nodes map" points={props.nodes.map(node => [node.latitude, node.longitude])} legend={<>
        <span><Icon name="server" size={16} /> GPON OLT</span>
        <span><Icon name="router" size={16} /> Router</span>
        <span><Icon name="network" size={16} /> Switch</span>
        <span><Icon name="radio" size={16} /> Wireless base station</span>
    </>}>
      <NodeMarkers {...props} />
    </MapFrame>
  )
}
