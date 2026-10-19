interface IconProps {
  name:
    | 'eye'
    | 'eye-off'
    | 'arrow-right'
    | 'loader'
    | 'alert'
    | 'check-circle'
    | 'check'
    | 'logout'
    | 'dashboard'
    | 'layers'
    | 'assign'
    | 'user'
    | 'users'
    | 'wrench'
    | 'history'
    | 'refresh'
    | 'download'
    | 'calendar'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'search'
    | 'clock'
    | 'trend'
    | 'close'
    | 'shield'
    | 'inbox'
    | 'arrow-up-right'
  size?: number
  className?: string
}

// Small inline SVGs keep icons independent of a UI library.
export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(name === 'eye' || name === 'eye-off') && (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {name === 'eye-off' && <path d="m3 3 18 18" />}
      {name === 'arrow-right' && <path d="M4 12h16m-6-6 6 6-6 6" />}
      {name === 'loader' && <circle cx="12" cy="12" r="9" strokeDasharray="42 16" />}
      {(name === 'alert' || name === 'check-circle') && <circle cx="12" cy="12" r="9" />}
      {name === 'alert' && <path d="M12 7v6m0 4h.01" />}
      {(name === 'check' || name === 'check-circle') && <path d="m7 12 3 3 7-7" />}
      {name === 'logout' && <path d="M9 4H4v16h5m1-8h11m-5-5 5 5-5 5" />}
      {name === 'dashboard' && <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" />}
      {name === 'layers' && (
        <>
          <path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 17l10 5 10-5" />
        </>
      )}
      {name === 'assign' && (
        <>
          <path d="M9 5H4v16h16v-5M9 3h6v4H9zM13 12h8m-3-3 3 3-3 3" />
          <path d="M8 12H7m1 5H7m4 0h3" />
        </>
      )}
      {name === 'user' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </>
      )}
      {name === 'users' && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
        </>
      )}
      {name === 'wrench' && (
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
      )}
      {name === 'history' && (
        <>
          <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-5v6l4 2" />
        </>
      )}
      {name === 'refresh' && (
        <path d="M20 7A9 9 0 0 0 5 5L2 8m0-6v6h6m-4 9a9 9 0 0 0 15 2l3-3m0 6v-6h-6" />
      )}
      {name === 'download' && <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />}
      {name === 'calendar' && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </>
      )}
      {name === 'chevron-down' && <path d="m6 9 6 6 6-6" />}
      {name === 'chevron-left' && <path d="m14 6-6 6 6 6" />}
      {name === 'chevron-right' && <path d="m10 6 6 6-6 6" />}
      {name === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="7.5" />
          <path d="m16 16 5 5" />
        </>
      )}
      {name === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === 'trend' && <path d="m3 17 6-6 4 4 8-10m-6 0h6v6" />}
      {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
      {name === 'shield' && (
        <>
          <path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      )}
      {name === 'inbox' && (
        <>
          <path d="m3 12 3-9h12l3 9v9H3Z" />
          <path d="M3 12h5l2 4h4l2-4h5" />
        </>
      )}
      {name === 'arrow-up-right' && <path d="M6 18 18 6M6 6h12v12" />}
    </svg>
  )
}
