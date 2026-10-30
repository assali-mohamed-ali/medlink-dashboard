# UI refresh plan: calm, premium, one click away

Owner: Mohamed (Al-Assad) · Repo: `medlink-dashboard` · Written 2026-10-30 · Status and next step: **[PROGRESS.md](PROGRESS.md)**
(a new session starts there).

## 1. Goal

Make MedLink look and feel like a premium health service: calm, trustworthy, easy for a first-time patient and fast for a
practitioner. Keep the team's colours and the vibe already in the app (deep teal-green, sage, white cards, rounded
shapes) and make it better through **typography, spacing, hierarchy, fewer and clearer words, and a small, consistent
component set**. Nothing is overloaded; every main action is one click away; everything works from 320 px to wide
screens.

**What "premium" means here** (not decoration): restraint, generous whitespace, one accent colour, a typeface with
character used sparingly, precise alignment, quiet motion, and words that sound like a good doctor: short, warm, exact.

Each role needs something different:

| Role | Needs | So the UI is |
|---|---|---|
| Patient | reassurance, clarity, guidance | spacious, plain French, one primary action per screen |
| Practitioner | speed, accuracy, little friction | denser, scannable, keyboard friendly, no flourish |
| Administrative staff | efficiency on lists and forms | tables, filters, clear status, bulk actions later |

## 2. Ground rules (do not break)

- **Team colours stay**: `--primary #0e5245` and its family, the sage secondary, white cards. Only the neutrals are tuned
  (decision D2), and only after the team sees the specimen.
- **CSP stays `'self'`**: fonts are self-hosted through `@fontsource` npm packages (Vite bundles them into `/assets`).
  No Google Fonts URL, no CDN.
- **Watermelon UI + shadcn/ui are in** (Mohamed, 2026-10-30, the rule was softened): Tailwind CSS 4 + shadcn
  (Base UI primitives) are configured on `feat/MLink-128-ui-kit`, mapped to our tokens, with no reset and a scan
  limited to `src/shared/components` (docs/ONBOARDING.md §7). Use Watermelon components where they fit, wrapped
  in French; our CSS Modules components stay for what exists. Icons: `lucide-react` (already a dependency).
- **New dependencies** (the fonts) are explained in the PR (why, size, alternative) and agreed by the team.
- **Teammates' pages**: `HomePage` and `SignupPage` are Ahlem's (MLink-51/81), `/mot-de-passe` is hers (MLink-89).
  Phase A restyles them **through tokens only**, without touching their files. Phase C changes inside her pages happen
  only with her written OK on her ticket, or she does them from this plan.
- **Tests stay green**: they query by role and label, so a restyle must not change roles, labels or texts they assert;
  when a text changes on purpose, its test changes in the same commit.
- Same workflow as the rest of the repo: branch from `master`, red/green where behaviour changes, one commit per step,
  `npm test && npm run lint && npm run build` before each push, no stacked PRs.

## 3. Audit of today (2026-10-30, `feat/MLink-6-front-auth-foundation` at `fdd47f0`)

Seen in the browser (home, login, signup) and in the code:

