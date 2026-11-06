import { Icon } from '../Icon'

interface RefreshButtonProps {
  onClick(): void
  disabled?: boolean
  label?: string
  ariaLabel?: string
}

export function RefreshButton({ onClick, disabled = false, label = 'Refresh', ariaLabel }: RefreshButtonProps) {
  return (
    <button className="dashboard-button button-neutral refresh-button" type="button"
      disabled={disabled} onClick={onClick} aria-label={ariaLabel}>
      <Icon name="refresh" size={18} />
      <span>{label}</span>
    </button>
  )
}
