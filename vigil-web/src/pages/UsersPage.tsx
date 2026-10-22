import { useUser } from '../context/UserContext'
import { useEffect, useState } from 'react'
import type { UserRole } from '../models/users'
import type { User } from '../models/users'
import { changeUserRole, listUsers, setUserEnabled } from '../api/usersApi'
import { userName } from '../services/dashboardData'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { UsersTable } from '../components/users/UsersTable'
import { FormMessage } from '../components/auth/FormMessage'
import { Icon } from '../components/Icon'

interface UsersPageProps {
  onNavigate(page: 'dashboard' | 'incidents' | 'users' | 'audit'): void
}

export function UsersPage({
  onNavigate
}: UsersPageProps) {
  const { session, onSessionExpired } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const items = await listUsers(session)
        if (active) {
          setUsers(items)
        }
      } catch (error) {
        if (active) {
          if (error instanceof Error) {
            setError(error.message)
          } else {
            setError('Users could not be loaded.')
          }
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [session, refresh])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') {
      onSessionExpired()
    }
  }, [error, onSessionExpired])

  function updateUser(updated: User) {
    setUsers(
      users.map(function (user) {
        if (user.id === updated.id) {
          return updated
        }
        return user
      })
    )
  }

  async function changeRole(user: User, role: UserRole) {
    if (busy) {
      return
    }
    if (
      role === 'ADMIN' &&
      !window.confirm('Give ' + userName(user) + ' full administrator access?')
    ) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await changeUserRole(session, user.id, role)
      updateUser(updated)
      setNotice('Role updated for ' + userName(updated) + '.')
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('The role could not be updated.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function changeAccess(user: User) {
    if (busy) {
      return
    }
    if (
      user.enabled &&
      !window.confirm('Disable access for ' + userName(user) + '?')
    ) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await setUserEnabled(
        session,
        user.id,
        !user.enabled
      )
      updateUser(updated)
      let message = 'Account disabled for '
      if (updated.enabled) {
        message = 'Account enabled for '
      }
      setNotice(message + userName(updated) + '.')
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Account access could not be updated.')
      }
    } finally {
      setBusy(false)
    }
  }


  return (
    <div className="workspace">
      <a className="skip-link" href="#users-main">
        Skip to users
      </a>
      <WorkspaceNavbar
        page="users"
        onNavigate={onNavigate}
      />
      <main className="dashboard-main" id="users-main">
        <div className="page-heading users-page-heading">
          <div>
            <h1>
              Users<span className="heading-period">.</span>
            </h1>
          </div>
          <button
            className="dashboard-button button-neutral"
            type="button"
            disabled={loading || busy}
            onClick={() => setRefresh(refresh + 1)}
          >
            <Icon name="refresh" size={16} /> Refresh
          </button>
        </div>

        {notice && (
          <div className="page-message">
            <FormMessage message={notice} type="success" />
          </div>
        )}
        {error && error !== 'SESSION_EXPIRED' && (
          <div className="page-message">
            <FormMessage message={error} />
            {users.length === 0 && (
              <button
                className="export-button"
                type="button"
                onClick={() => setRefresh(refresh + 1)}
              >
                Try again
              </button>
            )}
          </div>
        )}
        {!loading && (!error || users.length > 0) && (
          <UsersTable
            users={users}
            currentUserId={session.userId}
            busy={busy}
            onRoleChange={changeRole}
            onAccessChange={changeAccess}
          />
        )}
      </main>
    </div>
  )
}
