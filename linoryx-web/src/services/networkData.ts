import type { NetworkNode } from '../models/network'
import type { IconName } from '../components/Icon'

export const nodeTypeLabels = {
  GPON_OLT: 'GPON OLT',
  ROUTER: 'Router',
  SWITCH: 'Switch',
  WIRELESS_BASE_STATION: 'Wireless base station'
}

export const nodeStatusLabels = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', MAINTENANCE: 'Maintenance'
}

export const nodeTypeIcons: Record<NetworkNode['nodeType'], IconName> = {
  GPON_OLT: 'server', ROUTER: 'router', SWITCH: 'network', WIRELESS_BASE_STATION: 'radio'
}

export function groupNodes(nodes: NetworkNode[]): NetworkNode[][] {
  const groups: NetworkNode[][] = []
  for (const node of nodes) {
    const group = groups.find(function (items) {
      return items[0].latitude === node.latitude && items[0].longitude === node.longitude
    })
    if (group) {
      group.push(node)
    } else {
      groups.push([node])
    }
  }
  return groups
}
