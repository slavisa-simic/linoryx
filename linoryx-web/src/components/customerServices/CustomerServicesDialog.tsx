import type { User } from '../../models/users'
import type { CustomerService } from '../../models/customerServices'
import { userName } from '../../services/dashboardData'
import { FormDialog } from '../workspace/FormDialog'
import { ServicesTable } from './ServicesTable'
import { FormMessage } from '../auth/FormMessage'

interface CustomerServicesDialogProps {
  customer: User
  services: CustomerService[]
  busy: boolean
  error: string
  onAssign(): void
  onEdit(service: CustomerService): void
  onTerminate(service: CustomerService): void
  onClose(): void
}

export function CustomerServicesDialog(props: CustomerServicesDialogProps) {
  return (
    <FormDialog wide id="customer-services-dialog" title="Customer services" busy={props.busy} onClose={props.onClose}
      footer={<div className="dialog-actions">
        <button className="dashboard-button" type="button" disabled={props.busy} onClick={props.onAssign}>Assign service</button>
      </div>}>
      <p className="incident-muted">{userName(props.customer)} · {props.customer.email}</p>
      <FormMessage message={props.error} />
      <ServicesTable services={props.services} busy={props.busy} onEdit={props.onEdit} onTerminate={props.onTerminate} />
    </FormDialog>
  )
}
