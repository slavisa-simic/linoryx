import { useState } from 'react'
import type { NetworkNode } from '../../models/network'
import { nodeStatusLabels, nodeTypeIcons, nodeTypeLabels } from '../../services/networkData'
import { Icon } from '../Icon'
import { TablePagination, pageSize } from '../workspace/TablePagination'

interface NodesTableProps {
  nodes: NetworkNode[]
  busy: boolean
  onEdit(node: NetworkNode): void
  onDelete(node: NetworkNode): void
}

export function NodesTable({ nodes, busy, onEdit, onDelete }: NodesTableProps) {
  const [page, setPage] = useState(0)
  const pages = Math.ceil(nodes.length / pageSize)
  const currentPage = Math.min(page, Math.max(0, pages - 1))
  const visible = nodes.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  return (
    <section className="dashboard-panel table-panel" aria-labelledby="nodes-title">
      <header className="panel-heading"><h2 id="nodes-title">Network nodes</h2></header>
      <div className="incident-table-scroll">
        <table className="incident-table network-table">
          <caption className="sr-only">Registered network nodes and assigned service counts</caption>
          <thead><tr><th scope="col">Code</th><th scope="col">Name</th><th scope="col">Type</th>
            <th scope="col">Location</th><th scope="col">Status</th><th scope="col">Services</th><th scope="col">Actions</th></tr></thead>
          <tbody>{visible.map((node) => (
            <tr key={node.id}>
              <td>{node.code}</td><td><strong>{node.name}</strong></td>
              <td><span className="node-type"><Icon name={nodeTypeIcons[node.nodeType]} /><span>{nodeTypeLabels[node.nodeType]}</span></span></td>
              <td className="location-cell">{node.location}</td>
              <td><span className={'service-status service-status-' + node.status.toLowerCase()}>{nodeStatusLabels[node.status]}</span></td>
              <td>{node.customerServiceCount}</td>
              <td><div className="service-row-actions">
                <button className="icon-button" type="button" disabled={busy} aria-label={'Edit ' + node.code}
                  onClick={() => onEdit(node)}><Icon name="edit" size={17} /></button>
                <button className="icon-button danger-action" type="button" disabled={busy}
                  aria-label={'Delete ' + node.code} onClick={() => onDelete(node)}><Icon name="delete" size={17} /></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {nodes.length === 0 && <div className="table-empty"><Icon name="network" size={28} />
        <strong>No matching nodes</strong><p>Add a node or adjust the filters.</p></div>}
      <TablePagination page={currentPage} total={nodes.length} label="nodes" onPageChange={setPage} />
    </section>
  )
}
