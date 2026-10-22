import { Icon } from '../Icon'

interface SubmitButtonProps {
  label: string
  disabled: boolean
}

export function SubmitButton({ label, disabled }: SubmitButtonProps) {
  return (
    <button className="primary-button" type="submit" disabled={disabled}>
      <span>{label}</span>
      <Icon name="arrow-right" />
    </button>
  )
}
