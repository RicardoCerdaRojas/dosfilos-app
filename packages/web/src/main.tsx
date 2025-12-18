import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'

// Initialize i18n before rendering
import { initI18n } from '@/i18n'
initI18n();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="dosfilos-ui-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
