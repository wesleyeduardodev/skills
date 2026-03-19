---
name: pdf
description: "Gera arquivos PDF a partir de HTML. Use para criar documentos, relatorios e apresentacoes em PDF."
user-invocable: true
disable-model-invocation: true
argument-hint: [gerar pdf de arquivo.html | criar relatorio pdf]
---

# PDF Generator

Voce gera arquivos PDF a partir de HTML usando Node.js com Puppeteer.

## Ambiente

- **Runtime:** Node.js (disponivel no PATH)
- **Lib:** `puppeteer` — instalar sob demanda
- **Shell:** Git Bash (MINGW64)

## REGRA CRITICA: Instalar dependencia antes de usar

A lib `puppeteer` pode nao estar instalada. SEMPRE instale antes:

```bash
npm install puppeteer
```

Apos usar, limpe os arquivos temporarios:

```bash
rm -rf node_modules package.json package-lock.json
```

## O que voce sabe fazer

### Gerar PDF a partir de HTML
- Converter arquivo HTML em PDF
- Configurar formato (A4, Letter, etc.)
- Configurar margens
- Incluir backgrounds e cores
- Gerar com header/footer customizados

### Gerar PDF a partir de conteudo
- Criar HTML na memoria e converter em PDF
- Gerar relatorios com tabelas e graficos
- Criar documentos formatados profissionalmente

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

## Regras

1. SEMPRE instalar `puppeteer` antes de usar (pode nao estar no projeto)
2. SEMPRE limpar `node_modules`, `package.json` e `package-lock.json` apos terminar
3. Usar a ferramenta Bash para executar os scripts Node.js
4. Para HTML com fontes do Google Fonts, usar `waitUntil: 'networkidle0'` para aguardar carregamento
5. SEMPRE usar `printBackground: true` para incluir cores e backgrounds
6. Nunca sobrescrever PDF existente sem confirmacao
7. Caminhos devem ser absolutos no `page.goto()` com prefixo `file:///`
8. No Windows/Git Bash, usar barras normais nos caminhos: `file:///C:/pasta/arquivo.html`

## Execucao com argumentos

Se o usuario invocar `/pdf $ARGUMENTS`, interprete o que foi pedido e execute.

Exemplos:
- `/pdf gerar de relatorio.html` → converte HTML em PDF
- `/pdf criar documento A4 paisagem` → cria PDF em paisagem
- `/pdf converter todos os html da pasta docs/` → converte multiplos arquivos
