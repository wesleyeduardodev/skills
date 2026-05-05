#!/usr/bin/env bash
# Prepara o cache local da skill pdf.
# Usa puppeteer-core + Chrome/Edge ja instalado no Windows (sem download de Chromium).
# Uso: source scripts/setup.sh  -> exporta PDF_CACHE e BROWSER_PATH

set -euo pipefail

# Resolver username (Git Bash define USERNAME, WSL define USER)
WIN_USER="${USERNAME:-${USER:-$(whoami)}}"

CACHE_DIR="${HOME}/.claude/cache/skill-pdf"
mkdir -p "$CACHE_DIR"

NEEDS_INSTALL=0
[ ! -d "$CACHE_DIR/node_modules/puppeteer-core" ] && NEEDS_INSTALL=1
[ ! -d "$CACHE_DIR/node_modules/marked" ] && NEEDS_INSTALL=1
[ ! -d "$CACHE_DIR/node_modules/pdf-parse" ] && NEEDS_INSTALL=1

if [ "$NEEDS_INSTALL" = "1" ]; then
  echo "[pdf] Instalando puppeteer-core + marked + pdf-parse em $CACHE_DIR..." >&2
  pushd "$CACHE_DIR" >/dev/null
  if [ ! -f package.json ]; then
    npm init -y >/dev/null
  fi
  npm install puppeteer-core@latest marked@latest pdf-parse@latest >/dev/null
  popd >/dev/null
fi

# Auto-detectar browser instalado (ordem de preferencia: Chrome > Edge)
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
  echo "[pdf] ERRO: nenhum browser Chromium-based encontrado (Chrome/Edge)." >&2
  echo "[pdf] Instale Chrome ou Edge, ou ajuste setup.sh com o caminho correto." >&2
  exit 1
fi

export PDF_CACHE="$CACHE_DIR"
export BROWSER_PATH
echo "$CACHE_DIR|$BROWSER_PATH"
