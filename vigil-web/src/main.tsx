import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createAuthApi } from './api/authApi'
import { createSessionService } from './services/createSessionService'
import './index.css'

// URL i vreme cekanja citamo iz .env, a servise prosledjujemo komponentama.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const apiTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS)

const authApi = createAuthApi(apiBaseUrl, apiTimeout)
const sessionService = createSessionService(window.sessionStorage)

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App authApi={authApi} sessionService={sessionService} />
    </StrictMode>
  )
}
