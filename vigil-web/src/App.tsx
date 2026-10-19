import { UserProvider } from './context/UserProvider'
import { useEffect, useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import type { AuthResponse } from './models/auth'
import type { AuthApi } from './api/authApi'
import type { SessionService } from './services/SessionService'
import './App.css'

interface AppProps {
  authApi: AuthApi
  sessionService: SessionService
}

type AuthPage = 'login' | 'register'

function getCurrentPage(): AuthPage {
  if (window.location.pathname === '/register') {
    return 'register'
  }
  return 'login'
}

function App({ authApi, sessionService }: AppProps) {
  const [page, setPage] = useState<AuthPage>(getCurrentPage)
  const [session, setSession] = useState(() => sessionService.getSession())
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    function handlePopState() {
      setPage(getCurrentPage())
      setNotice('')
    }

    window.addEventListener('popstate', handlePopState)
    return function cleanup() {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (session) {
      document.title = 'Dashboard · Vigil'
    } else if (page === 'register') {
      document.title = 'Create account · Vigil'
    } else {
      document.title = 'Sign in · Vigil'
    }
  }, [page, session])

  useEffect(() => {
    if (session) {
      window.history.replaceState(null, '', '/dashboard')
    } else if (window.location.pathname !== '/register' && window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login')
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      return
    }

    const timeout = window.setTimeout(() => {
      sessionService.clearSession()
      setSession(null)
      setNotice('Your session has expired. Please sign in again.')
    }, session.expiresAt - Date.now())

    return function cleanup() {
      window.clearTimeout(timeout)
    }
  }, [session, sessionService])

  function navigate(nextPage: AuthPage) {
    window.history.pushState(null, '', '/' + nextPage)
    setPage(nextPage)
    setNotice('')
  }

  function handleLogin(response: AuthResponse, loginEmail: string) {
    const savedSession = sessionService.saveSession(response, loginEmail)
    setSession(savedSession)
    window.history.pushState(null, '', '/dashboard')
    setNotice('')
  }

  function handleRegister(registeredEmail: string) {
    setEmail(registeredEmail)
    navigate('login')
    setNotice('Account created. You can now sign in.')
  }

  function handleLogout() {
    sessionService.clearSession()
    setSession(null)
    navigate('login')
  }

  function handleSessionExpired() {
    sessionService.clearSession()
    setSession(null)
    navigate('login')
    setNotice('Your session is no longer valid. Please sign in again.')
  }

  let content

  if (session) {
    content = (
      <DashboardPage
        key="dashboard"
      />
    )
  } else if (page === 'register') {
    content = (
      <RegisterPage
        key="register"
        authApi={authApi}
        onRegister={handleRegister}
        onNavigate={navigate}
      />
    )
  } else {
    content = (
      <LoginPage
        key="login"
        authApi={authApi}
        initialEmail={email}
        notice={notice}
        onLogin={handleLogin}
        onNavigate={navigate}
      />
    )
  }

  if (session) {
    return (
      <UserProvider
        session={session}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
      >
        {content}
      </UserProvider>
    )
  }

  return content
}

export default App
