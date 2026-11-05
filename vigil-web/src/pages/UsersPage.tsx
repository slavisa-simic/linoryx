import type { WorkspacePage } from '../models/navigation'
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
import type { CustomerService } from '../models/customerServices'
import { listCustomerServices, terminateCustomerService } from '../api/customerServicesApi'
import { serviceSummary } from '../services/customerServiceData'
import { ServiceDialog } from '../components/customerServices/ServiceDialog'
import { CustomerServicesDialog } from '../components/customerServices/CustomerServicesDialog'

interface UsersPageProps {
  onNavigate(page: WorkspacePage): void
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
  const [services, setServices] = useState<CustomerService[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState('')
  const [serviceActionError, setServiceActionError] = useState('')
  const [customer, setCustomer] = useState<User | null>(null)
  const [serviceMode, setServiceMode] = useState<'list' | 'edit' | null>(null)
  const [selectedService, setSelectedService] = useState<CustomerService | null>(null)

  useEffect(() => {
    let active = true
    async function loadServices() {
      setServicesLoading(true)
      setServicesError('')
      try {
        const result = await listCustomerServices(session)
        if (active) setServices(result)
      } catch (error) {
        if (active) setServicesError(error instanceof Error ? error.message : 'Services could not be loaded.')
      } finally {
        if (active) setServicesLoading(false)
      }
    }
    loadServices()
    return () => { active = false }
  }, [session, refresh])

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
    if (error === 'SESSION_EXPIRED' || servicesError === 'SESSION_EXPIRED' || serviceActionError === 'SESSION_EXPIRED') {
      onSessionExpired()
    }
  }, [error, servicesError, serviceActionError, onSessionExpired])

  function openService(customer: User, mode: 'list' | 'edit') {
    setCustomer(customer)
    setServiceMode(mode)
    setSelectedService(null)
    setServiceActionError('')
  }

  function serviceSaved(saved: CustomerService) {
    const remaining = services.filter((item) => item.id !== saved.id)
    setServices([...remaining, saved])
    setServiceMode('list')
    setServiceActionError('')
    if (customer) setNotice('Service saved for ' + userName(customer) + '.')
  }

  async function terminate(service: CustomerService) {
    if (busy || !window.confirm('Terminate service #' + service.id + '?')) return
    setBusy(true)
    setServiceActionError('')
    try {
      const updated = await terminateCustomerService(session, service.id)
      setServices(services.map((item) => item.id === updated.id ? updated : item))
      setNotice('Service #' + service.id + ' terminated.')
    } catch (error) {
      setServiceActionError(error instanceof Error ? error.message : 'The service could not be terminated.')
    } finally {
      setBusy(false)
    }
  }

  const summaries: Record<number, string> = {}
  for (const user of users) {
    summaries[user.id] = serviceSummary(services, user.id)
    if (servicesLoading) summaries[user.id] = 'Loading…'
    if (servicesError) summaries[user.id] = 'Unavailable'
  }

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
            <p className="page-description">Manage account access, roles and customer services</p>
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
        {servicesError && servicesError !== 'SESSION_EXPIRED' && <div className="page-message">
          <FormMessage message={servicesError} />
          <button className="export-button" type="button" onClick={() => setRefresh(refresh + 1)}>Retry loading services</button>
        </div>}
        {loading && <p className="incident-muted" role="status">Loading users…</p>}
        {!loading && (!error || users.length > 0) && (
          <UsersTable
            users={users}
            currentUserId={session.userId}
            busy={busy}
            onRoleChange={changeRole}
            onAccessChange={changeAccess}
            serviceSummaries={summaries}
            servicesAvailable={!servicesLoading && !servicesError}
            onAssignService={(user) => openService(user, 'edit')}
            onViewServices={(user) => openService(user, 'list')}
          />
        )}
      </main>
      {customer && serviceMode === 'edit' && <ServiceDialog customer={customer} service={selectedService}
        onSaved={serviceSaved} onClose={() => setServiceMode(null)} />}
      {customer && serviceMode === 'list' && <CustomerServicesDialog customer={customer}
        services={services.filter((item) => item.customerId === customer.id)} busy={busy} error={serviceActionError}
        onAssign={() => { setSelectedService(null); setServiceMode('edit') }}
        onEdit={(service) => { setSelectedService(service); setServiceMode('edit') }}
        onTerminate={terminate} onClose={() => setServiceMode(null)} />}
    </div>
  )
}
