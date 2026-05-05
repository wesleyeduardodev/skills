---
name: pdf
description: "Le e gera arquivos PDF no Windows 11. Cria PDFs a partir de HTML, Markdown ou instrucoes (puppeteer-core + Chrome/Edge instalado, sem download de Chromium). Le PDFs extraindo texto e metadados (pdf-parse). Ideal para relatorios, propostas, fichas e extracao de conteudo."
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob
argument-hint: [gerar pdf de arquivo.html | converter README.md para pdf | extrair texto de doc.pdf]
---

# PDF Manager

Voce le e gera arquivos PDF. O usuario diz o que precisa, voce entrega.

Ambiente: **Windows 11 Pro**. Use a ferramenta **Bash** para os scripts.
Caminhos do usuario sempre absolutos (`/c/Users/wesle/...` no Git Bash).

## Estrutura da skill

```
~/.claude/skills/pdf/
├── SKILL.md
└── scripts/
    ├── setup.sh           # cache + auto-detect browser; instala puppeteer-core, marked, pdf-parse
    ├── html-to-pdf.js     # HTML → PDF
    ├── md-to-pdf.js       # Markdown → PDF
    └── read.js            # PDF → texto/JSON
```

## Por que NAO usar puppeteer full

`puppeteer` (full) baixa Chromium ~170MB toda execucao se nao houver cache —
no Windows costuma travar por antivirus/firewall. Esta skill usa
**`puppeteer-core` + Chrome/Edge ja instalado no sistema**:
- Sem download
- Mais rapido (cache local em `~/.claude/cache/skill-pdf/`)
- Funciona offline depois da primeira instalacao

## Browsers detectados automaticamente

Ordem de preferencia em `setup.sh`:
1. Chrome (user-local): `C:/Users/wesle/AppData/Local/Google/Chrome/Application/chrome.exe`
2. Chrome (Program Files / x86)
3. Edge (Program Files x86)
4. Edge (Program Files)

Se nenhum for encontrado, o setup falha com mensagem clara.

## Operacoes

### Padrao de invocacao (todos os scripts)

Os scripts ficam em `${CLAUDE_SKILL_DIR}/scripts/` mas as `node_modules` estao
no cache em `~/.claude/cache/skill-pdf/`. Use **`NODE_PATH`** para que o Node
ache as dependencias:

```bash
# 1) Carrega cache + browser
SETUP_OUT=$(bash "${CLAUDE_SKILL_DIR}/scripts/setup.sh")
PDF_CACHE=$(echo "$SETUP_OUT" | awk -F'|' '{print $1}')
export BROWSER_PATH=$(echo "$SETUP_OUT" | awk -F'|' '{print $2}')
export NODE_PATH="$PDF_CACHE/node_modules"
```

### HTML → PDF

```bash
node "${CLAUDE_SKILL_DIR}/scripts/html-to-pdf.js" "/c/path/in.html" "/c/path/out.pdf"
```

Com opcoes (formato, margem, header/footer):
```bash
PDF_OPTIONS='{"format":"A4","landscape":false,"margin":"20mm","header":"Relatorio","footer":"Pagina <span class=\"pageNumber\"></span>"}' \
  node "${CLAUDE_SKILL_DIR}/scripts/html-to-pdf.js" in.html out.pdf
```

### Markdown → PDF

```bash
node "${CLAUDE_SKILL_DIR}/scripts/md-to-pdf.js" "/c/path/README.md" "/c/path/README.pdf"
```

### Ler PDF (extrair texto)

```bash
# So o texto:
node "${CLAUDE_SKILL_DIR}/scripts/read.js" "/c/path/documento.pdf"

# Texto + metadados (numpages, info, etc):
node "${CLAUDE_SKILL_DIR}/scripts/read.js" "/c/path/documento.pdf" --json
```

A leitura usa `pdf-parse` v2 (classe `PDFParse`). Para PDFs com layout
complexo (multi-coluna, tabelas com bordas), o texto vem linearizado —
considere `pdfjs-dist` se precisar preservar estrutura.

