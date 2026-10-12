#!/usr/bin/env bash
# Valida mensagens de commit no padrão do projeto.
#   scripts/lint-commit-msg.sh <arquivo-da-mensagem>    valida um commit (hook commit-msg)
#   scripts/lint-commit-msg.sh --range <base>..<head>   valida commits de um intervalo (CI)
set -euo pipefail
source "$(dirname "$0")/lib/conventions.sh"

lint_header() {
  local header="$1" type scope bang subject
  case "$header" in
    Merge\ *|Revert\ \"*|fixup!\ *|squash!\ *) return 0 ;;
  esac

  if ! [[ "$header" =~ ^([a-z]+)(\(([a-z0-9-]+)\))?(!)?:\ (.+)$ ]]; then
    echo "formato inválido: \"$header\""
    echo "  esperado: <tipo>(<escopo>): [<CARD>] <descrição em português>"
    return 1
  fi
  type="${BASH_REMATCH[1]}"
  scope="${BASH_REMATCH[3]}"
  subject="${BASH_REMATCH[5]}"

  contains_word "$COMMIT_TYPES" "$type" || { echo "tipo \"$type\" inválido. Use: $COMMIT_TYPES"; return 1; }
  if [ -z "$scope" ]; then
    if contains_word "$SCOPED_TYPES" "$type"; then
      echo "\"$type\" exige escopo. Use um de: $COMMIT_SCOPES"
      return 1
    fi
  elif ! contains_word "$COMMIT_SCOPES" "$scope"; then
    echo "escopo \"$scope\" inválido. Use um de: $COMMIT_SCOPES"
    return 1
  fi
  if [[ "$subject" =~ ^\[ ]] && ! [[ "$subject" =~ ^\[(US|TECH|BUG|INFRA|DOCS)-[0-9]+(\ a\ (US|TECH|BUG|INFRA|DOCS)-[0-9]+)?\]\ [^\ ] ]]; then
    echo "ID do card malformado: use [US-12], [TECH-08] ou [US-32 a US-35] seguido de espaço e descrição"
    return 1
  fi
  [[ "$subject" =~ \.$ ]] && { echo "não termine a descrição com ponto"; return 1; }
  [ "${#header}" -le "$MAX_HEADER_LENGTH" ] || { echo "cabeçalho com ${#header} caracteres (máximo $MAX_HEADER_LENGTH)"; return 1; }
  return 0
}

add_card_id() {
  local file="$1" header card branch
  header="$(head -n1 "$file")"
  branch="$(git symbolic-ref --short -q HEAD || true)"
  card="$(card_id_from_branch "$branch")"
  [ -n "$card" ] || return 0
  [[ "$header" =~ \[(US|TECH|BUG|INFRA|DOCS)- ]] && return 0
  [[ "$header" =~ ^(feat|fix|refactor|perf|test|style|docs|chore)(\([a-z0-9-]+\))?!?:\ (.+)$ ]] || return 0
  local prefix="${header%%: *}" rest="${header#*: }" tmp
  tmp="$(mktemp)"
  { printf '%s: [%s] %s\n' "$prefix" "$card" "$rest"; tail -n +2 "$file"; } > "$tmp"
  mv "$tmp" "$file"
}

if [ "${1:-}" = "--range" ]; then
  range="${2:?informe <base>..<head>}"
  failed=0
  while IFS= read -r line; do
    sha="${line%% *}"
    header="${line#* }"
    if ! output="$(lint_header "$header")"; then
      echo "✗ ${sha:0:7} $header"
      echo "$output" | sed 's/^/    /'
      failed=1
    fi
  done < <(git log --no-merges --format='%H %s' "$range")
  [ "$failed" -eq 0 ] && echo "✓ mensagens de commit no padrão"
  exit "$failed"
fi

file="${1:?informe o arquivo da mensagem}"
add_card_id "$file"
header="$(grep -v '^#' "$file" | head -n1)"
if ! output="$(lint_header "$header")"; then
  echo "✗ commit recusado: $output" >&2
  echo "  exemplo: feat(vendas): [US-35] reaproveitar venda registrada" >&2
  echo "  padrão completo: AGENTS.md › Git" >&2
  exit 1
fi
