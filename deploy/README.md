# MedLink Dashboard: container build and deployment

The dashboard originally had no Docker image or Compose definition. This directory and the repository-level `Dockerfile` add the missing container delivery path.

## Build and run locally

From the repository root:

```bash
docker build --pull -t medlink-dashboard:local .
docker run --rm --name medlink-dashboard -p 8081:8080 medlink-dashboard:local
curl --fail http://localhost:8081/healthz
```

Or use the local Compose file:

```bash
docker compose -f deploy/docker-compose.local.yml up --build -d
docker compose -f deploy/docker-compose.local.yml ps
docker compose -f deploy/docker-compose.local.yml logs -f dashboard
docker compose -f deploy/docker-compose.local.yml down
```

The production image uses an unprivileged NGINX runtime and serves the Vite build on port 8080. The health endpoint is `/healthz`.

## CI and release flow

1. Pull requests build the image and run Trivy against that exact image.
2. HIGH/CRITICAL findings with an available fix block the release.
3. CI creates a CycloneDX SBOM and preserves the exact scanned image as an artifact.
4. A separate, least-privilege publish job downloads that artifact, pushes it to GHCR, captures the registry digest, and attaches provenance and SBOM attestations.
5. The publish job attaches provenance and SBOM attestations, then signs the published digest with keyless Cosign.
6. Staging/production jobs verify the signature against this GitHub Actions workflow identity before deploying the immutable digest with the production Compose file.

The PR job does not have GHCR write permissions and cannot publish images.

## Deployment configuration

Create GitHub Environments named `staging` and `production`.

Environment variables:
- `DEPLOY_HOST`: deployment server host.
- `DEPLOY_USER`: SSH account with permission to run Docker Compose.
- `DEPLOY_PATH`: absolute directory on the host for the Compose file and environment file.
- `DEPLOY_HEALTH_URL`: reachable URL for the dashboard's `/healthz` endpoint.
- `FRONTEND_HOST_PORT`: optional host port (defaults to 8081).

Environment secrets:
- `DEPLOY_SSH_KEY`: private deployment key.
- `DEPLOY_KNOWN_HOSTS`: pre-verified SSH host key lines.

Production must use required reviewers. Ensure the server has Docker Engine and the Compose plugin installed, can reach GHCR, and allows the configured port from the intended reverse proxy/firewall. Do not generate `known_hosts` with an unauthenticated `ssh-keyscan` inside the workflow.

The Compose deployment file is intentionally image-only: the remote server pulls an immutable digest; it does not build source code during deployment.


## Local pre-commit hooks

Install the required tools once from the repository root:

```bash
npm ci
pipx install pre-commit
pre-commit install
```

Run all hooks manually before opening a PR:

```bash
pre-commit run --all-files
```

The installed Git hook checks whitespace, EOF/newline hygiene, YAML/JSON/XML syntax, merge markers, private keys, large files, staged secrets with Gitleaks, GitHub Actions workflow syntax with actionlint, Oxlint, and the TypeScript/Vite production build when relevant files change.

The frontend CI workflow also runs `pre-commit run --all-files`, so the configuration is verified in pull requests rather than relying only on developer machines. The dedicated Gitleaks workflow remains responsible for repository-history secret scanning.
