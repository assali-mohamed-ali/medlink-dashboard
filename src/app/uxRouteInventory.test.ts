import { matchRoutes } from 'react-router-dom'
import { expect, test } from 'vitest'
import { routes } from './routes'

// Independent route inventory from the approved 41-screen V2.3 prototype.
// A match against the catch-all does not count as an implemented feature route.
const inventory = [
  [
    "Public",
    [
      "/",
      "/connexion",
      "/inscription",
      "/mot-de-passe-oublie",
      "/reinitialiser-mot-de-passe",
      "/verifier-email",
      "/double-authentification",
      "/configurer-code",
      "/mot-de-passe",
      "/activer-compte",
      "/acces-refuse",
      "*"
    ]
  ],
  [
    "Patient",
    [
      "/patient",
      "/patient/creneaux",
      "/patient/rendez-vous",
      "/patient/rendez-vous/reaffectations",
      "/patient/resultats",
      "/patient/comptes-rendus",
      "/patient/documents",
      "/patient/profil",
      "/patient/mot-de-passe"
    ]
  ],
  [
    "Practitioner",
    [
      "/praticien",
      "/praticien/agenda",
      "/praticien/absences",
      "/praticien/patients",
      "/praticien/patients/:patientId",
      "/praticien/agenda/reaffectations",
      "/praticien/profil",
      "/praticien/mot-de-passe"
    ]
  ],
  [
    "Staff",
    [
      "/admin",
      "/admin/rendez-vous",
      "/admin/reservation",
      "/admin/comptes/affectations/reaffectations",
      "/admin/comptes",
      "/admin/comptes/affectations",
      "/admin/documents",
      "/admin/demandes-suppression",
      "/admin/journal-audit",
      "/admin/statistiques",
      "/admin/profil",
      "/admin/mot-de-passe"
    ]
  ]
] as const

test('V2.3 inventory contains 41 unique screens', () => {
  const paths = inventory.flatMap(([, entries]) => [...entries])
  expect(paths).toHaveLength(41)
  expect(new Set(paths).size).toBe(41)
})

for (const [group, entries] of inventory) {
  for (const path of entries) {
    test(`${group}: ${path} resolves to the intended route`, () => {
      const url = path === '*' ? '/not-a-medlink-screen' : path.replace(':patientId', 'synthetic-patient')
      const matches = matchRoutes(routes, url)
      expect(matches).not.toBeNull()
      const leaf = matches?.[matches.length - 1]
      if (path === '/patient' || path === '/praticien' || path === '/admin') {
        expect(leaf?.route.index).toBe(true)
        expect(matches?.some(match => match.route.path === path)).toBe(true)
      } else {
        expect(leaf?.route.path).toBe(path)
      }
      if (path.includes(':patientId')) expect(leaf?.params.patientId).toBe('synthetic-patient')
    })
  }
}
