import { useState } from 'react'
import type { UserRole } from '../../models/users'
import type { User } from '../../models/users'
import { userName } from '../../services/dashboardData'
import { Icon } from '../Icon'
import { UserRow } from './UserRow'

interface UsersTableProps {
  users: User[]
  currentUserId: number
  busy: boolean
  onRoleChange(user: User, role: UserRole): void
  onAccessChange(user: User): void
}

const pageSize = 8

export function UsersTable({
  users,
  currentUserId,
  busy,
  onRoleChange,
  onAccessChange
}: UsersTableProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(0)

  function matchesFilters(user: User) {
    if (role !== 'ALL' && user.role !== role) {
      return false
    }
    if (status === 'ACTIVE' && !user.enabled) {
      return false
    }
    if (status === 'DISABLED' && user.enabled) {
      return false
    }
    const text = userName(user) + ' ' + user.email
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

  const filtered = users.filter(matchesFilters)
  const pages = Math.ceil(filtered.length / pageSize)
  let currentPage = page
  if (currentPage >= pages) {
    currentPage = Math.max(0, pages - 1)
  }
  const start = currentPage * pageSize
  const visible = filtered.slice(start, start + pageSize)
  let pageLabel = '0 users'
  let displayedPage = 0
  if (filtered.length > 0) {
    pageLabel =
      start +
      1 +
      '–' +
      Math.min(start + pageSize, filtered.length) +
      ' of ' +
      filtered.length +
      ' users'
    displayedPage = currentPage + 1
  }

  function clearFilters() {
    setSearch('')
    setRole('ALL')
    setStatus('ALL')
    setPage(0)
  }

  return (
    <section
      className="dashboard-panel table-panel"
      aria-labelledby="users-title"
    >
      <header className="panel-heading">
        <div className="heading-with-count">
          <h2 id="users-title">All users</h2>
          <span className="count-badge">{users.length}</span>
        </div>
      </header>
      <div className="table-toolbar">
        <label className="incident-search">
          <Icon name="search" size={17} />
          <span className="sr-only">Search users</span>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
          />
        </label>
        <label className="status-filter">
          <span className="sr-only">Filter users by role</span>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value)
              setPage(0)
            }}
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="TECHNICIAN">Technicians</option>
            <option value="USER">Users</option>
          </select>
          <Icon name="chevron-down" size={15} />
        </label>
        <label className="status-filter">
          <span className="sr-only">Filter users by status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(0)
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <Icon name="chevron-down" size={15} />
        </label>
      </div>
      <div className="incident-table-scroll">
        <table className="incident-table users-table">
          <caption className="sr-only">Users, roles and account access</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Joined</th>
              <th scope="col">Access</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <UserRow
                key={user.id + '-' + user.role + '-' + user.enabled}
                user={user}
                currentUserId={currentUserId}
                busy={busy}
                onRoleChange={onRoleChange}
                onAccessChange={onAccessChange}
              />
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <div className="table-empty">
          <Icon name="search" size={26} />
          <strong>No users found</strong>
          <p>Try a different name, email or filter.</p>
          {(search || role !== 'ALL' || status !== 'ALL') && (
            <button
              className="dashboard-button button-neutral"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      <footer className="table-pagination">
        <span aria-live="polite">{pageLabel}</span>
        <div>
          <button
            className="icon-button"
            type="button"
            disabled={currentPage === 0}
            aria-label="Previous page of users"
            onClick={() => setPage(currentPage - 1)}
          >
            <Icon name="chevron-left" size={17} />
          </button>
          <span>
            {displayedPage} / {pages}
          </span>
          <button
            className="icon-button"
            type="button"
            disabled={currentPage >= pages - 1}
            aria-label="Next page of users"
            onClick={() => setPage(currentPage + 1)}
          >
            <Icon name="chevron-right" size={17} />
          </button>
        </div>
      </footer>
      <p className="users-table-note">
        Role changes require a new sign-in.
      </p>
    </section>
  )
}
