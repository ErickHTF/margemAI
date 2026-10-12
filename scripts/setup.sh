#!/usr/bin/env bash
# Prepara o clone: ativa os hooks do projeto e instala dependências do frontend.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$root" config core.hooksPath .githooks
chmod +x "$root"/.githooks/* "$root"/scripts/*.sh "$root"/scripts/card
echo "✓ hooks ativados (.githooks): mensagens de commit são validadas e recebem o ID do card da branch"
(cd "$root/frontend" && npm ci --silent)
echo "✓ dependências do frontend instaladas"
if ! gh auth status >/dev/null 2>&1; then
  echo "! gh não autenticado: rode 'gh auth login' (e 'gh auth refresh -s project') para usar scripts/card"
fi
