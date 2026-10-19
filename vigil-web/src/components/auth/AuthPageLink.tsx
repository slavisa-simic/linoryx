import type { MouseEvent } from 'react'

interface AuthPageLinkProps {
  page: 'login' | 'register'
  label: string
  onNavigate(page: 'login' | 'register'): void
}

export function AuthPageLink({ page, label, onNavigate }: AuthPageLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    onNavigate(page)
  }

  return (
    <a className="text-link" href={'/' + page} onClick={handleClick}>
      {label}
    </a>
  )
}
