import { Icon } from '../Icon'

interface SubmitButtonProps {
  label: string
  loadingLabel: string
  loading: boolean
}

export function SubmitButton({ label, loadingLabel, loading }: SubmitButtonProps) {
  let text = label
  let icon: 'loader' | 'arrow-right' = 'arrow-right'
  let iconClass = ''

  if (loading) {
    text = loadingLabel
    icon = 'loader'
    iconClass = 'loading-icon'
  }

  return (
    <button className="primary-button" type="submit" disabled={loading}>
      <span>{text}</span>
      <Icon name={icon} className={iconClass} />
    </button>
  )
}
