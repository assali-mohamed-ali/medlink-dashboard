#!/usr/bin/env bash
# Checks that the publish job can write the attestations and their artifact metadata (GitHub's OIDC provenance).
# Usage: bash .github/scripts/test/container-security-attestations.test.sh
set -euo pipefail

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPOSITORY="$(cd -- "$HERE/../../.." && pwd -P)"
WORKFLOW="$REPOSITORY/.github/workflows/container-security.yml"

FAILED=0
fail() { echo "FAIL: $*" >&2; FAILED=$((FAILED + 1)); }
pass() { echo "ok:   $*"; }

grep -Fq 'artifact-metadata: write' "$WORKFLOW" \
  && pass "the publish job requests artifact metadata write permission" \
  || fail "the publish job is missing artifact-metadata: write"

PUBLISH_BLOCK="$(awk '/^  publish-and-attest:/{in_job=1} /^  [a-zA-Z0-9-]+:/{if (in_job && $0 !~ /^  publish-and-attest:/) exit} in_job{print}' "$WORKFLOW")"

grep -Fq 'attestations: write' <<<"$PUBLISH_BLOCK" \
  && pass "the publish job requests attestations write permission" \
  || fail "the publish job is missing attestations: write"

grep -Fq 'actions/attest-build-provenance@v3' <<<"$PUBLISH_BLOCK" \
  && pass "the workflow attests build provenance" \
  || fail "the build provenance attestation action is missing"

grep -Fq 'actions/attest-sbom@v3' <<<"$PUBLISH_BLOCK" \
  && pass "the workflow attests the SBOM" \
  || fail "the SBOM attestation action is missing"

COUNT="$(grep -Fc 'push-to-registry: true' <<<"$PUBLISH_BLOCK")"
[ "$COUNT" -ge 2 ] \
  && pass "both attestations are pushed to GHCR" \
  || fail "one or both attestations are not configured for GHCR"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "container-security-attestations: all checks passed"
else
  echo "container-security-attestations: $FAILED check(s) failed"
  exit 1
fi
