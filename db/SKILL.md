---
name: db
description: "Analisa e gerencia bancos PostgreSQL. Queries SELECT via MCP postgres, operacoes DDL/DML via container Docker (auto-detectado). Use para verificar estado do banco, debugar dados, criar/alterar tabelas, rodar migracoes ou analisar queries."
user-invocable: true
disable-model-invocation: true
argument-hint: [status | query SQL | criar tabela | o que precisa]
---

# Database Manager — PostgreSQL

Voce gerencia bancos PostgreSQL. Para leitura usa MCP postgres, para escrita/DDL acessa
o container Docker do banco via WSL.

## Fluxo de decisao

```
Usuario pede algo
    |
    ├─ E SELECT/leitura?
    │   └─ Usar mcp__postgres__query (se disponivel)
    │       └─ Se MCP nao disponivel → usar container Docker
    |
    └─ E DDL/DML (CREATE, ALTER, INSERT, UPDATE, DELETE, DROP, REFRESH)?
        └─ Descobrir container → executar via wsl docker exec
```

## Leitura — MCP postgres

Para queries SELECT, usar a ferramenta MCP:

```
mcp__postgres__query("SELECT * FROM pg_tables WHERE schemaname = 'public'")
```

Se o MCP postgres nao estiver configurado no projeto, usar o container Docker como fallback.

## Escrita/DDL — Container Docker

### Auto-discovery de container

Antes de executar DDL/DML, descobrir qual container Postgres esta rodando:

```bash
wsl docker ps --filter "ancestor=postgres" --format "{{.Names}}" 2>/dev/null
wsl docker ps --filter "ancestor=pgvector/pgvector" --format "{{.Names}}" 2>/dev/null
wsl docker ps | grep -i postgres | awk '{print $NF}' 2>/dev/null
```

**Regras de decisao:**
- **1 container encontrado** → usar direto, sem perguntar
- **N containers encontrados** → listar e perguntar ao usuario qual usar
- **0 containers** → avisar que nao encontrou Postgres rodando e perguntar se precisa subir

### Descobrir credenciais

Apos encontrar o container, extrair credenciais via inspect:

```bash
# Extrair usuario e banco das env vars do container
wsl docker inspect CONTAINER --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD'
```

**Fallback se nao encontrar env vars:**
- Usuario: `postgres`
- Database: `postgres`
- Perguntar ao usuario se os defaults nao funcionarem

### Executar comandos

```bash
# Query unica
wsl docker exec -i CONTAINER psql -U USUARIO -d DATABASE -c "SQL_AQUI"

# Arquivo SQL
wsl docker exec -i CONTAINER psql -U USUARIO -d DATABASE < arquivo.sql

# Sessao interativa (quando precisar de multiplos comandos)
wsl docker exec -i CONTAINER psql -U USUARIO -d DATABASE <<'EOF'
BEGIN;
CREATE TABLE ...;
INSERT INTO ...;
COMMIT;
EOF
```

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

1. SELECT → MCP postgres (se disponivel), senao container Docker
2. DDL/DML → sempre via container Docker com `wsl docker exec`
3. Auto-detectar container e credenciais antes de pedir ao usuario
4. Operacoes destrutivas (DROP, TRUNCATE, DELETE) → confirmacao obrigatoria
5. Sempre mostrar SQL antes de executar DDL
6. Se o usuario passar `$ARGUMENTS`, interpretar e executar direto
7. Formatar resultados de forma legivel (tabelas alinhadas)

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
