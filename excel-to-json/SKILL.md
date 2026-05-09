---
name: excel-to-json
description: "Converte arquivos Excel (.xlsx, .xls, .csv, .ods) para JSON no Windows 11. Use quando o usuario pedir para extrair dados de planilha em JSON, transformar Excel em JSON, ler aba especifica como JSON, ou invocar /excel-to-json. Suporta selecao de aba, tipagem (datas/numeros), pretty/compacto e saida em arquivo ou stdout."
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob
argument-hint: [arquivo.xlsx | arquivo.xlsx --sheet NomeAba --out saida.json]
---

# Excel to JSON

Converte planilhas para JSON. Roda Node.js + xlsx (SheetJS) com cache local.

Ambiente: **Windows 11 Pro**. Use a ferramenta **Bash** (Git Bash). Caminhos
absolutos no formato POSIX (`/c/Users/wesle/...`).

## Estrutura

```
~/.claude/skills/excel-to-json/
├── SKILL.md
└── scripts/
    ├── setup.sh      # cache de dependencias (xlsx)
    └── convert.js    # excel -> json
```

Cache em `~/.claude/cache/skill-excel-to-json/`. `xlsx` instalado uma unica vez.

## Padrao de invocacao

```bash
CACHE=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
export NODE_PATH="$CACHE/node_modules"
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" <opcoes>
```

## Operacoes

### Converter planilha inteira (todas as abas)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" "/c/path/dados.xlsx" --out "/c/path/dados.json"
```

Saida:
```json
{
  "sheetNames": ["Aba1", "Aba2"],
  "sheets": {
    "Aba1": [ {"col1": "valor", "col2": 123}, ... ],
    "Aba2": [ ... ]
  }
}
```

### Converter aba especifica

```bash
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" "/c/path/dados.xlsx" --sheet "Vendas" --out "/c/path/vendas.json"
```

Saida (array direto, sem wrapper):
```json
[ {"data": "2026-01-01", "produto": "X", "valor": 100}, ... ]
```

### Saida em stdout (sem `--out`)

Para pipe ou inspecao rapida — JSON vai pro stdout:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" "/c/path/dados.xlsx" --sheet "Vendas"
```

### Modo compacto (sem indentacao)

Ideal para arquivos grandes:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" "/c/path/dados.xlsx" --out "/c/path/dados.json" --compact
```

## Opcoes

| Flag | Default | Descricao |
|------|---------|-----------|
| `--sheet <nome>` | (todas) | Converte apenas a aba indicada |
| `--out <arquivo>` | stdout | Escreve em arquivo; sem flag, manda pra stdout |
| `--compact` | false | JSON sem indentacao (menor) |
| `--no-dates` | false | Nao parseia datas (mantem como string/number raw) |
| `--header-row <n>` | 1 | Linha do cabecalho (1-indexed) |

## Tipagem

Por padrao:
- Numeros viram `number`
- Datas viram strings ISO 8601 (`"2026-01-15T00:00:00.000Z"`)
- Celulas vazias viram `null`
- Booleanos viram `true`/`false`

Use `--no-dates` para receber datas como serial Excel (numero) ou string crua.

## Encoding de CSV

CSVs salvos pelo Excel BR sao geralmente **CP-1252** (Windows-1252). Se aparecer
acentuacao quebrada na saida JSON, converta antes:

```bash
iconv -f CP1252 -t UTF-8 entrada.csv > entrada-utf8.csv
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" "/c/path/entrada-utf8.csv" --out saida.json
```

## Regras

1. SEMPRE use o script em `${CLAUDE_SKILL_DIR}/scripts/convert.js` — nao gere inline
2. SEMPRE use o cache `~/.claude/cache/skill-excel-to-json/`
3. Caminhos do usuario sempre **absolutos** (`/c/Users/...`)
4. Se o usuario nao especificar `--out`, peca confirmacao se o JSON tiver > 5000 linhas (pode estourar contexto se mostrar tudo)
5. Se o pedido for ambiguo (varias abas, nao especificou qual), liste as abas e pergunte

## Exemplos de invocacao

- `/excel-to-json cronograma.xlsx` → converte todas as abas, salva como `cronograma.json`
- `/excel-to-json dados.xlsx --sheet Vendas` → converte so aba Vendas, mostra stdout
- `/excel-to-json dados.xlsx --sheet Vendas --out vendas.json --compact` → aba especifica, arquivo compacto
- `/excel-to-json relatorio.csv` → converte CSV (xlsx detecta automaticamente)
- `/excel-to-json dados.xlsx --no-dates` → mantem datas como serial Excel
