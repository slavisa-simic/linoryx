import { Icon } from '../Icon'

interface FormMessageProps {
  message: string
  type?: 'error' | 'success' | 'warning'
}

export function FormMessage({ message, type = 'error' }: FormMessageProps) {
  if (!message) {
    return null
  }

  let role: 'alert' | 'status' = 'status'
  let icon: 'alert' | 'check-circle' = 'alert'
  if (type === 'error') {
    role = 'alert'
  }
  if (type === 'success') {
    icon = 'check-circle'
  }

  return (
    <div className={'form-message message-' + type} role={role}>
      <Icon name={icon} className="message-icon" />
      <span>{message}</span>
    </div>
  )
}
