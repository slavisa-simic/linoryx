import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { listNetworkNodes } from '../../api/networkApi'
import { saveCustomerService } from '../../api/customerServicesApi'
import { useUser } from '../../context/UserContext'
import type { User } from '../../models/users'
import type { NetworkNode } from '../../models/network'
import type { LocationSelection } from '../../models/locations'
import type { CustomerService, ServiceStatus, ServiceType } from '../../models/customerServices'
import { userName } from '../../services/dashboardData'
import { locationRequest } from '../../services/locationData'
import { LocationPicker } from '../locations/LocationPicker'
import { FormMessage } from '../auth/FormMessage'
import { FormDialog } from '../workspace/FormDialog'

interface ServiceDialogProps {
  customer: User
  service: CustomerService | null
  onSaved(service: CustomerService): void
  onClose(): void
}

export function ServiceDialog({ customer, service, onSaved, onClose }: ServiceDialogProps) {
  const { session, onSessionExpired } = useUser()
  const [type, setType] = useState<ServiceType>(service?.serviceType ?? 'FIBER')
  const [status, setStatus] = useState<ServiceStatus>(service?.status ?? 'ACTIVE')
  const [nodeId, setNodeId] = useState(service ? String(service.networkNodeId) : '')
  const [location, setLocation] = useState<LocationSelection | null>(null)
  const [locationChanged, setLocationChanged] = useState(false)
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const result = await listNetworkNodes(session)
        if (active) setNodes(result)
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Network nodes could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, refresh])

  useEffect(() => {
    if (loadError === 'SESSION_EXPIRED') onSessionExpired()
  }, [loadError, onSessionExpired])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || loading || loadError) return
    if ((!service || locationChanged) && (!location || !location.positionConfirmed)) {
      setError('Select a service address and confirm the precise marker position.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await saveCustomerService(session, customer.id, service?.id ?? null, {
        serviceType: type, status, networkNodeId: Number(nodeId), location: locationRequest(location)
      })
      onSaved(saved)
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') onSessionExpired()
      else if (error instanceof Error) setError(error.message)
      else setError('The service could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDialog id="service-dialog" title={service ? 'Edit service' : 'Assign service'} busy={saving} onClose={onClose}>
      <form className="incident-form" onSubmit={submit} aria-busy={saving}>
        <label htmlFor="service-customer">Customer
          <input id="service-customer" className="field-input" value={userName(customer) + ' · ' + customer.email} readOnly />
        </label>
        <div className="incident-form-row">
          <label htmlFor="service-type">Service type
            <select id="service-type" className="field-input" value={type} disabled={saving}
              onChange={(event) => setType(event.target.value as ServiceType)}>
              <option value="FIBER">Fiber</option><option value="DSL">DSL</option><option value="WIRELESS">Wireless</option>
            </select>
          </label>
          <label htmlFor="service-status">Service status
            <select id="service-status" className="field-input" value={status} disabled={saving}
              onChange={(event) => setStatus(event.target.value as ServiceStatus)}>
              <option value="ACTIVE">Active</option><option value="PENDING_ACTIVATION">Pending activation</option>
              <option value="SUSPENDED">Suspended</option><option value="TERMINATED">Terminated</option>
            </select>
          </label>
        </div>
        <label htmlFor="service-node">Network node
          <select id="service-node" className="field-input" value={nodeId} required disabled={saving || loading || Boolean(loadError)}
            onChange={(event) => setNodeId(event.target.value)}>
            <option value="">Select a network node</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{node.code} · {node.name} · {node.status.toLowerCase()}</option>)}
          </select>
        </label>
        {loading && <p className="incident-muted" role="status">Loading network nodes…</p>}
        {!loading && !loadError && nodes.length === 0 && <p className="field-hint">Add a node on the Network page before assigning a service.</p>}
        {loadError && <><FormMessage message={loadError} /><button className="export-button" type="button"
          onClick={() => setRefresh(refresh + 1)}>Try again</button></>}
        <LocationPicker value={location} initialLocation={service?.serviceLocation} disabled={saving}
          onChange={(value) => { setLocation(value); setLocationChanged(true) }} />
        <FormMessage message={error} />
        <div className="incident-form-actions">
          <button className="dashboard-button button-neutral" type="button" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="dashboard-button" type="submit" disabled={saving || loading || Boolean(loadError) || !nodeId}>
            {saving ? 'Saving…' : 'Save service'}</button>
        </div>
      </form>
    </FormDialog>
  )
}
