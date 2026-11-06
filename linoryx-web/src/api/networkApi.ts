import type { AuthSession } from '../models/auth'
import type { NetworkNode, NetworkNodePage, NetworkNodeRequest } from '../models/network'
import { apiRequest } from './apiRequest'

export async function listNetworkNodes(session: AuthSession): Promise<NetworkNode[]> {
  let nodes: NetworkNode[] = []
  let pageNumber = 0
  let totalPages = 1
  while (pageNumber < totalPages) {
    const page: NetworkNodePage = await apiRequest(
      '/network-nodes?size=200&sort=id,asc&page=' + pageNumber, session.token
    )
    nodes = nodes.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }
  return nodes
}

export async function saveNetworkNode(
  session: AuthSession, id: number | null, request: NetworkNodeRequest
): Promise<NetworkNode> {
  if (id !== null) {
    return apiRequest('/network-nodes/' + id, session.token, 'PUT', request)
  }
  return apiRequest('/network-nodes', session.token, 'POST', request)
}

export async function deleteNetworkNode(session: AuthSession, id: number): Promise<void> {
  await apiRequest('/network-nodes/' + id, session.token, 'DELETE')
}
