---
name: waesy-integrity-auditor
description: Audita e conduz correções end-to-end no repositório Waesy, rastreando rotas, UI, BFF, autorização, schemas, persistência, IA, builders, mídia, testes e produção. Use em revisões de PR/branch, investigação de funcionalidades quebradas, auditorias de tabelas/rotas/integrações, correções sem regressão e preparação de release.
---

# Waesy End-to-End Integrity Auditor

## Objetivo

Aplicar auditoria adversarial baseada em evidências ao Waesy. Provar a cadeia **ação visível → rota → identidade/autorização → BFF → schema/constraint/RLS → escrita/leitura persistida → UI após reload → integração/deploy**, corrigindo por fatias verificáveis. Nunca transformar plausibilidade, código escrito ou teste sintético em afirmação de funcionamento real.

## Gatilho e limites

Use esta skill para qualquer auditoria ou remediação de módulos do Waesy, incluindo Copilot/chat, tabelas e catálogo, builders/editores, geração de imagem, IA/streaming, rotas/navegação, WhatsApp, turismo, design system, schemas/migrations, PRs e prontidão de produção. Mantenha o escopo no repositório `EduardoChapeco/waesy`; não trabalhe em repositórios vizinhos sem pedido explícito. Não implante, aplique migrations em produção, funda PR com checks falhos ou altere credenciais/conta sem autoridade adequada.

## Preflight obrigatório — antes de cada onda e cada microfase

1. Abra `AGENTS.md`, esta skill, o cartão da onda no documento `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md` e os relatórios/specs relacionados.
2. Releia imediatamente os arquivos de implementação relevantes: UI/rota, BFF/server function, tipo/DTO, migration/RLS/schema e teste existente. Não edite a partir de resumo ou memória de conversa.
3. Registre branch, `HEAD`, base remota, `git status`, PR/checks e paths permitidos no evidence ledger (`references/waesy-evidence-ledger-template.md`). Preserve todo diff preexistente; não faça `git add -A` em worktree contaminada.
4. Formule uma reprodução observável e o teste de regressão antes de alterar comportamento. Se a regra de produto ou semântica de dado for ambígua, documente a decisão necessária e pare nesse ponto.
5. Repita os passos 1–4 ao iniciar cada nova onda/microfase, mesmo que a sessão não tenha sido encerrada.

**Bloqueio:** se a leitura prévia, o escopo, a reprodução ou o estado inicial não estiverem registrados, não execute mutações de código, schema, GitHub ou produção.

## Fluxo de trabalho

### 1. Congelar e inventariar

- Separar mudanças do usuário, alterações anteriores, artefatos gerados e mudanças novas; nunca descartá-las silenciosamente.
- Obter o grafo completo de branches/PRs e o diff real contra a base correta; distinguir merged, open, stale, checks passados, falhos, cancelados e não executados.
- Classificar evidência anterior como histórica até reproduzi-la no SHA atual.

### 2. Traçar o fluxo real

Para cada ação, seguir origem e retorno em ambas as direções: componente e estado visual; evento/CTA; rota e route tree/registry; chamada cliente; server boundary; identidade/tenant/papel; serviço/integração; tabela/coluna/constraint/RLS; efeitos colaterais; resposta; re-render; reload; retry/cancelamento; observabilidade. Conferir callers e rotas alternativas para detectar implementações duplicadas.

### 3. Registrar achados, sem generalizar

Cada finding precisa de ID estável, severidade, condição reproduzível, prova com `path:linha` ou output, causa-raiz, blast radius, todos os paths afetados, plano mínimo e riscos, teste positivo e negativo, critério mensurável, dependências e estado da evidência. Rotular explicitamente **confirmado**, **hipótese**, **não verificado**, **corrigido no código**, **verificado em integração**, **verificado no browser** e **verificado em produção**; esses estados não são intercambiáveis.

### 4. Corrigir atomicamente

