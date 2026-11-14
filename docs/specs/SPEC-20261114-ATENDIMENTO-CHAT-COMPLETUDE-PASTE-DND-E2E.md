# SPEC-20261114-ATENDIMENTO-CHAT-COMPLETUDE-PASTE-DND-E2E

## 1. Contexto e Objetivo
Remediar de ponta a ponta o painel de Atendimento Omnichannel (`/workspace/atendimento/chat`), conectando efetivamente UI, BFF (Server Functions), Storage, Workers WhatsApp e rotas públicas, e implementar o pipeline universal de envio de arquivos por área de transferência (`Ctrl+V`), Drag & Drop na janela da conversa e abertura automática de conversa ao pairar arquivo arrastado sobre a lista lateral.

## 2. Escopo Autorizado
- `src/services/storage.functions.ts`
- `src/lib/upload-helper.ts`
- `src/lib/chat-media-attachment.ts` (novo utilitário puro de classificação de arquivo/MIME e helper de drag-hover)
- `src/services/chat.functions.ts`
- `src/services/whatsapp-channel-instances.functions.ts`
- `src/services/whatsapp-automation-runtime.server.ts`
- `src/services/whatsapp-voice-ai.functions.ts`
- `src/services/whatsapp-outbound-adapters.server.ts`
- `src/components/documents/CommercialBudgetPadSheet.tsx`
- `src/components/chat/customer-360-sidebar.tsx`
- `src/components/chat/ChatQuickComposerModals.tsx`
- `src/components/atendimento/AtendimentoChatWorkspace.tsx`
- `src/services/__tests__/atendimento-chat-e2e-audit.test.ts` (novo teste automatizado)
- `docs/design/DECISIONS.md` (registro de decisão final)

## 3. Requisitos EARS

### R1 — Integridade da Linha do Tempo & Instância / `@lid`
- **WHEN** `getChatMessages` consulta `public.chat_messages`, **THE SYSTEM SHALL** selecionar e inserir exclusivamente colunas existentes na tabela (removendo `metadata` ausente no schema e mantendo metadados dentro de `payload`), projetando `metadata` de forma compatível no DTO retornado.
- **WHEN** `getChatMessages`, `getWhatsAppMediaBase64` ou `syncContactProfileFromWhatsApp` precisam da instância Evolution, **THE SYSTEM SHALL** priorizar `thread.channel_instance_id` antes de recorrer à instância padrão (`is_default`) da loja.
- **WHEN** uma thread WhatsApp usa identificador `@lid` sem telefone E164 resolvido, **THE SYSTEM SHALL** preservar o JID completo `@lid` nas consultas e no envio via outbox (`recipient_phone`) e evitar exibir `+` sintético antes do token numérico na UI.
- **WHEN** mensagens de mídia (`image`, `video`, `audio`, `document`, `sticker`, `gif`) são sincronizadas da Evolution API, **THE SYSTEM SHALL** gravar o `message_type` real correspondente em `chat_messages` e incluir extensão/MIME válidos no `payload.media`.

### R2 — Conexão Real dos Blocos 1 a 4 da Ficha 360 (`Customer360Sidebar`)
- **WHEN** o operador alterna o interruptor de IA na Ficha 360 (`onToggleAiAutoReply`), **THE SYSTEM SHALL** inicializar o estado a partir de `thread.metadata.ai_auto_reply_enabled` e persistir no backend via `updateThreadAiHandoffMode`.
- **WHEN** o operador seleciona um Agente IA Especialista (`tourism_concierge`, `commercial_closer`, `financial_billing`, `sac_triage`, `general_copilot`), **THE SYSTEM SHALL** aplicar o especialista tanto no Copilot quanto no runtime automático de saída (`whatsapp-automation-runtime.server.ts`) e consultar cotações/faturas reais no contexto da IA.
- **WHEN** um dossiê PNR é salvo ou avaliado no onboarding (`getCustomer360Context` e `customer-360-sidebar.tsx`), **THE SYSTEM SHALL** ler `pnr_locator` (snake_case persistido no banco) e disponibilizar edição inline de PNR existente.
- **WHEN** o operador abre modais financeiros ou comerciais (`invoice`, `boleto`, `contract`, `quote`, `image_card`, `InChatStoreCartBanner`, `CommercialBudgetPadSheet`), **THE SYSTEM SHALL** abrir o modal exato solicitado (sem redirecionar para `form`), persistir faturas/orçamentos reais em `commercial_invoices` quando aplicável, gerar PIX EMV BACEN real quando houver chave PIX configurada e utilizar rotas públicas válidas (`/fatura/`, `/proposta/`, `/contrato/`, `/pedido/:token/confirmacao`) sem URLs hardcoded.
- **WHEN** o operador envia um e-mail vinculado (`sendClientLinkedEmail`), **THE SYSTEM SHALL** retornar o provedor e status real de entrega externa (`deliveredExternally`, `deliveryProvider`, `deliveryError`), evitar mascarar falha SMTP/Resend como entrega externa bem-sucedida e despachar a notificação de WhatsApp pelo `_sendChatMessage` quando marcada.

