// Extrai texto e metadados de um PDF (pdf-parse v2 — classe PDFParse).
// Uso: node read.js <input.pdf> [--json]
//
// Default: imprime o texto extraido na stdout.
// Com --json: imprime { numpages, info, text } como JSON.

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const [, , inputArg, ...flags] = process.argv;
if (!inputArg) {
  console.error('uso: node read.js <input.pdf> [--json]');
  process.exit(2);
}

const asJson = flags.includes('--json');

(async () => {
  const data = fs.readFileSync(path.resolve(inputArg));
  const parser = new PDFParse({ data });

  try {
    const textResult = await parser.getText();

    if (asJson) {
      let info = null;
      try { info = await parser.getInfo(); } catch { /* opcional */ }
      process.stdout.write(JSON.stringify({
        numpages: textResult.total ?? textResult.numpages,
        info,
        text: textResult.text,
      }, null, 2));
    } else {
      process.stdout.write(textResult.text);
    }
  } finally {
    if (parser.destroy) await parser.destroy();
  }
})().catch(err => {
  console.error('erro ao ler PDF:', err.message);
  process.exit(1);
});
