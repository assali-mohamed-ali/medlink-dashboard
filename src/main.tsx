import './instrument'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@/shared/styles/global.css'
import '@/shared/styles/tailwind.css'
import { reportError } from '@/shared/lib/errorReporting'
import { router } from '@/app/router'
import { AuthProvider } from '@/features/auth'

createRoot(document.getElementById('root')!, {
  onCaughtError: (error) => reportError(error),
  onUncaughtError: (error) => reportError(error),
  onRecoverableError: (error) => reportError(error),
}).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
