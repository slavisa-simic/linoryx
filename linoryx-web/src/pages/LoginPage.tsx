import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthPageLink } from '../components/auth/AuthPageLink'
import { FormField } from '../components/auth/FormField'
import { FormMessage } from '../components/auth/FormMessage'
import { SubmitButton } from '../components/auth/SubmitButton'
import type { AuthResponse, LoginRequest } from '../models/auth'
import type { AuthApi } from '../api/authApi'

interface LoginPageProps {
  authApi: AuthApi
  initialEmail: string
  notice: string
  onLogin(response: AuthResponse, email: string): void
  onNavigate(page: 'login' | 'register'): void
}

export function LoginPage({ authApi, initialEmail, notice, onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  let noticeType: 'success' | 'warning' = 'success'
  if (notice.startsWith('Your session')) {
    noticeType = 'warning'
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) {
      return
    }
    setError('')
    setLoading(true)

    try {
      const request: LoginRequest = {
        email: email.trim(),
        password: password
      }
      const response = await authApi.login(request)
      onLogin(response, email.trim())
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Sign-in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout page="login" email={email} passwordLength={password.length}>
      <h1 className="page-title" id="page-title" tabIndex={-1}>
        Sign in
      </h1>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <FormMessage message={notice} type={noticeType} />
        <FormField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="you@company.com"
          disabled={loading}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={loading}
        />
        <FormMessage message={error} />
        <SubmitButton label="Sign in" disabled={loading} />
      </form>
      <p className="auth-switch">
        No account yet?{' '}
        <AuthPageLink page="register" label="Create account" onNavigate={onNavigate} />
      </p>
    </AuthLayout>
  )
}
