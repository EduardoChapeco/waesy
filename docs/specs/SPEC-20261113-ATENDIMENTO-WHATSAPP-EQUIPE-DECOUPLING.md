# SPEC-20261113-ATENDIMENTO-WHATSAPP-EQUIPE-DECOUPLING

## 1. Objetivo
Executar refatoração end-to-end em 4 camadas (PostgreSQL/RLS, BFF Server Functions/Webhooks/Worker, TanStack Router/Sidebar e UI Minimalista Responsiva) para desacoplar o Chat Full-Page ao vivo (`/workspace/atendimento/chat`) dos submódulos de gestão operacional do pilar Atendimento (`/workspace/atendimento`, `/workspace/atendimento/whatsapp`, `/workspace/atendimento/filas`, `/workspace/atendimento/atendentes`, `/workspace/atendimento/horarios`, `/workspace/whatsapp/automacoes`), corrigir suporte multi-número WhatsApp e exclusão definitiva de canais, integrar vínculos operacionais de setor/WhatsApp no cadastro/perfil de colaboradores (`workspace_members`) e construir BI operacional real.

## 2. Requisitos em Sintaxe EARS

### R1 — Arquitetura de Rotas & Desacoplamento de Shell
- **WHEN** o usuário acessar `/workspace/atendimento/chat` sem `?view=embedded`, o shell `/workspace` **SHALL** ativar modo Full-Page (`isNativeFullPageChatOrCopilot = true`), removendo a sidebar fixa e o padding do container para experiência nativa de inbox.
- **WHEN** o usuário acessar `/workspace/atendimento` (Visão Geral & BI) ou os submódulos `/workspace/atendimento/whatsapp`, `/workspace/atendimento/filas`, `/workspace/atendimento/atendentes`, `/workspace/atendimento/horarios` e `/workspace/whatsapp/automacoes`, o shell `/workspace` **SHALL** exibir normalmente a sidebar lateral e o espaçamento padrão do Workspace.
- **THE SYSTEM SHALL** atualizar `src/lib/workspace-navigation.ts` e `src/components/workspace/workspace-all-tools-dialog.tsx` expondo todos os submódulos de Atendimento sem rotas órfãs no teste `workspace-navigation-pillars.test.ts`.
- **THE SYSTEM SHALL** apontar o atalho lateral de chat do `workspace-shell.tsx` para `/workspace/atendimento/chat`.

### R2 — Integridade de Banco de Dados & RLS (`20270403000000_attendance_whatsapp_team_consolidation.sql`)
- **THE SYSTEM SHALL** atualizar a constraint `CHECK` de `public.whatsapp_channel_instances.status` para incluir `'revoked'` ao lado de `'draft'`, `'pending'`, `'connected'`, `'degraded'`, `'disconnected'`, `'disabled'`, `'error'`.
- **THE SYSTEM SHALL** alterar a FK `public.whatsapp_outbox.channel_instance_id` para `ON DELETE SET NULL`, permitindo exclusão definitiva de instâncias sem violação de integridade histórica.
- **THE SYSTEM SHALL** criar o índice único parcial `uq_whatsapp_active_phone_per_store` em `public.whatsapp_channel_instances (store_id, display_phone_number) WHERE display_phone_number IS NOT NULL AND status IN ('connected', 'pending')` com deduplicação idempotente prévia para linhas legadas em conflito.
- **THE SYSTEM SHALL** estender `public.workspace_members` com as colunas operacionais e de contrato: `department_id`, `default_department_slug`, `whatsapp_instance_id`, `is_attendance_agent`, `attendance_presence`, `max_concurrent_chats`, `can_transfer_chats`, `can_close_chats`, `can_manage_whatsapp_qr`, `only_assigned_or_sector`, `contract_type`, `commission_percent`, `fee_bearer`, `can_view_unmasked_contacts`, `auto_deduct_supplies`, índices compostos por `(store_id, department_id)` e `(store_id, whatsapp_instance_id)` e `FORCE ROW LEVEL SECURITY`.
- **THE SYSTEM SHALL** estender `public.chat_departments` com `routing_mode`, `whatsapp_instance_id`, `schedule_start`, `schedule_end`, `schedule_days`, `away_message`, `auto_greeting_message`, `ai_sdr_enabled`, `ai_sdr_skill_prompt`, `round_robin_enabled`, `assigned_agent_ids` e `ai_triage_stages`, mantendo RLS deny-by-default multi-tenant.

