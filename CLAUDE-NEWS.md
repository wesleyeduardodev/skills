# Claude Code — Novidades

**Periodo:** 2026-05-04 -> 2026-05-11 (7 dias)
**Gerado em:** 2026-05-11
**Fontes consultadas:** Changelog oficial (code.claude.com), GitHub releases, Blog Anthropic, Reddit (falhou), WebSearch

---

## Destaques (produtividade)

### `--plugin-url <url>` — instalar plugins direto de uma URL .zip
- **Fonte:** Changelog v2.1.129 (2026-05-06)
- **TL;DR:** Novo flag para baixar um arquivo `.zip` de plugin direto de uma URL e usar so naquela sessao. Antes precisava clonar/baixar manualmente.
- **Como usar / impacto:** `claude --plugin-url https://exemplo.com/meu-plugin.zip`. Otimo pra testar plugins de terceiros sem instalar permanente, ou pra plugins privados hospedados em S3/Artifactory.
- **Link:** https://code.claude.com/docs/en/changelog

### Hooks agora recebem o nivel de effort ativo
- **Fonte:** Changelog v2.1.133 (2026-05-07)
- **TL;DR:** Hooks recebem o effort level via campo JSON `effort.level` e via env var `$CLAUDE_EFFORT`. Permite hooks que mudam comportamento dependendo do effort (high/medium/low/xhigh).
- **Como usar / impacto:** No script de hook, leia `$CLAUDE_EFFORT` ou o campo `effort.level` do JSON de input. Util pra hooks de logging, telemetria, ou pra gates que so disparam em effort alto. Tambem foi corrigido bug onde `/effort` numa sessao afetava outras concorrentes.
- **Link:** https://code.claude.com/docs/en/changelog

### `worktree.baseRef` — controle de origem da branch
- **Fonte:** Changelog v2.1.133 (2026-05-07)
- **TL;DR:** Nova setting que aceita `fresh` ou `head` pra decidir se `--worktree`, `EnterWorktree` e isolation worktrees branch from `origin/<default>` (fresh) ou do HEAD local (head).
- **Como usar / impacto:** Em `settings.json`: `"worktree": { "baseRef": "head" }`. Resolve a friccao de quem trabalha em features encadeadas e queria que o worktree partisse do branch atual em vez do main. Tambem em v2.1.128 corrigiram para `EnterWorktree` realmente usar HEAD local conforme documentado.
- **Link:** https://code.claude.com/docs/en/changelog

### `CLAUDE_CODE_SESSION_ID` no ambiente do Bash
- **Fonte:** Changelog v2.1.132 (2026-05-06)
- **TL;DR:** Subprocesses spawned pelo Bash tool agora recebem a env var `CLAUDE_CODE_SESSION_ID` com o ID da sessao atual.
- **Como usar / impacto:** Permite scripts/hooks correlacionarem logs e telemetria com a sessao especifica do Claude Code. Util pra observability e pra hooks que querem persistir estado por sessao.
- **Link:** https://code.claude.com/docs/en/changelog

### `settings.autoMode.hard_deny` — regras absolutas para auto mode
- **Fonte:** Changelog v2.1.136 (2026-05-08)
- **TL;DR:** Nova chave em settings que define regras do classificador de auto mode que bloqueiam incondicionalmente, independente da intencao do usuario ou de allow exceptions.
- **Como usar / impacto:** Pra times/enterprises que rodam Claude Code em auto mode mas querem garantir que certas operacoes (ex: `rm -rf`, deploys em prod) NUNCA passem mesmo com pressao do prompt.
- **Link:** https://code.claude.com/docs/en/changelog

### `/mcp` mostra contagem de tools por servidor + plugin-dir aceita .zip
- **Fonte:** Changelog v2.1.128 (2026-05-04)
- **TL;DR:** Dois ganhos rapidos: `/mcp` agora exibe quantas tools cada servidor MCP conectado expoe (e flaga servidores com 0 tools), e `--plugin-dir` aceita arquivos `.zip` alem de diretorios.
- **Como usar / impacto:** Debugar MCP fica trivial — quando voce ve "Server: 0 tools" sabe que ha um problema. `--plugin-dir foo.zip` simplifica distribuicao de plugins offline.
- **Link:** https://code.claude.com/docs/en/changelog

### Subagents agora descobrem skills (project/user/plugin)
- **Fonte:** Changelog v2.1.133 (2026-05-07) — bugfix
- **TL;DR:** Bug fix relevante: subagents nao estavam encontrando skills de projeto, do usuario, nem de plugins via Skill tool. Agora descobrem.
- **Como usar / impacto:** Se voce usa subagents que delegam pra skills (ex: subagent que invoca `/init`, `/review`), eles voltam a funcionar corretamente. Vale revisar agents que falharam silenciosamente nas ultimas semanas.
- **Link:** https://code.claude.com/docs/en/changelog

---

## Changelog oficial

### v2.1.138 (2026-05-09)
- Internal fixes

### v2.1.137 (2026-05-09)
- [VSCode] Fixed extension failing to activate on Windows

### v2.1.136 (2026-05-08) — release grande, ~40 itens
- **Novo:** `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` (enterprise survey via OTel)
- **Novo:** `settings.autoMode.hard_deny` (regras absolutas)
- **Fix:** MCP servers de `.mcp.json`, plugins e claude.ai connectors sumindo apos `/clear`
- **Fix:** Login loop raro em rotation concorrente de OAuth
- **Fix:** MCP OAuth refresh tokens perdidos em refresh concorrente
- **Fix:** API 400 com extended thinking + redacted thinking apos tool call
- **Fix:** `--resume`/`--continue` falhando com underscore em paths
- **Fix:** Plan mode nao bloqueando writes quando havia `Edit(...)` allow rule
- **Fix:** Plugin hooks `Stop`/`UserPromptSubmit` falhando quando cache cleanup deletava versao em uso
- **Fix:** Plan mode dialogs, code blocks, `@` file picker, `/usage`, `/insights`, varios
- **WSL2:** image paste do clipboard Windows funciona via PowerShell fallback
- **Fix:** `skills` em `plugin.json` escondendo `skills/` default do plugin
- **Mudanca:** plugin marketplace removal key agora e `d` (era `r`)

