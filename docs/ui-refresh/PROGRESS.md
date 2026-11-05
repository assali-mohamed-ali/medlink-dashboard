# UI refresh: progress and hand-over

**A new session starts here.** Read this file, then [PLAN.md](PLAN.md) (the why and the what), the repo's `CLAUDE.md`,
`CONTRIBUTING.md` (Team rules) and `docs/ONBOARDING.md` §7 (UI library and tokens). PR text: [PR-DRAFT.md](PR-DRAFT.md).

Work for: **Mohamed** (YouTrack `Mohamed.BenNaima`, also "Al-Assad"). Ticket: **MLink-162** (unassigned on purpose).
Teammate: **Ahlem** (`Ahlem.SAKLY`, GitHub `sakly123`) owns Home, Signup and the password pages (MLink-51/81/89): change
her files only with her written OK, or when Mohamed explicitly decides it (then comment on her ticket what changed).

## Where things stand (2026-11-05, end of session)

- **Done and pushed** on `feat/MLink-128-ui-kit` (in sync with GitHub, 0 commits behind #11): plan, decisions, B0–B6,
  Phase D except the manual checks below. 195 tests, lint, build, `check:contrast` (26 pairs), `check:budget` green.
- **#11 is no longer blocked by missing work.** `/mot-de-passe` (MLink-89) was built by Mohamed's decision on #11's
  branch (`d0c2aaf` red tests, `ed53de3` page); Ahlem told on MLink-89 before and after. CI on #11 green; the code
  owner's re-review was requested. GitHub still shows *changes requested* until he reviews again.
- **This branch's PR opens only after #11 is merged** (no stacked PRs).
- **Demo**: `Downloads/medlink-demo-amel-premiere-visite.gif` (patient journey, signup to logout). It created the dev
  account `amel.bensalah.demo@medlink.local` (dev password); a re-recording needs another address.

## Status

| Step | State | Commit / PR | Notes |
|---|---|---|---|
| Plan, decisions | ✅ 2026-10-30 | this folder | D1 = B (Geist + Instrument Serif), D2 = green greys; D3 (home claims) handled by Ahlem |
| YouTrack | ✅ | **MLink-162** | description + comment listing the shared files; notes for Ahlem on MLink-81 |
| B0 specimen `/__specimen` | ✅ | `9b05f15` … `c30a3f6` | dev only, opens on option B |
| B1 fonts + type scale | ✅ | `ea82b22` | Latin only, 2 files, 50.4 kB |
| B2 tokens v2 + contrast | ✅ | `94b0bbb` | `npm run check:contrast`, CI step |
| B3 components | ✅ | `6d6c40c`, `a03c2f2` | see ONBOARDING §7 table |
| B4 words | ✅ | `54db202` | error messages, login notice |
| B5 space shell | ✅ | `8fc2aea` | no dropdown until a "Mon compte" page exists |
| B6 space homes | ✅ | `bcaa76e`, `bd002ce` | data in `spaces.ts` |
| #11 blocker `/mot-de-passe` | ✅ 2026-11-05 | `d0c2aaf`, `ed53de3` (on #11) | MLink-89, Mohamed's decision, Ahlem notified |
| C1/C2 home, login/signup layout | ⬜ | | Ahlem's pages; her fixes from MLink-81 are in |
| D quality pass | 🔄 | `aaacd1c`, `b800a8b` | budget in CI, focus outline, CSP checked on 8090; NVDA + practitioner/staff by hand left |
| PR | ⏳ | `PR-DRAFT.md` | after #11 is merged |

Legend: ✅ done · ⏳ waiting on someone · 🔄 in progress · ⬜ not started.

## Next step (in order)

1. **Sync**: `git checkout feat/MLink-128-ui-kit && git pull`; `git fetch`; if #11's branch or `master` moved, merge
   them in (never force-push; check: `git log --oneline HEAD..origin/feat/MLink-6-front-auth-foundation`).
   Then `npm ci && npm test && npm run lint && npm run build && npm run check:contrast && npm run check:budget`.
2. **Check #11** (`gh pr view 11 --comments`, `gh api repos/{owner}/{repo}/pulls/11/reviews`): the code owner's
   re-review. Changes asked → fix them on #11 (tell Ahlem on MLink-89/81 which files). Also read MLink-89/81 for Ahlem.
3. **When #11 is merged**: merge `master` in, re-run the checks, take before/after screenshots (375 and 1440 px: `/`,
   `/connexion`, `/inscription`, `/patient`, `/admin`), open the PR to `master` with `PR-DRAFT.md` (AI disclosure:
   tick "J'ai utilisé…", never the human-review box), set MLink-162 to *To Verify* with the PR link (ask first).
