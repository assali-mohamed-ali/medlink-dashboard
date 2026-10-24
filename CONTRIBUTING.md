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
