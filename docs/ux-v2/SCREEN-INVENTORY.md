# V2.3 — 41-screen implementation inventory

Source implementation and local acceptance inventory. The approved homepage and patient homepage work from earlier commits are retained. New screen-specific changes use existing API contracts. The wildcard is the not-found screen, not an additional route.

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

## Local acceptance

- Chromium rendered the 41 inventory screens against the local Vite and Spring Boot stack. Checks at 1440px and 390px covered route loading, a single main landmark and primary heading, horizontal overflow and JavaScript errors. The forced-password screen was reached through a real staff login after an administrative reset.
- Synthetic accounts exercised consent registration and verification, recovery, verified email change, session revocation, staff activation and MFA, self-service and staff booking, rescheduling and cancellation, document upload and download, examination-result publication, notification preferences, a two-party transfer, an absence decision, clinic assignment and retention review.
- The running development realm needed the branch’s existing admin-only profile settings before verified email change worked. Keycloak’s direct registration remained off.
- Live report checks covered the pre-consultation guard and patient visibility after a completed synthetic appointment. Live statistics suppressed a small cohort and released a CSV for a dedicated five-patient local cohort. The CSV replay was identical, and a second indicator for the same month was refused.
- Render checks and workflow sampling complement screen-by-screen visual review and CI.
