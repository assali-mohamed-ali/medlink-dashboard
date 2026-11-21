#!/usr/bin/env bash
set -euo pipefail

environment=''
output_dir=''

usage() {
    cat >&2 <<'EOF'
usage: fetch-vault-deploy-secrets.sh --environment staging|prod --output-dir <dir>
EOF
    exit 2
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --environment) environment="${2:-}"; shift 2 ;;
        --output-dir) output_dir="${2:-}"; shift 2 ;;
        -h|--help) usage ;;
        *) echo "unknown argument: $1" >&2; usage ;;
    esac
done

case "$environment" in staging|prod) ;; *) echo "--environment must be staging or prod" >&2; usage ;; esac
[ -n "$output_dir" ] || usage
: "${VAULT_ADDR:?VAULT_ADDR is not set}"
: "${ACTIONS_ID_TOKEN_REQUEST_URL:?id-token: write is missing on this job}"
: "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:?id-token: write is missing on this job}"

VAULT_ADDR="${VAULT_ADDR%/}"
audience="${VAULT_JWT_AUDIENCE:-medlink-vault}"
role="${VAULT_ROLE:-front-${environment}}"
token=''

revoke_token() {
    if [ -n "$token" ]; then
        curl --silent --show-error --max-time 10 \
            --request POST --header "X-Vault-Token: ${token}" \
            "${VAULT_ADDR}/v1/auth/token/revoke-self" > /dev/null 2>&1 || true
    fi
}
trap revoke_token EXIT

umask 077
mkdir -p "$output_dir"
chmod 700 "$output_dir"

jwt="$(curl --fail --silent --show-error --retry 2 --retry-connrefused --max-time 10 \
    --header "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
    "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${audience}" |
    jq -r '.value // empty')"
[ -n "$jwt" ] || { echo "::error::GitHub did not return an OIDC token."; exit 1; }

login_payload="$(jq -n --arg jwt "$jwt" --arg role "$role" '{jwt: $jwt, role: $role}')"
token="$(curl --fail --silent --show-error --retry 2 --retry-connrefused --max-time 10 \
    --request POST --data "$login_payload" \
    "${VAULT_ADDR}/v1/auth/jwt-github/login" |
    jq -r '.auth.client_token // empty')"
[ -n "$token" ] || { echo "::error::Vault refused the OIDC login for role ${role}."; exit 1; }

fetch_field() {
    local field="$1" output="$2"
    curl --fail --silent --show-error --retry 2 --retry-connrefused --max-time 10 \
        --header "X-Vault-Token: ${token}" \
        "${VAULT_ADDR}/v1/medlink/data/${environment}/front" |
        jq -er --arg field "$field" '.data.data[$field]' |
        openssl base64 -d -A > "$output"
    chmod 600 "$output"
}

fetch_field ssh_private_key_b64 "$output_dir/ssh_private_key"
fetch_field known_hosts_b64 "$output_dir/known_hosts"

grep -q 'BEGIN .*PRIVATE KEY' "$output_dir/ssh_private_key" || {
    echo "::error::The Vault ssh_private_key_b64 value is not a private key."
    exit 1
}
[ -s "$output_dir/known_hosts" ] || {
    echo "::error::The Vault known_hosts_b64 value is empty."
    exit 1
}

echo "Loaded front/${environment} SSH credentials from Vault."
