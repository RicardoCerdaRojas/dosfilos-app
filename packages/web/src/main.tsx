import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'

// Initialize i18n before rendering
import { initI18n } from '@/i18n'
initI18n();

// Suppress known Excalidraw warning about controlled/uncontrolled inputs
// This is a known issue in the Excalidraw library and doesn't affect functionality
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('A component is changing a controlled input to be uncontrolled')
  ) {
    return;
  }
  originalError.apply(console, args);
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="dosfilos-ui-theme">
      <App />
    </ThemeProvider>
  </StrictMode>,
)
