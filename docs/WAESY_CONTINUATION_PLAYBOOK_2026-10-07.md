# Waesy — Playbook de Continuidade e Integridade de Evolução

**Data de consolidação:** 2026-10-07
**Branch de trabalho:** `fix/copilot-p0-integrity-2026-10-07`
**Objetivo:** manter uma fonte versionada de verdade para a auditoria, as decisões de arquitetura, o histórico de ondas e a continuidade segura entre conversas e branches.

> Este documento é um mapa operacional. Ele não substitui os contratos TypeScript, as migrations, os testes ou o relatório vivo; aponta para eles e registra por que cada decisão foi tomada.

## 1. Regras inegociáveis para qualquer continuação

1. **Zero mocks e zero dados sintéticos.** Se um conector, minerador, provider ou consulta Supabase não estiver disponível, a execução deve falhar honestamente, registrar o motivo e preservar o estado real. Nunca preencher a tela com clientes, cotações, produtos, notícias ou resultados fictícios.
2. **Não duplicar o Copilot.** Antes de criar qualquer planner, aprovação, executor, timeline ou persistência, auditar `src/services/autonomous-copilot-orchestrator.ts`, `src/services/copilot-execution-persistence.ts`, `src/services/ai-conversations.functions.ts`, `src/types/copilot-fsm.ts`, `src/components/chat/waesy-copilot-drawer.tsx`, `src/components/chat/ai-chat-shell.tsx`, `src/components/chat/copilot-approval-panel.tsx` e as migrations/tipos Supabase relacionados. Evoluções devem ampliar o contrato canônico, não criar um segundo fluxo paralelo.
3. **Renderização não é descartável.** Uma extração pode reduzir linhas, mas não pode simplificar regras de nicho, remover estados visuais, substituir mensagens, eliminar acessibilidade, esconder validações ou generalizar comportamentos diferentes apenas para produzir um componente menor.
4. **Mutação permanece na fronteira segura.** Componentes extraídos recebem valores e callbacks explícitos. Serviços de mutação continuam exigindo identidade server-side, autorização por tenant e validação de payload. A publicação só pode ser alterada após testes de contrato.
5. **Aprovação humana para alto impacto.** Cotações de viagem, demandas jurídicas, publicação de anúncios, ações externas, alterações destrutivas e mudanças de acesso devem passar pelo contrato persistido `copilot_action_approvals`. O estado pendente deve ser visível, auditável, realtime quando possível e nunca ser executado implicitamente.
6. **Prova antes de declarar pronto.** Toda fase precisa registrar typecheck, testes focados, suíte completa quando aplicável, build, client/server leak, schema, SSOT, ciclos, route budget, Design Lint e `git diff --check`. Falhas devem permanecer documentadas; não atualizar baseline para esconder dívida.

## 2. Log de ações já executadas

### Fundação do Copilot e segurança

- Foi realizada auditoria dos serviços, tabelas, schemas e stacks do Waesy.
- Foram corrigidos problemas P0 de isolamento RLS em etapas do Copilot.
- Foi removido o estado fantasma `PLANNING` da FSM.
- Foi implementado o contrato persistido de aprovação humana para ações de alto impacto, incluindo a tabela `copilot_action_approvals`, execução condicionada ao status pendente e painel visual de aprovação/rejeição.
- O dispatcher de ações foi unificado entre Copilot full-screen e Drawer, removendo defaults hardcoded e encaminhando mutações para a fronteira server-side.
- Dados sintéticos identificados no acompanhamento de pedidos foram removidos e o fluxo de pedido rápido passou a validar aritmética de subtotais.

### Refatoração incremental do editor de classificados

As ondas anteriores foram feitas em fatias coesas, mantendo a publicação na rota até existirem contratos suficientes:

