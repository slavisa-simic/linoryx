import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { checkBackendReadiness } from '../../api/readinessApi'
import { StartupScreen } from './StartupScreen'

interface StartupGateProps {
  baseUrl: string
  children: ReactNode
}

export function StartupGate({ baseUrl, children }: StartupGateProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    async function check() {
      try {
        if (await checkBackendReadiness(baseUrl, AbortSignal.timeout(4_000))) {
          if (active) setReady(true)
          return
        }
      } catch {
        // Retry if the backend is unreachable or the request times out.
      }

      if (active) timer = window.setTimeout(check, 3_000)
    }

    // Defer the first check so StrictMode can clean up its initial effect.
    let timer = window.setTimeout(check, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [baseUrl])

  return ready ? children : <StartupScreen />
}
