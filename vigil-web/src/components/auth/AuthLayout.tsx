import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AccessCard } from './AccessCard'
import { BrandLogo } from './BrandLogo'

interface AuthLayoutProps {
  children: ReactNode
  page: 'login' | 'register'
  firstName?: string
  lastName?: string
  email?: string
  passwordLength?: number
}

export function AuthLayout({
  children,
  page,
  firstName,
  lastName,
  email,
  passwordLength
}: AuthLayoutProps) {
  useEffect(() => {
    const title = document.getElementById('page-title')
    if (title) {
      title.focus()
    }
  }, [])

  let layoutClass = 'auth-layout'
  let cardVariant: 'profile' | 'login' = 'login'
  if (page === 'register') {
    layoutClass = 'auth-layout register-layout'
    cardVariant = 'profile'
  }

  return (
    <div className={layoutClass}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <section className="form-panel">
        <header className="form-panel-header">
          <BrandLogo />
        </header>
        <main className="auth-main" id="main-content">
          <div className="auth-content">{children}</div>
        </main>
      </section>
      <aside className="card-panel" aria-label="Access card preview" aria-hidden={page === 'login'}>
        <AccessCard
          variant={cardVariant}
          firstName={firstName}
          lastName={lastName}
          email={email}
          passwordLength={passwordLength}
        />
      </aside>
    </div>
  )
}
