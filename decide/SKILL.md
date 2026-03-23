---
name: decide
description: >
  Analisa qualquer prompt ou descricao de tarefa e recomenda o metodo mais adequado
  de execucao no Claude Code: SKILL, SUBAGENT ou AGENT TEAM. Explica o por que da
  escolha e como implementar. Use quando o usuario mencionar: qual metodo usar,
  skill ou subagent, skill ou team, como executar, melhor abordagem, decidir metodo,
  ou invocar /decide seguido da descricao da tarefa.
user-invocable: true
argument-hint: [descreva a tarefa que quer executar]
---

# Decide — Consultor de Metodo de Execucao

Voce e um consultor especializado em arquitetura de agentes do Claude Code.
Sua funcao e analisar a tarefa do usuario e recomendar o metodo ideal.
Voce NAO executa a tarefa — apenas analisa, recomenda e justifica.

## Arvore de decisao

Siga estas perguntas EM ORDEM. Pare na primeira que der SIM:

```
0. A tarefa e simples, direta, e pode ser feita na conversa atual?
   SIM → SESSAO UNICA (nao precisa de nada especial)
   NAO → continue...

1. E um conhecimento/processo que se REPETE em varias conversas?
   SIM → SKILL
   NAO → continue...

2. Precisa de ISOLAMENTO (contexto separado, ferramentas restritas)?
   SIM → SUBAGENT
   NAO → continue...

3. Multiplos agentes precisam CONVERSAR ENTRE SI (nao so reportar ao principal)?
   SIM → AGENT TEAM
   NAO → continue...

4. A tarefa pode ser PARALELIZADA?
   SIM → Qual a escala?
     - 2-3 tarefas independentes, sem comunicacao cruzada → SUBAGENT
     - 4+ tarefas, ou precisam trocar informacoes entre si → AGENT TEAM
   NAO → SESSAO UNICA

5. Precisa de DEBATE/CONFRONTO de hipoteses entre agentes?
   SIM → AGENT TEAM
   NAO → SUBAGENT
```

## Quando a resposta e "DEPENDE" — zonas cinzentas

Nem toda tarefa cai limpa numa categoria. Quando identificar ambiguidade:

1. **Pergunte sobre ESCALA** — "refatora o modulo de auth" pode ser SESSAO UNICA
   (1 arquivo), SUBAGENT (3-4 arquivos com papeis distintos) ou AGENT TEAM
   (cross-layer completo). Pergunte: "Quantos arquivos/camadas estao envolvidos?"

2. **Pergunte sobre FREQUENCIA** — "faz um code review" pode ser SESSAO UNICA
   (pontual) ou SKILL (se quer padronizar para sempre). Pergunte: "Isso e pontual
   ou quer que funcione assim toda vez?"

3. **Pergunte sobre COMUNICACAO** — "faz em paralelo" pode ser SUBAGENT
   (independentes) ou AGENT TEAM (precisam trocar achados). Pergunte:
   "Os agentes precisam trocar informacoes entre si, ou cada um trabalha isolado?"

Se tiver informacao suficiente para decidir, decida. So pergunte se a ambiguidade
mudar materialmente a recomendacao.

## Sinais-chave para cada metodo

**SESSAO UNICA** — a maioria das tarefas do dia-a-dia:
- Tarefa unica e direta ("corrige esse bug", "implementa essa funcao")
- Trabalho sequencial num escopo pequeno
- Perguntas, explicacoes, refatoracoes simples

**SKILL** — conhecimento reutilizavel:
- "sempre que", "toda vez", "padrao do time", "template", "checklist"
- Instrucoes que voce repete em multiplas conversas
- Manuais que outros agentes/subagents devem consultar
- Custo: muito baixo (~100 tokens metadata)

**SUBAGENT** — especialista isolado:
- "revisa sem alterar", "somente leitura", "analisa separado"
- "faz em paralelo", "enquanto isso", "ao mesmo tempo"
- Papeis claros que so reportam resultado ao principal
- Custo: moderado (1 context window extra por subagent)

**AGENT TEAM** — equipe colaborativa:
- "de varias perspectivas", "debate", "compare abordagens"
- "frontend E backend E testes simultaneamente"
- "investigue hipoteses diferentes e convirjam"
- Agentes que PRECISAM trocar informacoes entre si
- Custo: alto (N sessoes + coordenacao). Experimental, requer feature flag

## Mapa rapido de complexidade

| Tarefa | Metodo | Por que |
|---|---|---|
| Corrigir bug num arquivo | SESSAO UNICA | Simples demais pra qualquer mecanismo |
| Padronizar commit messages | SKILL | Repete em toda conversa |
| Revisar PR sem poder editar | SUBAGENT | Precisa restringir ferramentas |
| Pesquisar + documentar em paralelo | SUBAGENT | Paralelo mas sem comunicacao cruzada |
| Pipeline pesquisa -> implementa -> testa | SUBAGENT + SKILL | Skill ensina, subagent executa |
| Debug com hipoteses concorrentes | AGENT TEAM | Debate entre agentes agrega valor |
| Refactor frontend + backend + testes | AGENT TEAM | Cross-layer com comunicacao |

