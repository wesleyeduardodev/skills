---
name: excel
description: "Le, cria e manipula arquivos Excel (.xlsx, .xls, .csv, .ods) no Windows 11. Use para ler planilhas, criar novas, adicionar/editar dados, converter formatos. Roda Node.js + xlsx (SheetJS) com cache persistente para evitar reinstalacao."
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob
argument-hint: [ler arquivo.xlsx | criar planilha | converter para md]
---

# Excel Manager

Voce manipula arquivos Excel e planilhas. O usuario diz o que precisa, voce entrega.

Ambiente: **Windows 11 Pro**. Use a ferramenta **Bash** (Git Bash ou WSL bash)
para executar os scripts. Caminhos do usuario sempre absolutos
(ex: `C:/Users/wesle/Documents/planilha.xlsx`); dentro do Git Bash voce pode
usar a forma POSIX `/c/Users/wesle/...`.

**Atencao com `/tmp` e Node no Git Bash:** quando passa `/tmp/...` como string
dentro de `node -e "..."`, o Node resolve como `C:\tmp\...` (drive-root Windows),
NAO como o tmp real do MSYS. Use sempre `/c/Users/<usuario>/AppData/Local/Temp/...`
ou capture com `realpath`/`cygpath` antes de passar para Node `-e`. Em chamadas
normais (`node script.js /tmp/...`), o MSYS converte corretamente.

## Formatos suportados

- `.xlsx` (Excel moderno)
- `.xls` (Excel 97-2003)
- `.csv` (atencao com encoding — ver secao abaixo)
- `.ods` (OpenDocument — LibreOffice)

## Estrutura da skill

```
~/.claude/skills/excel/
├── SKILL.md
└── scripts/
    ├── setup.sh   # instala/reusa cache de dependencias
    ├── read.js    # le planilha → JSON
    └── write.js   # cria planilha a partir de JSON
```

Os scripts ficam em `${CLAUDE_SKILL_DIR}/scripts/`. Use SEMPRE estes scripts —
nao gere scripts inline.

## Cache de dependencias

A skill instala `xlsx` em `~/.claude/cache/skill-excel/` (uma unica vez).
Execucoes seguintes reusam o cache — sem `mktemp`, sem reinstalacao.

### Padrao de invocacao (todos os scripts)

Como os scripts ficam em `${CLAUDE_SKILL_DIR}/scripts/` mas as `node_modules`
no cache, exporte `NODE_PATH` antes de chamar Node:

```bash
EXCEL_CACHE=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
export NODE_PATH="$EXCEL_CACHE/node_modules"
```

## Operacoes

### Ler planilha

```bash
EXCEL_CACHE=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
export NODE_PATH="$EXCEL_CACHE/node_modules"
node "${CLAUDE_SKILL_DIR}/scripts/read.js" "/c/caminho/absoluto/arquivo.xlsx"
# Para uma aba especifica:
node "${CLAUDE_SKILL_DIR}/scripts/read.js" "/c/caminho/absoluto/arquivo.xlsx" "NomeDaAba"
```

A saida e JSON — interprete e formate para o usuario (ex: tabela markdown).

### Criar planilha

```bash
EXCEL_CACHE=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
export NODE_PATH="$EXCEL_CACHE/node_modules"

# Montar input JSON num arquivo temporario
cat > /tmp/excel-input.json <<'EOF'
{
  "sheets": {
    "Vendas": [
      {"data": "2026-01-01", "produto": "X", "valor": 100},
      {"data": "2026-01-02", "produto": "Y", "valor": 200}
    ]
  },
  "columnWidths": { "Vendas": [12, 20, 10] }
}
EOF

node "${CLAUDE_SKILL_DIR}/scripts/write.js" "/c/caminho/saida.xlsx" < /tmp/excel-input.json
rm /tmp/excel-input.json
```

### Editar planilha existente

Le com `read.js` → modifica o JSON em memoria (no proprio Claude) → grava com
`write.js` em arquivo NOVO. Nao sobrescreva o original sem confirmacao.

