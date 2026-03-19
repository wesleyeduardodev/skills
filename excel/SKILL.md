---
name: excel
description: "Lê, cria e manipula arquivos Excel (.xlsx, .xls, .csv, .ods). Use para ler planilhas, criar novas, adicionar/editar dados, converter formatos."
user-invocable: true
disable-model-invocation: true
argument-hint: [ler arquivo.xlsx | criar planilha | converter para md]
---

# Excel Manager

Voce manipula arquivos Excel e planilhas. O usuario diz o que precisa e voce entrega.

## Formatos suportados

- `.xlsx` (Excel moderno)
- `.xls` (Excel 97-2003)
- `.csv` (comma-separated values)
- `.ods` (OpenDocument — LibreOffice)

## O que voce sabe fazer

### Ler
- Listar abas de um arquivo
- Ler conteudo de uma ou todas as abas
- Ler celulas especificas
- Contar linhas e colunas

### Criar
- Criar arquivo .xlsx novo com dados
- Criar multiplas abas
- Definir largura de colunas
- Gerar a partir de dados JSON ou arrays

### Editar
- Adicionar linhas a uma planilha existente
- Adicionar nova aba a arquivo existente
- Atualizar celulas especificas

### Converter
- Excel → Markdown (tabela)
- Excel → JSON
- Excel → CSV
- JSON/Array → Excel

## Como funciona internamente

Use a lib `xlsx` (SheetJS) via Node.js. O processo interno e:
1. Criar diretorio temporario (`mktemp -d`)
2. Instalar `xlsx` no tmpdir
3. Executar o script com caminhos absolutos para os arquivos do usuario
4. Limpar o tmpdir

**REGRAS CRITICAS:**
- NUNCA instale dependencias no diretorio do projeto (usar tmpdir)
- Caminhos dos arquivos do usuario devem ser absolutos
- Sempre executar `cd "$TMPDIR"` antes de rodar scripts (para `require('xlsx')` funcionar)
- Limpar o tmpdir apos terminar
- Nunca sobrescrever arquivo original sem confirmacao

## Regras

1. SEMPRE instalar `xlsx` em diretorio temporario (NUNCA no diretorio do projeto)
2. SEMPRE limpar o diretorio temporario apos terminar
3. Nunca sobrescrever arquivo original sem confirmacao — salvar como novo ou pedir ao usuario
4. Para arquivos grandes, usar streams ou ler por ranges
5. Se o usuario passar `$ARGUMENTS`, executar diretamente sem perguntar

## Execucao com argumentos

Se o usuario invocar `/excel $ARGUMENTS`, interprete e execute.

Exemplos:
- `/excel ler cronograma.xlsx` → le e exibe o conteudo
- `/excel criar relatorio.xlsx com dados X` → cria arquivo novo
- `/excel converter dados.xlsx para markdown` → converte e exibe
- `/excel quantas linhas tem planilha.xlsx` → conta e informa
- `/excel adicionar aba "Resumo" em arquivo.xlsx` → adiciona aba
- `/excel ler arquivo.csv` → le CSV como planilha
