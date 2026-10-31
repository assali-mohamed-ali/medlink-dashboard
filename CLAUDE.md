# medlink-dashboard — instructions for AI assistants and new sessions

MedLink is a health portal (patients, practitioners, administrative staff, three clinics). This repository is its
React front. It talks only to our API, `api-MedLink` (Spring Boot), which is the only component that talks to
Keycloak. Read **docs/ONBOARDING.md** and **CONTRIBUTING.md** ("Team rules") before any change.

## Mandatory AI Contribution Disclosure

Any AI agent working on this repository MUST follow these rules:

1. **Disclose AI usage:** if you generate, modify, refactor, or materially influence any code, tests,
   configuration, documentation, or other files in a change, disclose AI assistance in the Pull Request.
2. **Update the PR description:** the `Utilisation de l'IA` section offers two exclusive choices. Check exactly one:
   `- [x] J'ai utilisé des outils d'IA générative pour contribuer à cette PR.` when AI was used, or
   `- [x] Cette PR n'utilise pas d'outils d'IA générative.` when it was not.
3. **Human review:** when AI was used, include `- [ ] Je confirme avoir relu, compris et validé les modifications
   proposées par l'IA.` and never check it on behalf of the human contributor.
4. **No false declarations:** never claim that tests passed, security checks were completed, or a human reviewed
   the code unless it was actually confirmed.
5. **Before finishing:** verify that the PR description discloses AI assistance; if you cannot edit it, tell the
   user they must update it before requesting review.
6. **No exceptions** for small changes.

## Start here, every session

1. Ask whose tickets you work on (YouTrack project `MLink`, `https://medlink.youtrack.cloud`). Work only on that
   person's tickets; on a teammate's ticket, comment instead of coding.
2. Check the worktree: clean status, in sync with the remote, no unknown stash. Pull `master`, then branch.
3. Read the API contract you need in `api-MedLink/docs/sprints/sprint-2/plan.md` §4.

## Hard rules

- **The browser never talks to Keycloak.** Every identity flow goes through `/api/auth/...`.
- **Only an HttpOnly session cookie** (+ the readable `XSRF-TOKEN`); `apiFetch` handles CSRF. Nothing about the
  session in web storage. Who is logged in comes from `useAuth()` (restored with `GET /api/auth/me`).
- **Never log or show** a password, a TOTP code, a mailed token, a secret or a full API response.
- **Structure and imports:** `app` → `spaces`/`pages` → `features` → `shared`; features through their `index.ts`;
  `@/` across folders. `npm run lint` enforces it: never disable the rule to make code pass.
- **API calls** only in a feature's `api.ts` through `apiFetch`; errors shown with `messageFor`.
- **URLs** from `shared/config/paths.ts`. The mailed pages (`/verifier-email`, `/configurer-code`,
  `/activer-compte`) are part of the API contract.
- **UI** from `shared/ui` with the tokens of `shared/styles/tokens.css`. Screen text in French, accessible
  (labels, `role="alert"` for errors).
- **A task is done when a test proves it:** one test per API answer; a guarded page is tested with the right role
  and a wrong role; red commit first, then green, then check that breaking the rule turns a test red.
- **The CSP is `'self'`:** self-host any asset; no third-party script, style, font or image.

## Versions (do not downgrade to make code compile)

Node 22 · React 19 · TypeScript 6 · Vite 8 · React Router 7 · Vitest 5. Use only APIs of these versions.

## Commands

- `npm ci` · `npm run dev` (port 3000, `/api` proxied to `localhost:8080`) · `npm test` · `npm run lint` ·
  `npm run build` · `npm run preview`.
- The API's dev stack: `scripts/setup-dev.ps1` or `scripts/setup-dev.sh` in `api-MedLink`.
- The production image with the API on one origin: `docker compose -f deploy/docker-compose.local.yml up --build -d`,
  then `http://localhost:8090`.
- Before every push: `npm ci && npm test && npm run lint && npm run build`.

## Git

- Never commit on `master`, `staging` or `Production`. Branch: `feat/MLink-<id>-<slug>`, `fix/…`, `docs/…`,
  `chore/…`.
- One commit per task step, prefixed `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`, naming the ticket.
- PRs to `master` only (no stacked PRs), template filled honestly; the code owner (@assali-mohamed-ali) reviews.
