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

### Try the production image with the API (one origin)

The local Compose file also starts `edge` (`deploy/edge.local.conf`), a stand-in for the HTTPS reverse proxy of
staging and prod: start the API's dev stack (`scripts/setup-dev` in `api-MedLink`), then open
**http://localhost:8090**. `/api/` goes to the API on the host, everything else to the dashboard. Local only (no TLS).

## One origin: the reverse proxy routes `/api` to the API

The browser must see the dashboard and the API on **the same origin** (e.g. `https://medlink.example.com`):
the session cookie and the `XSRF-TOKEN` cookie are `SameSite=Strict`, and the CSP allows calls to `'self'` only.
The HTTPS reverse proxy in front of both (not in this repository) therefore routes:

| Path | Goes to | Notes |
|---|---|---|
| `/api/` | the API container (`app:8080`) | keep the path as is; set `X-Forwarded-For` and `X-Forwarded-Proto` |
| everything else | this dashboard container (port 8080) | |

Example for an nginx reverse proxy (adapt names and certificates):

```nginx
server {
    listen 443 ssl;
    server_name medlink.example.com;
    # ssl_certificate ... ; ssl_certificate_key ... ;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /api/ {
        proxy_pass http://app:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    location / {
        proxy_pass http://dashboard:8080;
        proxy_set_header Host $host;
    }
}
```

- **`TRUSTED_PROXIES` on the API** must hold the proxy's address. The API's per-IP limits (login, signup) read the
  client IP from `X-Forwarded-For` only when the request comes from a trusted proxy; otherwise every user shares
  the proxy's IP and one busy minute blocks everyone.
- **Keycloak stays private**: the proxy publishes no Keycloak route (the browser never talks to Keycloak).
- **HSTS** is set by the proxy (it terminates TLS); this image sets the other security headers.
- If the dashboard container ever receives `/api/...`, it answers `502 {"code":"API_NOT_ROUTED"}`: the proxy is
  missing the `/api/` route.
- Ports: the API's staging profile also uses **8081** on the host (api-MedLink `docs/ARCHITECTURE.md`); give the
  dashboard another `FRONTEND_HOST_PORT` when both run on one host.

## What the image serves (`deploy/nginx.conf`)

| Request | Answer | Cache |
|---|---|---|
| `/assets/*` (Vite build, content-hashed names) | the file, gzip | `public, max-age=31536000, immutable` |
| any app URL (`/`, `/connexion`, `/patient`...) | `index.html` (React Router shows the page) | `no-cache` (a deployment is picked up at once) |
| `/healthz` | `ok` | none |
| `/api/...` | `502 API_NOT_ROUTED` (see above) | none |

Every page and file carries the headers of `deploy/nginx/security-headers.conf`: a strict
`Content-Security-Policy` (`'self'` only, plus `data:` images for the QR code), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` (mailed links carry single-use tokens),
`Permissions-Policy`, `Cross-Origin-Opener-Policy`. A new third-party script, style, font or image needs a CSP change
and a security review: prefer self-hosting it.

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

Prerequisites: Node.js 22, Python/pipx, and Go (the Gitleaks and actionlint hooks build Go tools). Install/enable the hooks once from the repository root:

```bash
sudo apt update
sudo apt install -y pipx golang-go
pipx ensurepath
# Open a new shell if pipx added a PATH entry.
pipx install pre-commit
npm ci
pre-commit validate-config
pre-commit install
```

Run all hooks manually before opening a PR:

```bash
pre-commit run --all-files
```

The installed Git hook checks whitespace, EOF/newline hygiene, YAML/JSON/XML syntax, merge markers, private keys, large files, staged secrets with Gitleaks, GitHub Actions workflow syntax with actionlint, Oxlint, and the TypeScript/Vite production build when relevant files change.

The frontend CI workflow also runs `pre-commit run --all-files`, so the configuration is verified in pull requests rather than relying only on developer machines. The dedicated Gitleaks workflow remains responsible for repository-history secret scanning.
