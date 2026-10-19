import { useState } from 'react'
import { Icon } from '../Icon'

interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange(value: string): void
  type?: 'text' | 'email' | 'password'
  autoComplete: string
  placeholder?: string
  minLength?: number
  maxLength?: number
  hint?: string
  error?: string
  onBlur?(): void
  disabled?: boolean
}

export function FormField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  minLength,
  maxLength,
  hint,
  error,
  onBlur,
  disabled
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  let inputClass = 'field-input'
  let inputType = type
  let descriptionId: string | undefined
  let description = hint
  let descriptionClass = 'field-hint'
  let toggleLabel = 'Show password'
  let toggleIcon: 'eye' | 'eye-off' = 'eye'

  if (isPassword) {
    inputClass = inputClass + ' password-input'
  }
  if (isPassword && showPassword) {
    inputType = 'text'
    toggleLabel = 'Hide password'
    toggleIcon = 'eye-off'
  }
  if (error) {
    inputClass = inputClass + ' field-input-error'
    description = error
    descriptionClass = 'field-error'
  }
  if (description) {
    descriptionId = id + '-description'
  }

  return (
    <div className="form-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-wrapper">
        <input
          className={inputClass}
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          disabled={disabled}
          required
        />
        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={toggleLabel}
            aria-pressed={showPassword}
            aria-controls={id}
            disabled={disabled}
          >
            <Icon name={toggleIcon} size={19} />
          </button>
        )}
      </div>
      {descriptionId && (
        <p id={descriptionId} className={descriptionClass} aria-live="polite">
          {description}
        </p>
      )}
    </div>
  )
}
