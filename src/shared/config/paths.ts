/**
 * Every URL of the app, once. Code navigates with these (`navigate(paths.login)`, `<Link to={paths.signup}>`),
 * never with a typed string, so a URL changes in one place.
 *
 * The API mails some of these pages (verify e-mail, code setup, account activation): their paths are part of
 * the API contract (api-MedLink plan.md §4, "React pages the mails and flows rely on"). Do not rename those.
 */
export const paths = {
  home: '/',
  login: '/connexion',
  signup: '/inscription',
  verifyEmail: '/verifier-email', // mailed by the API
  mfa: '/double-authentification',
  configureCode: '/configurer-code', // mailed by the API
  password: '/mot-de-passe', // the forced change right after a login (no session yet); logged in: the space's page
  activateAccount: '/activer-compte', // mailed by the API
  accessDenied: '/acces-refuse',
  patient: { root: '/patient', password: '/patient/mot-de-passe' },
  practitioner: { root: '/praticien', password: '/praticien/mot-de-passe' },
  staff: {
    root: '/admin',
    accounts: '/admin/comptes',
    audit: '/admin/journal-audit',
    password: '/admin/mot-de-passe',
  },
  specimen: '/__specimen', // dev only (npm run dev): the UI refresh specimen, absent from production builds
} as const
