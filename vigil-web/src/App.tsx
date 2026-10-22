import { UserProvider } from './context/UserProvider'
import { useEffect, useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { UsersPage } from './pages/UsersPage'
import { AuditPage } from './pages/AuditPage'
import type { AuthResponse, AuthSession } from './models/auth'
import type { AuthApi } from './api/authApi'
import type { SessionService } from './services/SessionService'

interface AppProps {
  authApi: AuthApi
  sessionService: SessionService
}

type Page = 'login' | 'register' | 'dashboard' | 'incidents' | 'users' | 'audit'

function getCurrentPage(): Page {
  if (window.location.pathname === '/audit') {
    return 'audit'
  }
  if (window.location.pathname === '/users') {
    return 'users'
  }
  if (window.location.pathname === '/incidents') {
    return 'incidents'
  }
  if (window.location.pathname === '/dashboard') {
    return 'dashboard'
  }
  if (window.location.pathname === '/register') {
    return 'register'
  }
  return 'login'
}

function getSessionPage(session: AuthSession | null): Page {
  const page = getCurrentPage()
  if (
    session &&
    (page === 'users' || page === 'audit') &&
    session.role !== 'ADMIN'
  ) {
    if (session.role === 'USER') {
      return 'incidents'
    }
    return 'dashboard'
  }
  if (session && (page === 'login' || page === 'register')) {
    if (session.role === 'USER') {
      return 'incidents'
    }
    return 'dashboard'
  }
  if (
    !session &&
    (page === 'dashboard' ||
      page === 'incidents' ||
      page === 'users' ||
      page === 'audit')
  ) {
    return 'login'
  }
  return page
}

function App({ authApi, sessionService }: AppProps) {
  const [session, setSession] = useState(() => sessionService.getSession())
  const [page, setPage] = useState<Page>(() => getSessionPage(session))
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    function handlePopState() {
      setPage(getSessionPage(sessionService.getSession()))
      setNotice('')
    }

    window.addEventListener('popstate', handlePopState)
    return function cleanup() {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [sessionService])

  useEffect(() => {
    if (session) {
      document.title = 'Dashboard · Vigil'
      if (page === 'incidents') {
        document.title = 'Incidents · Vigil'
      }
      if (page === 'users') {
        document.title = 'Users · Vigil'
      }
      if (page === 'audit') {
        document.title = 'Audit logs · Vigil'
      }
    } else if (page === 'register') {
      document.title = 'Create account · Vigil'
    } else {
      document.title = 'Sign in · Vigil'
    }
  }, [page, session])

  useEffect(() => {
    if (window.location.pathname !== '/' + page) {
      window.history.replaceState(null, '', '/' + page)
    }
  }, [page])

  useEffect(() => {
    if (!session) {
      return
    }

    const timeout = window.setTimeout(() => {
      sessionService.clearSession()
      setSession(null)
      setPage('login')
      setNotice('Your session has expired. Please sign in again.')
    }, session.expiresAt - Date.now())

    return function cleanup() {
      window.clearTimeout(timeout)
    }
  }, [session, sessionService])

  function navigate(nextPage: Page, incidentId?: number) {
    let url = '/' + nextPage
    if (incidentId) {
      url = url + '?incident=' + incidentId
    }
    window.history.pushState(null, '', url)
    setPage(nextPage)
    setNotice('')
  }

  function handleLogin(response: AuthResponse, loginEmail: string) {
    const savedSession = sessionService.saveSession(response, loginEmail)
    setSession(savedSession)
    if (savedSession.role === 'USER') {
      navigate('incidents')
    } else {
      navigate('dashboard')
    }
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

  if (session && page === 'audit' && session.role === 'ADMIN') {
    content = (
      <AuditPage
        onNavigate={navigate}
      />
    )
  } else if (session && page === 'users' && session.role === 'ADMIN') {
    content = (
      <UsersPage
        onNavigate={navigate}
      />
    )
  } else if (session && page === 'incidents') {
    content = (
      <IncidentsPage
        key={session.userId}
        onNavigate={navigate}
      />
    )
  } else if (session) {
    content = (
      <DashboardPage
        key="dashboard"
        onNavigate={navigate}
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
