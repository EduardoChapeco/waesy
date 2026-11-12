# SPEC-20261112-ECOSYSTEM-CHAT-WHATSAPP-MASTER-INTEGRATIONS-CONSOLIDATION

- **Status:** Aprovada para Execução Cirúrgica
- **Data:** 2026-11-12
- **SHA Base:** `c55dbd3feee33c1d332cbeb4e90abef16910ea21`
- **Referência Cruzada:** [SPEC-20261112-COPILOT-WORKBENCH-MANUS-PARITY-PROJECT-HIERARCHY.md](./SPEC-20261112-COPILOT-WORKBENCH-MANUS-PARITY-PROJECT-HIERARCHY.md)
- **Ledger de Evidências:** Artefato `evidence_ledger_2026-11-12.md`

---

## 1. Objetivo Executivo

Consolidar, corrigir quebras e integrar ponta a ponta os quatro módulos operacionais centrais da plataforma Waesy sob estrita conformidade com `AGENTS.md`, `DESIGN.md` e `DESIGN-LINT.md` (Zero Mocks, Zero Fallbacks Sintéticos, Zero-Trust BFF, Multi-Tenant estrito e WCAG 2.2 AA):

1. **Microfase A — Governança Admin Master (Módulos, Planos, Membros, Instâncias & Faturamento).**
2. **Microfase B — Hub de Integrações (Workspace & Admin Master).**
3. **Microfase C — Integração WhatsApp, Áudio IA, Ferramentas SDR & Runtime de Automações.**
4. **Microfase D — Chat / Atendimento & Waesy Copilot (Hierarquia Pastas -> Projetos -> Conversas, RAG, Estabilidade Worker & Design System 4.0).**

---

## 2. Requisitos em Sintaxe EARS e Escopo por Microfase

### 2.1 Microfase A — Governança Admin Master, Planos, Assentos & Faturas

- **EARS-A1 (Unificação & Visibilidade de Módulos/Planos):**
  QUANDO uma loja tiver um `plan_tier` configurado (`free`, `starter`, `growth`, `professional`, `enterprise`), O SISTEMA DEVE resolver consistentemente os módulos inclusos, limites de colaboradores (`maxStaffUsers`) e limites de instâncias WhatsApp (`maxWhatsAppInstances`) em `src/lib/architecture/module-plan-governance.ts`, corrigindo a exibição de `enterprise` (`999` => `"Ilimitados"`) em `src/routes/admin-master.lojas.tsx`.
- **EARS-A2 (Enforcement Real de Limites em Equipe & WhatsApp):**
  SE uma loja atingir o limite `maxStaffUsers` de seu plano ao convidar/adicionar membro em `src/services/admin-team.functions.ts`, OU atingir `maxWhatsAppInstances` ao criar/ativar nova instância em `src/services/whatsapp-channel-instances.functions.ts`, O BFF DEVE rejeitar a mutação com erro acionável indicando o plano atual, uso corrente e destino `/workspace/configuracoes/planos`, exceto quando o ator operar sob governança explícita isenta (Admin Master ou loja matriz marcada como Enterprise).
- **EARS-A3 (Consolidação da UI de Planos, Assentos e Faturas no Admin Master):**
  NO PAINEL `/admin-master/modulos` (aba `store_plans`) e `/admin-master/lojas`, O ADMIN MASTER DEVE visualizar por loja: o seletor direto de `plan_tier`, a ocupação real de membros (`membros_ativos / maxStaffUsers`) e instâncias WhatsApp (`instancias / maxWhatsAppInstances`), distinção clara entre módulo `"Incluso no Plano"` (bloqueando remoção ilusória via toggle de add-on) vs `"Add-on"` vs `"Inativo"`, e ação direta `"Emitir Fatura do Ciclo"` que cria cobrança na tabela real `platform_invoices`.
- **EARS-A4 (Paridade de Schema em `billing.functions.ts` & Criação de `/workspace/configuracoes/planos`):**
  O BFF `src/services/billing.functions.ts` DEVE mapear estritamente as colunas reais de `platform_invoices` (`amount_cents`, `description`, `due_date`, `status`, `receipt_url`, `notes`) definidas em `20260810010000_billing_and_ads.sql`. A rota `/workspace/configuracoes/planos` (`src/routes/workspace.configuracoes.planos.tsx`) DEVE ser criada e linkada em `src/lib/workspace-navigation.ts`, exibindo o plano ativo, cotas de equipe/instâncias, módulos habilitados, resumo das faturas (`platform_invoices` + link para `/workspace/financeiro/faturas`) e solicitação de upgrade/envio de comprovante.

