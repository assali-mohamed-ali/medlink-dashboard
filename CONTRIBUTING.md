# Contributing to MedLink Dashboard

## Install local pre-commit hooks

Prerequisites: Git, Python 3.9+, Node.js 22+, and npm.

Install the pre-commit CLI once (recommended on Ubuntu/Linux):

```bash
sudo apt install pipx
pipx ensurepath
pipx install pre-commit
export PATH="$HOME/.local/bin:$PATH"
```

From the repository root, install the Git hook and its pinned hook environments:

```bash
bash scripts/setup-pre-commit.sh
```

The installer validates `.pre-commit-config.yaml` and runs `pre-commit install --install-hooks`. After this, the checks run automatically on `git commit`.

## What runs before a commit?

- Basic hygiene: whitespace, final newline, YAML/JSON/XML validation, merge-conflict markers, case collisions, private-key detection, and a 1 MiB added-file limit.
- Gitleaks scans staged changes for secrets.
- actionlint validates GitHub Actions workflows.
- Oxlint runs on changed JavaScript/TypeScript files.
- The TypeScript/Vite production build runs when source, Vite/TypeScript configuration, or npm manifests change.

Some hooks automatically fix whitespace/newline issues. If a hook changes files, stage the changes and retry the commit.

## Run the complete checks manually

```bash
pre-commit run --all-files --show-diff-on-failure --verbose
npm run lint
npm run build
npm audit --audit-level=high
```

The full checks are also run in GitHub Actions. Pre-commit is a fast local feedback layer, not a replacement for CI.

## Updating hooks

Review version updates before changing pinned revisions in `.pre-commit-config.yaml`:

```bash
pre-commit autoupdate
pre-commit validate-config
pre-commit run --all-files
```

## Team rules

New here? Read **[docs/ONBOARDING.md](docs/ONBOARDING.md)** first: first run, architecture, request flow, recipes.
These rules keep several people working on the same code without stepping on each other.

### Structure and code

- **Folders:** `app/` (wiring), `spaces/` (role layouts), `pages/` (pages of no feature), `features/<domain>/`
  (business areas), `shared/` (generic). **Imports go one way:** `app` → `spaces`/`pages` → `features` → `shared`.
  A feature is imported through its `index.ts` only; across folders use the `@/` alias, never `../../`.
  `npm run lint` enforces all of this (`.oxlintrc.json`, `no-restricted-imports`).
- **One way to call the API:** a function in the feature's `api.ts`, which calls `apiFetch`. Never `fetch()` in a
  component. Show errors with `messageFor(error)`, map field errors with `fieldErrors(details, FIELDS)`.
- **One way to know who is logged in:** `useAuth()`. Nothing about the session in `localStorage`/`sessionStorage`.
- **URLs** come from `shared/config/paths.ts`, never typed strings. Pages the API mails are part of its contract.
- **UI:** build from `shared/ui` (Button, TextField, PasswordField, Alert…). Styles: CSS Modules and the tokens of
  `shared/styles/tokens.css`: no raw colour, font size or spacing (`--text-*`, `--space-*`…; docs/ONBOARDING.md §7).
  A component moves to `shared/ui` the second time it is needed. `npm run check:contrast` checks the colour pairs;
  `npm run check:budget` (after `npm run build`) keeps a first visit's JavaScript ≤ 75 kB gzip: a page or a space
  is a lazy chunk, never in the entry.
- **Naming:** components `PascalCase.tsx`, everything else `camelCase.ts`; tests and styles next to their file
  (`X.test.tsx`, `X.module.css`). Code, comments and docs in English; text on screen in French.
- **Keep it simple:** one styling approach per layer (our components: CSS Modules + tokens; shadcn/Watermelon
  components: Tailwind mapped to the same tokens, see `docs/ONBOARDING.md` §7), no new state library, no
  abstraction for a single use. Components from Watermelon UI or shadcn/ui are welcome when a screen needs them;
  add them with the shadcn CLI, never `shadcn init`. A new dependency is
  explained in the PR (why, size, alternative considered) and agreed by the team.

### Security (a health portal)

- The browser never talks to Keycloak. No token, password, code or mailed token is ever logged, stored or shown.
- A token read from a mailed link leaves the address bar at once (`useTokenFromUrl`); single-use calls run once
  (`useSingleRequest`).
- Never reveal whether an account exists: show the API's neutral answers as they are.
- No `dangerouslySetInnerHTML`, no third-party script, style, font or image (the CSP allows `'self'` only).
- The front's role checks are comfort; the API is the security. Every protected page sits under its space's guard.

### Tests and definition of done

- Test first (a red commit, then green); break the rule once on purpose to see a test fail.
- A page has a test per answer the API can give (200 and each error code); a guarded page has a test for the
  right role and one for a wrong role. Query by role and label, as a user would.
- Done = `npm test`, `npm run lint` and `npm run build` green, the onboarding guide updated if a rule, a folder or
  a flow changed, and the PR template filled honestly.

### Git and teamwork

- Branch from `master`: `feat/MLink-<id>-<slug>`, `fix/…`, `docs/…`, `chore/…`. One ticket per PR, PRs based on
  `master` only (no stacked PRs). Commits start with `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:` and
  name the YouTrack ticket.
- **Shared files** (`app/routes.tsx`, `shared/**`, `features/auth/**`, `spaces/**`, `.oxlintrc.json`, CI): say on
  your ticket what you change before changing it, keep that PR small, pull before you push, never force-push a
  branch someone else works on.
- YouTrack mirrors the work: *In Progress* when you start, *To Verify* with the PR link, *Done* when merged.