- `CreateTypePicker`: seleção de tipo e prefill assistido.
- `ClassifiedEditorNavigation`: barra operacional, stepper e score de qualidade.
- `ClassifiedMediaSection`: uploads Hero/Feed e estado agregado concorrente.
- `ClassifiedBasicInfoSection`: título, descrição e preview de refinamento.
- `ClassifiedLocationSection`: localização estruturada e privacidade LGPD.
- `src/types/classified-editor.ts`: SSOT acíclico para contratos compartilhados.
- Preview de título/descrição do Copilot com versão, timestamp, hash do texto-base, snapshot anterior e aplicação somente após conferência do hash.

O módulo legado foi reduzido progressivamente para aproximadamente 8.899 linhas antes da extração de preço/ciclo de vida. O relatório detalhado está em `docs/AUDIT_EXECUTION_2026-10-07.md`.

### Gatilhos de qualidade comprovados na última onda fechada

A décima segunda onda fechada teve typecheck aprovado, 240 arquivos e 1.552 testes aprovados, build Cloudflare aprovado, 492 chunks verificados contra vazamento client/server, schema/SSOT/route budget aprovados e `check:canonical` com exit code 0. O Design Lint passou pela catraca sem atualização artificial do baseline: a dívida histórica permanece explicitamente registrada.

## 3. Estado desta continuação: preço, validade e estoque

A nova extração está sendo feita em `src/components/classifieds/classified-pricing-lifecycle-section.tsx`. Ela concentra somente a renderização que já existia dentro de `ClassifiedBasicInfoSection`:

- modalidades `fixed`, `starting_at`, `price_range`, `on_quote`, `exchange_only` e `free`;
- valor fixo, faixa mínima/máxima e comportamento de preço inicial;
- checkbox de negociação e orçamento final;
- validade de 30, 60 e 90 dias;
- limite de ofertas/pedidos e estoque físico;
- avisos de valor, disponibilidade, sazonalidade, câmbio e aviso customizado;
- todas as mensagens e variações visuais existentes.

A rota continua dona dos estados, do payload de publicação, dos cálculos de `price_cents`, `price_min_cents`, `price_max_cents`, `validity_days`, `stock_limit` e `offer_limit`, além das integrações do Copilot. O contrato foi tipado no SSOT com `ClassifiedPricingType`, `ClassifiedPriceDisclaimer` e `ClassifiedValidityDays`. Não foi criado um segundo motor de preços e nenhuma regra do `editorial-showcase-view` foi misturada nesta extração.

Antes do commit desta onda, concluir obrigatoriamente a validação do typecheck que já está em execução, depois rodar testes focados de classificados/tipos, suíte completa, build, leak, gates de schema/SSOT/route budget/ciclos, Design Lint e `check:canonical`. Só então atualizar a seção da onda no relatório vivo.

## 4. Auditoria de sobreposição com o Copilot

O Copilot existente de aprovações persistidas está em `src/services/ai-conversations.functions.ts` e nos componentes `src/components/chat/copilot-approval-panel.tsx`, `src/components/chat/waesy-copilot-drawer.tsx` e `src/components/chat/ai-chat-shell.tsx`. O preview de refinamento do editor é uma capacidade local de edição assistida, com evidência no payload; ele não executa uma ação externa nem substitui o motor de aprovação.

A regra para futuras melhorias é separar claramente quatro níveis:

| Nível | Responsabilidade | Persistência/controle |
|---|---|---|
| Sugestão local | Texto, preço ou metadado sugerido para o formulário | Preview, hash e evidência |
| Comando de domínio | Preparar uma alteração de negócio validável | Serviço server-side e identidade |
| Ação de alto impacto | Publicar, cotar, demandar, anunciar ou alterar dados externos | `copilot_action_approvals` e decisão humana |
| Orquestração | Planejar, dividir, executar, criticar e sintetizar | `copilot_executions`, `copilot_steps`, FSM e timeline |

Não criar um novo approval hook no editor nem uma nova tabela de ações sem provar que o contrato existente não atende ao caso.

## 5. Backlog priorizado de próximas fases