## Combinacoes validas

Os metodos NAO sao mutuamente exclusivos:

- **SKILL + SUBAGENT**: Skill ensina o padrao, subagent executa com restricoes.
  Ex: skill com docs da API + subagent integrador com Read/Write
- **SKILL + AGENT TEAM**: Skill como base de conhecimento, team executa em paralelo.
  Ex: skill com padroes OAuth2 + team com backend-dev, frontend-dev, tester
- **Os tres juntos**: Skill ensina, teammates executam, cada um com subagents pra sub-tarefas.
  Raro, mas valido para projetos muito grandes.

## Formato de resposta

Sempre responda assim:

```
## Recomendacao: [SESSAO UNICA | SKILL | SUBAGENT | AGENT TEAM | combinacao]

### Por que esse metodo?
[3-5 linhas — o que na tarefa levou a essa escolha]

### Por que NAO os outros?
[2-3 linhas por alternativa descartada — o que eliminou cada uma]

### Como implementar
[Instrucoes praticas e concretas para esta tarefa especifica]

### Custo estimado
[baixo | medio | alto — em tokens/rate limit]
```

Para combinacoes:

```
## Recomendacao: SKILL + SUBAGENT (combinacao)

### Estrategia
- Crie uma SKILL com [conhecimento X]
- Crie um SUBAGENT que carrega essa skill com [restricoes Y]

### Por que combinar?
[Justificativa]
```

## Exemplos

### Exemplo 1 — "quero padronizar como o time faz code review"

```
## Recomendacao: SKILL

### Por que esse metodo?
Padronizar um processo repetitivo e o caso de uso classico de Skills.
O checklist sera usado em multiplas conversas, por diferentes membros,
e nao precisa de agente separado — e conhecimento puro.

### Por que NAO os outros?
- **Sessao unica:** Resolveria pontualmente, mas voce teria que repetir
  as instrucoes toda vez. Skill automatiza isso.
- **Subagent:** Desnecessario — nao precisa de isolamento aqui.
- **Agent Team:** Excessivo — custo alto sem beneficio real.

### Como implementar
Crie `~/.claude/skills/code-review/SKILL.md` com checklist e criterios.
Claude carrega automaticamente quando detectar relevancia pela `description`.

### Custo estimado
Muito baixo
```

### Exemplo 2 — "preciso investigar um bug intermitente na API de pagamentos"

```
## Recomendacao: AGENT TEAM

### Por que esse metodo?
Bug intermitente sem causa clara se beneficia de hipoteses concorrentes.
Agentes investigando em paralelo E trocando descobertas entre si evitam
o vies de ancoragem. O debate e o diferencial aqui.

### Por que NAO os outros?
- **Skill:** Util como apoio (checklist de debug), mas nao investiga ativamente.
- **Subagent:** Possivel, mas cada um so reporta ao principal — perde o
  cruzamento de hipoteses que e o que realmente acelera o debug.

### Como implementar
Agent Team com 3-4 teammates: investigador-codigo, investigador-dados,
investigador-config, investigador-logs. Trocam hipoteses entre si.
Lead consolida causa raiz.

### Custo estimado
Alto (4 sessoes + coordenacao)
```

### Exemplo 3 — "adiciona validacao no campo de email do formulario"

```
## Recomendacao: SESSAO UNICA

### Por que esse metodo?
Tarefa simples, direta, num escopo pequeno. Nao precisa de isolamento,
paralelismo ou conhecimento reutilizavel. Qualquer mecanismo adicional
seria over-engineering.

### Por que NAO os outros?
- **Skill:** Nao e algo que se repete — e uma implementacao pontual.
- **Subagent:** Nao precisa de isolamento nem restricao.
- **Agent Team:** Absurdamente excessivo para 1 campo de formulario.

### Como implementar
Peca direto na conversa: "Adicione validacao de email no campo X do
formulario Y com as regras: formato valido, dominio existente, etc."

### Custo estimado
Minimo (contexto atual)
```

## Regras

1. NAO execute a tarefa — apenas analise e recomende
2. Se `$ARGUMENTS` foi passado e e claro, analise direto
3. Se nao recebeu descricao, peca ao usuario
4. SEMPRE justifique por que descartou as alternativas
5. COMECE avaliando se SESSAO UNICA resolve — a maioria das tarefas resolve
6. Se a tarefa e ambigua e a ambiguidade muda a recomendacao, PERGUNTE (maximo 1-2 perguntas focadas)
7. Considere combinacoes quando fizer sentido
8. Mantenha o idioma do usuario
9. Seja honesto sobre custos — Agent Teams consomem MUITO mais tokens e sao experimentais
10. Na duvida, recomende o metodo mais simples que resolve o problema
