import { createRoot } from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import App from './App'
import './index.css'
import { branding } from './config/branding'
import { ErrorBoundary } from './ui/ErrorBoundary'

// Expand WebApp to full height immediately
try {
  WebApp.expand();
} catch (e) {
  // Ignore in non-telegram env
}

// Fallback title until runtime config from /api/config is loaded.
document.title = branding.appTitle

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})
