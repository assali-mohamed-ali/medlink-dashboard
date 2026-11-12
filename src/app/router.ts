import { createBrowserRouter } from 'react-router-dom'
import { routes } from './routes'

// The route table lives in routes.tsx (tests build a memory router from it); this is the browser's router.
export const router = createBrowserRouter(routes)
