import './StartupScreen.css'

export function StartupScreen() {
  return (
    <main className="startup-screen" aria-labelledby="startup-status">
      <div className="startup-screen__content">
        <img className="startup-screen__logo" src="/brand/linoryx-logo.svg"
          width="452" height="124" alt="Linoryx" fetchPriority="high" />
        <div className="startup-screen__status" role="status" aria-live="polite" aria-atomic="true">
          <h1 id="startup-status">Connecting to Linoryx…</h1>
        </div>
        <span className="startup-spinner" aria-hidden="true" />
      </div>
    </main>
  )
}
