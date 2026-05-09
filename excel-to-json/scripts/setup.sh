#!/usr/bin/env bash
# Prepara o cache local da skill excel-to-json.
# Instala xlsx (SheetJS) no diretorio de cache so na primeira vez.
# Uso: bash scripts/setup.sh  -> imprime caminho do cache

set -euo pipefail

CACHE_DIR="${HOME}/.claude/cache/skill-excel-to-json"
mkdir -p "$CACHE_DIR"

if [ ! -d "$CACHE_DIR/node_modules/xlsx" ]; then
  echo "[excel-to-json] Instalando xlsx em $CACHE_DIR (primeira execucao)..." >&2
  pushd "$CACHE_DIR" >/dev/null
  if [ ! -f package.json ]; then
    npm init -y >/dev/null
  fi
  npm install xlsx@latest >/dev/null
  popd >/dev/null
fi

echo "$CACHE_DIR"
