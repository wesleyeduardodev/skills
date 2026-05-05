// Le um arquivo .xlsx/.xls/.csv/.ods e imprime JSON na stdout.
// Uso (a partir do XLSX_CACHE):
//   node read.js <caminho-absoluto> [nome-da-aba]
// Sem nome de aba, retorna { sheets: { ABA: [linhas...] }, sheetNames: [...] }

const path = require('path');
const XLSX = require('xlsx');

const file = process.argv[2];
const sheet = process.argv[3];
if (!file) {
  console.error('uso: node read.js <arquivo> [aba]');
  process.exit(2);
}

const wb = XLSX.readFile(file, { cellDates: true });
if (sheet) {
  const ws = wb.Sheets[sheet];
  if (!ws) {
    console.error(`aba nao encontrada: ${sheet}. Disponiveis: ${wb.SheetNames.join(', ')}`);
    process.exit(3);
  }
  process.stdout.write(JSON.stringify(XLSX.utils.sheet_to_json(ws, { defval: null }), null, 2));
} else {
  const out = { sheetNames: wb.SheetNames, sheets: {} };
  for (const name of wb.SheetNames) {
    out.sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
  }
  process.stdout.write(JSON.stringify(out, null, 2));
}
