import { useState } from 'react'
import GhostFibers from './GhostFibers'
import './StartupScreen.css'

interface StartupScreenProps {
  unavailable?: boolean
  leaving?: boolean
}

export function StartupScreen({
  unavailable = false, leaving = false
}: StartupScreenProps) {
  const [failed, setFailed] = useState(false)

  let className = 'startup-screen'
  if (leaving) className += ' startup-screen--leaving'
  if (failed) className += ' startup-screen--static'

  return (
    <main className={className}
      aria-label="Connecting to Linoryx" aria-hidden={leaving || undefined} inert={leaving}>
      {!failed && (
        <div className="startup-screen__artwork" aria-hidden="true">
          <GhostFibers
            glowColor="#D05445" secondaryColor="#481C1C" lineColor="#E66A56"
            gradient="along" layers={2} threads={54} density={0.75} dpr={1}
            scale={1.5} perspective={0.2} vignette={0}
            fiberStyle="dots" waves={1.2} twist={1.5} volume={0.8}
            speed={0.45} flow={0.5} rollSpeed={0.15} rotation={-18}
            depthOfField={0.25} particles={0.08} sparkle={0.3}
            brightness={5.2} spread={1.3} lightMode intro
            mouseInteraction hoverEffect="focus" pulseOnClick
            onUnavailable={() => setFailed(true)}
          />
        </div>
      )}
      <div className="startup-screen__content">
        <img className="startup-screen__logo" src="/brand/linoryx-logo.svg"
          width="452" height="124" alt="Linoryx" fetchPriority="high" />
        <div className="startup-screen__status" role="status" aria-live="polite" aria-atomic="true">
          <h1>{unavailable ? 'Taking longer to connect.' : 'Setting up your workspace...'}</h1>
          <p>{unavailable ? 'Linoryx services are unavailable. We’ll keep trying.' : 'Connecting to Linoryx services.'}</p>
        </div>
      </div>
    </main>
  )
}
