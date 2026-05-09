// Analisa colunas de uma planilha e recomenda quais cabem no PDF.
// Mede largura estimada por coluna e compara com o orcamento de cada formato.
// Saida: JSON em stdout para o Claude interpretar.
//
// Uso:
//   node analyze.js <arquivo> [--sheet <nome>] [--header-row <n>]

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// === Constantes de medicao ===
// Fonte 9pt (proporcional system-ui): ~2.0mm por char medio. Usado para
// converter caracteres em milimetros e vice-versa.
const MM_PER_CHAR_9PT = 2.0;
// Padding por celula: 3mm de cada lado = 6mm de overhead, ~3 chars equivalentes.
const CELL_PADDING_CHARS = 3;
// Margens da pagina: 15mm de cada lado.
const PAGE_MARGIN_MM = 15;

// Larguras uteis em mm (largura total - 2*margem)
const PAGE_WIDTHS_MM = {
  a4Portrait: 210 - 2 * PAGE_MARGIN_MM,
  a4Landscape: 297 - 2 * PAGE_MARGIN_MM,
  a3Portrait: 297 - 2 * PAGE_MARGIN_MM,
  a3Landscape: 420 - 2 * PAGE_MARGIN_MM,
  letterPortrait: 215.9 - 2 * PAGE_MARGIN_MM,
  letterLandscape: 279.4 - 2 * PAGE_MARGIN_MM,
  tabloidLandscape: 431.8 - 2 * PAGE_MARGIN_MM,
};

function mmToChars(mm) {
  return Math.floor(mm / MM_PER_CHAR_9PT);
}

const BUDGETS = Object.fromEntries(
  Object.entries(PAGE_WIDTHS_MM).map(([k, mm]) => [k, mmToChars(mm)])
);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sheet') args.sheet = argv[++i];
    else if (a === '--header-row') args.headerRow = parseInt(argv[++i], 10);
    else args._.push(a);
  }
  return args;
}

// Percentil 95 do array de tamanhos — evita 1 outlier inflar a coluna toda.
function p95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

function stringifyCell(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

// Selecao automatica: remove colunas mais largas ate caber no orcamento.
// Preserva a primeira coluna (geralmente ID/data).
function selectColumnsForBudget(columns, budgetChars) {
  const total = columns.reduce((s, c) => s + c.estimatedWidthChars, 0);
  if (total <= budgetChars) {
    return {
      selected: columns.map(c => c.name),
      dropped: [],
    };
  }

  const firstColName = columns[0].name;
  // Ordena por largura DESC para droppar as maiores primeiro
  const sortedByWidth = [...columns].sort((a, b) => b.estimatedWidthChars - a.estimatedWidthChars);
  const dropped = new Set();
  let runningTotal = total;

  for (const col of sortedByWidth) {
    if (runningTotal <= budgetChars) break;
    if (col.name === firstColName) continue; // preserva primeira coluna
    dropped.add(col.name);
    runningTotal -= col.estimatedWidthChars;
  }

  const selected = columns.filter(c => !dropped.has(c.name)).map(c => c.name);
  return { selected, dropped: [...dropped] };
}

function pickRecommendation(columns) {
  const totalChars = columns.reduce((s, c) => s + c.estimatedWidthChars, 0);

  // Tenta cada formato em ordem de preferencia (mais simples → mais largo)
  const tryFormats = [
    { key: 'a4Portrait', orientation: 'portrait', format: 'A4' },
    { key: 'a4Landscape', orientation: 'landscape', format: 'A4' },
    { key: 'a3Portrait', orientation: 'portrait', format: 'A3' },
    { key: 'a3Landscape', orientation: 'landscape', format: 'A3' },
    { key: 'tabloidLandscape', orientation: 'landscape', format: 'Tabloid' },
  ];

  for (const fmt of tryFormats) {
    if (totalChars <= BUDGETS[fmt.key]) {
      return {
        fits: true,
        orientation: fmt.orientation,
        format: fmt.format,
        selectedColumns: columns.map(c => c.name),
        droppedColumns: [],
        reason: `Todas as ${columns.length} colunas cabem em ${fmt.format} ${fmt.orientation} (${totalChars}/${BUDGETS[fmt.key]} chars).`,
      };
    }
  }

  // Nem em Tabloid landscape cabe — sugere A4 landscape com selecao.
  const budget = BUDGETS.a4Landscape;
  const { selected, dropped } = selectColumnsForBudget(columns, budget);
  const selectedTotal = columns
    .filter(c => selected.includes(c.name))
    .reduce((s, c) => s + c.estimatedWidthChars, 0);

  return {
    fits: false,
    orientation: 'landscape',
    format: 'A4',
    selectedColumns: selected,
    droppedColumns: dropped,
    reason: `${columns.length} colunas excedem ${budget} chars em A4 landscape (total: ${totalChars}). Sugerido dropar ${dropped.length} coluna(s) [${dropped.join(', ')}] — mantem ${selected.length} colunas em ${selectedTotal}/${budget} chars. Alternativa: A3 landscape (orcamento ${BUDGETS.a3Landscape}) ou Tabloid landscape (${BUDGETS.tabloidLandscape}).`,
  };
}

// === Main ===
const args = parseArgs(process.argv.slice(2));
const file = args._[0];
if (!file) {
  console.error('uso: node analyze.js <arquivo> [--sheet <nome>] [--header-row <n>]');
  process.exit(2);
}

const absFile = path.resolve(file);
if (!fs.existsSync(absFile)) {
  console.error(`arquivo nao encontrado: ${absFile}`);
  process.exit(3);
}

const wb = XLSX.readFile(absFile, { cellDates: true });
const sheetName = args.sheet || wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error(`aba nao encontrada: "${sheetName}". Disponiveis: ${wb.SheetNames.join(', ')}`);
  process.exit(4);
}

const opts = { defval: null };
if (args.headerRow && args.headerRow > 1) opts.range = args.headerRow - 1;
const rows = XLSX.utils.sheet_to_json(ws, opts);

if (rows.length === 0) {
  console.error(`aba "${sheetName}" nao tem dados`);
  process.exit(5);
}

const columnNames = Object.keys(rows[0]);
const columns = columnNames.map(name => {
  const headerLen = name.length;
  const lengths = rows.map(r => stringifyCell(r[name]).length);
  const maxContentLen = Math.max(0, ...lengths);
  const p95Content = p95(lengths);
  const baseWidth = Math.max(headerLen, p95Content);
  return {
    name,
    headerLen,
    maxContentLen,
    p95ContentLen: p95Content,
    estimatedWidthChars: baseWidth + CELL_PADDING_CHARS,
  };
});

const totalEstimatedChars = columns.reduce((s, c) => s + c.estimatedWidthChars, 0);

const result = {
  file: absFile,
  sheet: sheetName,
  totalRows: rows.length,
  columns,
  totalEstimatedChars,
  budgets: {
    a4Portrait: { chars: BUDGETS.a4Portrait, fits: totalEstimatedChars <= BUDGETS.a4Portrait },
    a4Landscape: { chars: BUDGETS.a4Landscape, fits: totalEstimatedChars <= BUDGETS.a4Landscape },
    a3Landscape: { chars: BUDGETS.a3Landscape, fits: totalEstimatedChars <= BUDGETS.a3Landscape },
    tabloidLandscape: { chars: BUDGETS.tabloidLandscape, fits: totalEstimatedChars <= BUDGETS.tabloidLandscape },
  },
  recommendation: pickRecommendation(columns),
};

process.stdout.write(JSON.stringify(result, null, 2));
