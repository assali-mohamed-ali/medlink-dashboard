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
| D1, D2 decisions | ✅ 2026-10-30 | — | Mohamed: **D1 = B** (Geist + Instrument Serif), **D2 = proposed greys**; D3 still open |
| YouTrack ticket "[FE] UI refresh" | ✅ 2026-10-30 | **MLink-162** | unassigned, no sprint (Mohamed: assign nothing); comment for Ahlem on MLink-81 |
| B0 specimen `/__specimen` | ✅ 2026-10-30 | `65498c6`, `2328f22`, `9b05f15` | built, dev only; waiting on Mohamed's D1/D2 pick |
| B1 fonts + type scale | ✅ 2026-10-30 | `95418cf`, `a1e5815`, `ea82b22` | Geist + Instrument Serif, Latin only, 2 files 50.4 kB |
| B2 tokens v2 + contrast script | ✅ 2026-10-30 | `878699f`, `94b0bbb` | 21 pairs pass; `npm run check:contrast` in CI |
| B3 components | ✅ 2026-10-30 | `ac56811`…`6d6c40c`, `a2f3cb7`, `a03c2f2` | upgrades + Card, EmptyState, Skeleton, Select, Checkbox, RadioGroup, StatusBadge, UserAvatar; shown in the specimen |
| B4 words (my pages) | ✅ 2026-10-30 | see log | error messages, login notice; MFA/verify/status pages had no jargon |
| B5 space shell | ✅ 2026-10-30 | `e4371ae`, `8fc2aea` | no dropdown yet (no "Mon compte" page); not seen in a browser: dev login timed out |
| B6 space homes | ✅ 2026-10-30 | `53ffd7a` + next | greeting + parts per role from spaces.ts; not seen in a browser (login times out) |
| C1 home, C2 login/signup layout | ⬜ | | Ahlem's OK needed |
| D1–D4 quality pass | 🔄 | `8a6c123`…`b800a8b` + style | D3 budget in CI; D1 focus outline for plain links; patient space seen at 1440/900/375; NVDA by hand left |

Legend: ✅ done · ⏳ waiting on someone · 🔄 in progress · ⬜ not started.

## Next step

1. `git checkout feat/MLink-128-ui-kit && git pull`. It is built on #11 (`feat/MLink-6-front-auth-foundation`): if #11
   has new commits, merge them in (never force-push). Open this branch's PR **only after #11 is merged** into `master`
   (then merge `master` in first).
2. **Left of Phase D**: an NVDA spot check by hand (login, signup, a space: headings, landmarks, the skip link,
   errors read out), the practitioner and staff spaces in the browser (they need the TOTP code; their tests pass).
   Then the **PR** once #11 is merged (merge `master` in first; AI disclosure; before/after screenshots at 375 and
   1440 px; list the new packages and the shared files, as on MLink-162).
   Open: `HomePage.css` font and token copies, and the home's heading jump h2 → h4 (Ahlem's; not yet added to
   MLink-81: ask Mohamed first); the specimen still opens on option A; the timeout message kept its old voice.
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

- **2026-10-30**: the dev login works again. Slow Tab run on /connexion: every stop has a focus mark (the earlier
  "none" was a timing artefact); plain links had only the browser's thin outline, now a 2 px green one (red then
  green). Patient space seen at 1440 (sidebar), 900 (72 px rail, labels hidden but read) and 375 px (bottom bar,
  logout still named): no overflow, one main; home cards made compact. 179 tests, lint, build, budget green.

- **2026-10-30**: D3: entry JavaScript had grown to 88.2 kB gzip (Base UI + the space shell in the entry chunk), now
  70.8 kB with the spaces lazy under the guard; `scripts/budget.mjs` + CI step (red at 87.3 kB first). D1/D2 audit of
  the 10 public pages at 320 px: lang, one main, one h1, labels, names, alt, no overflow: all pass except the home's
  h2 → h4 jump (Ahlem's). CSP scan of `dist`: no external URL, no inline script or style. 178 tests green.

- **2026-10-30**: B6 done (red then green; a link to a page that does not exist turns its test red): greeting and
  role parts from `spaces.ts`. 175 tests, lint, build, contrast green. Phases A and B of the plan are complete.

- **2026-10-30**: B5 done (red then green, removing the focus call turns its test red): one restyled `<nav>`,
  top bar with initials and role, skip link, focus on the h1 after navigation, `SpaceComingSoon` for /admin/comptes.
  170 tests, lint, build green. Browser check blocked: the dev API timed out on login.

- **2026-10-30**: B4 done (red then green): generic and network error messages per PLAN.md §4.6, login notice without
  "TOTP"; 162 tests, lint, build green.

- **2026-10-30**: B3b done: 8 new components, the Watermelon badge copies replaced by `StatusBadge`; 161 tests,
  lint, build, contrast green; seen in the specimen. Break-the-rule: an unnamed Card fails its test; lucide already
  hides icons by default, so dropping our `aria-hidden` cannot break the badge test (removing the icon does).

- **2026-10-30**: MLink-162 created (unassigned) and a comment for Ahlem on MLink-81 (home font, words, claims,
  layout waits for her OK). Checked in the browser at 1440 px and 375 px: login, signup, verify e-mail, 404, access
  denied in Geist, no horizontal scroll; home still on the system font (her `HomePage.css`). B3a done: 144 tests, lint,
  build, 26 contrast pairs green. Visible: buttons at weight 500, disabled fields dashed.

- **2026-10-30**: B1 (fonts, type scale, base heading styles, `MedLinkShell.css` reads `--font-sans`) and B2 (tokens
  v2 with aliases, spacing/radius/elevation/motion/layout, `scripts/contrast.mjs` + CI step, shadcn border/input
  mapping, `MedLinkShell.css` local token copies removed). Each red first; breaking `--border-strong` turns the check
  red. 137 tests, lint, build, check:contrast green. Not yet looked at in a browser.

- **2026-10-30**: Mohamed picked D1 = option B (Geist + Instrument Serif) and D2 = the proposed greys. The 3001 dev
  server was stopped by Claude Code (low memory); restart it only when asked.

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
