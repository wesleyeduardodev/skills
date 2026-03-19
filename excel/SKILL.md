---
name: excel
description: "Lê, cria e manipula arquivos Excel (.xlsx). Use para ler planilhas, criar novas, adicionar/editar dados, converter formatos."
user-invocable: true
disable-model-invocation: true
argument-hint: [ler arquivo.xlsx | criar planilha | converter para md]
---

# Excel Manager

Voce manipula arquivos Excel (.xlsx) usando Node.js com a lib `xlsx` (SheetJS).

## Ambiente

- **Runtime:** Node.js (disponivel no PATH)
- **Lib:** `xlsx` (SheetJS) — instalar sob demanda com `npm install xlsx`
- **Shell:** Git Bash (MINGW64)

## REGRA CRITICA: Instalar dependencia antes de usar

A lib `xlsx` pode nao estar instalada. SEMPRE verifique antes:

```bash
node -e "require('xlsx')" 2>/dev/null && echo "OK" || (npm install xlsx && echo "INSTALADO")
```

Apos usar, limpe os arquivos temporarios:

```bash
rm -rf node_modules package.json package-lock.json
```

## O que voce sabe fazer

### Ler planilha
- Listar abas de um arquivo
- Ler conteudo de uma aba (como tabela/CSV)
- Ler celulas especificas
- Contar linhas e colunas
- Converter para Markdown, JSON ou CSV

### Criar planilha
- Criar arquivo .xlsx novo com dados
- Criar multiplas abas
- Definir largura de colunas
- Gerar a partir de dados JSON ou arrays

### Editar planilha
- Adicionar linhas a uma planilha existente
- Adicionar nova aba a arquivo existente
- Atualizar celulas especificas

### Converter formatos
- Excel → Markdown (tabela)
- Excel → JSON
- Excel → CSV
- JSON/Array → Excel

## Snippets prontos

### Ler arquivo completo (todas as abas)

```javascript
const XLSX = require('xlsx');
const wb = XLSX.readFile('arquivo.xlsx');
wb.SheetNames.forEach(name => {
  console.log('=== ABA: ' + name + ' ===');
  const ws = wb.Sheets[name];
  console.log(XLSX.utils.sheet_to_csv(ws, {FS: '\t'}));
});
```

### Ler como JSON (array de objetos)

```javascript
const XLSX = require('xlsx');
const wb = XLSX.readFile('arquivo.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);
console.log(JSON.stringify(data, null, 2));
```

### Criar arquivo novo

```javascript
const XLSX = require('xlsx');

const headers = ['Coluna1', 'Coluna2', 'Coluna3'];
const rows = [
  ['valor1', 'valor2', 'valor3'],
  ['valor4', 'valor5', 'valor6'],
];

const data = [headers, ...rows];
const ws = XLSX.utils.aoa_to_sheet(data);

// Largura das colunas (opcional)
ws['!cols'] = [
  {wch: 20},
  {wch: 30},
  {wch: 15},
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Pagina1');
XLSX.writeFile(wb, 'novo-arquivo.xlsx');
```

### Adicionar aba a arquivo existente

```javascript
const XLSX = require('xlsx');
const wb = XLSX.readFile('arquivo.xlsx');

const novaAba = XLSX.utils.aoa_to_sheet([
  ['Col1', 'Col2'],
  ['dado1', 'dado2'],
]);

XLSX.utils.book_append_sheet(wb, novaAba, 'NovaAba');
XLSX.writeFile(wb, 'arquivo.xlsx');
```

### Converter Excel para Markdown

```javascript
const XLSX = require('xlsx');
const wb = XLSX.readFile('arquivo.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header: 1});

if (data.length > 0) {
  const headers = data[0];
  console.log('| ' + headers.join(' | ') + ' |');
  console.log('|' + headers.map(() => '---').join('|') + '|');
  data.slice(1).forEach(row => {
    console.log('| ' + headers.map((_, i) => row[i] || '').join(' | ') + ' |');
  });
}
```

## Regras

1. SEMPRE instalar `xlsx` antes de usar (pode nao estar no projeto)
2. SEMPRE limpar `node_modules`, `package.json` e `package-lock.json` apos terminar
3. Usar a ferramenta Bash para executar os scripts Node.js
4. Para arquivos grandes, usar streams ou ler por ranges
5. Nunca sobrescrever arquivo original sem confirmacao — salvar como novo arquivo ou pedir ao usuario
6. Quando o usuario passar argumentos em $ARGUMENTS, executar diretamente sem perguntar

## Execucao com argumentos

Se o usuario invocar `/excel $ARGUMENTS`, interprete o que foi pedido e execute.

Exemplos:
- `/excel ler cronograma.xlsx` → le e exibe o conteudo
- `/excel criar relatorio.xlsx com dados X` → cria arquivo novo
- `/excel converter dados.xlsx para markdown` → converte e exibe
- `/excel quantas linhas tem planilha.xlsx` → conta e informa
- `/excel adicionar aba "Resumo" em arquivo.xlsx` → adiciona aba
