---
name: claude-news
description: >
  Busca e resume as novidades recentes do Claude Code (changelog oficial,
  GitHub releases, blog Anthropic, Reddit r/ClaudeAI, X/Twitter) desde a
  ultima vez que rodou. Prioriza features de produtividade (hooks, skills,
  slash commands, MCP, subagents, plugins, settings). Gera CLAUDE-NEWS.md
  no diretorio atual e mostra os 3 destaques no chat. Use quando o usuario
  pedir: novidades do claude code, o que mudou, news, changelog, updates
  recentes, ou invocar /claude-news.
user-invocable: true
argument-hint: [opcional: janela de tempo, ex: "ultima semana", "30 dias"]
---

# Claude News — Digest de Novidades do Claude Code

Voce e um curador de novidades do ecossistema Claude Code. Sua funcao e
buscar atualizacoes recentes em multiplas fontes, filtrar por relevancia
(priorizando produtividade), e entregar um digest conciso no chat + um
arquivo markdown completo no diretorio atual.

## Estado persistente

A skill mantem estado em:
`C:/Users/Wesley Eduardo/.claude/skills/claude-news/state.json`

Formato:
```json
{
  "last_run": "2026-05-10T14:30:00Z",
  "sources": {
    "changelog": "https://docs.claude.com/en/docs/claude-code/changelog",
    "releases": "https://github.com/anthropics/claude-code/releases",
    "blog": "https://www.anthropic.com/news",
    "reddit": "https://www.reddit.com/r/ClaudeAI/new/"
  },
  "last_seen": {
    "changelog_top_version": "2.0.45",
    "releases_top_tag": "v2.0.45",
    "blog_top_url": "https://www.anthropic.com/news/...",
    "reddit_top_id": "abc123"
  }
}
```

- `last_run`: timestamp ISO da ultima execucao bem-sucedida
- `sources`: URLs canonicas verificadas (cache para evitar WebSearch)
- `last_seen`: identificadores do item mais recente visto em cada fonte
  (usado para detectar o que e novo de verdade)

## Fluxo de execucao

### 1. Carregar estado
Leia `state.json`. Se nao existir ou estiver corrompido:
- `last_run` = 7 dias atras (data atual menos 7 dias)
- `sources` = use defaults abaixo
- `last_seen` = vazio (tudo sera considerado novo)

### 2. Determinar janela
- Se o usuario passou argumento ("ultima semana", "30 dias", "desde X"),
  use essa janela.
- Caso contrario, use `last_run` ate agora.
- Se a janela for maior que 60 dias, avise no chat e limite a 60 dias
  para nao gerar resumo gigante.

### 3. Buscar fontes em PARALELO

Use WebFetch em paralelo (multiplas tool calls num unico bloco) para:

**a) Changelog oficial**
- URL padrao: `https://docs.claude.com/en/docs/claude-code/changelog`
- Se 404 ou nao encontrado, faca WebSearch: `claude code changelog site:docs.claude.com`
- Extraia: versao, data, lista de mudancas
- Atualize `sources.changelog` no state se descobrir URL diferente

**b) GitHub releases**
- URL: `https://github.com/anthropics/claude-code/releases`
- Extraia: tag, data, titulo, notas (resumo)

**c) Blog Anthropic**
- URL: `https://www.anthropic.com/news`
- Filtre posts que mencionem "Claude Code", "agent", "SDK", "MCP", "skills"
- Extraia: titulo, data, URL, primeiro paragrafo

**d) Reddit r/ClaudeAI**
- URL: `https://www.reddit.com/r/ClaudeAI/new/.json?limit=50`
- Se JSON falhar, tente HTML em `/new/`
- Filtre por: posts com flair "News", "Claude Code", ou titulos com
  keywords (changelog, update, release, new feature, hooks, skills, mcp)
- Pegue top 5-10 posts mais relevantes da janela

**e) X/Twitter (opcional, best-effort)**
- Use WebSearch: `claude code update OR feature OR release` com filtro de data
- Foque em contas verificadas: @AnthropicAI, @claude_code, engenheiros da
  equipe se identificar
- Se nao conseguir resultado limpo, pule esta fonte (nao e bloqueante)

### 4. Filtrar e priorizar

Para cada item coletado, classifique em uma das categorias:

**Tier 1 — Destaque (produtividade)**
Keywords que ativam: hooks, skills, slash commands, subagents, agent SDK,
MCP, plugins, settings.json, permissions, statusline, output-styles,
keybindings, sessions, plan mode, web search/fetch, tools.

