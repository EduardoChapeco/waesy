# SPEC-WHATSAPP-VOICE-AI-STUDIO: Transcrição STT, Síntese de Voz com Personas & Ambientes Acústicos e Despacho PTT Nativo

## 1. Contexto e Motivação
O atendimento via WhatsApp exige alta agilidade na compreensão e resposta de mensagens de voz. Atendentes e clientes se beneficiam de:
1. **Transcrição Imediata (STT - Speech to Text):** Áudios recebidos de clientes devem ser transcritos para texto (via Whisper) para leitura rápida sem necessidade de reprodução com fones de ouvido em ambientes movimentados.
2. **Estúdio de Síntese de Voz (TTS - Text to Speech):** Respostas em texto podem ser transformadas em mensagens de voz hiper-realistas com escolha de Persona (Gênero: Mulher/Homem, Idade: Jovem/Adulto/Sênior, Sotaque: Paulista, Carioca, Mineiro, Gaúcho, Nordestino, Neutro) e Ambientes Acústicos (Estúdio limpo, Escritório com ruído de fundo sutil, Ligação telefônica com compressão e filtro passa-banda 300Hz-3400Hz).
3. **Despacho PTT (Push-To-Talk) Nativo:** Áudios enviados chegam no WhatsApp como mensagem de voz nativa (microfone verde e onda sonora no WhatsApp), através do endpoint `/message/sendWhatsAppAudio` com `encoding: true` e `voice_note: true`.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Transcrição de Áudio (STT) Inbound
- **EARS-01:** O sistema DEVE fornecer a server function `transcribeWhatsAppAudioMessage` que recebe `messageId` e `threadId`, extrai o áudio em base64 da mensagem e consulta o motor de transcrição Whisper (Groq `whisper-large-v3` ou OpenAI Whisper).
- **EARS-02:** QUANDO a transcrição for concluída com sucesso, o sistema DEVE persistir o texto transcrito em `chat_messages.payload.transcript`, atualizar o banco e sincronizar a visualização via Supabase Realtime.
- **EARS-03:** A interface do Atendimento DEVE exibir o texto transcrito imediatamente abaixo do player de áudio na bolha da mensagem.

### 2.2 Estúdio de Voz, Personas e Ambientes Acústicos (TTS)
- **EARS-04:** O sistema DEVE fornecer a server function `generateAiVoiceAudio` que recebe `text` e objeto de configuração `persona`:
  - `gender`: `"female"` | `"male"`
  - `age`: `"young"` | `"adult"` | `"senior"`
  - `accent`: `"paulista"` | `"carioca"` | `"mineiro"` | `"gaucho"` | `"nordestino"` | `"neutro"`
  - `environment`: `"studio"` | `"office"` | `"phone_call"`
- **EARS-05:** O sistema DEVE aplicar mapeamento de vozes neurais e pré-processamento prosódico de acordo com o sotaque e idade selecionados.
- **EARS-06:** O sistema DEVE modular os parâmetros acústicos conforme o ambiente:
  - `"studio"`: Áudio de estúdio de alta fidelidade e sem ruído de fundo.
  - `"office"`: Inserção de ruído ambiente sutil de fundo de escritório corporativo.
  - `"phone_call"`: Aplicação de características de compressão e resposta de frequência telefônica (codec PSTN/GSM).

### 2.3 Despacho de Áudio PTT no WhatsApp
- **EARS-07:** QUANDO o atendente acionar o envio de uma nota de voz gerada, o sistema DEVE gravar a mensagem em `chat_messages` com `message_type: "audio"` e despachar na fila `whatsapp_outbox` com `payload.voice_note: true` e `payload.encoding: true`.
- **EARS-08:** O adapter outbound DEVE direcionar para `/message/sendWhatsAppAudio/${instanceName}`, garantindo entrega no WhatsApp com formato de nota de voz gravada.

### 2.4 Ergonomia e Acessibilidade no Atendimento SAC
- **EARS-09:** O diálogo de Estúdio de Voz DEVE conter pré-escuta de áudio com controles nativos acessíveis, alvos de toque móveis >= 44px (`h-11 min-h-11`), foco visível em todos os controles interativos e zero classes com colchetes arbitrários.

---

## 3. Invariantes do Repositório
- Invariante B.4 / B.8: Zero cores arbitrárias fora de token; alvos de toque móveis >= 44px; foco visível em todos os botões e links.
- Invariante B.7: Toda mutação em código existente via `edit_file` cirúrgico contíguo.
- Invariante B.9: Zero erros TypeScript (`npm run typecheck`), build de produção aprovado e testes de integração validados.
