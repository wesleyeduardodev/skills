#!/usr/bin/env bash
# Prepara o cache local de dependencias para a skill excel.
# Instala xlsx no diretorio de cache (so na primeira vez), reusa depois.
# Uso: source scripts/setup.sh  -> exporta XLSX_CACHE com o caminho

set -euo pipefail

# Resolver username (Git Bash define USERNAME, WSL define USER)
WIN_USER="${USERNAME:-${USER:-$(whoami)}}"

CACHE_DIR="${HOME}/.claude/cache/skill-excel"
mkdir -p "$CACHE_DIR"

if [ ! -d "$CACHE_DIR/node_modules/xlsx" ]; then
  echo "[excel] Instalando dependencias em $CACHE_DIR (so na primeira vez)..." >&2
  pushd "$CACHE_DIR" >/dev/null
  if [ ! -f package.json ]; then
    npm init -y >/dev/null
  fi
  # xlsx oficial (SheetJS) — note que versoes recentes do SheetJS sao distribuidas via cdn.sheetjs.com,
  # mas o pacote npm classico ainda funciona para leitura/escrita basica. Para projetos novos,
  # avaliar tambem `exceljs` que tem suporte mais rico a estilos.
  npm install xlsx@latest >/dev/null
  popd >/dev/null
fi

export XLSX_CACHE="$CACHE_DIR"
echo "$CACHE_DIR"