Para PDFs **escaneados** (so imagens, sem texto OCR), `read.js` retorna
vazio. Nesses casos voce precisa de OCR (`tesseract`), que nao esta nesta skill.

CSS profissional (system-ui, tabelas, codigo) ja embutido no script.

### PDF "do zero" (sem arquivo de entrada)

1. Voce gera o HTML completo (com CSS) num arquivo temporario
2. Chama `html-to-pdf.js` apontando para esse arquivo
3. Remove o temporario

```bash
TMP=$(mktemp --suffix=.html)
cat > "$TMP" <<'EOF'
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: system-ui, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px; }
  th { background: #f5f5f5; }
</style></head><body>
  <h1>Relatorio</h1>
  <table>...</table>
</body></html>
EOF

node "${CLAUDE_SKILL_DIR}/scripts/html-to-pdf.js" "$TMP" "/c/path/saida.pdf"
rm "$TMP"
```

## Opcoes de formatacao

| Opcao | Valores | Default |
|-------|---------|---------|
| `format` | A4, A3, Letter, Legal, Tabloid | A4 |
| `landscape` | true/false | false |
| `margin` | em mm/cm/in (ex: "15mm") | 15mm em todos os lados |
| `header` | HTML curto (texto + `<span class="pageNumber"></span>`) | sem |
| `footer` | mesmo que header | sem |

`printBackground: true` esta sempre ligado para incluir cores e backgrounds.

## Estilo dos PDFs gerados do zero

Ao montar HTML inline para um relatorio, use:
- Fonte: `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
- Tabelas: borda `#ddd`, header `#f5f5f5`, padding 8-12px
- Hierarquia: h1 28px, h2 22px, h3 18px
- `line-height: 1.6`, `max-width: 800px` se A4 retrato
- Sem cores berrantes — sobriedade profissional

## Fallback se Puppeteer falhar

Se o browser nao subir (raro), voce pode usar **wkhtmltopdf** como plano B:
```bash
# Verificar se esta instalado:
command -v wkhtmltopdf
# Instalar via winget:
# winget install --id wkhtmltopdf.wkhtmltopdf
wkhtmltopdf in.html out.pdf
```

Para instalar via Chocolatey/Scoop, peca confirmacao ao usuario antes.

## Path conventions no Windows

- Dentro do JS: aceitar caminhos Windows (`C:\\...`) OU POSIX (`/c/...`)
  — `path.resolve` normaliza
- Para `file://`: sempre `file:///C:/path/...` com forward slashes
- No shell (Bash), use `/c/Users/...` por padrao

## Regras

1. SEMPRE use os scripts em `${CLAUDE_SKILL_DIR}/scripts/` — nao gere inline
2. SEMPRE use o cache `~/.claude/cache/skill-pdf/` (sem `mktemp` para deps)
3. SEMPRE use `puppeteer-core` + browser do sistema, nunca `puppeteer` full
4. Caminhos do usuario sempre **absolutos**
5. Nunca sobrescrever PDF existente sem confirmacao
6. Se o usuario nao especificar saida, usar `<input>.pdf`
7. Se o pedido for vago ("gera um pdf"), peca o conteudo

## Execucao com argumentos

Se o usuario invocar `/pdf $ARGUMENTS`, interprete e execute.

**Geracao:**
- `/pdf gerar de relatorio.html` → `html-to-pdf.js`
- `/pdf converter README.md para pdf` → `md-to-pdf.js`
- `/pdf criar relatorio de vendas com tabela [dados]` → gera HTML inline + `html-to-pdf.js`
- `/pdf documento A4 paisagem com header "Meu Relatorio"` → PDF formatado com `PDF_OPTIONS`
- `/pdf converter todos os .md da pasta docs/` → loop sobre arquivos

**Leitura:**
- `/pdf ler contrato.pdf` → `read.js` + retorna o texto
- `/pdf extrair texto de doc.pdf` → `read.js`
- `/pdf metadados de doc.pdf` → `read.js --json` + extrair `info`
- `/pdf resumir documento.pdf` → `read.js` + Claude resume o texto extraido