4. **By hand, Mohamed**: an NVDA pass (`docs/MANUAL-TESTING.md` §7b), the practitioner and staff spaces (TOTP).
5. **Open choices for Mohamed**: the timeout message ("Le serveur met trop de temps à répondre. Veuillez réessayer.")
   kept its old voice; a "Mon compte" page would bring the user dropdown of PLAN.md §4.5; Phase C waits on Ahlem.

Suggested first message of the next session: *"Read docs/ui-refresh/PROGRESS.md, sync the branch, check #11 (review),
MLink-89 and MLink-81, and give me a brief."*

## Facts a new session needs

- **Working rules (Mohamed)**: ask before every push and every YouTrack post; assign nothing to anyone; brief reports;
  commits name **MLink-162**; red test commit first, then green.
- **Push**: Claude Code's permission check blocks `git push` unless Mohamed allows it (`/permissions`); if blocked, he
  runs `! git push`.
- **YouTrack**: the claude.ai YouTrack connector needs `/mcp` sign-in; without it, the logged-in Chrome tab works
  (comment editor: switch to Markdown, then paste).
- **Run everything**: from `code/`, `powershell -ExecutionPolicy Bypass -File .\dev.ps1 -KeepData` (containers, API on
  8080, Vite on 3000, Mailpit on 8025). `-KeepData` matters: without it a changed realm file wipes Keycloak data (dev
  accounts, TOTP enrolments). Stop: `.\dev.ps1 -Stop`. A stray Vite can hold `[::1]:3000` in a non-LISTEN state that
  `-Stop` misses: find it with `netstat -ano | grep :3000`.
- **Dev accounts**: `docs/ONBOARDING.md` §1 (patient works without TOTP). Production image + strict CSP:
  `docker compose -f deploy/docker-compose.local.yml up --build -d`, then `http://localhost:8090`; `down` after.
- **Stack**: React 19, TS 6, Vite 8, React Router 7, Vitest 5, oxlint. CSS Modules + `shared/styles/tokens.css` for
  `shared/ui`; Tailwind 4 + shadcn (Base UI) only in `shared/components` (`npx shadcn@4.23.0 add …`, never `init`).
  Icons: `lucide-react`. Fonts: `@fontsource` (CSP `'self'`), loaded once in `shared/styles/fonts.css`.
- **Gotchas**: Vitest empties CSS imports (even `?raw`): CSS tests read files with `node:fs`. Heredocs in the Bash
  tool can drop backslashes: write regex-heavy files with the editor. The spaces are lazy chunks
  (`src/app/spaceChunks.ts`); keep new space pages lazy or `check:budget` fails. Dependabot #9 bumps TypeScript to 7:
  against the CLAUDE.md versions, leave it to the team.

## Log

- **2026-11-05**: #11 merged in: `/mot-de-passe` (MLink-89, built by Mohamed with his decision; `d0c2aaf`, `ed53de3`), the
  last blocker of #11. "Mot de passe" added to each space menu with the `KeyRound` icon. 195 tests, lint, tsc, build,
  contrast (26 pairs) and budget green on the merge.
- **2026-11-05**: #11's CI failed on a missing final newline in 3 of Ahlem's files; Mohamed decided to fix it on her
  branch (`4a605ce`, whitespace only, comment on MLink-81). CI on #11 green again. Merged into this branch, pushed.
  #11 still waits on the code owner's review: `/mot-de-passe` (MLink-89, Ahlem) is the remaining blocker.

- **2026-11-05**: synced. #11 had 2 new commits from Ahlem (home: our font token, the h3 heading, softer claims;
  signup: unused fields and the dead 409 removed), merged in with no conflict (her files only). 179 tests, lint,
  build, contrast, budget green. The home page items of MLink-81 are done.

- **2026-10-30**: production image on 8090 (strict CSP, `style-src 'self'`): home, login, signup, 404 and the patient
  space show no CSP refusal, Geist loads. YouTrack: shared files added to MLink-162 (comment), heading note for
  Ahlem on MLink-81. Specimen opens on option B. PR text in `PR-DRAFT.md`. `git push` blocked by the permission
  check: Mohamed pushes.

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
