// Converte HTML (arquivo ou string via stdin) em PDF usando puppeteer-core
// + browser do sistema. Aceita opcoes JSON via env PDF_OPTIONS.
//
// Uso 1 — arquivo HTML:
//   BROWSER_PATH=... node html-to-pdf.js <input.html> <output.pdf>
//
// Uso 2 — HTML via stdin:
//   echo "<h1>oi</h1>" | BROWSER_PATH=... node html-to-pdf.js - <output.pdf>
//
// Opcoes (env PDF_OPTIONS, JSON):
//   { "format": "A4", "landscape": false, "margin": "15mm",
//     "header": "Meu Relatorio", "footer": "Pagina <span class=pageNumber></span> / <span class=totalPages></span>" }

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error('uso: node html-to-pdf.js <input.html|-> <output.pdf>');
  process.exit(2);
}

const browserPath = process.env.BROWSER_PATH;
if (!browserPath) {
  console.error('BROWSER_PATH nao definido');
  process.exit(2);
}

const opts = process.env.PDF_OPTIONS ? JSON.parse(process.env.PDF_OPTIONS) : {};
const format = opts.format || 'A4';
const landscape = !!opts.landscape;
const margin = opts.margin || '15mm';
const header = opts.header || '';
const footer = opts.footer || '';

(async () => {
  const html = inputArg === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(path.resolve(inputArg), 'utf8');

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfOpts = {
      path: path.resolve(outputArg),
      format,
      landscape,
      printBackground: true,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
    };

    if (header || footer) {
      pdfOpts.displayHeaderFooter = true;
      pdfOpts.headerTemplate = header
        ? `<div style="font-size:9px;width:100%;text-align:center;color:#666;">${header}</div>`
        : '<div></div>';
      pdfOpts.footerTemplate = footer
        ? `<div style="font-size:9px;width:100%;text-align:center;color:#666;">${footer}</div>`
        : '<div></div>';
    }

    await page.pdf(pdfOpts);
    console.error(`gerado: ${pdfOpts.path}`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
