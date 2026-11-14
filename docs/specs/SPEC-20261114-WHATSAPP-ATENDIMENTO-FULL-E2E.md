# SPEC-20261114-WHATSAPP-ATENDIMENTO-FULL-E2E

## 1. Contexto e Objetivo
Refatoracao ponta a ponta do ecossistema de WhatsApp, Atendimento Ao Vivo, Audio/Transcricao com IA, Permissoes Granulares por Funcionario e Canal, Telefones Clicaveis Inteligentes, Economia de Memoria (`new_only` + Incentivo a Intranet + Submodulo Historico) e Gestao Centralizada de Grupos e Canais com Campanha de Transbordo Automatico (`Auto-Overflow`).

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

- **EARS-WA-01 (Permissoes Granulares Funcionario <-> Canal WhatsApp & RBAC):**
  - WHEN um gerente ou administrador configura atendentes ou canais WhatsApp, the system SHALL persistir vinculos individuais na tabela `public.whatsapp_instance_member_permissions` (`can_view`, `can_reply`, `can_manage_qr`, `can_manage_groups`, `can_sync_history`, `only_assigned_or_sector`, `can_transfer`, `can_close`) alem do canal padrao/setor no `workspace_members`.
  - WHEN um funcionario autenticado (`staff`, `agent`, `support`, `sales`) acessa `/workspace/atendimento`, `listWorkspaceWhatsAppInstances`, `listChatThreads` ou `_sendChatMessage`, the system SHALL liberar leitura dos canais permitidos e bloquear acesso ou envio em canais explicitamente negados (`can_view = false` ou `can_reply = false`), mantendo acesso irrestrito para `owner`, `admin`, `manager` e `platform_admin`.

- **EARS-WA-02 (Reproducao Plena de Audio, Gravacao PTT ao Vivo & Transcricao Whisper):**
  - WHEN uma mensagem de audio chega por webhook Evolution API ou pull `findMessages` sem `data:` URI reproduzivel (incluindo URLs expiradas `mmg.whatsapp.net`), the system SHALL hidratar o audio em base64 via Evolution API (`/chat/getBase64FromMediaMessage/{instance}`) utilizando prioritariamente o `channel_instance_id` da conversa, enviando `{ key: { id, remoteJid, fromMe } }` e preservando o MIME real de audio (`audio/ogg; codecs=opus`, `audio/mpeg`, `audio/mp4`, `audio/webm`).
  - WHEN o atendente aciona "Transcrever com IA" (`transcribeWhatsAppAudio`), the system SHALL aceitar cabecalhos base64 com parametros (`data:audio/ogg; codecs=opus;base64,...`), hidratar automaticamente da Evolution API caso `attachments`/`media.url` esteja ausente no registro local, enviar para Groq/OpenAI Whisper com extensao compativel e salvar a transcricao em `payload.transcription`.
  - WHEN o atendente grava audio no navegador via `MediaRecorder` ou usa o Estudio de Voz IA, the system SHALL permitir gravacao nativa PTT e envio em base64 normalizado sem quebra no adaptador Evolution (`/message/sendWhatsAppAudio`, `/message/sendMedia`, `/message/sendSticker`).

- **EARS-WA-03 (Chamada Manual no WhatsApp & Telefones Azuis Clicaveis):**
  - WHEN uma mensagem textual no Atendimento contiver numeros de telefone/celular validos (nacionais ou E.164), the system SHALL destacar o numero como link clicavel azul (`text-primary`), oferecendo acoes contextuais: "Chamar no WhatsApp" (selecionando canal conectado do workspace), "Ligar (`tel:`)" e "Copiar numero".
  - WHEN o atendente clica em "Nova Conversa" no Atendimento ou "Chamar no WhatsApp" em um numero clicavel, the system SHALL executar `startStaffWhatsAppThread` de forma idempotente (criando/reaproveitando contato e thread associada ao canal selecionado) e abrir imediatamente a conversa para atendimento/disparo.

- **EARS-WA-04 (Economia de Memoria por Padrao, Intranet Corporativa & Submodulo Historico):**
  - WHERE um novo canal WhatsApp e conectado, the system SHALL manter `sync_mode = 'new_only'` (`auto_import_history = false`) como padrao para poupar banco e memoria, sincronizando novas conversas a partir da conexao.
  - WHEN a empresa acessa `/workspace/atendimento/whatsapp` ou `/workspace/atendimento`, the system SHALL exibir orientacao objetiva incentivando o uso da Intranet interna para comunicacao entre colaboradores e ofertar painel explicito de **Historico**, registrando jobs em `public.whatsapp_history_sync_jobs` quando a sincronizacao historica manual (`forceImport: true`) for acionada.

