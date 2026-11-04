import { useEffect, useState } from 'react'
import { listCustomerServices } from '../api/customerServicesApi'
import { useUser } from '../context/UserContext'
import type { CustomerService } from '../models/customerServices'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { ServicesTable } from '../components/customerServices/ServicesTable'
import { FormMessage } from '../components/auth/FormMessage'
import { Icon } from '../components/Icon'

interface ServicesPageProps {
  onNavigate(page: 'dashboard' | 'incidents' | 'users' | 'audit' | 'network' | 'services'): void
}

export function ServicesPage({ onNavigate }: ServicesPageProps) {
  const { session, onSessionExpired } = useUser()
  const [services, setServices] = useState<CustomerService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const result = await listCustomerServices(session)
        if (active) setServices(result)
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Services could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, refresh])
  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])
  return (
    <div className="workspace">
      <a className="skip-link" href="#services-main">Skip to services</a>
      <WorkspaceNavbar page="services" onNavigate={onNavigate} />
      <main id="services-main" className="dashboard-main">
        <div className="page-heading"><h1>My services<span className="heading-period">.</span></h1>
          <button className="dashboard-button button-neutral" type="button" disabled={loading}
            onClick={() => setRefresh(refresh + 1)}><Icon name="refresh" size={16} />Refresh</button></div>
        {loading && <p className="incident-muted" role="status">Loading your services…</p>}
        {error && error !== 'SESSION_EXPIRED' && <FormMessage message={error} />}
        {!loading && !error && <section className="dashboard-panel table-panel">
          <header className="panel-heading"><h2>Your internet services</h2></header>
          <ServicesTable services={services} />
        </section>}
      </main>
    </div>
  )
}
