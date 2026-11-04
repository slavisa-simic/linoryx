import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { saveNetworkNode } from '../../api/networkApi'
import { useUser } from '../../context/UserContext'
import type { LocationData, LocationSelection } from '../../models/locations'
import type { NetworkNode, NodeStatus, NodeType } from '../../models/network'
import { locationRequest } from '../../services/locationData'
import { FormMessage } from '../auth/FormMessage'
import { LocationPicker } from '../locations/LocationPicker'
import { FormDialog } from '../workspace/FormDialog'

interface NodeDialogProps {
  node: NetworkNode | null
  onSaved(node: NetworkNode): void
  onClose(): void
}

export function NodeDialog({ node, onSaved, onClose }: NodeDialogProps) {
  const { session, onSessionExpired } = useUser()
  const [name, setName] = useState(node?.name ?? '')
  const [type, setType] = useState<NodeType>(node?.nodeType ?? 'GPON_OLT')
  const [status, setStatus] = useState<NodeStatus>(node?.status ?? 'ACTIVE')
  const [location, setLocation] = useState<LocationSelection | null>(null)
  const [locationChanged, setLocationChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  let initialLocation: LocationData | undefined
  if (node) {
    initialLocation = { formattedAddress: node.location, city: node.city, countryCode: node.countryCode,
      latitude: node.latitude, longitude: node.longitude }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if ((!node || locationChanged) && (!location || !location.positionConfirmed)) {
      setError('Select an address and confirm the precise marker position.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await saveNetworkNode(session, node?.id ?? null,
        { name: name.trim(), nodeType: type, status, location: locationRequest(location) })
      onSaved(saved)
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') onSessionExpired()
      else if (error instanceof Error) setError(error.message)
      else setError('The node could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDialog id="node-dialog" title={node ? 'Edit node' : 'Add node'} busy={saving} onClose={onClose}>
      {node && <p className="incident-muted">{node.code} · The code stays unchanged.</p>}
      <form className="incident-form" onSubmit={submit} aria-busy={saving}>
        <div className="incident-form-field">
          <label htmlFor="node-name">Node name</label>
          <input id="node-name" className="field-input" value={name} maxLength={150} required autoFocus
            disabled={saving} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="incident-form-row">
          <label htmlFor="node-type">Node type
            <select id="node-type" className="field-input" value={type} disabled={saving}
              onChange={(event) => setType(event.target.value as NodeType)}>
              <option value="GPON_OLT">GPON OLT</option><option value="ROUTER">Router</option>
              <option value="SWITCH">Switch</option><option value="WIRELESS_BASE_STATION">Wireless base station</option>
            </select>
          </label>
          <label htmlFor="node-status">Node status
            <select id="node-status" className="field-input" value={status} disabled={saving}
              onChange={(event) => setStatus(event.target.value as NodeStatus)}>
              <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </label>
        </div>
        <LocationPicker value={location} initialLocation={initialLocation} disabled={saving}
          onChange={(value) => { setLocation(value); setLocationChanged(true) }} />
        <FormMessage message={error} />
        <div className="incident-form-actions">
          <button className="dashboard-button button-neutral" type="button" disabled={saving} onClick={onClose}>Cancel</button>
          <button className="dashboard-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save node'}
          </button>
        </div>
      </form>
    </FormDialog>
  )
}