- **EARS-WA-05 (Gestao Centralizada de Grupos & Canais e Deteccao de Membros Repetidos):**
  - WHEN o atendente ou gestor acessa `/workspace/atendimento/grupos`, the system SHALL sincronizar e listar grupos e canais conectados nas instancias da loja (`public.whatsapp_groups_directory` e `public.whatsapp_group_members`), listar participantes e detectar automaticamente membros presentes em 2 ou mais grupos da empresa ("Membros Repetidos").
  - WHEN o gestor cria um grupo automatico pelo painel, the system SHALL chamar Evolution API (`/group/create`), promover os administradores configurados (`/group/updateParticipant` -> `promote`), gerar o link de convite (`/group/inviteCode`) e salvar no diretorio local.

- **EARS-WA-06 (Campanhas de Transbordo Automatico & Integracao com Formularios):**
  - WHEN uma empresa cria uma campanha em `/workspace/atendimento/grupos` (`public.whatsapp_group_campaigns` + `public.whatsapp_group_campaign_pools`) e a vincula opcionalmente no Builder de Formularios (`/workspace/marketing/formularios` como destino pos-envio `/g/:slug`), the system SHALL disponibilizar URL publica fixa `/g/$slug` redirecionando para o link ativo do grupo atual sem expor PII interna ou lista de participantes.
  - WHILE a campanha estiver ativa e a ocupacao do grupo corrente atingir ou ultrapassar `overflow_threshold` (limite de capacidade configurado), the system SHALL encerrar o grupo atual no pool, criar automaticamente o Grupo `N+1` via Evolution API na instancia configurada, promover os administradores padrao da empresa, obter o novo link de convite e rotacionar a rota `/g/$slug` sem intervencao manual.

## 3. Arquivos Autorizados para Criacao/Modificacao
- `supabase/migrations/20270415000000_whatsapp_permissions_groups_overflow_history.sql` (novo)
- `src/lib/whatsapp-media-utils.ts` (novo, helpers puros de data-URI/MIME/extensao)
- `src/services/whatsapp-media.server.ts` (novo, hidratacao Evolution server-only)
- `src/services/whatsapp-groups.functions.ts` (novo, BFF de grupos, membros repetidos e transbordo)
- `src/lib/phone-links.ts` (novo, parser seguro de telefones em mensagens)
- `src/components/atendimento/SmartPhoneText.tsx` (novo)
- `src/routes/workspace.atendimento.grupos.tsx` (novo)
- `src/routes/g.$slug.tsx` (novo, rota publica segura sem vazar PII)
- `src/services/whatsapp-atendimento-e2e.test.ts` (novo)
- `src/services/whatsapp-provider-webhook.server.ts` (edit cirurgico)
- `src/services/whatsapp-voice-ai.functions.ts` (edit cirurgico)
- `src/services/whatsapp-outbound-adapters.server.ts` (edit cirurgico)
- `src/services/whatsapp-channel-instances.functions.ts` (edit cirurgico)
- `src/services/chat.functions.ts` (edit cirurgico)
- `src/lib/workspace-navigation.ts` (edit cirurgico)
- `src/components/atendimento/AtendimentoSubmoduleHeader.tsx` (edit cirurgico)
- `src/components/atendimento/AtendimentoChatWorkspace.tsx` (edit cirurgico)
- `src/components/chat/whatsapp-qr-connect-modal.tsx` (edit cirurgico)
- `src/components/chat/whatsapp-team-sectors-drawer.tsx` (edit cirurgico)
- `src/routes/workspace.atendimento.atendentes.tsx` (edit cirurgico)
- `src/routes/workspace.atendimento.whatsapp.tsx` (edit cirurgico)
- `src/routes/workspace.marketing.formularios.tsx` (edit cirurgico)
- `docs/design/DECISIONS.md` (append `DEC-496` e `DEC-497`)

## 4. Criterios de Aceite & Verificacao
- `npm.cmd run check:migration-inventory`, `npm.cmd run check:bff`, `npm.cmd run check:schema`, `npm.cmd run check:tokens` aprovados.
- `node ./node_modules/vitest/vitest.mjs run` nos testes novos e existentes de WhatsApp/Atendimento com 100% pass.
- `node scripts/lint-target.mjs` com `0` violacoes em todos os arquivos UI e rotas tocados.
- `node scripts/audit/audit-interactive-buttons.mjs` aprovado nos arquivos tocados.
- `npm.cmd run typecheck` e `npm.cmd run build` com Exit Code 0.
