---
name: restore-backup-db
description: "Faz backup de um Postgres remoto (RDS, Supabase, Neon, etc) e restaura num container Docker local no Windows 11. Recebe URL ou credenciais da origem + nome do container destino. Postgres 17 ou 18. Use para clonar producao localmente, criar dev a partir de staging, ou snapshot rapido."
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
argument-hint: [URL postgresql://... container=NOME] ou [host=... user=... db=... container=...]
---

# Restore Backup DB — Postgres remoto → Container local

Voce automatiza `pg_dump` de um Postgres remoto + `pg_restore` num container
Docker local. Sempre Postgres 17 ou 18.

Ambiente: **Windows 11 Pro + Docker Desktop**. Use a ferramenta **Bash**.

## Estrutura

```
~/.claude/skills/restore-backup-db/
├── SKILL.md
└── scripts/
    └── restore.sh   # orquestra dump + drop+recreate + restore + verify
```

Dumps salvos em `~/.claude/cache/skill-restore-backup-db/dumps/<db>-<timestamp>.dump`
(preservados — uteis para re-restaurar sem refazer o dump).

## Workflow

1. Coletar credenciais da origem + nome do container
2. **Mostrar plano ao usuario** (origem mascarada, destino, drop sim/nao) e
   **pedir confirmacao** antes de executar
3. Rodar `scripts/restore.sh` com as variaveis de ambiente
4. Reportar resultado: tabelas restauradas, tamanho, caminho do dump

## Como invocar

### Forma 1 — URL completa

```bash
SRC_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO" \
TARGET_CONTAINER="mentor-db" \
bash "${CLAUDE_SKILL_DIR}/scripts/restore.sh"
```

### Forma 2 — Campos separados (senhas com caracteres especiais)

```bash
SRC_HOST="db.exemplo.com" \
SRC_PORT="5432" \
SRC_USER="admin" \
SRC_PASS='senha@com#especiais!' \
SRC_DB="produção" \
TARGET_CONTAINER="mentor-db" \
bash "${CLAUDE_SKILL_DIR}/scripts/restore.sh"
```

### Variaveis opcionais

| Variavel | Default | Quando usar |
|---|---|---|
| `TARGET_DB` | `$SRC_DB` | Renomear o banco no destino |
| `TARGET_USER` | descoberto via `docker inspect` | Override se inspect falhar |
| `DROP_TARGET` | `1` | `0` para preservar o db existente (usa `pg_restore --clean`) |
| `SRC_SSL` | `1` (sslmode=require) | `0` para conexoes locais sem SSL |
| `PG_DUMP_IMAGE` | `postgres:18` | Trocar versao da imagem temporaria |

## Regras de seguranca

1. **SEMPRE mostre o plano antes de rodar**, mascarando a senha (ex: `pa****ra`)
2. **SEMPRE peca confirmacao** se `DROP_TARGET=1` (default) — destroi dados locais
3. **NUNCA passe a senha em linha de comando** — use `PGPASSWORD` env (ja feito no script)
4. **NUNCA registre a senha em logs ou commits** — verifique antes de colar saidas
5. **Containers de producao**: jamais use este skill apontando o destino para um container que nao seja de dev/local

## Pre-flight checks (script faz automaticamente)

- Container destino existe e esta `running`
- Container e Postgres saudavel (`pg_isready`)
- Origem responde (`SELECT version()`)
- Se algo falha, sai com exit code != 0 e mensagem clara

## Tratamento de erros comuns

| Sintoma | Causa provavel | Solucao |
|---|---|---|
| `pg_dump: connection refused` | Firewall do remoto, IP nao autorizado | Liberar IP no firewall do RDS/Supabase |
| `permission denied for schema public` (no restore) | Origem com extensoes privilegiadas (pgcrypto, pgvector) | Pre-instalar extensoes no destino: `docker exec -it CONTAINER psql -c "CREATE EXTENSION pgvector;"` |
| `database "X" is being accessed by other users` | Conexoes ativas no banco destino | Script ja faz `pg_terminate_backend`; se persistir, restart do container |
| `pg_restore: error: could not execute query: ERROR: extension "X" does not exist` | Extensao do dump nao existe no destino | Pre-instalar a extensao OU adicionar `--no-acl` e ignorar |

## Execucao com argumentos

Quando invocada com `/restore-backup-db $ARGUMENTS`:

1. Parse os argumentos (URL e container ou campos separados)
2. Mostre o plano:
   ```
   Vou:
   - Conectar em USUARIO@HOST:PORT/BANCO (ssl=on)
   - Fazer pg_dump (formato custom)
   - Dropar e recriar 'BANCO' no container 'CONTAINER'
   - Restaurar
   - Verificar
   Confirma?
   ```
3. Aguarde "sim" / "ok" / "pode ir"
4. Execute `bash ${CLAUDE_SKILL_DIR}/scripts/restore.sh` com as env vars

### Exemplos de invocacao do usuario

- `/restore-backup-db postgresql://admin:s3cr3t@db.prod.com:5432/app container=mentor-db`
- `/restore-backup-db host=db.prod.com user=admin pass=s3cr3t db=app container=mentor-db`
- `/restore-backup-db <URL> container=mentor-db target_db=app_local`
- `/restore-backup-db <URL> container=mentor-db drop=0` (preserva db existente)

## Saidas tipicas

```
[restore] Origem:  admin:se***t@db.prod.com:5432/app (ssl=1)
[restore] Destino: container=mentor-db db=app drop=1
[restore] Container postgres user: postgres
[restore] ✓ Container destino OK
[restore] Testando conexao com a origem...
[restore] ✓ Origem acessivel
[restore] Iniciando pg_dump (formato custom -Fc)...
[restore]   → /c/Users/wesle/.claude/cache/skill-restore-backup-db/dumps/app-20260505-143022.dump
[restore] ✓ Dump concluido: 45M
[restore] Dropando e recriando 'app' no container...
[restore] ✓ 'app' recriado
[restore] Restaurando dump no container...
[restore] ✓ Restauracao concluida
[restore]   Tabelas no schema public: 47
[restore]   Tamanho do banco: 52 MB
[restore]   Dump preservado em: /c/Users/wesle/.claude/cache/skill-restore-backup-db/dumps/app-20260505-143022.dump
[restore] Acesse com:
[restore]   docker exec -it mentor-db psql -U postgres -d app
```
