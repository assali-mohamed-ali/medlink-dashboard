# MedLink — Web (front)

Interface React du portail MedLink. Elle parle uniquement à notre API (`api-MedLink`), avec le cookie de session ; aucun token n'est stocké dans le navigateur.

## Prérequis

- Node 22.12 ou plus (voir `.nvmrc`). Sur Windows, installer Node 22 avec nvm-windows ou depuis le site officiel.
- L'API en local sur `http://localhost:8080`

## Démarrer

    npm ci
    npm run dev      # http://localhost:3000 (le port des liens envoyés par mail)
    npm test
    npm run lint
    npm run build

Le serveur de développement redirige `/api` vers `http://localhost:8080` : le navigateur ne voit qu'une origine, donc pas de CORS et le cookie `XSRF-TOKEN` reste lisible. Il tourne sur le port 3000, l'`APP_FRONTEND_URL` de l'API en dev : les liens des mails (vérification, configuration du code) s'ouvrent ici. En staging et en prod, le reverse proxy HTTPS route `/api` vers l'API : voir [deploy/README.md](deploy/README.md).

## Lancer l'API

Dans le dépôt `api-MedLink`, lancer `scripts/setup-dev` (voir le README de ce dépôt).

## Structure

- `src/app` : le câblage (la table des routes, le routeur)
- `src/spaces` : les espaces par rôle (patient, praticien, administratif) : une mise en page, un menu par rôle
- `src/features/<domaine>` : un dossier par domaine métier (`auth` pour l'instant) : appels API, types, pages, routes
- `src/pages` : les pages sans domaine (accueil, accès refusé, page introuvable, erreur)
- `src/shared` : le code réutilisable sans métier (client API, messages d'erreur, URLs, composants UI, styles)

Les imports vont dans un seul sens : `app` → `spaces`/`pages` → `features` → `shared`. Le guide complet (premier lancement,
architecture, flux d'une requête, sécurité, tests, dépannage) : **[docs/ONBOARDING.md](docs/ONBOARDING.md)**.
Tester à la main tous les parcours (inscription, connexion, code à 6 chiffres, espaces) : **[docs/MANUAL-TESTING.md](docs/MANUAL-TESTING.md)**.

## Sentry (optionnel)

Le SDK Sentry (React) ne démarre que si `VITE_SENTRY_DSN` est défini au build. En local, mettez-le dans
`.env.local` (ignoré par Git) :

    VITE_SENTRY_DSN=https://<clé-publique>@o<org>.ingest.sentry.io/<projet>

Le DSN est public ; sans lui, aucun événement ne quitte le navigateur. Le SDK est chargé dans un chunk séparé
pour rester dans le budget JavaScript de la première visite ; les erreurs du premier rendu attendent dans une
petite file jusqu'à son chargement.

En production, le Dockerfile et le workflow `container-security` utilisent déjà le DSN public du projet ; la
variable de dépôt `VITE_SENTRY_DSN` peut le remplacer. Pour des stack traces lisibles en production, définissez
aussi `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` et `SENTRY_PROJECT` au build : le plugin Vite téléverse les source maps
puis les supprime de `dist/`. Le token est un secret. Ce projet est dans la région EU de Sentry : le Dockerfile et
le workflow utilisent `SENTRY_URL=https://de.sentry.io` par défaut, modifiable par la variable de dépôt
`SENTRY_URL`. Voir [deploy/README.md](deploy/README.md#sentry) et la CSP dans
`deploy/nginx/security-headers.conf`.

## Local development checks

Install the repository's Git pre-commit hook by following [CONTRIBUTING.md](CONTRIBUTING.md):

```bash
bash scripts/setup-pre-commit.sh
```

The hook checks staged files before each commit. CI also runs all pre-commit hooks across the repository.
