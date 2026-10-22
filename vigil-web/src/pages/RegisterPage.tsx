import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthPageLink } from '../components/auth/AuthPageLink'
import { FormField } from '../components/auth/FormField'
import { FormMessage } from '../components/auth/FormMessage'
import { SubmitButton } from '../components/auth/SubmitButton'
import type { AuthApi } from '../api/authApi'
import type { RegisterRequest } from '../models/auth'

interface RegisterPageProps {
  authApi: AuthApi
  onRegister(email: string): void
  onNavigate(page: 'login' | 'register'): void
}

export function RegisterPage({ authApi, onRegister, onNavigate }: RegisterPageProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  let passwordError = ''
  if (confirmTouched && password !== confirmPassword) {
    passwordError = 'Passwords do not match.'
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) {
      return
    }
    setError('')
    setConfirmTouched(true)

    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.')
      return
    }

    if (password !== confirmPassword) {
      const confirmField = document.getElementById('confirm-password')
      if (confirmField) {
        confirmField.focus()
      }
      return
    }

    setLoading(true)

    try {
      const request: RegisterRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password
      }
      await authApi.register(request)
      onRegister(email.trim())
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout page="register" firstName={firstName} lastName={lastName} email={email}>
      <h1 className="page-title" id="page-title" tabIndex={-1}>
        Create account
      </h1>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <div className="form-row">
          <FormField
            id="first-name"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
            placeholder="First name"
            maxLength={255}
            disabled={loading}
          />
          <FormField
            id="last-name"
            label="Last name"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
            placeholder="Last name"
            maxLength={255}
            disabled={loading}
          />
        </div>
        <FormField
          id="email"
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="you@company.com"
          maxLength={255}
          disabled={loading}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Create a password"
          minLength={8}
          maxLength={20}
          hint="8–20 characters."
          disabled={loading}
        />
        <FormField
          id="confirm-password"
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          onBlur={() => setConfirmTouched(true)}
          autoComplete="new-password"
          placeholder="Confirm your password"
          maxLength={20}
          error={passwordError}
          disabled={loading}
        />
        <FormMessage message={error} />
        <SubmitButton label="Create account" disabled={loading} />
      </form>
      <p className="auth-switch">
        Already have an account?{' '}
        <AuthPageLink page="login" label="Sign in" onNavigate={onNavigate} />
      </p>
    </AuthLayout>
  )
}
