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
  const [showStartup, setShowStartup] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  // Make one request at a time. Retry three seconds after a failed request.
  useEffect(() => {
    if (ready) return

    let stopped = false
    let controller: AbortController | undefined
    let retryTimer: number | undefined
    let timeoutTimer: number | undefined

    async function check() {
      controller = new AbortController()
      timeoutTimer = window.setTimeout(() => controller?.abort(), 4_000)

      try {
        const serverReady = await checkBackendReadiness(baseUrl, controller.signal)
        if (!stopped && !controller.signal.aborted && serverReady) {
          setReady(true)
          return
        }
      } catch {
        // A sleeping server, lost connection or timeout will be retried.
      } finally {
        window.clearTimeout(timeoutTimer)
      }

      if (!stopped) retryTimer = window.setTimeout(check, 3_000)
    }

    const showTimer = window.setTimeout(() => setShowStartup(true), 400)
    const errorTimer = window.setTimeout(() => setUnavailable(true), 45_000)
    // The zero-delay timer also prevents duplicate requests in StrictMode.
    const firstCheck = window.setTimeout(check, 0)

    return () => {
      stopped = true
      controller?.abort()
      window.clearTimeout(firstCheck)
      window.clearTimeout(showTimer)
      window.clearTimeout(errorTimer)
      window.clearTimeout(retryTimer)
      window.clearTimeout(timeoutTimer)
    }
  }, [baseUrl, ready])

  // The app is already usable while the startup screen fades out.
  useEffect(() => {
    if (!ready || !showStartup) return

    const fadeTimer = window.setTimeout(() => setShowStartup(false), 220)
    return () => window.clearTimeout(fadeTimer)
  }, [ready, showStartup])

  return (
    <>
      {ready && children}
      {showStartup && (
        <StartupScreen
          unavailable={unavailable}
          leaving={ready}
        />
      )}
    </>
  )
}