**Arquivos autorizados na Microfase A:**
- `src/lib/architecture/module-plan-governance.ts`
- `src/services/store-modules.functions.ts`
- `src/services/admin-team.functions.ts`
- `src/services/whatsapp-channel-instances.functions.ts`
- `src/services/billing.functions.ts`
- `src/services/master.functions.ts` (se necessário estender listagem com contagem de membros/instâncias)
- `src/routes/admin-master.lojas.tsx`
- `src/routes/admin-master.modulos.tsx`
- `src/routes/workspace.configuracoes.planos.tsx` (novo)
- `src/lib/workspace-navigation.ts`
- `src/components/workspace/workspace-shell.tsx` (somente se precisar alinhar RBAC/rota de planos)
- Testes: `src/services/admin-governance-plan-enforcement.test.ts` (novo)

---

### 2.2 Microfase B — Hub de Integrações

- **EARS-B1 (Persistência Visível de Metadados Não-Secretos & Desativação Segura):**
  QUANDO `/workspace/configuracoes/integracoes` carregar as credenciais via `listIntegrationSettings`, O BFF DEVE retornar com segurança os campos não-sensíveis (`public_metadata`: ex. `environment`, `base_url`, `pixel_id`, `measurement_id`, `conversion_id`, `phone_number_id`, `waba_id`, `store_cnpj`, `seller_id`, `cartao_postagem`, `usuario_cws`) sem jamais expor secrets/tokens criptografados, pré-populando `formData` no cliente e permitindo salvar quando o `<Switch>` for desligado (`isActive = false`) mesmo com o formulário recolhido. O `TabsList` DEVE comportar os 9 domínios sem overflow de coluna (`lg:grid-cols-9` ou `flex-wrap`).
- **EARS-B2 (Testes Reais usando Segredo Recém-Digitado OU Segredo Salvo no Cofre):**
  QUANDO o lojista clicar em `"Testar Conexão"` em gateways de pagamento, ERP ou logística sem redigitar o token já salvo no banco, A SERVER FUNCTION DE TESTE DEVE recuperar defensivamente a credencial salva para a loja caso o campo esteja em branco, executando o `fetch` real ou falhando com orientação clara se não houver credencial salva nem digitada.
- **EARS-B3 (Fim de Falso Sucesso no Teste de Marketplaces & Limpeza de IP Legado):**
  EM `src/services/marketplace-hub.functions.ts` (`testMarketplaceConnectorCredentialsFn`), conectores sem endpoint público de verificação remota (ex: iFood sem endpoint de auth testado no handshake atual ou plataformas de feed/API manual) NÃO DEVEM retornar mensagem falsa simulando validação remota aprovada (`success: true` genérico como se tivesse batido na API); devem executar validação real onde suportado (ex: Mercado Livre `/users/me`, Magento/WooCommerce/Nuvemshop onde URL/token permitem probe seguro) ou retornar explicitamente estado estruturado de conferência local de formato/armazenamento (`verifiedRemotely: false` com mensagem honesta). EM `src/routes/admin-master.integracoes.tsx:122`, o rótulo estático `Oracle Cloud · 147.15.61.45:8080` DEVE ser substituído pelo status/host real da instância configurada ou rótulo genérico canônico de gateway.

**Arquivos autorizados na Microfase B:**
- `src/services/integrations.functions.ts`
- `src/services/marketplace-hub.functions.ts`
- `src/routes/workspace.configuracoes.integracoes.tsx`
- `src/routes/admin-master.integracoes.tsx`
- Testes: `src/services/integrations-hub-integrity.test.ts` (novo)

---

### 2.3 Microfase C — WhatsApp Security, Outbox, Audio IA, Tools & Fluxos

- **EARS-C1 (Webhook Fail-Closed Estrito):**
  EM `src/services/whatsapp-provider-webhook.server.ts`, É TERMINANTEMENTE PROIBIDO atribuir `isVerified = true` para `evolution_api` quando `receivedApiKey` e `x-waesy-signature` estiverem ausentes E um `secret` ou `masterApiKey` existir. A verificação de `apikey`/`HMAC` é obrigatória sempre que houver segredo provisionado; quando não houver nenhum segredo provisionado nem variável global, deve exigir flag explícita controlada ou rejeitar com HTTP 401.
