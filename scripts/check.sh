#!/usr/bin/env bash
# Roda a mesma validação do CI. Use antes de cada commit e cole o resumo no PR.
#   scripts/check.sh              backend + frontend
#   scripts/check.sh frontend     só frontend (lint, testes, build)
#   scripts/check.sh backend      só backend
set -uo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
target="${1:-all}"
summary=()
failed=0

run_step() {
  local label="$1" dir="$2" log
  shift 2
  log="$(mktemp)"
  printf '▶ %s… ' "$label"
  if (cd "$root/$dir" && "$@") >"$log" 2>&1; then
    echo "ok"
    summary+=("✓ $label$(extract_counts "$log")")
  else
    echo "FALHOU"
    tail -n 40 "$log"
    summary+=("✗ $label")
    failed=1
  fi
  rm -f "$log"
}

extract_counts() {
  local maven vitest
  maven="$(grep -E '^\[(INFO|ERROR)\] Tests run: [0-9]+, Failures' "$1" | tail -n1 | sed -E 's/^\[[A-Z]+\] //')"
  vitest="$(grep -E '^ +Tests +[0-9]+' "$1" | tail -n1 | sed -E 's/^ +//; s/ +/ /g')"
  [ -n "$maven" ] && printf ' — %s' "$maven"
  [ -n "$vitest" ] && printf ' — %s' "$vitest"
  return 0
}

if [ "$target" = "all" ] || [ "$target" = "backend" ]; then
  run_step "backend: testes" backend ./mvnw -B test
fi

if [ "$target" = "all" ] || [ "$target" = "frontend" ]; then
  [ -d "$root/frontend/node_modules" ] || run_step "frontend: npm ci" frontend npm ci
  run_step "frontend: lint" frontend npm run lint
  run_step "frontend: testes" frontend npx vitest run
  run_step "frontend: build" frontend npm run build
fi

echo
printf '%s\n' "${summary[@]}"
exit "$failed"