- Uma microfase deve fechar uma causa-raiz, não esconder sintomas nem introduzir funcionalidades paralelas.
- Ler contratos e testes atuais antes da edição. Atualizar UI, DTO, BFF, schema/RLS e fixtures de forma coerente quando o contrato atravessar camadas.
- Preservar tenant, identidade, semântica de status, idempotência, proveniência e compatibilidade. Em banco, preferir RPC/transação/constraints a sequências best-effort.
- Não transformar falha em `[]`, saudação, UUID sintético, toast de sucesso, `completed`, fallback fictício ou `not_found` genérico.

### 5. Tentar refutar a própria correção

Para cada finding, executar: caso de sucesso; caso negativo/autorização; erro de banco/provider; falha entre duas escritas; retry/replay; concorrência quando aplicável; reload; outro tenant/role; view mobile/desktop. Inspecionar requests, resposta, linha persistida, contagem afetada e estado renderizado. Quando viável, usar fault injection ou mutation testing para provar que o teste falha se a proteção for removida.

### 6. Validar por níveis independentes

1. diff/check de paths e `git diff --check`;
2. testes de unidade de lógica e contratos reais;
3. testes de componentes e handlers/API;
4. typecheck, lint/design e build de produção;
5. integração com Postgres/Supabase de teste, migrations desde zero e RLS por papel;
6. Playwright/browser com sessão e dados de teste, cobrindo a jornada completa e reload;
7. CI do SHA final;
8. deploy confirmado pelo provedor e smoke test público, quando explicitamente autorizado.

Não promover evidência de um nível ao nível seguinte. Teste mockado não prova RLS/provider real; typecheck não prova função; build não prova clique; resposta 200 não prova persistência; PR criado não prova merge; merge não prova deploy.

## Invariantes anti-falso-positivo

- Nunca declarar sucesso de gravação sem verificar `error`, linha/ID/count afetados e leitura posterior do registro requerido.
- Nunca marcar `completed/delivered/applied/published` antes de confirmar todos os efeitos obrigatórios; erro parcial deve ser recuperável e idempotente.
- Para tabelas, reconciliar cada coluna visível com select/DTO/schema. Paginação, busca, ordenação e exportação devem cobrir o conjunto anunciado, com totais e limites explícitos.
- Para IA, provar provider/model real, conteúdo não vazio e válido, contexto autorizado, quota/custo, erro/retry/cancelamento e persistência; não aceitar a mensagem padrão como resposta de sucesso.
- Para builders, provar create → save → reload → edit → publish → abrir URL pública; draft e published não podem ser confundidos.
- Para imagem/arquivo, provar job/provider ou rotular determinístico, quota, Storage, MIME, ownership, provenance, preview/download e sobrevivência a reload.
- Para rotas, provar arquivo de rota + route tree + registry/menu + autorização + navegação browser; links devem apontar a destinos que existem.
- Nunca remover checks, enfraquecer RLS, afrouxar TypeScript, ampliar `any`, ocultar exceções ou atualizar baseline de lint para “passar”.

## Definition of Done por finding

Um finding só fecha quando: (a) teste de regressão reproduz a falha na baseline e passa após a correção; (b) paths afetados e contrato estão revisados; (c) validações aplicáveis passam no SHA final; (d) prova positiva e negativa está anexada ao ledger; e (e) um revisor adversarial confirma que o teste detectaria a regressão. Manter status aberto se faltar infraestrutura, credencial, decisão de produto, migração aplicada, browser, provider ou verificação de produção.

## Squad adversarial

Quando houver agentes disponíveis, separar: **líder de escopo/evidência** (não implementa), **auditor de fronteira/segurança**, **auditor de persistência/schema**, **auditor UI/browser**, **implementador** e **revisor adversarial**. O revisor recebe o finding e deve tentar refutar a correção; nunca aprova seu próprio finding. Sem subagentes, mudar explicitamente de papel, reler evidência e registrar que a revisão foi feita pela mesma pessoa/modelo.

## Referências obrigatórias

- Para o backlog, findings, PRs e sequência de ondas deste snapshot, leia `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`.
- Para criar o registro de execução e comprovar cada microfase, use `references/waesy-evidence-ledger-template.md`.
- Para contratos normativos do repositório, consulte também `AGENTS.md` e a spec ativa antes de qualquer mudança.
