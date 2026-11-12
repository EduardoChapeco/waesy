# SPEC-WHATSAPP-RICH-MEDIA-REALTIME-E2E: Blindagem de Mídias Ricas, Stickers e Sincronização Realtime de Tickets

## 1. Contexto e Motivação
A integração WhatsApp / Evolution API reportava mensagens de figurinhas (stickers) como texto genérico `[Mensagem]`, omitia o salvamento de mídias ricas (`attachments`, imagens, áudios PTT, vídeos, documentos) no banco `chat_messages`, e a interface de atendimento no Workspace não possuía renderizadores especializados para mídias ao vivo nem sincronização reativa imediata de tickets reabertos pelo cliente.

## 2. Requisitos em Sintaxe EARS

### 2.1 Detecção e Normalização de Mídia no Webhook (Ubiquitous & Event-Driven)
- **EARS-01:** O sistema DEVE normalizar `stickerMessage`, `imageMessage`, `videoMessage`, `audioMessage` e `documentMessage` desempacotando invólucros Baileys (`ephemeralMessage`, `viewOnceMessage`, `viewOnceMessageV2`, `documentWithCaptionMessage`).
- **EARS-02:** QUANDO o webhook da Evolution API receber uma mensagem com `stickerMessage` ou `item.messageType === "stickerMessage"`, o sistema DEVE classificar `messageType` como `"sticker"`, atribuir texto representativo `"[Figurinha]"` e extrair a mídia (base64, data URI ou URL remota).
- **EARS-03:** QUANDO uma mensagem com imagem, vídeo, áudio ou documento for processada pelo webhook, o sistema DEVE extrair a mídia para o array `attachments` e salvar metadados estruturados no campo `payload.media` (`type`, `url`, `mimetype`, `fileName`, `caption`, `isAnimated`).

### 2.2 Persistência e Integridade de Dados no Supabase (State-Driven)
- **EARS-04:** ENQUANTO uma mensagem com mídia estiver sendo inserida em `chat_messages`, o sistema DEVE persistir a coluna `attachments` (tipo `jsonb`) contendo as URLs ou data URIs válidas.
- **EARS-05:** QUANDO um cliente enviar mensagem em um ticket com status `"closed"` ou `"resolved"`, o sistema DEVE automaticamente transicionar `status` para `"open"`, atualizar `last_message_text`, `last_message_at` e disparar evento via Supabase Realtime.

### 2.3 Recuperação On-Demand de Mídia Remota (Unwanted Behavior / Recovery)
- **EARS-06:** SE uma mensagem com mídia antiga não possuir base64 salvo em `attachments`, o sistema DEVE fornecer endpoint seguro no servidor (`getWhatsAppMediaBase64`) que consulta a Evolution API (`/chat/getBase64FromMediaMessage`) e realiza cache permanente da mídia no banco de dados.

### 2.4 Renderização Visual e Ergonomia no Atendimento (Ubiquitous)
- **EARS-07:** O sistema DEVE renderizar figurinhas/stickers sem a caixa de balão retangular padrão, em imagem transparente flutuante com sombra suave (`size-32 sm:size-36 object-contain`).
- **EARS-08:** O sistema DEVE renderizar imagens com visualizador expandido (lightbox), vídeos com player nativo (`<video controls>`), áudios com player de áudio dedicado (`<audio controls>`), e documentos com cartão de download contendo nome e tamanho do arquivo.
- **EARS-09:** O sistema DEVE atualizar a lista de conversas e a área de mensagens em tempo real via Supabase Realtime sem exigir recarregamento de página (F5) pelo usuário.

### 2.5 Adapter de Envio Outbound (Event-Driven)
- **EARS-10:** QUANDO um operador enviar uma figurinha ou mídia pelo painel, o adapter de saída DEVE aceitar `sticker` no conjunto `MEDIA_TYPES` e encaminhar com sucesso ao gateway da Evolution API.

## 3. Invariantes do Repositório
- Invariante B.4 / B.8: Zero cores arbitrárias fora de token; alvos de toque móveis >= 44px; foco visível em todos os controles interativos.
- Invariante B.7: Toda mutação em código existente via `edit_file` cirúrgico contíguo.
- Invariante B.33: Zero fallbacks sintéticos; mensagens reais de usuários renderizadas de forma honesta.
- Invariante B.9: Zero erros TypeScript (`npm run typecheck`), build de produção aprovado e testes de integração validados.
