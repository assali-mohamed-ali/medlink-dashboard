# MedLink — Web (front)

Interface React du portail MedLink. Elle parle uniquement à notre API (`api-MedLink`), avec le cookie de session ; aucun token n'est stocké dans le navigateur.

## Prérequis

- Node 22.12 ou plus (voir `.nvmrc`). Sur Windows, installer Node 22 avec nvm-windows ou depuis le site officiel.
- L'API en local sur `http://localhost:8080`

## Démarrer

    npm ci
    npm run dev      # http://localhost:5173
    npm test
    npm run lint
    npm run build

Le serveur de développement redirige `/api` vers `http://localhost:8080` : le navigateur ne voit qu'une origine, donc pas de CORS et le cookie `XSRF-TOKEN` reste lisible.

## Lancer l'API

Dans le dépôt `api-MedLink`, lancer `scripts/setup-dev` (voir le README de ce dépôt).

## Structure

- `src/app` : le routeur (le câblage seulement)
- `src/features/<domaine>` : un dossier par domaine métier (`auth` pour l'instant) : appels API, types, pages
- `src/shared` : le code réutilisable sans métier (`api/apiClient.ts` : `apiFetch`, `ApiError` ; `layout/`)
- `src/pages` : les pages sans domaine (accueil)

Les imports vont dans un seul sens : `app` → `features` → `shared`. Le guide complet (premier lancement,
architecture, flux d'une requête, sécurité, tests, dépannage) : **[docs/ONBOARDING.md](docs/ONBOARDING.md)**.

## Local development checks

Install the repository's Git pre-commit hook by following [CONTRIBUTING.md](CONTRIBUTING.md):

```bash
bash scripts/setup-pre-commit.sh
```

The hook checks staged files before each commit. CI also runs all pre-commit hooks across the repository.
