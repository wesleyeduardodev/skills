---
name: excel-to-pdf
description: "Converte arquivos Excel (.xlsx, .xls, .csv, .ods) em PDF tabular no Windows 11. Use quando o usuario pedir Excel para PDF, exportar planilha em PDF, gerar PDF de tabela, relatorio PDF de dados, ou invocar /excel-to-pdf. Detecta automaticamente quando ha colunas demais para caber na pagina e pergunta ao usuario quais manter, evitando estouro horizontal. Suporta orientacao retrato/paisagem, A4/A3 e selecao de colunas."
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob
argument-hint: [arquivo.xlsx | arquivo.xlsx --sheet Nome --columns col1,col2,col3]
---

# Excel to PDF

Converte planilhas em PDF tabular com selecao inteligente de colunas para nao
estourar horizontalmente. Stack: Node.js + xlsx (SheetJS) + puppeteer-core +
Chrome/Edge do sistema.

Ambiente: **Windows 11 Pro**. Use **Bash** (Git Bash). Caminhos POSIX
absolutos (`/c/Users/wesle/...`).

## Estrutura

```
~/.claude/skills/excel-to-pdf/
├── SKILL.md
└── scripts/
    ├── setup.sh      # cache + auto-detect Chrome/Edge
    ├── analyze.js    # mede colunas e recomenda quais cabem
    └── convert.js    # gera o PDF a partir das colunas selecionadas
```

Cache em `~/.claude/cache/skill-excel-to-pdf/` (xlsx + puppeteer-core, marked,
instalados uma unica vez).

## Workflow obrigatorio

Copie e siga este checklist:

```
- [ ] Passo 1: Rodar setup (carrega cache + detecta browser)
- [ ] Passo 2: Rodar analyze.js para medir colunas
- [ ] Passo 3: Verificar se todas cabem
- [ ] Passo 4: Se nao couberem, apresentar ao usuario e pedir selecao
- [ ] Passo 5: Rodar convert.js com colunas escolhidas
```

### Passo 1 — Setup

```bash
SETUP_OUT=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
PDF_CACHE=$(echo "$SETUP_OUT" | awk -F'|' '{print $1}')
export BROWSER_PATH=$(echo "$SETUP_OUT" | awk -F'|' '{print $2}')
export NODE_PATH="$PDF_CACHE/node_modules"
```

### Passo 2 — Analyze

```bash
node "${CLAUDE_SKILL_DIR}/scripts/analyze.js" "/c/path/dados.xlsx" --sheet "Vendas"
```

Saida (JSON em stdout):

```json
{
  "sheet": "Vendas",
  "totalRows": 1234,
  "columns": [
    { "name": "data",    "headerLen": 4,  "maxContentLen": 10, "estimatedWidthChars": 13 },
    { "name": "produto", "headerLen": 7,  "maxContentLen": 25, "estimatedWidthChars": 28 },
    { "name": "valor",   "headerLen": 5,  "maxContentLen": 8,  "estimatedWidthChars": 11 }
  ],
  "totalEstimatedChars": 52,
  "budgets": {
    "a4Portrait":  { "chars": 90,  "fits": true },
    "a4Landscape": { "chars": 133, "fits": true },
    "a3Landscape": { "chars": 195, "fits": true }
  },
  "recommendation": {
    "fits": true,
    "orientation": "portrait",
    "format": "A4",
    "selectedColumns": ["data", "produto", "valor"],
    "droppedColumns": [],
    "reason": "Todas as 3 colunas cabem em A4 retrato (52/90 chars)."
  }
}
```

Quando NAO cabem todas:

```json
{
  "totalEstimatedChars": 240,
  "budgets": { "a4Portrait": {...}, "a4Landscape": { "chars": 133, "fits": false }, ... },
  "recommendation": {
    "fits": false,
    "orientation": "landscape",
    "format": "A4",
    "selectedColumns": ["data", "produto", "vendedor", "valor"],
    "droppedColumns": ["observacoes", "endereco_cliente"],
    "reason": "8 colunas excedem 133 chars em A4 landscape. Sugerido dropar 'observacoes' (60 chars) e 'endereco_cliente' (48 chars) — mantem 4 colunas em 125/133 chars. Considere A3 landscape (195) para incluir todas."
  }
}
```

### Passo 3 — Decidir