### R3 — Multi-Número WhatsApp, Anti-Colisão & Exclusão Segura
- **WHEN** `connectWhatsAppQrCodeInstance` for acionada com `mode: "create"`, o BFF **SHALL NOT** sobrescrever instância existente por `upsert` em `instance_key`; caso `instance_key` já exista na loja, **SHALL** retornar erro explícito, validar cota via `assertStoreWhatsAppInstanceAvailable` e gerar `webhookUrl` exclusiva por instância usando `externalName`.
- **WHEN** Evolution API reportar `disconnectionReasonCode` / `disconnectionAt`, o detector anti-zombie **SHALL** comparar `disconnectionAt` temporalmente contra `lastConnectedAt` (apenas invalidando quando desconexão for mais recente que a última conexão válida ou estado não estiver autenticado com `ownerJid`).
- **WHEN** `syncWhatsAppInstanceStatus` ou `handleUnofficialWhatsAppWebhook` receberem `ownerJid` com telefone já ativo em outra instância conectada da mesma loja, **SHALL** encerrar a sessão duplicada no gateway, gravar diagnóstico em `last_error_message` / auditoria e recusar duplicidade ativa.
- **THE SYSTEM SHALL** prover `deleteWorkspaceWhatsAppInstance`, `deleteMasterWhatsAppInstance` e `updateWorkspaceWhatsAppInstanceMetadata`, desvinculando `workspace_members.whatsapp_instance_id`, `chat_threads.channel_instance_id` e `whatsapp_outbox.channel_instance_id`, promovendo outra instância conectada caso a excluída fosse `is_default`, registrando `instance.deleted` antes do `DELETE` e tentando logout/delete na Evolution API com timeout defensivo.

### R4 — Roteamento Inteligente, Equipe 100% Persistida & BI Real
- **WHEN** `sendChatMessage` despachar mensagem em conversa WhatsApp sem `thread.channel_instance_id` prévio, **SHALL** resolver em ordem determinística: (1) `workspace_members.whatsapp_instance_id` do atendente logado, (2) instância vinculada ao setor (`chat_departments` / `whatsapp_governance`), (3) instância `is_default` ativa da loja.
- **THE SYSTEM SHALL** atualizar `listTeamMembers`, `inviteTeamMember` e adicionar `updateTeamMemberProfile` + `toggleAgentPresence` em `admin-team.functions.ts` para persistir e editar setor, WhatsApp vinculado, presença, permissões operacionais e regime de contrato.
- **THE SYSTEM SHALL** adicionar `getAttendanceBusinessIntelligence` em `whatsapp-operations-metrics.functions.ts` retornando KPIs, séries diárias, distribuição por canal/setor, ranking real com nome dos atendentes e saúde do outbox/worker sem IDs truncados anônimos.

### R5 — Submódulos Minimalistas & Contrato Visual Waesy
- **THE SYSTEM SHALL** manter no máximo 1 ação primária por tela, cards flat (`border-border/60`), alvos táteis `h-11 min-h-11` no mobile, zero cores literais/classes arbitrárias/`!important`/Containeritis e `px-0 sm:px-4` em wrappers móveis.
- **THE SYSTEM SHALL** adicionar `targetInstanceId?: string | null` e `initialMode?: "create" | "manage"` em `WhatsAppQrConnectModal` sincronizados via `useEffect`.

## 3. Critérios de Aceitação & Verificação
- Suites Vitest positivas e negativas passando após a última edição.
- `npm run check:schema`, `npm run check:bff`, `npm run check:migration-inventory`, `npm run lint:design`, `npm run audit:buttons`, `npm run typecheck` e `npm run build` com Exit Code 0.
