#!/usr/bin/env bash
# MLink-170: on a server the dashboard is reachable only through the host's Caddy, so its port stays on loopback.
# Docker's published ports bypass ufw. Usage: bash scripts/ci/check-deploy-config.test.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
file=deploy/docker-compose.frontend.yml
if ! grep -Eq '^ +- "127\.0\.0\.1:\$\{FRONTEND_HOST_PORT:-8081\}:8080"$' "$file"; then
  echo "FAIL: $file must publish the dashboard on 127.0.0.1 only" >&2
  exit 1
fi
if ! grep -q 'restart: unless-stopped' "$file"; then
  echo "FAIL: $file must bring the dashboard back after a reboot" >&2
  exit 1
fi
workflow=.github/workflows/container-security.yml
for needle in \
  'cancel-in-progress: false' \
  'load-deploy-secrets' \
  'deploy-frontend' \
  'wait-for-api-staging' \
  '--job deploy-staging' \
  '--job smoke-staging' \
  "vars.AUTO_DEPLOY_PROD != 'false'" \
  'deploy-prod-from-staging'; do
  if ! grep -Fq -- "$needle" "$workflow"; then
    echo "FAIL: $workflow must contain: $needle" >&2
    exit 1
  fi
done
grep -Fq 'fetch-vault-deploy-secrets.sh' .github/actions/load-deploy-secrets/action.yml || {
  echo "FAIL: the loader action must call the Vault helper" >&2
  exit 1
}
echo "deploy config: staging gate, Vault fallback and automatic production deployment are wired"
