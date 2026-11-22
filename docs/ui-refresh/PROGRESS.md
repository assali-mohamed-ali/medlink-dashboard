# UI refresh: progress and hand-over

**A new session starts here.** Read this file, then [PLAN.md](PLAN.md) (the why and the what), then the repo's
`CLAUDE.md`, `CONTRIBUTING.md` (Team rules) and `docs/ONBOARDING.md` §7 (UI library and tokens).

Work for: **Mohamed** (YouTrack `Mohamed.BenNaima`, also "Al-Assad"). Teammate pages (Home, Signup, password pages):
**Ahlem** (`Ahlem.SAKLY`, GitHub `sakly123`); change them only with her written OK on her ticket.

## Status

| Step | State | Commit / PR | Notes |
|---|---|---|---|
| Plan written | ✅ 2026-10-30 | this folder | research, audit, design direction, roadmap |
| D1–D4 decisions | ⏳ waiting | — | B0 specimen first; defaults in PLAN.md §6 |
| YouTrack ticket "[FE] UI refresh" | ⏳ not created | — | show the text to Mohamed before posting |
| B0 specimen `/__specimen` | ⬜ | | dev only |
| B1 fonts + type scale | ⬜ | | |
| B2 tokens v2 + contrast script | ⬜ | | red first: `--outline-variant` fails 3:1 |
| B3 components | ⬜ | | |
| B4 words (my pages) | ⬜ | | |
| B5 space shell | ⬜ | | |
| B6 space homes | ⬜ | | |
| C1 home, C2 login/signup layout | ⬜ | | Ahlem's OK needed |
| D1–D4 quality pass | ⬜ | | |

Legend: ✅ done · ⏳ waiting on someone · 🔄 in progress · ⬜ not started.

## Next step

1. Check where the foundation is: PR medlink-dashboard#11 (`feat/MLink-6-front-auth-foundation`). If it is merged,
   pull `master` and branch `feat/MLink-<new ticket>-ui-refresh`. If not, ask Mohamed (decision D4): the refresh builds
   on #11's `shared/ui` and tokens, and PRs are never stacked.
2. Build **B0**, the specimen page, then stop for the team's choice of D1/D2.

## Facts a new session needs

- **Stack**: React 19, TS 6, Vite 8, React Router 7, Vitest 5, oxlint, CSS Modules + `src/shared/styles/tokens.css`. Icons:
  `lucide-react` (already a dependency). No Tailwind, no UI kit.
- **CSP is `'self'`** (`deploy/nginx/security-headers.conf`): fonts come from `@fontsource` npm packages, never a CDN.
  Candidates checked on npm 2026-10-30, all OFL-1.1, v5.3.0: `@fontsource-variable/plus-jakarta-sans`,
  `@fontsource/instrument-serif`, `@fontsource-variable/geist`, `@fontsource-variable/fraunces`.
- **Watermelon UI** (MCP `mcp__claude_ai_Watermelon_UI__*`, connected) is shadcn + Tailwind: use it for **inspiration**
  (`get_inspiration`, `get_component`), then rebuild in CSS Modules. Useful entries: `medesk-dashboard` (healthcare:
  Geist + Instrument Serif, 224 px sidebar, 50 px top bar, 10 px radius, 14 px medium text), `macos-sidebar`,
  `navigation-1`.
- **Design skill**: `ui-ux-pro-max` (`--design-system`, `--domain typography|ux|color`); ignore its palettes (the team's
  colours stay).
- **Contrast today** (WCAG): text pairs pass (primary on white 9.08); `--outline-variant #bfc9c4` field borders 1.70:1
  (fail, needs 3:1); `--outline #707975` 4.49:1 (just fails 4.5:1). Proposed neutrals in PLAN.md §4.2 are verified.
- **Local run**: the API dev stack (`api-MedLink/scripts/setup-dev.ps1`), `npm run dev` on 3000, Mailpit on 8025; dev
  accounts in `docs/ONBOARDING.md` §1; full manual checks in `docs/MANUAL-TESTING.md`.
- **Screens to compare before/after**: `/`, `/connexion`, `/inscription`, `/double-authentification`, `/configurer-code`,
  `/verifier-email`, `/patient`, `/praticien`, `/admin`, `/acces-refuse`, a 404; at 375 and 1440 px.

## Log

- **2026-10-30**: plan written after a browser review of home, login and signup, the code audit (tokens, CSS sizes,
  owners), the contrast script, online research and Watermelon UI references. Nothing implemented yet.
