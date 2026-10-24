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

- `src/app` : routeur
- `src/pages` : pages (vides pour l'instant)
- `src/services` : client API (`apiFetch`, `ApiError`)

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.


## Local development checks

Install the repository's Git pre-commit hook by following [CONTRIBUTING.md](CONTRIBUTING.md):

```bash
bash scripts/setup-pre-commit.sh
```

The hook checks staged files before each commit. CI also runs all pre-commit hooks across the repository.
