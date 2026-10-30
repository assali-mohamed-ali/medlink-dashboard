# UI refresh: progress and hand-over

**A new session starts here.** Read this file, then [PLAN.md](PLAN.md) (the why and the what), then the repo's
`CLAUDE.md`, `CONTRIBUTING.md` (Team rules) and `docs/ONBOARDING.md` §7 (UI library and tokens).

Work for: **Mohamed** (YouTrack `Mohamed.BenNaima`, also "Al-Assad"). Teammate pages (Home, Signup, password pages):
**Ahlem** (`Ahlem.SAKLY`, GitHub `sakly123`); change them only with her written OK on her ticket.

## Status

| Step | State | Commit / PR | Notes |
|---|---|---|---|
| Plan written | ✅ 2026-10-30 | this folder | research, audit, design direction, roadmap |
| Tailwind + shadcn + Watermelon configured | ✅ 2026-10-30 | `feat/MLink-128-ui-kit` | no reset, scan limited, colours mapped, `cn` pinned, guard test |
| D4 branch | ✅ 2026-10-30 | — | work on `feat/MLink-128-ui-kit` now; open its PR only after #11 merges (no stacked PRs) |
| D1–D3 decisions | ⏳ waiting | — | B0 specimen first; defaults in PLAN.md §6 |
| YouTrack ticket "[FE] UI refresh" | ⏳ not created | — | show the text to Mohamed before posting |
| B0 specimen `/__specimen` | ⏳ 2026-10-30 | `65498c6`, `2328f22`, `9b05f15` | built, dev only; waiting on Mohamed's D1/D2 pick |
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

1. `git checkout feat/MLink-128-ui-kit && git pull`. It is built on #11 (`feat/MLink-6-front-auth-foundation`): if #11
   has new commits, merge them in (never force-push). Open this branch's PR **only after #11 is merged** into `master`
   (then merge `master` in first).
2. **B0 is built**: `npm run dev`, then `http://localhost:3000/__specimen` (toolbar: Option A/B, Gris actuels/proposés).
   Waiting for Mohamed's choice of D1 (A, B or sans only) and D2 (greys yes/no). Then **B1** keeps the chosen
   `@fontsource` packages (move them to `dependencies`, drop the others) and **B2** moves the chosen greys from
   `src/pages/specimen/neutrals.ts` into `tokens.css`.
3. Mohamed starts the session with "go B0" (or similar): Go was given on 2026-10-30 for the whole refresh, but each push
   and each YouTrack post still waits for his OK.

## Facts a new session needs

- **Stack**: React 19, TS 6, Vite 8, React Router 7, Vitest 5, oxlint, CSS Modules + `src/shared/styles/tokens.css`. Icons:
  `lucide-react` (already a dependency). Tailwind 4 + shadcn (Base UI) configured for `src/shared/components`
  (branch `feat/MLink-128-ui-kit`, ONBOARDING §7): `npx shadcn@4.23.0 add <name or Watermelon URL>`, never `init`.
- **CSP is `'self'`** (`deploy/nginx/security-headers.conf`): fonts come from `@fontsource` npm packages, never a CDN.
  Candidates checked on npm 2026-10-30, all OFL-1.1, v5.3.0: `@fontsource-variable/plus-jakarta-sans`,
  `@fontsource/instrument-serif`, `@fontsource-variable/geist`, `@fontsource-variable/fraunces`.
- **Watermelon UI** (MCP `mcp__claude_ai_Watermelon_UI__*`, connected; shadcn + Tailwind + Base UI): find items with
  `get_inspiration`/`search`, check them with `--dry-run --view`, install with the shadcn CLI. Useful entries: `medesk-dashboard` (healthcare:
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

- **2026-10-30**: B0 built (`src/pages/specimen/`). Route only when `import.meta.env.DEV` (tested both ways; no
  specimen chunk or font in `dist`). Fonts as devDependencies, imported by the specimen only. Watermelon `badge-12/13/15`
  retinted to our tokens + shadcn `avatar`. Rejected for now: `macos-sidebar` (needs `motion`, `@hugeicons`),
  `navigation-1` (marketing navbar, 5 primitives), `stats-*` (`react-icons`), `medesk-dashboard` (`recharts`, Geist
  non-variable): B5 picks the sidebar. Seen at 1440 and 375 px (no horizontal scroll). Noted for B3: `TextField` has no
  disabled look; the `PasswordField` eye button is 40×40 (< 44). 128 tests, lint, build green.

- **2026-10-30**: Mohamed: go for the refresh on `feat/MLink-128-ui-kit`; both branches pushed; session changed.
- **2026-10-30**: rule softened (Mohamed): Tailwind 4 + shadcn 4 (Base UI) configured by hand (no `shadcn init`), the
  shadcn `button` added, `var(--secondary)` guard test; pages unchanged in the browser; 118 tests, lint, tsc, build green.
- **2026-10-30**: plan written after a browser review of home, login and signup, the code audit (tokens, CSS sizes,
  owners), the contrast script, online research and Watermelon UI references. Nothing implemented yet.