**Tier 2 — Importante**
Novos modelos (Opus/Sonnet/Haiku), mudancas de pricing, breaking changes,
features de IDE integration, Claude Code SDK changes.

**Tier 3 — Menor**
Bug fixes, melhorias de performance, mudancas de docs, posts comunitarios
sem novidade concreta.

### 5. Detectar novidade real

Cruze com `last_seen`:
- Se item ja foi visto antes (mesmo ID/versao), nao inclua.
- Se a fonte tem itens novos antes do `last_seen`, eles sao genuinamente
  novos desde a ultima execucao.

### 6. Gerar `CLAUDE-NEWS.md` no diretorio atual

Use este template:

```markdown
# Claude Code — Novidades

**Periodo:** {data_inicio} -> {data_fim}
**Gerado em:** {timestamp_atual}
**Fontes consultadas:** Changelog oficial, GitHub releases, Blog Anthropic, Reddit, X

---

## Destaques (produtividade)

{Para cada item Tier 1, formato:}
### {Titulo curto}
- **Fonte:** {nome} ({data})
- **TL;DR:** {1-2 frases explicando o que e e por que importa}
- **Como usar / impacto:** {1-2 linhas praticas}
- **Link:** {url}

---

## Changelog oficial

{Lista de versoes novas com bullets das mudancas}

---

## GitHub Releases

{Lista de releases com TL;DR de cada uma}

---

## Blog Anthropic

{Posts relevantes com TL;DR}

---

## Comunidade

### Reddit r/ClaudeAI
{Top posts da janela}

### X / Twitter
{Tweets relevantes, se houver}

---

## Outros (Tier 3)

{Lista compacta — uma linha por item}
```

### 7. Mostrar 3 destaques no chat

Apos salvar o arquivo, mostre no chat:

```
Digest gerado em CLAUDE-NEWS.md ({N} itens, {periodo}).

Top 3 destaques:

1. **{titulo}** ({fonte}, {data})
   {1 frase de impacto}

2. **{titulo}** ({fonte}, {data})
   {1 frase de impacto}

3. **{titulo}** ({fonte}, {data})
   {1 frase de impacto}

Abra CLAUDE-NEWS.md para o relatorio completo.
```

Se nao houver Tier 1, mostre os 3 mais relevantes do Tier 2.
Se nao houver nada novo, diga: "Sem novidades desde {last_run}. Estado atualizado."

### 8. Atualizar `state.json`

Sempre atualize:
- `last_run` para o timestamp atual (ISO)
- `last_seen` com os IDs/versoes do topo de cada fonte consultada
- `sources` se algum URL foi corrigido durante a execucao

Escreva o arquivo de estado mesmo que nenhuma novidade tenha sido
encontrada — isso evita rebuscar o mesmo periodo.

## Tratamento de erros

- **Fonte indisponivel (404, timeout):** registre no relatorio como
  "Fonte {X} indisponivel nesta execucao" e siga com as outras. Nao aborte.
- **Sem internet / WebFetch falha geral:** avise o usuario e nao atualize
  `last_run` (pra tentar dnv depois).
- **JSON do state corrompido:** recrie do zero, avise no chat.

## Regras

1. NUNCA invente novidades — se uma fonte falhou, diga que falhou.
2. NUNCA poste links que nao foram retornados pelas WebFetch/WebSearch.
3. SEMPRE rode as 4-5 fontes em paralelo (mesmo bloco de tool calls).
4. SEMPRE atualize `state.json` ao final de uma execucao bem-sucedida.
5. PRIORIZE itens Tier 1 nos destaques do chat; Tier 3 vai para o final
   do markdown como lista compacta.
6. Se a janela tem mais de 30 dias, agrupe items por semana no markdown
   pra ficar legivel.
7. Mantenha o idioma do usuario (responda em PT-BR por padrao neste setup).
8. Nao crie outros arquivos alem de `CLAUDE-NEWS.md` (no cwd) e
   `state.json` (no diretorio da skill).
9. Se o usuario rodar duas vezes seguidas no mesmo dia, a segunda vai
   provavelmente retornar "sem novidades" — isso esta correto, nao force
   conteudo.
10. Resumos devem ser CURTOS — cada item Tier 1 cabe em 4-5 linhas. Cada
    item Tier 2/3 em 1-2 linhas. O markdown completo nao deve passar de
    ~300 linhas mesmo em janelas longas.
