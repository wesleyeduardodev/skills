// Gera PDF tabular a partir de uma planilha Excel.
// Recebe colunas selecionadas (do analyze.js) e renderiza HTML+CSS via puppeteer.
//
// Uso:
//   node convert.js <input.xlsx> <output.pdf> [--sheet <nome>] [--columns a,b,c]
//                   [--orientation portrait|landscape] [--format A4|A3|Letter|Legal|Tabloid]
//                   [--title <texto>] [--font-size <n>] [--max-rows <n>] [--header-row <n>]

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer-core');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sheet') args.sheet = argv[++i];
    else if (a === '--columns') args.columns = argv[++i];
    else if (a === '--orientation') args.orientation = argv[++i];
    else if (a === '--format') args.format = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--font-size') args.fontSize = parseInt(argv[++i], 10);
    else if (a === '--max-rows') args.maxRows = parseInt(argv[++i], 10);
    else if (a === '--header-row') args.headerRow = parseInt(argv[++i], 10);
    else args._.push(a);
  }
  return args;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCell(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
}

// Heuristica simples de alinhamento por coluna: se >70% das celulas sao numericas, alinha a direita.
function detectAlignment(rows, colName) {
  let numCount = 0;
  let total = 0;
  for (const r of rows) {
    const v = r[colName];
    if (v === null || v === undefined || v === '') continue;
    total++;
    if (typeof v === 'number') numCount++;
  }
  return total > 0 && numCount / total > 0.7 ? 'right' : 'left';
}

function buildHtml({ title, sourceFile, sheet, totalRows, columns, rows, alignments, fontSize }) {
  const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const thead = `
    <thead>
      <tr>
        ${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
      </tr>
    </thead>`;

  const tbody = `
    <tbody>
      ${rows.map((r, i) => `
        <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
          ${columns.map(c => {
            const val = formatCell(r[c]);
            const align = alignments[c];
            return `<td class="align-${align}">${escapeHtml(val)}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: ${fontSize}pt;
    color: #222;
    margin: 0;
  }
  header {
    border-bottom: 2px solid #333;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  header h1 {
    font-size: ${fontSize + 7}pt;
    margin: 0 0 4px 0;
  }
  header .meta {
    font-size: ${Math.max(fontSize - 1, 7)}pt;
    color: #666;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    table-layout: auto;
  }
  thead {
    display: table-header-group;
  }
  th {
    background: #f0f0f0;
    border: 1px solid #ccc;
    padding: 4px 6px;
    text-align: left;
    font-weight: 600;
    font-size: ${fontSize}pt;
  }
  td {
    border: 1px solid #ddd;
    padding: 3px 6px;
    word-break: break-word;
    font-size: ${fontSize}pt;
  }
  tr.odd { background: #fafafa; }
  .align-right { text-align: right; }
  .align-left  { text-align: left; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      Origem: ${escapeHtml(path.basename(sourceFile))} &middot;
      Aba: ${escapeHtml(sheet)} &middot;
      Linhas: ${totalRows} &middot;
      Colunas: ${columns.length} &middot;
      Gerado: ${generatedAt}
    </div>
  </header>
  <table>
    ${thead}
    ${tbody}
  </table>
</body>
</html>`;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const inputFile = args._[0];
  const outputFile = args._[1];

  if (!inputFile || !outputFile) {
    console.error('uso: node convert.js <input.xlsx> <output.pdf> [opcoes]');
    process.exit(2);
  }

  const browserPath = process.env.BROWSER_PATH;
  if (!browserPath) {
    console.error('BROWSER_PATH nao definido (rode setup.sh primeiro)');
    process.exit(2);
  }

  const absInput = path.resolve(inputFile);
  const absOutput = path.resolve(outputFile);

  if (!fs.existsSync(absInput)) {
    console.error(`arquivo nao encontrado: ${absInput}`);
    process.exit(3);
  }

  const wb = XLSX.readFile(absInput, { cellDates: true });
  const sheetName = args.sheet || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`aba nao encontrada: "${sheetName}". Disponiveis: ${wb.SheetNames.join(', ')}`);
    process.exit(4);
  }

  const opts = { defval: null };
  if (args.headerRow && args.headerRow > 1) opts.range = args.headerRow - 1;
  let rows = XLSX.utils.sheet_to_json(ws, opts);

  if (rows.length === 0) {
    console.error(`aba "${sheetName}" nao tem dados`);
    process.exit(5);
  }

  if (args.maxRows && args.maxRows > 0) {
    rows = rows.slice(0, args.maxRows);
  }

  const allColumns = Object.keys(rows[0]);
  let columns = allColumns;
  if (args.columns) {
    const requested = args.columns.split(',').map(s => s.trim()).filter(Boolean);
    const missing = requested.filter(c => !allColumns.includes(c));
    if (missing.length > 0) {
      console.error(`colunas nao encontradas: ${missing.join(', ')}. Disponiveis: ${allColumns.join(', ')}`);
      process.exit(6);
    }
    columns = requested;
  }

  const alignments = Object.fromEntries(columns.map(c => [c, detectAlignment(rows, c)]));

  const html = buildHtml({
    title: args.title || path.basename(inputFile, path.extname(inputFile)),
    sourceFile: absInput,
    sheet: sheetName,
    totalRows: rows.length,
    columns,
    rows,
    alignments,
    fontSize: args.fontSize || 9,
  });

  fs.mkdirSync(path.dirname(absOutput), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: absOutput,
      format: args.format || 'A4',
      landscape: (args.orientation || 'portrait') === 'landscape',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#666;">Pagina <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    const size = fs.statSync(absOutput).size;
    console.error(`gerado: ${absOutput} (${rows.length} linhas, ${columns.length} colunas, ${(size / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
