# Manual test guide

Step-by-step checks of every flow the front has today, against the real API on your machine. Run them before a
demo, after a big change, or to review a pull request. Each step says what to do and what you must see; tick the
box when it matches. Automated tests (`npm test`) cover the same rules screen by screen; this guide proves the whole
chain: browser → Vite → API → Keycloak, PostgreSQL, Mailpit.

Time: about 20 minutes for everything, 5 for the patient part alone.

## 0. Before you start

1. **API dev stack** (in `api-MedLink`): `scripts/setup-dev.ps1` (Windows) or `scripts/setup-dev.sh`. Wait for the
   green summary. Check: `http://localhost:8080/actuator/health` shows `"status":"UP"`.
2. **Front** (here): `npm ci` once, then `npm run dev`. Open **`http://localhost:3000`**: the mail links open
   this address (the Docker image on 8090 is section 9).
3. **Mailpit** (the API's mails): `http://localhost:8025`.
4. **An authenticator app** on your phone: Google Authenticator, Microsoft Authenticator or FreeOTP.
5. Open the browser's dev tools (F12), tabs **Console** and **Network**: you will check them on the way.

Dev accounts (password in [ONBOARDING.md §1](ONBOARDING.md#1-first-run-about-5-minutes)):
`patient.dev@medlink.local`, `practitioner.dev@medlink.local`, `staff.dev@medlink.local`.

> **Read this, or you will lock yourself out:**
> - 5 wrong passwords lock an account for 15 minutes, and **2 wrong passwords within one second** do too
>   (Keycloak's quick-login check). Leave a few seconds between wrong tries.
> - The locked message is the same as the wrong-password one on purpose (never tell an attacker which is true).
> - Cookies are shared by every port of `localhost`: after using 8081/8090, clear the `localhost` cookies
>   (dev tools → Application → Cookies) before testing on 3000.

Reset helpers (dev only):

| To | Run |
|---|---|
| Set up the code again for an account | `docker exec api-medlink-postgres-1 psql -U myuser -d mydatabase -c "delete from user_mfa where user_id=(select id from users where username='practitioner.dev')"` |
| Start from a clean stack (all accounts, codes and locks) | `scripts/setup-dev.ps1 -Reset` in `api-MedLink` |
| Unlock an account | wait 15 minutes, or `-Reset` |

## 1. Visitor and guards

- [ ] Open `/`: the home page shows, with its images (all served by us: no request to another site in Network).
- [ ] Open `/patient`: you land on `/connexion`. No "session a expiré" notice (you never had a session).
- [ ] Open `/praticien` and `/admin`: same, `/connexion`.
- [ ] Open `/nimporte-quoi`: "Page introuvable".
- [ ] Console: one `401` on `api/auth/me` is normal (the app asks "who is logged in?" and the answer is nobody).

## 2. Sign up and confirm the e-mail (patient)

1. [ ] `/inscription`: submit the empty form. Every required field says what is missing; nothing is sent.
2. [ ] Fill it with a **new** address (e.g. `test1@medlink.local`), a password that follows the rules shown, tick
   the consent, submit. You see "Ouvrez le lien reçu par e-mail pour confirmer votre adresse."
3. [ ] Try to log in with this account now: refused (the address is not confirmed yet).
4. [ ] Mailpit: open the mail, click the link. The browser opens `localhost:3000/verifier-email?token=…` and the
   **token disappears from the address bar** at once.
5. [ ] You see "Votre adresse e-mail est confirmée." and a link to the login.
6. [ ] Click the same mail link again: "Ce lien a expiré ou a déjà servi." and a "Recevoir un nouveau lien" button.
7. [ ] Click "Recevoir un nouveau lien" with any address: the answer is the same whether the account exists or not.
8. [ ] Log in with the new account: you reach `/patient`.

## 3. Patient session

1. [ ] `/connexion`, `patient.dev@medlink.local` + a wrong password: "E-mail ou mot de passe incorrect, ou compte
   temporairement verrouillé." The password field is emptied.
2. [ ] Wait a few seconds, then the right password: you land on **`/patient`**, "Espace patient", menu "Accueil",
   your name and a "Se déconnecter" button.
3. [ ] **Refresh (F5): you stay logged in** (the app restores the session with `GET /api/auth/me`).
4. [ ] Open `/admin`: "Accès refusé", with "Retour à mon espace" leading back to `/patient`.
5. [ ] Open `/connexion` while logged in: you are sent to `/patient` (no second login).
6. [ ] Dev tools → Application → Cookies: the session cookie is **HttpOnly**; `XSRF-TOKEN` is the only readable
   one. Local Storage and Session Storage hold **nothing** about the session.
7. [ ] Network: no request goes to Keycloak (`:8180`); only `/api/...` and our own files.
8. [ ] "Se déconnecter": back to `/connexion`, no "session a expiré" notice. F5: still logged out. Browser **Back**:
   the space does not come back.

## 4. Code setup, first time (practitioner or staff)

Start with an account that has no code yet (reset helper above).

1. [ ] `/connexion`, `practitioner.dev@medlink.local` + password: you land on `/double-authentification`, which
   says "Ouvrez le lien reçu par e-mail". **No session yet**: `/praticien` still sends you to `/connexion`.
2. [ ] Mailpit: a mail with a code setup link (valid 30 minutes, single use). Click it **in the same browser**.
3. [ ] `localhost:3000/configurer-code?token=…` opens, the **token leaves the address bar**, and you see
   "Configurez votre application": the steps, the **QR code** and the **manual key** under it.
4. [ ] In the app: **+** → *Scan a QR code* (or *Enter a setup key* with the key shown). An entry "MedLink" with your e-mail appears.
5. [ ] Type a wrong 6-digit code: "Code incorrect. Vérifiez le code affiché dans votre application." You stay.
6. [ ] Type the code shown in the app: you land on **`/praticien`** ("Espace praticien").
7. [ ] Log out, then open the same mail link again: it never shows a new QR code (the link works once).
8. [ ] Same steps with `staff.dev`: you land on **`/admin`**, with the extra menu entries "Gestion des comptes" and
   "Journal d’audit".

Extra cases:
- [ ] Open the setup link **before** logging in (or in a private window): you are sent to `/connexion`; after the
  password you come back to the QR code by yourself (the token is kept in memory, never in the address).
- [ ] Wait more than 5 minutes between the password and the code: "Votre étape de connexion a expiré (5 minutes).
  Reconnectez-vous."

## 5. Code at the next logins

1. [ ] Log out, log in again with the same account: `/double-authentification` shows the **code field directly**
   (no new mail; check Mailpit).
2. [ ] `12ab56` or 5 digits: "Saisissez les 6 chiffres du code.", nothing is sent. On a phone the keyboard is
   numeric and the code from an SMS-style autofill is offered.
3. [ ] Right code: your space. **Refresh: still logged in.**
4. [ ] A code already used once is refused (each code works once, even within its 30 seconds).
5. [ ] Lock (do it last, it blocks the account's code step for 15 minutes): 5 wrong codes in a row →
   "Trop de codes incorrects.", the form disappears, a link goes back to the login.

## 6. Role separation (one role per person)

| Logged in as | Open | Expected |
|---|---|---|
| patient | `/praticien`, `/admin`, `/admin/comptes`, `/admin/journal-audit` | "Accès refusé" |
| practitioner | `/patient`, `/admin`, `/admin/journal-audit` | "Accès refusé" |
| staff | `/patient`, `/praticien` | "Accès refusé" |
| nobody | any of them | `/connexion` |

- [ ] All rows checked. (The front's guard is comfort; the API refuses the data anyway: see section 7d, part C.)

## 7. Errors and outages

- [ ] Stop the API, then log in: a short French message ("Un problème est survenu de notre côté. Réessayez dans un instant." through
  Vite's proxy; "Connexion impossible…" when the network itself is down), no blank page, no technical
  text.
- [ ] Restart the API, try again: it works without reloading the page.

## 7b. Look and feel (UI refresh, docs/ui-refresh/PLAN.md)

At 1440, 900 and 375 px wide (DevTools device bar), on `/`, `/connexion`, `/inscription`, a 404 and each space:

- [ ] Text is in Geist (DevTools → Computed → font-family; Network shows one `geist-latin` file, from our own origin).
- [ ] No horizontal scroll at 375 px (or 320 px); nothing hidden under the header.
- [ ] Tab through a page: every stop shows the green focus ring or an outline; in a space the first Tab shows
  "Aller au contenu".
- [ ] Space menu: a sidebar at 1440, icons only at 900, a bottom bar at 375; the current page is highlighted.
- [ ] Space home: "Bonjour <prénom>", the role's parts; only "Gestion des comptes" and "Journal d’audit" (staff) are
  links, the others say "Bientôt disponible".
- [ ] Zoom 200 % (Ctrl +) at 1440: the page reflows, no text cut off.

## 7c. Password (MLink-89)

Use the account you created in section 2 (`test1@medlink.local`), not a dev account: Keycloak keeps the last 3
passwords, so a dev account cannot go back to its usual password (`scripts/setup-dev.ps1 -Reset` restores them all).

Own change (logged in), a page of your space (`/patient/mot-de-passe`, `/praticien/…`, `/admin/…`):
- [ ] Menu "Mot de passe": you **stay in your space** (its menu with "Mot de passe" marked, your name, "Se
  déconnecter"; no public header). The page asks the current password, the new one and its confirmation, and says
  you will be logged out of every device. The rule checklist ticks as you type (icon and text, not colour alone).
- [ ] Logged in, type `/mot-de-passe` in the address bar: you land on your space's password page.
- [ ] Two different new passwords: "Les deux mots de passe ne sont pas identiques.", nothing sent (Network).
- [ ] A wrong current password: "Le mot de passe actuel est incorrect." under that field; you stay.
- [ ] One of your last 3 passwords: Keycloak's message under the new password.
- [ ] Right values: back to `/connexion` with "Mot de passe changé…" (not "session expirée"); F5 and `/patient` show
  you are logged out; the old password is refused, the new one works and opens your space's home (not the password
  page).

Forced change (staff reset it):
- [ ] Keycloak admin (`http://localhost:8180`, dev only) > realm `medlink` > Users > the account > "Required user
  actions": add "Update Password", save. Log in on 3000: you land on `/mot-de-passe`, "Choisissez un nouveau mot de
  passe", with no current-password field.
- [ ] Wait more than 5 minutes, then submit: back to `/connexion` with "Votre étape de connexion a expiré".
- [ ] Log in again, choose a new password: `/connexion` with "Mot de passe changé…"; the new password logs you in.
- [ ] Open `/mot-de-passe` logged out (no forced step): you are sent to `/connexion`.

## 7d. Audit log: screen, completeness and access (MLink-116, MLink-117)

The audit log is append-only and only the administrative staff can read it (`GET /api/admin/audit-entries`). The
API must run with the audit feature (the branches of MLink-115 and MLink-72 or later), and you need `staff.dev`
with its code set up (section 4). Do part A last, after parts B and C have produced entries to look at.

If the API runs on another port than 8080 (for example 8081 because another program uses 8080), point the proxy of
your own copy of `vite.config.ts` at it and never commit that change.

### Part A. The screen (staff)

- [ ] Logged in as `staff.dev`: the menu has "Journal d’audit"; it opens `/admin/journal-audit` and the entry is
  marked as the current page.
- [ ] Network shows `GET /api/admin/audit-entries` answering `200`: the rows come from the API, not from a mock.
- [ ] While loading, grey placeholders show; then a table of entries (date, action, outcome, and who/what it
  concerns). Dates are on one line; actions and outcomes are in French (no raw `ACCOUNT_CREATED` unless the
  action is unknown to the front).
- [ ] An outcome that failed or was refused is shown with a "danger" look (icon and text, not colour alone):
  "Échec" or "Refusé"; a good one is "Réussi".
- [ ] Filter by action: only those entries remain; the list restarts at page 1.
- [ ] Filter by dates: an end date before the start date is refused with a message, and **nothing is sent**
  (Network).
- [ ] Type something that is not a UUID in the user or resource filter: refused with a message, nothing sent.
- [ ] More than 50 entries: the pager works (next, previous), the first page has no "previous".
- [ ] Stop the API, reload the page: an error message with a "Réessayer" button; start the API, click it: the table
  comes back without reloading.
- [ ] Empty result (a filter nothing matches): a clear "no entry" message, not an empty table.
- [ ] The log never shows a password, a code, a token or an e-mail address in clear: only identifiers.

### Part B. Completeness: every sensitive action leaves an entry

For each row: do the action, then reload `/admin/journal-audit` as staff and look for the new entry (right action,
right outcome, a date of a few seconds ago, an identifier and not personal data). Rows marked "to confirm" are
the ones to check in `api-MedLink` if the entry does not appear: a missing entry is a finding, not a mistake of
yours.

| Action shown | How to cause it | Expected entry |
|---|---|---|
| Connexion (`LOGIN`) | Log in with a dev account (section 3 or 5) | "Connexion", "Réussi"; a wrong password gives "Échec" (to confirm) |
| Changement de mot de passe exigé (`PASSWORD_CHANGE_REQUIRED`) | Forced change, section 7c | "Changement de mot de passe exigé" for that account |
| Accès refusé (`ACCESS_DENIED`) | Part C, step 4 (a patient calls the audit API) | "Accès refusé", "Refusé" |
| Consultation de données (`DATA_READ`) | Staff reads the audit log or lists accounts (to confirm) | an entry, or a gap to report (see part D) |
| Compte créé (`ACCOUNT_CREATED`) | A patient signs up (section 2) or staff creates an account (to confirm) | "Compte créé" |
| Compte modifié (`ACCOUNT_UPDATED`) | Staff edits an account (no screen yet: API only) | **Never recorded today**: see part D |
| Rôle modifié (`ROLE_CHANGED`) | Staff changes a role (no screen yet: API only, to confirm) | "Rôle modifié" |
| Compte activé / désactivé (`ACCOUNT_ENABLED`, `ACCOUNT_DISABLED`) | Staff enables or disables an account (no screen yet: API only, to confirm) | "Compte activé" / "Compte désactivé" |
| Créneau ouvert / fermé (`SLOT_OPENED`, `SLOT_CLOSED`) | A practitioner opens or closes a slot (no screen yet) | "Créneau ouvert" / "Créneau fermé" |
| Dossier patient consulté (`RECORD_VIEWED`) | A practitioner opens a patient record (no screen yet) | "Dossier patient consulté" |

- [ ] Every row you can cause today is checked. For the others, write "no screen yet" in the MLink-117 comment
  instead of ticking it.
- [ ] A refused or failed action leaves an entry too (outcome "Échec" or "Refusé"), not only the successful ones.
- [ ] Nothing in the log can be edited or deleted from the screen (it has no such button), and the API has no such
  route.

### Part C. Access restriction

1. [ ] **Staff** (`staff.dev`): `/admin/journal-audit` opens the table; Network shows `GET /api/admin/audit-entries`
   answering `200`.
2. [ ] **Patient** (`patient.dev`): open `/admin/journal-audit`: "Accès refusé", and Network shows **no** request to
   `/api/admin/audit-entries`. The menu of the patient space has no audit entry.
3. [ ] **Practitioner** (`practitioner.dev`): same as the patient.
4. [ ] **The API refuses even without the front**: logged in as the patient, in the Console type
   `fetch('/api/admin/audit-entries').then(r => console.log(r.status))`. Expected: `403`. Then, as staff, reload
   the log: an "Accès refusé" entry from that attempt appears (to confirm).
5. [ ] **Nobody logged in**: open `/admin/journal-audit`: you land on `/connexion`. The same `fetch` in the Console
   answers `401`.
6. [ ] An unknown action in the filter (in the Console: `fetch('/api/admin/audit-entries?action=NOPE')`)
   answers `400`, not `500`.

### Part D. Gaps found while preparing MLink-117 (to report to Md. Assali, not to fix here)

Each line is a finding in the API, written after reading its code or seeing it on a running stack; none is fixed
by the front.

- `ACCOUNT_UPDATED` exists in the list of actions and the front labels it, but **no code records it**: editing an
  account leaves no entry.
- Not seen recording an entry: the account activation by mail link, a user's own password change, the code
  (MFA) setup, the patient sign-up, and reading the audit log itself.
- To confirm on a running stack: the "Connexion" entry shows no user and no IP address, which makes it of little
  use for tracing who logged in.
- When you finish parts B and C, add here every row that stayed without an entry.

## 8. Not testable by hand yet

- **"Votre session a expiré"** after the API ends an open session: no page of the spaces calls the API yet (the
  spaces only have "Accueil"), so nothing triggers it by hand. `src/app/sessionExpiry.test.tsx` and the
  `AuthProvider` tests cover it until the first real space page lands.
- `/activer-compte` (MLink-71) and `/admin/comptes` (MLink-73): placeholder pages for now.

## 9. The production image (optional)

`docker compose -f deploy/docker-compose.local.yml up --build -d` with the API's dev stack running, then
`http://localhost:8090` (the image behind a local reverse proxy; see [deploy/README.md](../deploy/README.md)).

- [ ] `curl -I http://localhost:8090/` shows `Content-Security-Policy`, `X-Frame-Options: DENY`,
  `Referrer-Policy: same-origin`; `curl -I` on a file of `/assets/` shows `max-age=31536000, immutable`.
- [ ] `http://localhost:8081/api/auth/me` answers `502 API_NOT_ROUTED`: the dashboard image never serves `/api`
  itself, the proxy in front does.

- [ ] Sections 1, 3 and 6 on `http://localhost:8090`: same results as on 3000 (login, refresh, guards, logout).
  Mail links still open 3000 (`APP_FRONTEND_URL`): run sections 2, 4 and 5 on 3000.
- [ ] The Console shows no CSP violation from our pages.

Console lines from browser extensions are not ours: `customElements.js`, `ajaxRequestInterceptor`, `inspector.js`,
"unload is not allowed", and CSP blocks of stylesheets the extension injects (e.g. `fonts.googleapis.com`: MedLink
loads no third-party file; the CSP blocking them is the CSP working). Test in a private window without extensions
to get a clean console.

## When something does not match

Note the step, what you saw, the Console and the failing request in Network (status and `code` of the answer, never
a password, code or token), and see [ONBOARDING.md §10 Troubleshooting](ONBOARDING.md#10-troubleshooting).
