// Converte .xlsx/.xls/.csv/.ods para JSON.
// Uso:
//   node convert.js <arquivo> [--sheet <nome>] [--out <arquivo>]
//                   [--compact] [--no-dates] [--header-row <n>]
//
// Sem --sheet: retorna { sheetNames: [...], sheets: { Nome: [linhas...] } }
// Com --sheet: retorna o array da aba diretamente.
// Sem --out: escreve em stdout. Com --out: escreve no arquivo.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sheet') args.sheet = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--compact') args.compact = true;
    else if (a === '--no-dates') args.noDates = true;
    else if (a === '--header-row') args.headerRow = parseInt(argv[++i], 10);
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const file = args._[0];
if (!file) {
  console.error('uso: node convert.js <arquivo> [--sheet <nome>] [--out <arquivo>] [--compact] [--no-dates] [--header-row <n>]');
  process.exit(2);
}

const absFile = path.resolve(file);
if (!fs.existsSync(absFile)) {
  console.error(`arquivo nao encontrado: ${absFile}`);
  process.exit(3);
}

// cellDates=true converte celulas-data para JS Date.
// Quando --no-dates, deixa serial cru (numero) ou string crua.
const wb = XLSX.readFile(absFile, { cellDates: !args.noDates });

const sheetToJsonOpts = { defval: null };
if (args.headerRow && args.headerRow > 1) {
  // Para header em outra linha: usa range pra pular linhas iniciais.
  sheetToJsonOpts.range = args.headerRow - 1;
}

let payload;
if (args.sheet) {
  const ws = wb.Sheets[args.sheet];
  if (!ws) {
    console.error(`aba nao encontrada: "${args.sheet}". Disponiveis: ${wb.SheetNames.join(', ')}`);
    process.exit(4);
  }
  payload = XLSX.utils.sheet_to_json(ws, sheetToJsonOpts);
} else {
  payload = { sheetNames: wb.SheetNames, sheets: {} };
  for (const name of wb.SheetNames) {
    payload.sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], sheetToJsonOpts);
  }
}

const indent = args.compact ? 0 : 2;
const json = JSON.stringify(payload, null, indent);

if (args.out) {
  const absOut = path.resolve(args.out);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, json, 'utf8');
  const size = fs.statSync(absOut).size;
  const rows = Array.isArray(payload)
    ? payload.length
    : Object.values(payload.sheets).reduce((s, arr) => s + arr.length, 0);
  console.error(`gerado: ${absOut} (${rows} linhas, ${(size / 1024).toFixed(1)} KB)`);
} else {
  process.stdout.write(json);
}