| # | Finding | Evidence | Fix in |
|---|---|---|---|
| A1 | No brand typeface: `--font` is the system stack, so Windows shows Segoe UI and Mac shows SF; `MedLinkShell.css` names `Plus Jakarta Sans` but never loads it | `tokens.css`, `MedLinkShell.css:25` | B1 |
| A2 | Cool lavender neutrals (`--surface #f9f9ff`, inputs `#f0f3ff`) next to a warm sage page: two temperatures | screenshots login/signup | B2 (D2) |
| A3 | Field borders `--outline-variant #bfc9c4` on white = **1.70:1**, under WCAG 1.4.11 (3:1 for control edges) | contrast script | B2 |
| A4 | `--outline #707975` on white = **4.49:1**, just under 4.5:1 for placeholder or hint text | contrast script | B2 |
| A5 | Type scale has 2 steps (`--text-sm`, `--text-md`); sizes are written by hand in page CSS (1 349 lines in `HomePage.css`, 818 in `SignupPage.css`) | `tokens.css` | B1, C |
| A6 | Spacing tokens stop at 24 px (`--space-6`); larger gaps are raw values | `tokens.css` | B2 |
| A7 | Jargon on patient screens: "Session protégée par CSRF", "TOTP", "Fiche d'identification clinique", "Mot de passe maître", "Politique de sécurité MedLink", "Identifiant unique du dossier" | `SignupPage.tsx`, `LoginPage.tsx` | B4, C |
| A8 | **Claims to verify before they stay**: "Hébergement agréé Données de Santé (HDS)", "Certification INPDP Validée", "chiffrement de bout en bout", "Réseau hospitalier agréé". A health portal must not claim a certification it does not hold (trust, legal) | `HomePage.tsx`, `SignupPage.tsx` | D1 |
| A9 | Login: the logo appears twice (header and card); on a 686 px-high window the card's top hides under the header | screenshot | C2 |
| A10 | Spaces: one "Accueil" entry per role, no page title bar or user menu; nothing shows what comes next | `spaces.ts` | B5 |
| A11 | Signup collects gouvernorat, clinic and consent that are never sent (comment on MLink-81) | `api.ts` vs `RegisterRequest` | Ahlem |

What already works and stays: the palette, the cards, the uppercase eyebrow labels, the icons in tinted squares, the
shared `Button`, `TextField`, `PasswordField` and `Alert`, the role spaces and guards.

## 4. Design direction

### 4.1 Typography (decision D1: pick A or B from the specimen, step B0)

