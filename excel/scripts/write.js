// Cria um .xlsx a partir de JSON na stdin.
// Formato esperado (stdin):
//   {
//     "sheets": { "Aba1": [{...},{...}], "Aba2": [{...}] },
//     "columnWidths": { "Aba1": [20, 30, 15] }   // opcional
//   }
// Uso: node write.js <caminho-saida-absoluto> < input.json

const fs = require('fs');
const XLSX = require('xlsx');

const out = process.argv[2];
if (!out) {
  console.error('uso: node write.js <saida.xlsx> < input.json');
  process.exit(2);
}

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const wb = XLSX.utils.book_new();

for (const [name, rows] of Object.entries(input.sheets || {})) {
  const ws = XLSX.utils.json_to_sheet(rows || []);
  if (input.columnWidths && input.columnWidths[name]) {
    ws['!cols'] = input.columnWidths[name].map(w => ({ wch: w }));
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

XLSX.writeFile(wb, out);
console.error(`gerado: ${out}`);
