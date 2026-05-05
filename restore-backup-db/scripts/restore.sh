#!/usr/bin/env bash
# Faz backup de um Postgres remoto e restaura em container Docker local.
# Postgres 17 ou 18 (usa imagem postgres:18 para o pg_dump — superset).
#
# Uso (env vars):
#   --- Origem (escolha um modo) ---
#   SRC_URL       postgresql://user:pass@host:port/db
#   ou
#   SRC_HOST, SRC_PORT, SRC_USER, SRC_PASS, SRC_DB
#
#   --- Destino ---
#   TARGET_CONTAINER     nome do container Docker (obrigatorio)
#   TARGET_DB            (opcional, default = SRC_DB)
#   TARGET_USER          (opcional, default = descoberto via docker inspect)
#
#   --- Comportamento ---
#   DROP_TARGET=1        drop+recreate o db destino (default 1)
#   SRC_SSL=1            sslmode=require na origem (default 1; 0 desativa)
#   PG_DUMP_IMAGE        imagem do container temporario (default postgres:18)
#
# Exit codes: 2=parametros invalidos, 3=preflight, 4=dump, 5=restore

set -euo pipefail

log() { echo "[restore] $*" >&2; }
die() { log "ERRO: $*"; exit "${2:-1}"; }

# ---- 1) Parse origem ----
if [ -n "${SRC_URL:-}" ]; then
  RE='^postgresql://([^:]+):([^@]+)@([^:/]+)(:([0-9]+))?/([^?]+)'
  if [[ ! "$SRC_URL" =~ $RE ]]; then
    die "SRC_URL invalida (esperado postgresql://user:pass@host:port/db)" 2
  fi
  SRC_USER="${BASH_REMATCH[1]}"
  SRC_PASS="${BASH_REMATCH[2]}"
  SRC_HOST="${BASH_REMATCH[3]}"
  SRC_PORT="${BASH_REMATCH[5]:-5432}"
  SRC_DB="${BASH_REMATCH[6]}"
else
  for v in SRC_HOST SRC_PORT SRC_USER SRC_PASS SRC_DB; do
    [ -n "${!v:-}" ] || die "$v nao definida (ou use SRC_URL)" 2
  done
fi
[ -n "${TARGET_CONTAINER:-}" ] || die "TARGET_CONTAINER nao definido" 2

TARGET_DB="${TARGET_DB:-$SRC_DB}"
DROP_TARGET="${DROP_TARGET:-1}"
SRC_SSL="${SRC_SSL:-1}"
PG_DUMP_IMAGE="${PG_DUMP_IMAGE:-postgres:18}"

CACHE_DIR="${HOME}/.claude/cache/skill-restore-backup-db/dumps"
mkdir -p "$CACHE_DIR"

# Mascarar senha em logs
SRC_PASS_MASK="${SRC_PASS:0:2}***${SRC_PASS: -2}"
log "Origem:  ${SRC_USER}:${SRC_PASS_MASK}@${SRC_HOST}:${SRC_PORT}/${SRC_DB} (ssl=${SRC_SSL})"
log "Destino: container=${TARGET_CONTAINER} db=${TARGET_DB} drop=${DROP_TARGET}"

# ---- 2) Pre-flight container ----
docker inspect "$TARGET_CONTAINER" >/dev/null 2>&1 \
  || die "container '$TARGET_CONTAINER' nao existe" 3

STATUS=$(docker inspect "$TARGET_CONTAINER" --format '{{.State.Status}}')
[ "$STATUS" = "running" ] \
  || die "container nao esta rodando (status=$STATUS)" 3

# Descobrir TARGET_USER via env vars do container, se nao informado
if [ -z "${TARGET_USER:-}" ]; then
  TARGET_USER=$(docker inspect "$TARGET_CONTAINER" \
    --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | awk -F= '/^POSTGRES_USER=/{print $2; exit}')
  TARGET_USER="${TARGET_USER:-postgres}"
fi
log "Container postgres user: $TARGET_USER"

# Confirmar que o container e postgres
docker exec -i "$TARGET_CONTAINER" pg_isready -U "$TARGET_USER" >/dev/null 2>&1 \
  || die "container nao parece ser Postgres saudavel (pg_isready falhou)" 3
log "✓ Container destino OK"

# ---- 3) Pre-flight origem ----
PGSSL_ENV=()
if [ "$SRC_SSL" = "1" ]; then PGSSL_ENV=(-e PGSSLMODE=require); fi

log "Testando conexao com a origem..."
docker run --rm \
  -e PGPASSWORD="$SRC_PASS" "${PGSSL_ENV[@]}" \
  "$PG_DUMP_IMAGE" \
  psql -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -d "$SRC_DB" \
       -tAc "SELECT version();" \
  >/dev/null \
  || die "falha ao conectar na origem (cheque host/porta/credenciais/SSL)" 3
log "✓ Origem acessivel"

# ---- 4) Dump ----
TS=$(date +%Y%m%d-%H%M%S)
DUMP_PATH="$CACHE_DIR/${SRC_DB}-${TS}.dump"
LOG_PATH="$CACHE_DIR/${SRC_DB}-${TS}.log"

log "Iniciando pg_dump (formato custom -Fc)..."
log "  → $DUMP_PATH"
docker run --rm \
  -e PGPASSWORD="$SRC_PASS" "${PGSSL_ENV[@]}" \
  "$PG_DUMP_IMAGE" \
  pg_dump -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -d "$SRC_DB" \
    -Fc --no-owner --no-privileges --verbose \
  > "$DUMP_PATH" 2> "$LOG_PATH" \
  || { log "pg_dump falhou — veja $LOG_PATH"; tail -5 "$LOG_PATH" >&2; exit 4; }

DUMP_SIZE=$(du -h "$DUMP_PATH" | cut -f1)
log "✓ Dump concluido: $DUMP_SIZE"

# ---- 5) Drop + recreate (opcional) ----
if [ "$DROP_TARGET" = "1" ]; then
  log "Dropando e recriando '$TARGET_DB' no container..."
  docker exec -i "$TARGET_CONTAINER" psql -U "$TARGET_USER" -d postgres \
    -v ON_ERROR_STOP=1 <<EOF >/dev/null
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$TARGET_DB";
CREATE DATABASE "$TARGET_DB";
EOF
  log "✓ '$TARGET_DB' recriado"
fi

# ---- 6) Restore ----
log "Restaurando dump no container..."
docker exec -i "$TARGET_CONTAINER" \
  pg_restore -U "$TARGET_USER" -d "$TARGET_DB" \
    --no-owner --no-privileges \
  < "$DUMP_PATH" \
  2> >(tee -a "$LOG_PATH" >&2) \
  || log "AVISO: pg_restore retornou erros — veja $LOG_PATH (objetos comuns: extensoes nao instaladas no destino)"

# ---- 7) Verify ----
TABLES=$(docker exec -i "$TARGET_CONTAINER" \
  psql -U "$TARGET_USER" -d "$TARGET_DB" -tAc \
  "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")
SIZE_DB=$(docker exec -i "$TARGET_CONTAINER" \
  psql -U "$TARGET_USER" -d "$TARGET_DB" -tAc \
  "SELECT pg_size_pretty(pg_database_size('$TARGET_DB'));")
log "✓ Restauracao concluida"
log "  Tabelas no schema public: $TABLES"
log "  Tamanho do banco: $SIZE_DB"
log "  Dump preservado em: $DUMP_PATH"
log ""
log "Acesse com:"
log "  docker exec -it $TARGET_CONTAINER psql -U $TARGET_USER -d $TARGET_DB"