- **`recommendation.fits === true`**: pule pro Passo 5 com a recomendacao do analyzer.
- **`recommendation.fits === false`**: apresente ao usuario:
  1. Lista de TODAS as colunas com largura estimada
  2. A sugestao automatica (selectedColumns + droppedColumns + orientation)
  3. Alternativa: A3 landscape ou Tabloid landscape se couber tudo
  4. Pergunte: "Aceita a sugestao OU quer escolher manualmente OU usar A3?"

### Passo 4 — Selecao manual (apenas se usuario pedir)

Se o usuario listar colunas explicitamente, valide que todas existem
no `analyze.js` output antes de prosseguir.

### Passo 5 — Convert

```bash
node "${CLAUDE_SKILL_DIR}/scripts/convert.js" \
  "/c/path/dados.xlsx" \
  "/c/path/dados.pdf" \
  --sheet "Vendas" \
  --columns "data,produto,vendedor,valor" \
  --orientation landscape \
  --format A4 \
  --title "Relatorio de Vendas"
```

## Opcoes do convert.js

| Flag | Default | Descricao |
|------|---------|-----------|
| `--sheet <nome>` | primeira aba | Aba a converter |
| `--columns <a,b,c>` | todas | Colunas a incluir, na ordem |
| `--orientation` | portrait | `portrait` ou `landscape` |
| `--format` | A4 | A4, A3, Letter, Legal, Tabloid |
| `--title <texto>` | nome do arquivo | Titulo no header do PDF |
| `--font-size <n>` | 9 | Tamanho da fonte do corpo (pt) |
| `--max-rows <n>` | (sem limite) | Limite de linhas a renderizar |
| `--header-row <n>` | 1 | Linha do cabecalho (1-indexed) |

## Calculo de largura

Constantes documentadas em `analyze.js`:

- **Fonte 9pt**: ~2.0mm por caractere medio (proporcional)
- **Padding por celula**: 6mm (3mm cada lado)
- **Margem da pagina**: 15mm cada lado

Orcamento por formato (em **caracteres totais**):

| Formato | Util | Chars 9pt |
|---------|------|-----------|
| A4 retrato | 180mm | ~90 |
| A4 paisagem | 267mm | ~133 |
| A3 retrato | 267mm | ~133 |
| A3 paisagem | 390mm | ~195 |
| Letter retrato | 186mm | ~93 |
| Letter paisagem | 244mm | ~122 |
| Tabloid paisagem | 402mm | ~201 |

`estimatedWidthChars = max(headerLen, p95(contentLen)) + 3` (3 = padding em chars).
Usa percentil 95 do conteudo para nao deixar 1 outlier inflar a coluna.

## Heuristica de selecao automatica

Quando excede o orcamento (mesmo em landscape):

1. Ordena colunas por largura DESC
2. Remove colunas mais largas uma a uma ate caber
3. Sempre preserva a primeira coluna (geralmente ID/data) e numericas curtas
4. Sugere `A3 landscape` ou `Tabloid landscape` se couber tudo

## Estilo do PDF gerado

- Fonte: `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
- Header: titulo + nome do arquivo origem + data de geracao + total de linhas
- Tabela: zebra stripes (cinza muito claro), borda fina `#ddd`
- Cabecalho fixo no topo de cada pagina (CSS `thead { display: table-header-group }`)
- Numeros alinhados a direita, datas e textos a esquerda
- Footer: numero da pagina

## Regras

1. SEMPRE rode `analyze.js` ANTES de `convert.js` — nao adivinhe colunas
2. SEMPRE apresente ao usuario quando `recommendation.fits === false` antes de gerar
3. SEMPRE use os scripts em `${CLAUDE_SKILL_DIR}/scripts/` — nao gere inline
4. Caminhos do usuario sempre **absolutos** (`/c/Users/...`)
5. Se o usuario nao especificar saida, usar `<input>.pdf` no mesmo diretorio
6. Nunca sobrescrever PDF existente sem confirmacao
7. Para CSVs, verificar encoding antes (ver secao no SKILL.md de excel-to-json)

## Exemplos de invocacao

- `/excel-to-pdf vendas.xlsx` → analyze + convert (auto se couber, pergunta se nao)
- `/excel-to-pdf vendas.xlsx --sheet 2026 --orientation landscape` → forca paisagem
- `/excel-to-pdf dados.xlsx --columns "data,cliente,total"` → pula analyze, usa colunas dadas
- `/excel-to-pdf dados.xlsx --format A3` → A3 retrato, mais espaco horizontal
- `/excel-to-pdf relatorio.csv --title "Relatorio Q1"` → CSV com titulo customizado
