import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Initialize i18n before rendering
import { initI18n } from '@/i18n'
initI18n();

// Create a client
const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="dosfilos-ui-theme">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
