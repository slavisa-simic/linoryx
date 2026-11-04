import type { CustomerService } from '../../models/customerServices'
import { serviceStatusLabels, serviceTypeLabels } from '../../services/customerServiceData'
import { formatDate } from '../../services/dashboardData'

interface ServicesTableProps {
  services: CustomerService[]
  busy?: boolean
  onEdit?(service: CustomerService): void
  onTerminate?(service: CustomerService): void
}

export function ServicesTable({ services, busy = false, onEdit, onTerminate }: ServicesTableProps) {
  return (
    <div>
      <div className="incident-table-scroll">
        <table className="incident-table services-table">
          <caption className="sr-only">Customer internet services</caption>
          <thead><tr><th scope="col">Service</th><th scope="col">Status</th><th scope="col">Location</th>
            <th scope="col">Network node</th><th scope="col">Created</th>
            {onEdit && <th scope="col">Actions</th>}</tr></thead>
          <tbody>{services.map((service) => (
            <tr key={service.id}>
              <td><strong>{serviceTypeLabels[service.serviceType]}</strong><div className="incident-muted">#{service.id}</div></td>
              <td><span className={'service-status service-status-' + service.status.toLowerCase()}>{serviceStatusLabels[service.status]}</span></td>
              <td className="location-cell">{service.serviceLocation.formattedAddress}</td>
              <td>{service.networkNodeCode}<div className="incident-muted">{service.networkNodeName}</div></td>
              <td className="table-date">{formatDate(service.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              {onEdit && <td><div className="service-row-actions">
                <button className="user-save-button" type="button" disabled={busy} onClick={() => onEdit(service)}>Edit service</button>
                {onTerminate && service.status !== 'TERMINATED' && <button className="user-access-button danger-action"
                  type="button" disabled={busy} onClick={() => onTerminate(service)}>Terminate</button>}
              </div></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {services.length === 0 && <div className="table-empty"><strong>No services assigned</strong>
        <p>Account access and internet service status are managed separately.</p></div>}
      {services.length > 0 && <p className="location-attribution">Addresses by <a href="https://www.geoapify.com/">Geoapify</a>
        {' · '}<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></p>}
    </div>
  )
}
