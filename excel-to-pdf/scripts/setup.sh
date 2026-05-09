#!/usr/bin/env bash
# Prepara o cache local da skill excel-to-pdf.
# Instala xlsx + puppeteer-core no diretorio de cache (so na primeira vez).
# Detecta browser Chrome/Edge ja instalado no Windows.
# Uso: bash scripts/setup.sh -> imprime "<cache>|<browser_path>"

set -euo pipefail

WIN_USER="${USERNAME:-${USER:-$(whoami)}}"
CACHE_DIR="${HOME}/.claude/cache/skill-excel-to-pdf"
mkdir -p "$CACHE_DIR"

NEEDS_INSTALL=0
[ ! -d "$CACHE_DIR/node_modules/xlsx" ] && NEEDS_INSTALL=1
[ ! -d "$CACHE_DIR/node_modules/puppeteer-core" ] && NEEDS_INSTALL=1

if [ "$NEEDS_INSTALL" = "1" ]; then
  echo "[excel-to-pdf] Instalando xlsx + puppeteer-core em $CACHE_DIR..." >&2
  pushd "$CACHE_DIR" >/dev/null
  if [ ! -f package.json ]; then
    npm init -y >/dev/null
  fi
  npm install xlsx@latest puppeteer-core@latest >/dev/null
  popd >/dev/null
fi

# Auto-detectar Chrome/Edge instalado
BROWSER_PATH=""
CANDIDATES=(
  "/c/Users/${WIN_USER}/AppData/Local/Google/Chrome/Application/chrome.exe"
  "/c/Program Files/Google/Chrome/Application/chrome.exe"
  "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe"
)

for c in "${CANDIDATES[@]}"; do
  if [ -f "$c" ]; then
    BROWSER_PATH="$c"
    break
  fi
done

if [ -z "$BROWSER_PATH" ]; then
  echo "[excel-to-pdf] ERRO: nenhum Chrome/Edge encontrado." >&2
  echo "[excel-to-pdf] Instale Chrome ou Edge, ou edite setup.sh com o caminho correto." >&2
  exit 1
fi

echo "$CACHE_DIR|$BROWSER_PATH"
