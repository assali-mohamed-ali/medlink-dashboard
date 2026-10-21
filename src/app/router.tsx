import { createBrowserRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import PlaceholderPage from '../pages/PlaceholderPage'

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/inscription', element: <PlaceholderPage title="Inscription" /> },
  { path: '/verifier-email', element: <PlaceholderPage title="Vérification de l’e-mail" /> },
  { path: '/connexion', element: <PlaceholderPage title="Connexion" /> },
  { path: '/double-authentification', element: <PlaceholderPage title="Double authentification" /> },
  { path: '/mot-de-passe', element: <PlaceholderPage title="Mot de passe" /> },
  { path: '/activer-compte', element: <PlaceholderPage title="Activation du compte" /> },
  { path: '/admin/comptes', element: <PlaceholderPage title="Gestion des comptes" /> },
]

export const router = createBrowserRouter(routes)
