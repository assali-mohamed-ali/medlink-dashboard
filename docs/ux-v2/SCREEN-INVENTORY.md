# V2.3 — 41-screen implementation inventory

Source implementation pass; not visual acceptance or a CI attestation. The approved homepage and patient homepage work from earlier commits are retained. New screen-specific changes use existing API contracts. The wildcard is the not-found screen, not an additional route.

## Public (12)

| Route | Source implementation |
| --- | --- |
| `/` | Approved homepage retained |
| `/connexion` | Split login |
| `/inscription` | Registration with consent and journey guide |
| `/mot-de-passe-oublie` | Recovery frame |
| `/reinitialiser-mot-de-passe` | Reset frame |
| `/verifier-email` | Verification frame |
| `/double-authentification` | MFA frame |
| `/configurer-code` | Setup frame |
| `/mot-de-passe` | Forced password frame |
| `/activer-compte` | Activation frame |
| `/acces-refuse` | Access-denied frame |
| `*` | Not-found frame |

## Patient (9)

| Route | Source implementation |
| --- | --- |
| `/patient` | Patient home retained from a85f1bd |
| `/patient/creneaux` | Criteria and available-slot views |
| `/patient/rendez-vous` | Upcoming/history switch and date filter |
| `/patient/rendez-vous/reaffectations` | Transfer decision view |
| `/patient/resultats` | Results cards |
| `/patient/comptes-rendus` | Report cards |
| `/patient/documents` | Document page and downloads |
| `/patient/profil` | Profile section views |
| `/patient/mot-de-passe` | Own password and security guidance |

## Practitioner (8)

| Route | Source implementation |
| --- | --- |
| `/praticien` | Daily overview and retry |
| `/praticien/agenda` | Agenda day/week controls |
| `/praticien/absences` | Absence split view |
| `/praticien/patients` | Directory table and search |
| `/praticien/patients/:patientId` | Identity/report/result views |
| `/praticien/agenda/reaffectations` | Recipient transfer decision |
| `/praticien/profil` | Profile sections |
| `/praticien/mot-de-passe` | Own password and guidance |

## Staff (12)

| Route | Source implementation |
| --- | --- |
| `/admin` | Operational home cards |
| `/admin/rendez-vous` | Clinic/week filter and agenda |
| `/admin/reservation` | Booking steps and summary |
| `/admin/comptes/affectations/reaffectations` | Transfer workflow and summary |
| `/admin/comptes` | Account role/status filters |
| `/admin/comptes/affectations` | Searchable assignments and editing |
| `/admin/documents` | Patient-specific document panel |
| `/admin/demandes-suppression` | Request list and retention decision |
| `/admin/journal-audit` | Audit filters and result selection |
| `/admin/statistiques` | Monthly export and published chart |
| `/admin/profil` | Profile sections |
| `/admin/mot-de-passe` | Own password and guidance |

## Acceptance still required

- Build and run regression tests, including the independent route inventory. No CI polling during this implementation pass, at the owner's request.
- Compare desktop/mobile rendered screens to the approved reference; exercise navigation, deep links, keyboard access, error/loading/empty states and live synthetic-account workflows on a non-production stack.
- No fake availability, clinical data, statistics, compliance claims, or unsupported API capabilities. Preserve consent, role guards, MFA, retention, dual approvals, immutable monthly releases and all review/security gates. No production deployment or merge.