### R3 — Storage Universal & Outbound WhatsApp de Qualquer Arquivo
- **WHEN** um arquivo comum de trabalho (imagem, GIF, PDF, vídeo, áudio `.mp3/.ogg/.wav/.m4a/.opus/.webm/.aac`, planilhas `.xlsx/.xls/.csv`, apresentações `.pptx/.ppt`, documentos `.docx/.doc/.txt/.rtf/.json/.xml`, arquivos `.zip/.rar/.7z`) é enviado para upload no atendimento, **THE SYSTEM SHALL** aceitar o MIME/extensão e retornar URL pública permanente para buckets públicos (`post-media`, `cms-media`, `public_media`).
- **WHEN** um operador envia mídia sem texto digitado ou com legenda opcional, **THE SYSTEM SHALL** permitir o envio via `sendStaffMessageSchema`, propagar `file_name` e `mime_type` e despachar corretamente pelo `whatsapp-outbound-adapters.server.ts` (incluindo `gifPlayback` quando aplicável).

### R4 — Colar (`Ctrl+V`), Arrastar e Soltar na Conversa e Hover na Lista de Conversas
- **WHEN** o operador pressiona `Ctrl+V` na área da conversa ativa com imagem, screenshot, GIF, PDF ou arquivo copiado na área de transferência, **THE SYSTEM SHALL** capturar os arquivos de `clipboardData`, classificá-los, iniciar o upload imediato para o storage e exibi-los em fila de pré-visualização no compositor sem bloquear a colagem normal de texto.
- **WHEN** o operador arrasta um ou mais arquivos externos sobre a área da conversa ativa, **THE SYSTEM SHALL** exibir uma camada visual clara estilo WhatsApp ("Solte o arquivo para enviar para <Nome>") sem cintilação entre nós filhos e, ao soltar, adicionar todos os arquivos identificados na fila de envio pronta para legenda e disparo.
- **WHEN** o operador mantém um arquivo arrastado sobre um item de conversa na lista lateral esquerda por aproximadamente 380ms, **THE SYSTEM SHALL** destacar visualmente o item alvo e alternar automaticamente para essa conversa (`setActiveThreadId`), permitindo continuar o arraste e soltar diretamente dentro da conversa desejada.

## 4. Invariantes e Design Lint
- Zero `!important`, zero cores hardcoded em TSX, zero classes Tailwind com colchetes arbitrários, alvos táteis >= 44px no mobile, anel `:focus-visible:ring-2`, e preservação integral de alterações não relacionadas no repositório.
- Evitar containeritis e acúmulo de padding lateral mobile; usar exclusivamente tokens semânticos de `styles.css`.

## 5. Plano de Verificação
- Testes automatizados em `src/services/__tests__/atendimento-chat-e2e-audit.test.ts` + suíte WhatsApp existente (`whatsapp-rich-media-e2e.test.ts`, `whatsapp-outbound-adapters.test.ts`, `whatsapp-provider-webhook.test.ts`).
- `npm run typecheck` (Exit 0).
- `node scripts/design-lint.mjs --ratchet`.
- `npm run build` (Exit 0).
