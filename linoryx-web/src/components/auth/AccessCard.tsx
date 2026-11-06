import { BrandLogo } from './BrandLogo'

interface AccessCardProps {
  firstName?: string
  lastName?: string
  email?: string
  variant?: 'profile' | 'login'
  passwordLength?: number
}

export function AccessCard({
  firstName = '',
  lastName = '',
  email = '',
  variant = 'profile',
  passwordLength = 0
}: AccessCardProps) {
  // The form's useState values are passed to the card through props.
  let displayName = (firstName.trim() + ' ' + lastName.trim()).trim()

  if (!displayName) {
    displayName = 'Your name'
  }
  let displayEmail = email.trim()
  if (displayEmail === '') {
    displayEmail = 'you@company.com'
  }

  let passwordMask = ''
  if (passwordLength > 0) {
    passwordMask = '•'.repeat(passwordLength)
  }

  return (
    <div className="card-float">
      <div className="access-card">
        <img className="access-card-art" src="/brand/access-card.svg" width="720" height="444" alt="" />
        <div className="access-card-logo">
          <BrandLogo />
        </div>
        <div className="card-credentials">
          {variant === 'login' ? (
            <>
              <p className="card-login-email" title={displayEmail}>{displayEmail}</p>
              {/* Only the length reaches this component, never the password. */}
              <p className="card-login-password">
                {passwordMask || <span className="card-password-placeholder" />}
              </p>
            </>
          ) : (
            <>
              <p className="card-holder-name" title={displayName}>{displayName}</p>
              <p className="card-holder-email" title={displayEmail}>{displayEmail}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
