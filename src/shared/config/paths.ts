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
  forgotPassword: '/mot-de-passe-oublie',
  resetPassword: '/reinitialiser-mot-de-passe',
  signup: '/inscription',
  verifyEmail: '/verifier-email', // mailed by the API
  mfa: '/double-authentification',
  configureCode: '/configurer-code', // mailed by the API
  password: '/mot-de-passe', // the forced change right after a login (no session yet); logged in: the space's page
  activateAccount: '/activer-compte', // mailed by the API
  accessDenied: '/acces-refuse',
  patient: {
    root: '/patient',
    slots: '/patient/creneaux',
    appointments: '/patient/rendez-vous',
    results: '/patient/resultats',
    reports: '/patient/comptes-rendus',
    documents: '/patient/documents',
    profile: '/patient/profil',
    password: '/patient/mot-de-passe',
  },
  // A patient's record: patients/:id (MLink-31)
  practitioner: {
    root: '/praticien',
    absences: '/praticien/absences',
    agenda: '/praticien/agenda',
    patients: '/praticien/patients',
    profile: '/praticien/profil',
    password: '/praticien/mot-de-passe',
  },
  staff: {
    root: '/admin',
    booking: '/admin/reservation',
    deletionRequests: '/admin/demandes-suppression',
    accounts: '/admin/comptes',
    clinicAssignments: '/admin/comptes/affectations',
    documents: '/admin/documents',
    audit: '/admin/journal-audit',
    stats: '/admin/statistiques',
    activity: '/admin/rendez-vous',
    profile: '/admin/profil',
    password: '/admin/mot-de-passe',
  },
  specimen: '/__specimen', // dev only (npm run dev): the UI refresh specimen, absent from production builds
} as const
