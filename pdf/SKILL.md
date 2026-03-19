---
name: pdf
description: "Gera arquivos PDF a partir de HTML, Markdown ou conteudo dinamico. Use para criar documentos, relatorios, propostas e apresentacoes em PDF."
user-invocable: true
disable-model-invocation: true
argument-hint: [gerar pdf de arquivo.html | criar relatorio pdf | converter markdown para pdf]
---

# PDF Generator

Voce gera arquivos PDF a partir de HTML usando Node.js com Puppeteer.

## Ambiente

- **Runtime:** Node.js (disponivel no PATH)
- **Lib:** `puppeteer` — instalar sob demanda em diretorio temporario
- **Shell:** Git Bash (MINGW64)

## REGRA CRITICA: Instalar dependencia em diretorio temporario

NUNCA instale no diretorio do projeto do usuario (pode sobrescrever node_modules/package.json
existentes). Use um diretorio temporario:

```bash
TMPDIR=$(mktemp -d)
cd "$TMPDIR" && npm init -y --silent && npm install puppeteer --silent
```

Execute scripts referenciando o diretorio temporario:

```bash
cd "$TMPDIR" && node script.js
```

Apos terminar, limpe:

```bash
rm -rf "$TMPDIR"
```

## O que voce sabe fazer

### A partir de arquivo HTML
- Converter arquivo HTML existente em PDF
- Processar HTML com CSS externo, imagens e fontes

### A partir de conteudo gerado
- Criar HTML na memoria e converter em PDF
- Gerar relatorios com tabelas, graficos e layouts profissionais
- Criar documentos formatados (propostas, contratos, fichas)

### A partir de Markdown
- Converter Markdown para HTML e depois para PDF
- Aplicar estilos profissionais ao Markdown renderizado

### Configuracoes
- Formato de pagina (A4, Letter, A3, Legal, Tabloid)
- Orientacao (retrato/paisagem)
- Margens customizadas
- Header e footer com numeracao de paginas
- Backgrounds e cores
- Escala e range de paginas

## Snippet principal: HTML para PDF

```javascript
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto('file:///caminho/absoluto/arquivo.html', {waitUntil: 'networkidle0', timeout: 15000});
  await page.pdf({
    path: 'saida.pdf',
    format: 'A4',
    printBackground: true,
    margin: {top: '15mm', bottom: '15mm', left: '15mm', right: '15mm'}
  });
  await browser.close();
  console.log('PDF gerado com sucesso');
})();
```

### Gerar PDF a partir de string HTML

```javascript
const puppeteer = require('puppeteer');
(async () => {
  const html = '<html><body><h1>Titulo</h1><p>Conteudo</p></body></html>';
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.setContent(html, {waitUntil: 'networkidle0'});
  await page.pdf({
    path: 'saida.pdf',
    format: 'A4',
    printBackground: true,
    margin: {top: '15mm', bottom: '15mm', left: '15mm', right: '15mm'}
  });
  await browser.close();
  console.log('PDF gerado com sucesso');
})();
```

### Opcoes de page.pdf()

| Opcao | Tipo | Descricao |
|-------|------|-----------|
| `path` | String | Caminho do PDF de saida |
| `format` | String | Formato: 'A4', 'A3', 'Letter', 'Legal', 'Tabloid' |
| `printBackground` | Boolean | Incluir cores/backgrounds (default: false) |
| `landscape` | Boolean | Orientacao paisagem (default: false) |
| `margin` | Object | Margens: {top, bottom, left, right} em px, mm, cm ou in |
| `displayHeaderFooter` | Boolean | Mostrar header/footer (default: false) |
| `headerTemplate` | String | HTML do header |
| `footerTemplate` | String | HTML do footer |
| `scale` | Number | Escala do conteudo (0.1 a 2, default: 1) |
| `pageRanges` | String | Ex: '1-5', '1,3,5' |

### PDF com header e footer customizados

```javascript
await page.pdf({
  path: 'saida.pdf',
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  margin: {top: '25mm', bottom: '20mm', left: '15mm', right: '15mm'},
  headerTemplate: '<div style="font-size:9px; width:100%; text-align:center; color:#999;">Meu Relatorio</div>',
  footerTemplate: '<div style="font-size:9px; width:100%; text-align:center; color:#999;">Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
});
```

### Converter Markdown para PDF

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');

const markdown = fs.readFileSync('documento.md', 'utf8');

// Converter markdown basico para HTML (sem lib externa)
const html = `<!DOCTYPE html>
<html><head>
<style>
  body { font-family: -apple-system, Arial, sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; color: #333; padding: 0 20px; }
  h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
  h2 { border-bottom: 1px solid #eee; padding-bottom: 8px; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre code { display: block; padding: 16px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f8f8f8; }
</style>
</head><body>${markdownToHtml(markdown)}</body></html>`;

// Para conversao completa de Markdown, considere instalar 'marked' no tmpdir
```

## Regras

1. SEMPRE instalar `puppeteer` em diretorio temporario (NUNCA no diretorio do projeto)
2. SEMPRE limpar o diretorio temporario apos terminar
3. Usar a ferramenta Bash para executar os scripts Node.js
4. Para HTML com fontes do Google Fonts, usar `waitUntil: 'networkidle0'` para aguardar carregamento
5. SEMPRE usar `printBackground: true` para incluir cores e backgrounds
6. Nunca sobrescrever PDF existente sem confirmacao
7. Caminhos devem ser absolutos no `page.goto()` com prefixo `file:///`
8. No Windows/Git Bash, usar barras normais nos caminhos: `file:///C:/pasta/arquivo.html`
9. Se o usuario passar `$ARGUMENTS`, interpretar e executar direto

## Execucao com argumentos

Se o usuario invocar `/pdf $ARGUMENTS`, interprete o que foi pedido e execute.

Exemplos:
- `/pdf gerar de relatorio.html` → converte HTML em PDF
- `/pdf criar documento A4 paisagem` → cria PDF em paisagem
- `/pdf converter todos os html da pasta docs/` → converte multiplos arquivos
- `/pdf converter README.md para pdf` → Markdown → HTML → PDF
- `/pdf gerar relatorio de vendas com tabela` → cria HTML com dados e gera PDF
