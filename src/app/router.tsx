import { createBrowserRouter } from 'react-router-dom'
import LoginPage from '@/features/auth/pages/LoginPage'
import SignupPage from '@/features/auth/pages/SignupPage'
import { ProtectedRoute } from '@/features/auth'
import HomePage from '@/pages/HomePage'
import PlaceholderPage from '@/pages/PlaceholderPage'
import SpacePage from '@/pages/SpacePage'

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/inscription', element: <SignupPage /> },
  { path: '/verifier-email', element: <PlaceholderPage title="Vérification de l’e-mail" /> },
  { path: '/connexion', element: <LoginPage /> },
  { path: '/double-authentification', element: <PlaceholderPage title="Double authentification" /> },
  { path: '/mot-de-passe', element: <PlaceholderPage title="Mot de passe" /> },
  { path: '/activer-compte', element: <PlaceholderPage title="Activation du compte" /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/patient', element: <SpacePage title="Espace patient" /> },
      { path: '/praticien', element: <SpacePage title="Espace praticien" /> },
      { path: '/admin', element: <SpacePage title="Espace administratif" /> },
      { path: '/admin/comptes', element: <PlaceholderPage title="Gestion des comptes" /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
