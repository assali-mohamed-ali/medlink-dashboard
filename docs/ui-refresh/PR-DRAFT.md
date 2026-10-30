# PR draft: UI refresh (open after #11 is merged)

Base `master`, branch `feat/MLink-128-ui-kit`. Before opening: merge `master` in (never force-push), re-run
`npm ci && npm test && npm run lint && npm run build && npm run check:contrast && npm run check:budget`, add the
before/after screenshots (375 and 1440 px), then paste the text below into the PR and delete this file.
Title: `MLink-162: UI refresh: typography, tokens, components, space shell`

---

## Description

MLink-162. MedLink gets a calm, premium look without changing the team's colours: one typeface for the interface,
green-tinted greys that pass WCAG, a full token scale, the missing components, a real frame for the role spaces and
plainer words. Plan and decisions: `docs/ui-refresh/PLAN.md`; step by step: `docs/ui-refresh/PROGRESS.md`.

- **Decisions** (from the dev-only specimen `/__specimen`): D1 Geist for the interface + Instrument Serif for public
  and auth titles; D2 green-tinted neutrals (field edges ≥ 3:1, muted text ≥ 4.5:1).
- **Fonts** self-hosted with `@fontsource` (Latin only, 2 files, 50.4 kB, CSP stays `'self'`).
- **Tokens v2** (`shared/styles/tokens.css`): type scale, greys, spacing 4–96 px, radius, 3 elevations, motion, layout
  widths; the old names stay as aliases, so every page repaints with no change in its own files.
- **Checks in CI**: `npm run check:contrast` (26 colour pairs) and `npm run check:budget` (entry JavaScript ≤ 75 kB
  gzip, now 70.8 kB; fonts ≤ 90 kB).
- **Components**: Button sizes and `danger`, Alert `warning`/title/icons, TextField count and disabled look, 44 px
  targets; new Card, EmptyState, Skeleton, Select, Checkbox, RadioGroup (`shared/ui`), StatusBadge and UserAvatar
  (`shared/components`, on shadcn/Watermelon).
- **Spaces**: one menu restyled by width (sidebar, icon rail, phone bottom bar), top bar with initials and role,
  skip link "Aller au contenu", focus on the title after navigation, home per role with "Bientôt disponible" for
  what is not built; the space shell is a lazy chunk under the role's guard.
- **Words**: plainer error messages; the login page says "code à 6 chiffres" instead of "TOTP".
- **Visible on every page**: body text 16 px (was 15), secondary 14 px (was 13), buttons at weight 500, darker
  field edges, a 2 px green focus outline on plain links.
- **Not changed**: Ahlem's pages (home, signup) only through tokens; her follow-ups are on MLink-81.

New packages (team rule: why, size, alternative): `@fontsource-variable/geist` and `@fontsource/instrument-serif`
(OFL-1.1, the chosen faces; the alternative, a CDN, breaks the CSP); `@fontsource-variable/plus-jakarta-sans` as a
devDependency for the specimen's option A only.

## Type de changement

- [x] feat
- [ ] fix
- [x] chore/docs/refacto
- [ ] security fix

## Utilisation de l'IA

- [ ] Cette PR n'utilise pas d'outils d'IA générative.
- [x] J'ai utilisé des outils d'IA générative pour contribuer à cette PR.
- [ ] Je confirme avoir relu, compris et validé les modifications proposées par l'IA.

## Checklist

- [x] Tests ajoutés ou mis à jour : un test par réponse de l'API, rôle autorisé et rôle refusé pour une page protégée
- [x] `npm test`, `npm run lint` et `npm run build` OK en local
- [ ] Parcours touchés vérifiés à la main (`docs/MANUAL-TESTING.md`): §7b done for the public pages and the patient
      space; practitioner and staff spaces and an NVDA pass still to do
- [x] Aucun secret, jeton, mot de passe ou code journalisé ou stocké dans le navigateur
- [x] Aucune ressource tierce (script, style, police, image) : la CSP reste `'self'` (to confirm on the production
      image, `http://localhost:8090`, before merge)
- [x] `docs/ONBOARDING.md` mis à jour si une règle, un dossier ou un parcours change
- [ ] Fichiers partagés (`app/routes.tsx`, `shared/**`, `features/auth/**`, `spaces/**`) annoncés sur le ticket:
      MLink-162 lists `shared/styles`, `shared/layout`, `routes.tsx`, `paths.ts`, `ci.yml`; add `shared/ui`,
      `shared/components`, `shared/api` (messages), `features/auth/pages/LoginPage.tsx` (one sentence), `spaces/**`

## Preuves

<!-- test, lint, build, check:contrast, check:budget output; screenshots 375 / 1440 px before and after; CI run link -->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
