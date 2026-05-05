// Converte Markdown em PDF.
// Uso: BROWSER_PATH=... node md-to-pdf.js <input.md> <output.pdf>

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer-core');

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error('uso: node md-to-pdf.js <input.md> <output.pdf>');
  process.exit(2);
}

const browserPath = process.env.BROWSER_PATH;
if (!browserPath) {
  console.error('BROWSER_PATH nao definido');
  process.exit(2);
}

const opts = process.env.PDF_OPTIONS ? JSON.parse(process.env.PDF_OPTIONS) : {};
const format = opts.format || 'A4';
const margin = opts.margin || '15mm';

const md = fs.readFileSync(path.resolve(inputArg), 'utf8');
const body = marked.parse(md);

const css = `
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
         line-height: 1.6; color: #222; max-width: 800px; margin: 0 auto; padding: 0 8px; }
  h1 { font-size: 28px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
  h2 { font-size: 22px; margin-top: 32px; }
  h3 { font-size: 18px; }
  code { background: #f3f3f3; padding: 2px 5px; border-radius: 3px;
         font-family: "Cascadia Code", Consolas, "Courier New", monospace; font-size: 90%; }
  pre { background: #f8f8f8; padding: 12px; border-radius: 5px; overflow-x: auto;
        border: 1px solid #eee; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
  hr { border: none; border-top: 1px solid #ddd; margin: 32px 0; }
  a { color: #0366d6; }
`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>${body}</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: path.resolve(outputArg),
      format,
      printBackground: true,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
    });
    console.error(`gerado: ${path.resolve(outputArg)}`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