- **EARS-C2 (Integridade do Outbox Agendado & Envio de Áudio/Mídia pelo Chat):**
  QUANDO `runWhatsAppOutboxWorker` promover itens de `whatsapp_scheduled_messages`, DEVE resolver o `provider` e `channel_instance_id` da thread/instância ativa da loja (nunca hardcoded `"evolution_api"`) e transicionar o agendamento para `"processing"`/`"queued"`, marcando `"sent"` somente após aceite pelo adapter ou via reconciliação final. QUANDO `sendChatMessage` em `src/services/chat.functions.ts` receber `message_type` diferente de `"text"` (ex: `"audio"`, `"image"`, `"document"`, `"video"` com `attachments[0]`), DEVE enfileirar no `whatsapp_outbox` com o respectivo `message_type` e `payload.media_url` + `voice_note` correspondente.
- **EARS-C3 (Voice AI Real via Pool/BYOK & Zero Stubs Falsos):**
  EM `src/services/whatsapp-voice-ai.functions.ts`, `transcribeWhatsAppAudioMessage` e `generateAiVoiceAudio` DEVEM consultar chaves OpenAI/Groq tanto via `secret_vault` / `api_key_pools` quanto `process.env`, aceitar áudio via `data:` URI ou download HTTP(S) autenticado (com limite de tamanho e timeout seguro), incluir explicitamente `provider` ao inserir na tabela `whatsapp_outbox`, e NUNCA gravar string fictícia de transcrição ou retornar header `OggS` vazio de 24 bytes como se fosse áudio real — falhando com mensagem clara e acionável quando nenhuma chave STT/TTS estiver disponível. Em `workspace.atendimento.index.tsx`, o player de preview (`aiAudioElementRef`) DEVE reiniciar ao gerar novo áudio. Em `chat.functions.ts`, `generateSmartContextualAiReply` DEVE usar o pool/BYOK quando `process.env` não possuir chave.
- **EARS-C4 (PIX EMV Coerente com CRC-16 CCITT & Runtime Real de Fluxos + Ferramentas AI SDR):**
  EM `src/services/whatsapp-ai-agent-tools.server.ts`, `toolCreatePixCharge` DEVE consultar a chave Pix configurada da loja (`stores` / `integration_credentials`) — falhando explicitamente se a loja não tiver chave Pix cadastrada — e montar BR Code EMV válido com comprimentos TLV exatos e checksum **CRC-16/CCITT-FALSE (`0x1021`)**, propagando erros de persistência com registro explícito.
  EM `src/services/whatsapp-automation-runtime.server.ts` e `src/services/whatsapp-outbound-adapters.server.ts`, o runtime DEVE ler `node.config.text` (além de `keyword`/`keywords`/`field`) em `branch_condition`, e executar de ponta a ponta os nós `send_buttons`, `send_list`, `ai_sdr_reply` (conectando as tools `toolCheckInventory`, `toolCreatePixCharge`, `toolGetOrderStatus`, `toolHandoffToHuman`), além de reconhecer os blocos Concierge configurados na loja. Em `src/routes/workspace.whatsapp.automacoes.tsx`, remover ícone proibido `Sparkles` (`DESIGN.md C.21`) e badge estático `"Ativo no Canal"`, exibindo o status real da instância WhatsApp ativa.

**Arquivos autorizados na Microfase C:**
- `src/services/whatsapp-provider-webhook.server.ts`
- `src/services/whatsapp-outbox.worker.ts`
- `src/services/whatsapp-outbound-adapters.server.ts`
- `src/services/whatsapp-voice-ai.functions.ts`
- `src/services/whatsapp-ai-agent-tools.server.ts`
- `src/services/whatsapp-automation-runtime.server.ts`
- `src/services/chat.functions.ts`
- `src/routes/workspace.atendimento.index.tsx`
- `src/routes/workspace.whatsapp.automacoes.tsx`
- Testes: `src/services/whatsapp-provider-webhook.test.ts`, `src/services/whatsapp-outbound-adapters.test.ts`, `src/services/whatsapp-e2e-hardening.test.ts` (novo)

---

### 2.4 Microfase D — Copilot WorkBench (Estabilidade Worker, Hierarquia Pastas/Projetos/Conversas, RAG & Design 4.0)

- **EARS-D1 (Orçamento Rígido de Subrequests Cloudflare Workers & Proteção de Persistência):**
  EM `src/services/api-orchestrator.functions.ts` e `src/services/ai-core-gateway.functions.ts`, uma invocação única de `executeAiCoreGateway` NÃO DEVE repetir consultas `claim_healthy_api_keys_for_provider` + `SELECT api_key_pools` + `secret_vault` para todos os candidatos antes de filtrar provedores ou em retries excessivos:
  - Carregar as chaves elegíveis do pool em **1 única consulta em lote (`getBatchActiveKeysForProviders`)** para os provedores candidatos da rota (além do cache curto em memória por processo);
  - Limitar tentativas externas (`maxHttpAttempts` por invocação de Worker <= 8 e max keys por provedor <= 2), abortando a cascata com resposta degradada antes de estourar o limite de 50 subrequests do runtime Cloudflare Workers, garantindo reserva de subrequests para `persist_ai_conversation_exchange_atomic` em `src/services/ai-conversations.functions.ts`.