### P0 — segurança e integridade

- Revisar todos os serviços de mutação Supabase para cobertura de `getServerIdentity`, tenant e autorização contextual.
- Completar a auditoria dos `catch {}` silenciosos; cada falha deve ter mensagem, telemetria ou propagação apropriada.
- Confirmar RLS, chaves estrangeiras, índices e colunas reais das tabelas do Copilot e dos classificados contra as migrations consolidadas.
- Testar idempotência e concorrência das aprovações humanas, inclusive corrida entre aprovação, rejeição e expiração.

### P1 — editor de classificados

- Separar as regras puras de preço e validação de faixa, sem retirar a UI especializada.
- Criar testes de payload para `fixed`, `starting_at`, `price_range`, `on_quote`, `exchange_only` e `free`.
- Validar relações entre preço, negociação, desconto máximo, Pix, financiamento, estoque, limite de ofertas e disclaimers.
- Extrair especificações de viagem, veículos, imóveis, serviços, vagas e conveniência somente quando cada contrato de props refletir o domínio real.
- Adicionar regressões de rascunho, recuperação e preview para garantir que novos campos não se percam no localStorage ou no payload.

### P1 — Autonomous Copilot Engine

- Auditar o orquestrador linear atual antes de introduzir DAG/spawner.
- Mapear a FSM atual e alinhar o estado de aprovação persistido sem reintroduzir estados fantasmas.
- Evoluir etapas filhas com `parent_task_id` somente após migration, tipos, RLS e testes de isolamento.
- Adicionar critic/synthesizer com evidências estruturadas, não apenas texto gerado.
- Conectar mineradores reais (`src/services/mining`) usando o AI Pool e Secret Vault existentes; indisponibilidade deve resultar em falha honesta.
- Modelar timeline de eventos e artefatos vivos reaproveitando os componentes existentes do Drawer.
- Manter upload multimodal isolado por tenant e validar conteúdo antes da inferência.

### P2 — qualidade e performance

- Reduzir a dívida Design Lint por lotes mensuráveis, sem baixar baseline.
- Monitorar orçamento de rota e tamanho do worker após cada extração.
- Manter o grafo sem ciclos e o SSOT sem tipos duplicados.
- Adicionar testes de acessibilidade e interação para cada componente extraído.

## 6. Protocolo operacional para a próxima conversa/branch

1. Ler este playbook e `docs/AUDIT_EXECUTION_2026-10-07.md`.
2. Executar `git status`, `git branch --show-current` e `git log -10 --oneline`.
3. Auditar o alvo com `rg` e ler apenas janelas cirúrgicas do arquivo grande.
4. Pesquisar implementações existentes antes de criar qualquer novo serviço, tipo, tabela ou componente.
5. Definir contrato explícito, preservar a renderização completa e escrever testes antes de mover payload/mutação.
6. Rodar typecheck imediatamente após a mudança estrutural.
7. Rodar gates completos antes do commit.
8. Atualizar o relatório vivo com fatos, contagens e falhas reais.
9. Fazer commit atômico com mensagem semântica e abrir PR apenas após a árvore estar limpa.
10. Nunca executar deploy, migration destrutiva, publicação ampla ou alteração de segurança sem o fluxo de confirmação/controle correspondente.

## 7. Comandos canônicos

```bash
npm run typecheck
npm test
npm run build
npm run check:schema
npm run check:types-ssot
npm run check:cycles
npm run check:route-budget
npm run lint:design
npm run check:canonical
git diff --check
```

## 8. Critérios de encerramento de uma fase

Uma fase somente pode ser marcada como concluída quando a implementação compilou, os testes relevantes provaram os contratos, o build gerou o worker, o leak detector não encontrou runtime server em chunks client, os gates estruturais passaram, o relatório registrou o que mudou e a árvore Git foi commitada. Se algum gate falhar, registrar a falha e manter a fase aberta; não declarar produção pronta por aproximação.
