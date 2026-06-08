import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { branding } from './config/branding'

// Fallback title until runtime config from /api/config is loaded.
document.title = branding.appTitle

createRoot(document.getElementById('root')!).render(
  <App />,
)
