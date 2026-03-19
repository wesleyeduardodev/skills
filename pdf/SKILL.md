---
name: pdf
description: "Gera arquivos PDF. Converte HTML, Markdown ou cria PDFs do zero a partir de instrucoes. Use para criar relatorios, documentos, propostas, fichas ou converter arquivos existentes para PDF."
user-invocable: true
disable-model-invocation: true
argument-hint: [gerar pdf de arquivo.html | criar relatorio pdf | converter README.md para pdf]
---

# PDF Generator

Voce gera arquivos PDF. O usuario diz o que precisa e voce entrega o PDF pronto.

## O que voce sabe fazer

- Converter arquivo HTML existente para PDF
- Converter arquivo Markdown para PDF
- Criar PDFs do zero a partir de instrucoes do usuario (relatorios, tabelas, propostas, fichas)
- Configurar formato (A4, Letter, paisagem), margens, header/footer com numeracao de paginas

## Como funciona internamente

Use Puppeteer (Node.js) para gerar os PDFs. O processo interno e:
1. Criar diretorio temporario (`mktemp -d`)
2. Instalar `puppeteer` (e `marked` se precisar de Markdown) no tmpdir
3. Montar HTML com CSS profissional (o usuario NAO precisa saber disso)
4. Renderizar e salvar o PDF no diretorio do usuario (caminho absoluto)
5. Limpar o tmpdir

**REGRAS CRITICAS:**
- NUNCA instale dependencias no diretorio do projeto (usar tmpdir)
- O PDF de saida deve ser salvo no diretorio do usuario, NAO no tmpdir
- Caminhos de entrada e saida devem ser absolutos
- SEMPRE usar `printBackground: true` para incluir cores e backgrounds
- No Windows/Git Bash, usar barras normais: `file:///C:/pasta/arquivo.html`
- Para fontes do Google Fonts, usar `waitUntil: 'networkidle0'`
- Limpar o tmpdir apos gerar o PDF

## Opcoes de formatacao

| Opcao | Valores | Default |
|-------|---------|---------|
| Formato | A4, A3, Letter, Legal, Tabloid | A4 |
| Orientacao | retrato, paisagem | retrato |
| Margens | em mm (ex: 15mm) | 15mm todos os lados |
| Header/Footer | texto customizado + numeracao de paginas | sem |
| Background | cores e imagens | sim |

## Estilo dos PDFs gerados

Quando criar PDFs do zero (sem arquivo de entrada), use CSS profissional:
- Fonte: system-ui ou Arial, legivel
- Tabelas: bordas sutis, header com fundo cinza claro, padding adequado
- Titulos: hierarquia visual clara (h1 > h2 > h3)
- Cores: sobriedade profissional, sem exageros
- Espaçamento: line-height 1.6, margens entre secoes

## Regras

1. SEMPRE instalar dependencias em diretorio temporario (NUNCA no projeto)
2. SEMPRE limpar o tmpdir apos gerar
3. SEMPRE salvar o PDF no diretorio do usuario (caminho absoluto)
4. Nunca sobrescrever PDF existente sem confirmacao
5. Se o usuario passar `$ARGUMENTS`, interpretar e executar direto
6. Se o usuario nao especificar nome de saida, usar o nome do arquivo de entrada com extensao .pdf
7. Se o usuario pedir algo vago ("gera um pdf"), perguntar o conteudo

## Execucao com argumentos

Se o usuario invocar `/pdf $ARGUMENTS`, interprete e execute.

Exemplos:
- `/pdf gerar de relatorio.html` → converte para PDF
- `/pdf converter README.md para pdf` → Markdown → PDF
- `/pdf criar relatorio de vendas com tabela de dados X` → gera HTML interno → PDF
- `/pdf documento A4 paisagem com header "Meu Relatorio"` → PDF formatado
- `/pdf converter todos os .md da pasta docs/` → converte multiplos arquivos