- **EARS-D2 (Hierarquia Pastas -> Projetos -> Conversas & Base de Conhecimento RAG):**
  Implementar as entregas pendentes da `SPEC-20261112-COPILOT-WORKBENCH-MANUS-PARITY-PROJECT-HIERARCHY.md`:
  - Criar `supabase/migrations/20270401000000_copilot_folders_projects_knowledge_base.sql` com `copilot_folders`, `copilot_projects`, `copilot_project_files`, `copilot_project_embeddings`, vínculo opcional `project_id`/`folder_id` em `ai_threads` e `ai_tasks`, e políticas RLS multi-tenant estritas. *(Nota B.31: não aplicar remotamente sem confirmação do usuário.)*
  - Criar `src/services/copilot-projects.functions.ts` para CRUD de Pastas, Projetos, upload/indexação de arquivos de contexto (TXT, Markdown, CSV, JSON, PDF/HTML textual extraído) com chunking semântico + busca contextual por projeto e tolerância defensiva caso a migration remota ainda não tenha sido aplicada.
  - Atualizar `src/services/ai-conversations.functions.ts` (`executeAiCopilotPipeline`) para injetar `<PROJECT_KNOWLEDGE_BASE>` quando a conversa estiver vinculada a um Projeto, mantendo compatibilidade integral com os contratos em `ai-conversations-persistence-consistency.test.ts`.
- **EARS-D3 (Dados Reais de Segundo Plano, Telemetria Honesta & Refinamento Design System 4.0):**
  - Remover defaults estáticos e IP legado (`5m 36s`, `14.820 tokens`, `95 créditos (Free Tier Pool)`, `Oracle Cloud VPS · 147.15.61.45`) de `src/components/chat/manus-task-telemetry-sheet.tsx`, passando métricas derivadas das mensagens reais da sessão em `src/routes/workspace.copilot.tsx`.
  - Conectar `CopilotBackgroundTasksDrawer` em `workspace.copilot.tsx` às funções reais `listUserDurableAiTasks` e `cancelDurableAiTask` (`src/services/ai-tasks-durability.functions.ts`), com contador dinâmico (omitido quando `0`).
  - Criar `src/components/chat/copilot-project-knowledge-panel.tsx` e refinar `src/components/chat/ai-chat-shell.tsx` e `src/routes/workspace.copilot.tsx` unificando a barra superior (sem headers duplicados dando aspecto de iframe/widget externo), organizando a Coluna 1 (`Pastas ➔ Projetos ➔ Conversas`), Coluna 2 (Fluxo de leitura centralizado), e Coluna 3 (Arquivos do Projeto / Memória / Artefatos), tudo em tokens semânticos DS 4.0, alvos táteis `h-11 min-h-11` e anéis `:focus-visible`.

**Arquivos autorizados na Microfase D:**
- `src/services/api-orchestrator.functions.ts`
- `src/services/ai-core-gateway.functions.ts`
- `src/services/ai-conversations.functions.ts`
- `supabase/migrations/20270401000000_copilot_folders_projects_knowledge_base.sql` (novo)
- `src/services/copilot-projects.functions.ts` (novo)
- `src/components/chat/copilot-project-knowledge-panel.tsx` (novo)
- `src/components/chat/manus-task-telemetry-sheet.tsx`
- `src/components/chat/ai-chat-shell.tsx`
- `src/routes/workspace.copilot.tsx`
- `docs/specs/SPEC-20261112-COPILOT-WORKBENCH-MANUS-PARITY-PROJECT-HIERARCHY.md` (atualizar tabela de status)
- Testes: `src/services/copilot-projects-and-budget.test.ts` (novo)

---

## 3. Critérios Objetivos de Aceitação & Verificação

1. Testes unitários/regressão novos e existentes reproduzindo cada achado (prova positiva e negativa de autorização/tenant/erro/CRC16/subrequest budget/webhook fail-closed).
2. `npm.cmd run typecheck` retornando Exit Code `0`.
3. `node scripts/design-lint.mjs --ratchet` retornando aprovação sem novas violações P0/P1.
4. `npx.cmd vitest run` completo após a última edição sem falhas ou testes ignorados dentro do escopo.
5. `npm.cmd run build` retornando Exit Code `0`.
6. Registro final em `evidence_ledger_2026-11-12.md` e handoff em `docs/design/DECISIONS.md`.