```bash
EXCEL_CACHE=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
export NODE_PATH="$EXCEL_CACHE/node_modules"

# 1) Le o arquivo original em JSON
node "${CLAUDE_SKILL_DIR}/scripts/read.js" "/c/path/original.xlsx" > /tmp/excel-current.json

# 2) Modifica o JSON (no Claude, ou via node -e usando process.argv)
#    Exemplo: adicionar linha na aba "Vendas"
node -e "
const fs = require('fs');
const cur = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const out = { sheets: cur.sheets };
out.sheets.Vendas.push({data: '2026-05-05', produto: 'Z', valor: 999});
fs.writeFileSync(process.argv[2], JSON.stringify(out));
" /tmp/excel-current.json /tmp/excel-edited.json

# 3) Grava em arquivo NOVO (nao sobrescreve)
node "${CLAUDE_SKILL_DIR}/scripts/write.js" "/c/path/original-v2.xlsx" < /tmp/excel-edited.json

# 4) Limpa
rm /tmp/excel-current.json /tmp/excel-edited.json
```

### Conversao

- **Excel → Markdown**: ler com `read.js`, formatar como tabela markdown
- **Excel → JSON**: stdout do `read.js` ja e JSON
- **Excel → CSV**: ler aba especifica, juntar com `,` ou `;`
- **JSON/Array → Excel**: `write.js`

## Encoding de CSV no Windows

Excel no Windows salva CSV em **CP-1252** (Windows-1252) por padrao, nao UTF-8.
Se o arquivo tem acentuacao quebrada ao abrir no Excel:

```bash
# Detectar encoding (heuristica simples)
file -i /c/caminho/arquivo.csv

# Converter UTF-8 → CP-1252 para abrir no Excel BR
iconv -f UTF-8 -t CP1252 input.csv > output.csv

# Ou gerar UTF-8 com BOM (Excel reconhece)
printf '\xEF\xBB\xBF' > out.csv && cat input.csv >> out.csv
```

Quando o usuario for **abrir no Excel**, prefira **UTF-8 com BOM** ou **CP-1252**.
Para qualquer outra ferramenta (Python, JS, dbs), prefira **UTF-8 puro**.

## Lib alternativa — quando preferir

| Caso | Use |
|---|---|
| Leitura/escrita basica, dados tabulares | `xlsx` (SheetJS) — atual da skill |
| Estilos ricos, formulas, imagens | `exceljs` |
| Apenas ler CSV grande | `papaparse` (mais leve) |
| Geracao com templates | `xlsx-populate` |

Se precisar trocar, atualize `setup.sh` e os scripts. Mantenha a interface
(stdin JSON / stdout JSON) para nao quebrar o resto.

## Regras

1. SEMPRE use os scripts em `${CLAUDE_SKILL_DIR}/scripts/` — nao gere inline
2. SEMPRE use o cache `~/.claude/cache/skill-excel/` — nao instale em tmpdir
3. Caminhos do usuario sempre **absolutos**
4. NUNCA sobrescreva arquivo original sem confirmacao — salve como novo
5. Para CSV, sempre verifique encoding antes de manipular acentos
6. Arquivos > 10MB: avise o usuario sobre tempo/memoria; considere streaming
7. Se o usuario passar `$ARGUMENTS`, executar diretamente sem perguntar

## Execucao com argumentos

Se o usuario invocar `/excel $ARGUMENTS`, interprete e execute.

Exemplos:
- `/excel ler cronograma.xlsx` → `read.js` + tabela markdown
- `/excel criar relatorio.xlsx com [dados]` → monta JSON + `write.js`
- `/excel converter dados.xlsx para markdown` → `read.js` + formatar
- `/excel quantas linhas tem planilha.xlsx` → `read.js` + count
- `/excel adicionar aba "Resumo" em arquivo.xlsx` → ler, adicionar, gravar como `_v2.xlsx`
- `/excel ler arquivo.csv` → `read.js` (xlsx detecta CSV automaticamente)
