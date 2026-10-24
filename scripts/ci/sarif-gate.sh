#!/usr/bin/env bash
# Blocks when CodeQL reports a finding with security-severity >= threshold.
# Usage: bash scripts/ci/sarif-gate.sh 7.0 codeql-results/*.sarif
set -euo pipefail

threshold="${1:?usage: sarif-gate.sh <threshold> <file.sarif>...}"
shift
[ "$#" -gt 0 ] || { echo "no SARIF file given" >&2; exit 2; }

blocking=0
for file in "$@"; do
  [ -s "$file" ] || { echo "missing or empty SARIF file: $file" >&2; exit 2; }
  report="$(jq -r --argjson threshold "$threshold" '
    .runs[]
    | ([.tool.driver.rules[]?, .tool.extensions[]?.rules[]?]
       | map({key: .id, value: (.properties["security-severity"] // "0" | tonumber)})
       | from_entries) as $severity
    | .results[]
    | (.ruleId // .rule.id) as $rule
    | ($severity[$rule] // 0) as $score
    | [(if $score >= $threshold then "BLOCK" else "INFO" end),
       ($score | tostring), $rule,
       ((.locations[0].physicalLocation.artifactLocation.uri // "?") + ":" +
        (.locations[0].physicalLocation.region.startLine // 0 | tostring)),
       (.message.text | split("\n")[0])]
    | join("  ")' "$file")"
  count="$(printf '%s\n' "$report" | grep -c . || true)"
  echo "== $file: $count result(s)"
  [ -z "$report" ] || printf '%s\n' "$report"
  if printf '%s\n' "$report" | grep -q '^BLOCK'; then blocking=1; fi
done

if [ "$blocking" -ne 0 ]; then
  echo "::error::CodeQL finding(s) at or above severity $threshold."
  exit 1
fi
echo "No CodeQL finding with severity >= $threshold"
