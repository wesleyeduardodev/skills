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
    else if (a === '--highlight') args.highlight = argv[++i];
    else args._.push(a);
  }
  return args;
}

const BR_DATE_RE = /^data\b/i;
const BR_CURRENCY_RE = /valor|R\$|total\b|pre[çc]o|sal[aá]rio|custo|montante|saldo/i;
const NARROW_COL_RE = /^(#|n[º°o]\.?|item|id|seq)$/i;

function excelSerialToUtcDate(serial) {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function formatDateBR(d) {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrencyBR(n) {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function colWidthHint(name) {
  const trimmed = String(name).trim();
  if (NARROW_COL_RE.test(trimmed)) return '3%';
  if (/^data\b/i.test(trimmed)) return '7%';
  if (/^hora\b/i.test(trimmed)) return '6%';
  if (BR_CURRENCY_RE.test(trimmed)) return '8%';
  return null;
}

function isSummaryRow(row, columns) {
  const firstVal = row[columns[0]];
  if (typeof firstVal !== 'string' || firstVal.trim().length < 4) return false;
  let emptyCount = 0;
  for (let i = 1; i < columns.length; i++) {
    const v = row[columns[i]];
    if (v === null || v === undefined || v === '') emptyCount++;
  }
  return emptyCount >= columns.length - 3;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCellByColumn(v, colName) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return formatDateBR(v);
  if (typeof v === 'number') {
    if (BR_CURRENCY_RE.test(colName)) return formatCurrencyBR(v);
    if (BR_DATE_RE.test(colName) && v > 25569 && v < 80000) {
      return formatDateBR(excelSerialToUtcDate(v));
    }
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
}

// Heuristica simples de alinhamento por coluna: se >70% das celulas sao numericas, alinha a direita.
// Excecao: colunas de data alinham a esquerda mesmo quando armazenadas como numero serial.
function detectAlignment(rows, colName) {
  if (BR_DATE_RE.test(colName)) return 'left';
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

function buildHtml({ title, sourceFile, sheet, totalRows, columns, rows, alignments, fontSize, highlightSet }) {
  const generatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const colgroup = `
    <colgroup>
      ${columns.map(c => {
        const w = colWidthHint(c);
        return w ? `<col style="width: ${w}">` : '<col>';
      }).join('')}
    </colgroup>`;

  const thead = `
    <thead>
      <tr>
        ${columns.map(c => {
          const hi = highlightSet.has(c) ? ' highlight' : '';
          return `<th class="align-${alignments[c]}${hi}">${escapeHtml(c)}</th>`;
        }).join('')}
      </tr>
    </thead>`;

  const renderDataRow = (r, rowClass) => `
    <tr class="${rowClass}">
      ${columns.map(c => {
        const val = formatCellByColumn(r[c], c);
        const align = alignments[c];
        const hi = highlightSet.has(c) ? ' highlight' : '';
        return `<td class="align-${align}${hi}">${escapeHtml(val)}</td>`;
      }).join('')}
    </tr>`;

  const renderSummaryRow = (r, rowClass) => {
    const label = formatCellByColumn(r[columns[0]], columns[0]);
    let valueIdx = -1;
    for (let j = 1; j < columns.length; j++) {
      const v = r[columns[j]];
      if (v !== null && v !== undefined && v !== '') { valueIdx = j; break; }
    }
    if (valueIdx === -1) {
      return `
    <tr class="summary ${rowClass}">
      <td colspan="${columns.length}" class="summary-label">${escapeHtml(label)}</td>
    </tr>`;
    }
    const valueCol = columns[valueIdx];
    const value = formatCellByColumn(r[valueCol], valueCol);
    const remainingCols = columns.length - valueIdx - 1;
    return `
    <tr class="summary ${rowClass}">
      <td colspan="${valueIdx}" class="summary-label">${escapeHtml(label)}</td>
      <td class="align-${alignments[valueCol]} summary-value">${escapeHtml(value)}</td>
      ${remainingCols > 0 ? `<td colspan="${remainingCols}"></td>` : ''}
    </tr>`;
  };

  const tbody = `
    <tbody>
      ${rows.map((r, i) => {
        const rowClass = i % 2 === 0 ? 'even' : 'odd';
        return isSummaryRow(r, columns) ? renderSummaryRow(r, rowClass) : renderDataRow(r, rowClass);
      }).join('')}
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
  td.highlight { background-color: #fff3cd; font-weight: 600; }
  th.highlight { background-color: #ffe69c; color: #5a3e00; }
  tr.summary td { background: #e8eef5 !important; border-top: 2px solid #6c757d; font-weight: 600; }
  tr.summary td.summary-label { text-align: right; padding-right: 10px; color: #1a1a1a; }
  tr.summary td.summary-value { font-weight: 700; color: #1a1a1a; }
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
    ${colgroup}
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

  const highlightSet = new Set(
    (args.highlight || '').split(',').map(s => s.trim()).filter(Boolean)
  );
  const missingHighlight = [...highlightSet].filter(c => !columns.includes(c));
  if (missingHighlight.length > 0) {
    console.error(`colunas de highlight nao encontradas: ${missingHighlight.join(', ')}`);
    process.exit(7);
  }

  const html = buildHtml({
    title: args.title || path.basename(inputFile, path.extname(inputFile)),
    sourceFile: absInput,
    sheet: sheetName,
    totalRows: rows.length,
    columns,
    rows,
    alignments,
    fontSize: args.fontSize || 9,
    highlightSet,
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