Research: in health UI, legibility and calm beat decoration; most premium products pair one clean sans for the interface
with, at most, one display face for a few large titles ([925 Studios, 2026](https://www.925studios.co/blog/healthtech-patient-portal-design-examples-2026),
[Fuselab](https://fuselabcreative.com/healthcare-ux-design-best-practices-guide/)). Watermelon's healthcare dashboard
(Medesk) uses Geist + Instrument Serif. The skill's health pairings: Figtree + Noto Sans, Lexend + Source Sans 3,
Atkinson Hyperlegible.

| Option | Interface (all text) | Display (hero, auth titles, big numbers only) | Why |
|---|---|---|---|
| **A (recommended)** | **Plus Jakarta Sans Variable** (OFL, `@fontsource-variable/plus-jakarta-sans`) | **Instrument Serif** (OFL, `@fontsource/instrument-serif`) | Plus Jakarta Sans is the face the team already chose in `MedLinkShell.css`: same vibe, now loaded. Soft geometric, warm, premium; full French accents. Instrument Serif adds the "luxury clinic" note on a few headings |
| B | Geist Variable (OFL) | Instrument Serif | Medesk's pairing: crisper, more "tech" |
| Fallback | either sans alone | none | if the serif feels too editorial for a clinic |

Rules:
- **Display face**: public pages and auth page titles only (≥ 32 px), never in forms, tables or practitioner screens.
- **Weights**: 400 text, 500 labels and buttons, 600 headings. No 800/900: heavy titles read loud, not premium.
- **French**: `lang="fr"` (done), non-breaking spaces before `: ; ? !` and inside `« »`, and `hyphens: auto` off on
  headings. Numbers in lists and times use `font-variant-numeric: tabular-nums` (check the face supports it in B0).
- **Budget**: Latin subset only, `font-display: swap`, at most 2 files preloaded; total fonts < 90 kB.

Type scale (rem at 16 px, line-height):

| Token | Size | LH | Use |
|---|---|---|---|
| `--text-xs` | 12 | 16 | badges, legal (sparingly) |
| `--text-sm` | 14 | 20 | secondary text, table cells, hints |
| `--text-md` | 16 | 24 | body, inputs (16 px also stops iOS zoom on focus) |
| `--text-lg` | 18 | 28 | lead paragraphs |
| `--text-xl` | 20 | 28 | card titles |
| `--text-2xl` | 24 | 32 | section titles |
| `--text-3xl` | 30 | 36 | page titles in spaces |
| `--display-sm` | 36 | 40 | auth titles (display face) |
| `--display-lg` | clamp(40 px, 5vw, 56 px) | 1.1 | home hero (display face) |

### 4.2 Colour (decision D2: neutrals only)

Brand colours do not change. Neutrals move from the M3 lavender tint to the brand's own green tint so the page, cards and
fields share one temperature; feedback colours stay.

| Role (new semantic token) | Today | Proposal | Check |
|---|---|---|---|
| `--bg` page | `#f9f9ff` | `#f6f8f6` (sage-white) | text 16.0:1, primary 8.5:1 |
| `--surface-raised` cards | `#ffffff` | `#ffffff` | |
| `--surface-sunken` inputs, wells | `#f0f3ff` | `#f3f6f4` | |
| `--border` dividers | `#bfc9c4` | `#dfe5e1` (decorative only) | |
| `--border-strong` field edges | `#bfc9c4` | `#808a85` | 3.56 on white, 3.34 on `--bg`, 3.28 on `--surface-sunken`: ≥ 3:1 everywhere (fixes A3) |
| `--text-muted` hints, placeholders | `#707975` | `#5f6863` | 5.76 on white, 5.40 on `--bg`, 5.29 on `--surface-sunken` (fixes A4) |
| `--accent-soft` selected, chips | `--primary-fixed #b1efdd` | same | |

Exact values are tuned in B2 with the contrast script (`scripts/contrast.mjs`) and shown to the team before merge. The old
token names stay as aliases until every page has moved (no big-bang rename).

### 4.3 Space, shape, depth, motion

- **Spacing**, a 4-point scale: `--space-1..12` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96. Sections 64–96 on public
  pages, 24–32 in spaces; inside a card 16–24.
- **Radius**: field 10, control 12, card 18, sheet/dialog 24, pill. Same values as today, named once.
- **Depth**, 3 levels only: `--elev-1` cards (today's soft shadow), `--elev-2` menus and popovers, `--elev-3` dialogs.
  Borders do most of the work; shadows stay faint and green-tinted.
- **Motion**: 120 ms (hover, press), 200 ms (open/close), 300 ms (page-level); one easing
  `cubic-bezier(.2,.8,.2,1)`; only `opacity` and `transform`; everything off under `prefers-reduced-motion` (already
  global). No parallax, no autoplay carousels.
- **Layout**: content max 1200 px (public), 1040 px (space pages), forms 480 px; breakpoints 640, 768, 1024, 1280.
  Mobile first; no horizontal scroll at 320 px; touch targets ≥ 44 × 44 px.

### 4.4 Components (only what screens need now; a component joins `shared/ui` the second time it is needed)

New ones come from shadcn/Watermelon (`src/shared/components`) when an item fits, wrapped with French texts and
checked against the CSP; our existing CSS Modules components stay and are restyled with the tokens.

| Component | State | Change |
|---|---|---|
| Button | exists | sizes sm/md/lg; variants primary, secondary (outline), ghost, danger; leading/trailing icon; full width; 44 px min height |
| TextField, PasswordField | exist | 16 px text, `--border-strong`, optional leading icon, hint and error in one slot, character count when `maxLength` |
| Alert | exists | 4 tones (info, success, warning, error) with lucide icon; optional title and action |
| **Select** | new | native `<select>` styled (accessible, no library) |
| **Checkbox, Radio** | new | native inputs, custom box, label click target ≥ 44 px |
| **Card** | new | header (title, action), body, footer; `as="section"`; padding from tokens |
| **Badge / StatusChip** | new | neutral, info, success, warning, danger; text + icon, never colour alone |
| **EmptyState** | new | icon, one sentence, one action: every space page before its feature lands |
| **Skeleton** | new | replaces spinners for page content (spinner stays for buttons) |
| **Avatar** | new | initials, for the user menu |
| **Dialog** | later | native `<dialog>`, when the first confirm is needed |
| Toast, Tabs, Table | later | with the first screen that needs them (appointments, back office) |

Each comes with a test (label, keyboard, error announced) and an entry in `docs/ONBOARDING.md` §7.

### 4.5 The space shell (all roles)

```
Desktop ≥ 1024                                Mobile < 768
┌──────────┬──────────────────────────────┐   ┌──────────────────────────┐
│ MedLink  │ Page title        [Avatar ▾] │   │ ≡  Page title   [Avatar] │
│          ├──────────────────────────────┤   ├──────────────────────────┤
│ ◉ Accueil│                              │   │                          │
│ ○ RDV    │   content (max 1040 px)      │   │   content                │
│ ○ Docs   │                              │   │                          │
│          │                              │   ├──────────────────────────┤
│ ─────    │                              │   │ ◉Accueil ○RDV ○Docs ○…   │
│ Aide     │                              │   └──────────────────────────┘
└──────────┴──────────────────────────────┘   bottom bar ≤ 5 entries
 sidebar 240 px, collapsible to 72 px icons
```

- **Sidebar** entries come from `spaces.ts` (data only, as today) and gain an `icon` field; the active page is marked
  with `aria-current="page"`; 768–1023 px shows the icon rail.
- **Top bar**: page title (the `<h1>`), the user menu (name, role in French, "Mon compte", "Se déconnecter"), which is
  logout in one click from anywhere.
- **Space home** per role: a greeting, the 1–3 actions that matter for the role, and an `EmptyState` for features not
  built yet. It is honest: "Bientôt disponible", no fake data.

### 4.6 Words (microcopy)

Voice: *vous*, short sentences, everyday words, the action first. One idea per sentence; no technical term on a patient
screen. Error messages say what happened and what to do.

| Today | Proposal | Where |
|---|---|---|
| Session protégée par CSRF | (remove) | signup |
| Fiche d'identification clinique · Étape unique de création d'accès patient | Vos informations | signup |
| Mot de passe maître · Politique de sécurité MedLink | Mot de passe | signup |
| Identifiant unique du dossier | (remove) | signup |
| … valident leur connexion avec un code à usage unique (TOTP) | … confirment leur connexion avec un code à 6 chiffres | login |
| Une erreur est survenue. Veuillez réessayer. | Un problème est survenu de notre côté. Réessayez dans un instant. | `apiClient` |
| Impossible de joindre le serveur. | Connexion impossible. Vérifiez votre accès à Internet puis réessayez. | `apiClient` |

Claims (A8) go to a content check with the team (D1 owner: whoever owns the home page). Until confirmed, a neutral
wording: "Vos données de santé sont protégées et ne sont partagées qu'avec vos soignants."

## 5. Roadmap

Each step = one commit (or a red + green pair), tests/lint/build green, a before/after screenshot at 375 and 1440 px in
the PR. "Mine" = Mohamed; "Ahlem" = her ticket, or her written OK.

### Phase 0: decisions (no code merged)
- **B0 Specimen page** (mine): a dev-only route `/__specimen` (not in production builds) showing options A and B on real
  MedLink content (hero, login card, a form, a space page, numbers, French punctuation), plus the neutral palette D2
  before/after. Screenshots in the ticket. **Gate: the team picks D1 and agrees D2.**
- **YouTrack**: one ticket "[FE] UI refresh: typography, tokens, components, space shell" (mine), and a comment on
  MLink-51/81 (Ahlem) for the copy and claims. Shown to Mohamed before posting.

### Phase A: foundation (mine, shared files; restyles everything through tokens)
- **B1 Fonts + type scale**: add the chosen `@fontsource` packages, import once in `app/main.tsx`, `--font-sans`,
  `--font-display`, the scale tokens, base element styles (`h1–h4`, `p`, `small`, links), tabular numbers utility.
  Check: bundle report (fonts < 90 kB), no CSP error on 8090, screenshots.
- **B2 Tokens v2**: semantic colour tokens (D2), full spacing, radius, elevation, motion, layout tokens; old names as
  aliases. `scripts/contrast.mjs` (Node, no dependency) asserts every text/background pair ≥ 4.5:1 and every control edge
  ≥ 3:1; run in CI (`npm run check:contrast`). Red first: today's `--outline-variant` fails it.
- **B3 Components**: upgrade Button, TextField, PasswordField, Alert; add Select, Checkbox/Radio, Card, Badge,
  EmptyState, Skeleton, Avatar. Each with its test; LoginPage and the MFA/verify pages use them.
- **B4 Words (mine)**: the `apiClient`/`errors.ts` messages and the pages I own (login copy, MFA, verify email, access
  denied, 404, error page), with their tests updated in the same commit.

### Phase B: the spaces (mine)
- **B5 Space shell**: sidebar + top bar + user menu + mobile bottom bar, icons in `spaces.ts`, `aria-current`, focus
  management on navigation (focus the `<h1>`), skip link "Aller au contenu". Tests: menu per role, logout from the user
  menu, keyboard path, active entry.
- **B6 Space homes**: greeting + the role's actions + `EmptyState` for what is not built (appointments, documents,
  messages; accounts for staff until MLink-73).

### Phase C: public pages (Ahlem's, with her OK)
- **C1 Home**: hero with the display face, fewer words, one primary action; the search block simplified (no field for a
  feature that does not exist yet); claims per D1; sections on the spacing scale; `HomePage.css` moves to tokens (target:
  well under half its 1 349 lines).
- **C2 Login/Signup layout**: one logo, the card never hidden by the header (A9), signup in 2 short steps (identity, then
  password) with the copy of §4.6 and only the fields the API takes (A11).

### Phase D: quality pass (mine)
- **D1** accessibility: keyboard-only run of every flow, screen reader spot check (NVDA), zoom 200 %, `axe` in the
  browser (dev tool, not a dependency), contrast script green.
- **D2** responsive: screenshots at 320, 375, 768, 1024, 1440 for each page; no horizontal scroll.
- **D3** performance: entry JS stays ≤ 75 kB gzip, fonts ≤ 90 kB, no layout shift from fonts (`size-adjust` fallback if
  needed), images keep width/height.
- **D4** docs: `docs/ONBOARDING.md` §7 (UI library and tokens, the type and spacing rules, "how to build a page that
  looks right"), `docs/MANUAL-TESTING.md` (visual checks), CONTRIBUTING (no raw sizes or colours).

## 6. Decisions

| # | Question | Who | Default if no answer |
|---|---|---|---|
| D1 | Type pairing A or B (or sans only) | team, from B0 | **B** (Mohamed, 2026-10-30) |
| D2 | Neutrals move to the green tint | team, from B0 | **yes** (Mohamed, 2026-10-30) |
| D3 | Which claims on the home page are true today (HDS, INPDP, encryption) | team / home page owner | neutral wording |
| D4 | Branch: start after #11 merges (new branch from `master`), or before | Mohamed | after #11 |

## 7. Risks

- **Scope creep** into teammates' pages: Phase C waits for Ahlem's OK; Phase A only touches shared files.
- **Tests asserting old texts**: the word changes update their tests in the same commit.
- **Font weight on slow phones**: subset, swap, 2 files max preloaded, measured in D3.
- **Display face overuse**: rule in §4.1, enforced in review.

## Sources

- [10 Healthtech Patient Portal Design Examples That Reduce Anxiety (2026)](https://www.925studios.co/blog/healthtech-patient-portal-design-examples-2026)
- [Healthcare UX design best practices (Fuselab)](https://fuselabcreative.com/healthcare-ux-design-best-practices-guide/)
- [Healthcare dashboard UI/UX best practices (Aufait UX)](https://www.aufaitux.com/blog/healthcare-dashboard-ui-ux-design-best-practices/)
- [Designing empathetic healthcare interfaces (UXmatters)](https://uxmatters.com/mt/archives/2023/12/designing-empathetic-healthcare-user-interfaces-enhancing-usability-and-accessibility.php)
- [Best free and premium fonts for 2026 (Freeforfonts)](https://freeforfonts.com/blog/best-free-premium-fonts-designers-will-use-in-2026)
- Watermelon UI: Medesk Dashboard (`medesk-dashboard`), macOS Sidebar, Navigation-1
- WCAG 2.2: 1.4.3 contrast (minimum), 1.4.11 non-text contrast, 2.5.8 target size
