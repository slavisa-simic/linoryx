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

  if (!displayName && email.trim()) {
    let emailName = email.split('@')[0]
    emailName = emailName.replaceAll('.', ' ')
    emailName = emailName.replaceAll('_', ' ')
    emailName = emailName.replaceAll('-', ' ')
    const nameParts = emailName.split(' ')

    for (const word of nameParts) {
      if (word !== '') {
        displayName = displayName + word.charAt(0).toUpperCase() + word.slice(1) + ' '
      }
    }
    displayName = displayName.trim()
  }

  if (!displayName) {
    displayName = 'Jon Doe'
  }
  let displayEmail = email.trim()
  if (displayEmail === '') {
    displayEmail = 'jon.doe@company.com'
  }

  let loginEmail = email.trim()
  let passwordMask = '—'
  if (loginEmail === '') {
    loginEmail = 'you@company.com'
  }
  if (passwordLength > 0) {
    passwordMask = '*'.repeat(passwordLength)
  }

  const words = displayName.split(' ')
  let initials = words[0].charAt(0)
  if (words.length > 1) {
    initials = initials + words[words.length - 1].charAt(0)
  }
  initials = initials.toUpperCase()

  return (
    <div className="card-float">
      <div className="card-stack">
        <div className="card-outline card-outline-back" aria-hidden="true" />
        <div className="card-outline card-outline-front" aria-hidden="true" />
        <div className="access-card">
          <div className="access-card-main">
            <div className="card-slot" aria-hidden="true" />
            <BrandLogo />
            {variant === 'login' ? (
              <div className="card-credentials">
                <p className="card-login-email" title={email.trim()}>
                  {loginEmail}
                </p>
                {/* Only the length reaches this component, never the password. */}
                <p className="card-login-password">{passwordMask}</p>
              </div>
            ) : (
              <>
                <p className="card-initials" aria-hidden="true">
                  {initials}
                </p>
                <p className="card-holder-name" title={displayName}>
                  {displayName}
                </p>
                <p className="card-holder-email" title={displayEmail}>
                  {displayEmail}
                </p>
                <p className="card-holder-role">User</p>
              </>
            )}
            <img className="card-barcode" src="/barcode.svg" width="176" height="44" alt="" />
          </div>
          <div className="access-card-stub" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