### v2.1.133 (2026-05-07)
- **Novo:** `worktree.baseRef` (`fresh` | `head`)
- **Novo:** `sandbox.bwrapPath` e `sandbox.socatPath`
- **Novo:** `parentSettingsBehavior` (SDK managedSettings)
- **Novo:** hooks recebem `effort.level` / `$CLAUDE_EFFORT`
- **Fix:** parallel sessions dead-ending em 401 (refresh-token race)
- **Fix:** Edit/Write allow rules em drive root
- **Fix:** Remote Control stop/interrupt
- **Fix:** `/effort` afetando sessoes concorrentes
- **Fix:** subagents nao descobrindo skills via Skill tool

### v2.1.132 (2026-05-06)
- **Novo:** `CLAUDE_CODE_SESSION_ID` no ambiente do Bash
- **Novo:** `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1` opt-out fullscreen
- **Novo:** "Pasting…" footer hint durante Ctrl+V image paste
- **Fix:** SIGINT externo nao rodando graceful shutdown
- **Fix:** Fullscreen mode blank apos sleep/wake
- **Fix:** Cursor mid-grapheme com Indic/ZWJ emoji
- **Fix:** Paste comecando com `/` swallowing input
- **Fix:** Mouse wheel rapido demais em Cursor/VSCode
- **Fix:** Memory growth (10GB+) com stdio MCP server escrevendo non-protocol no stdout
- **Fix:** MCP tools/list silently retornando 0 tools

### v2.1.131 (2026-05-06)
- **Fix:** [VSCode] extensao falhando no Windows (hardcoded build path no SDK)
- **Fix:** Mantle endpoint auth (missing `x-api-key`)

### v2.1.129 (2026-05-06)
- **Novo:** `--plugin-url <url>` (instalar plugin .zip de URL)
- **Novo:** `CLAUDE_CODE_FORCE_SYNC_OUTPUT=1`
- **Novo:** `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` (Homebrew/WinGet)
- **Mudanca:** plugin manifests — `themes` e `monitors` agora em `"experimental"`
- **Mudanca:** gateway `/v1/models` discovery agora opt-in
- **Mudanca:** Ctrl+R history picker default busca todos os prompts cross-project
- **Mudanca:** `skillOverrides` aceita `off`, `user-invocable-only`, `name-only`
- **Fix:** `/clear` nao resetando terminal tab title
- **Fix:** `/context` jogando ASCII grid no chat
- **Fix:** 1-hour prompt cache TTL caindo pra 5min
- **Fix:** `Bash(mkdir *)`, `Bash(touch *)` allow rules nao honradas

### v2.1.128 (2026-05-04)
- **Novo:** bare `/color` escolhe cor random
- **Novo:** `/mcp` mostra tool count
- **Novo:** `--plugin-dir` aceita `.zip`
- **Novo:** `--channels` funciona com console (API key) auth
- **Mudanca:** `EnterWorktree` cria branch a partir do HEAD local
- **Mudanca:** subprocesses nao herdam mais `OTEL_*`
- **Mudanca:** `workspace` agora e nome reservado de MCP server
- **Fix:** parallel shell tool calls — falha de read-only nao cancela siblings
- **Fix:** sessoes em modelos 1M-context falsamente bloqueadas com "Prompt is too long"
- **Fix:** Bedrock default model resolvia pra `global.*` em vez de region-prefix
- **Fix:** vim mode — Space em NORMAL agora move cursor right
- **Fix:** `/plugin update` nao detectava versoes novas de plugins npm

---

## GitHub Releases

Releases v2.1.128 -> v2.1.138 publicadas entre 2026-05-04 e 2026-05-09 (10 releases em 6 dias). Cadencia muito alta com foco em estabilidade pos-merge de varias features grandes do final de abril (PowerShell tool, auto mode, /ultrareview, Opus 4.7 xhigh effort).

Fonte: https://github.com/anthropics/claude-code/releases

---

## Blog Anthropic

Nesta janela (2026-05-04 a 2026-05-11) o blog nao publicou posts especificos sobre Claude Code que foram extraiveis via WebFetch. WebSearch sugere que conteudo recente sobre plugins, hooks e skills permanece nas paginas:
- https://claude.com/blog/claude-code-plugins
- https://claude.com/plugins
- https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously

---

## Comunidade

### Reddit r/ClaudeAI
Fonte indisponivel nesta execucao (WebFetch bloqueado em www.reddit.com). Tente checar manualmente em https://www.reddit.com/r/ClaudeAI/new/ se quiser cobertura comunitaria.

### X / Twitter
Nao consultado nesta execucao (sem retorno limpo via WebSearch).

---

## Outros (Tier 3)

- v2.1.138: internal fixes apenas
- v2.1.137 / v2.1.131: VS Code Windows activation fixes
- v2.1.136: ~30 micro-fixes de UI (cores, dialogs, scroll, CJK, copy paste, vim, slash command picker)
- v2.1.132: micro-fixes de cursor, vim NFD, scroll wheel, /status, /effort picker
- v2.1.129: micro-fixes de OAuth refresh race, agent panel, cache-miss warning
- v2.1.128: micro-fixes diversos (drag-drop image, /rename resumed sessions, vim mode space)
