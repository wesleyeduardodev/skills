---
name: db-geral
description: "Analisa e gerencia bancos PostgreSQL no Windows 11 com Docker Desktop. Queries SELECT via MCP postgres, operacoes DDL/DML via psql local ou container Docker (auto-detectado). Use para verificar estado do banco, debugar dados, criar/alterar tabelas, rodar migracoes ou analisar queries."
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
argument-hint: [status | query SQL | criar tabela | o que precisa]
---

# Database Manager — PostgreSQL

Voce gerencia bancos PostgreSQL em ambiente **Windows 11 Pro + Docker Desktop**.
Para leitura usa MCP postgres, para escrita/DDL acessa o container Docker
diretamente (Docker Desktop expoe `docker` no PATH — NUNCA usar `wsl docker`).

Use SEMPRE a ferramenta **Bash** para executar comandos shell desta skill
(sintaxe POSIX, heredocs, etc). Se precisar interagir com PowerShell, troque
explicitamente para a ferramenta PowerShell.

## Fluxo de decisao

```
Usuario pede algo
    |
    ├─ E SELECT/leitura?
    │   └─ Usar mcp__postgres__query (se disponivel)
    │       └─ Se MCP nao disponivel → tentar psql local → senao, container Docker
    |
    └─ E DDL/DML (CREATE, ALTER, INSERT, UPDATE, DELETE, DROP, REFRESH)?
        └─ Tentar psql local → senao, descobrir container → executar via docker exec
```

## Leitura — MCP postgres

Para queries SELECT, usar a ferramenta MCP:

```
mcp__postgres__query("SELECT * FROM pg_tables WHERE schemaname = 'public'")
```

Se o MCP postgres nao estiver configurado no projeto, usar o container Docker como fallback.

## Escrita/DDL — Detectar como conectar

### Passo 1: Tentar psql local

Antes de buscar container Docker, verifique se `psql` esta disponivel localmente:

```bash
command -v psql 2>/dev/null
```

Se `psql` estiver no PATH, tente conectar diretamente (util para Postgres local,
RDS, Supabase, ou qualquer instancia acessivel por rede):

```bash
PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -d postgres -c "SELECT 1" 2>/dev/null
```

Se funcionar, use `psql` direto — sem Docker. Se nao, siga para o passo 2.

### Passo 2: Auto-discovery de container (Docker Desktop)

Docker Desktop expoe `docker` direto no PATH do Windows — sem prefixo `wsl`.
Para descobrir qual container Postgres esta rodando:

```bash
docker ps --filter "ancestor=postgres" --format "{{.Names}}"
docker ps --filter "ancestor=pgvector/pgvector" --format "{{.Names}}"
docker ps --format "{{.Names}}\t{{.Image}}" | grep -i postgres
```

**Regras de decisao:**
- **1 container encontrado** → usar direto, sem perguntar
- **N containers encontrados** → listar e perguntar ao usuario qual usar
- **0 containers** → avisar que nao encontrou Postgres rodando e perguntar se precisa subir

### Descobrir credenciais

Apos encontrar o container, extrair credenciais via inspect:

```bash
# Extrair usuario e banco das env vars do container
docker inspect CONTAINER --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD'
```

**Fallback se nao encontrar env vars:**
- Usuario: `postgres`
- Database: `postgres`
- Perguntar ao usuario se os defaults nao funcionarem

### Executar comandos

```bash
# Query unica
docker exec -i CONTAINER psql -U USUARIO -d DATABASE -c "SQL_AQUI"

# Arquivo SQL (usar caminho absoluto Windows convertido p/ POSIX no Git Bash)
docker exec -i CONTAINER psql -U USUARIO -d DATABASE < /c/projetos/.../arquivo.sql

# Sessao com multiplos comandos (heredoc — bash only)
docker exec -i CONTAINER psql -U USUARIO -d DATABASE <<'EOF'
BEGIN;
CREATE TABLE ...;
INSERT INTO ...;
COMMIT;
EOF
```

**Nota Windows:** se rodar via PowerShell, substitua o heredoc por here-string:
```powershell
@'
BEGIN;
CREATE TABLE ...;
COMMIT;
'@ | docker exec -i CONTAINER psql -U USUARIO -d DATABASE
```
A linha `'@` precisa estar na coluna 0 (sem indentacao).

## O que voce sabe fazer

### Consultas
- Listar tabelas, views, materialized views, indices
- Ver estrutura de uma tabela (colunas, tipos, constraints)
- Contar registros
- Queries personalizadas
- Explain/analyze de queries

### Estrutura
- Criar tabelas, indices, views, materialized views
- Alterar tabelas (add/drop/rename columns)
- Criar/alterar constraints (FK, UK, CHECK)
- Refresh de materialized views

### Dados
- Inserir dados
- Atualizar registros
- Deletar registros (com confirmacao)
- Import/export CSV

### Diagnostico
- Ver conexoes ativas
- Ver queries lentas / bloqueios
- Ver tamanho de tabelas e indices
- Verificar extensoes instaladas
- Verificar configuracoes do servidor

## Queries uteis

### Status geral
```sql
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### Tamanho das tabelas
```sql
SELECT relname AS tabela,
       pg_size_pretty(pg_total_relation_size(relid)) AS tamanho_total,
       pg_size_pretty(pg_relation_size(relid)) AS dados,
       pg_size_pretty(pg_indexes_size(relid)) AS indices
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Conexoes ativas
```sql
SELECT pid, usename, datname, state, query_start, left(query, 80) as query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

### Indices nao utilizados
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### Extensoes
```sql
SELECT extname, extversion FROM pg_extension ORDER BY extname;
```

### Materialized views
```sql
SELECT schemaname, matviewname, hasindexes, ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
```

## Seguranca

- NUNCA execute DROP, TRUNCATE ou DELETE sem confirmacao explicita do usuario
- Para ALTER TABLE destrutivo (drop column), pedir confirmacao
- Queries SELECT: sempre seguras, executar direto
- INSERT/UPDATE: executar direto (nao destrutivo)
- Sempre mostrar o SQL que vai executar antes de executar DDL

## Regras

1. SELECT → MCP postgres (se disponivel), senao psql local, senao container Docker
2. DDL/DML → psql local (se conectar) ou `docker exec` (Docker Desktop)
3. NUNCA usar `wsl docker` — Docker Desktop expoe `docker` direto no PATH
4. Auto-detectar container e credenciais antes de pedir ao usuario
5. Operacoes destrutivas (DROP, TRUNCATE, DELETE) → confirmacao obrigatoria
6. Sempre mostrar SQL antes de executar DDL
7. Se o usuario passar `$ARGUMENTS`, interpretar e executar direto
8. Formatar resultados de forma legivel (tabelas alinhadas)
9. Se Docker Desktop nao estiver rodando, instruir o usuario a inicia-lo

## Execucao com argumentos

Se o usuario invocar `/db $ARGUMENTS`, interprete e execute.

Exemplos:
- `/db status` → listar tabelas + contagens
- `/db tabela usuarios` → mostrar estrutura da tabela
- `/db dados silver_obras` → ultimos registros
- `/db criar tabela X` → gerar DDL e executar (com confirmacao)
- `/db queries lentas` → pg_stat_activity filtrado
- `/db refresh gold_obras_resumo` → REFRESH MATERIALIZED VIEW
- `/db extensoes` → listar extensoes instaladas
- `/db tamanho` → tamanho de cada tabela
