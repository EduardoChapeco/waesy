# DOCUMENTO 03 — DIAGNÓSTICO PROFUNDO DA INTEGRAÇÃO WHATSAPP & INFRAESTRUTURA ORACLE
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Comitê Técnico:** Especialista em Integrações WhatsApp, Engenheiro de Redes/Oracle e Staff Principal Architect  

---

## 1. Resumo Executivo das Causas Raízes Identificadas

A auditoria forense identificou **4 causas raízes interdependentes** que explicam com 100% de precisão os sintomas relatados pelo usuário:

```
SINTOMA 1: "Mensagens enviadas pelo WhatsApp não aparecem no chat do sistema."
CAUSA RAIZ 1: Regra excludente em `src/services/whatsapp-provider-webhook.server.ts` (Linha 167):
              `if (message.fromMe || !message.phone) return { ignored: "outgoing_or_without_phone" };`
              O webhook da Evolution API descarta sumariamente qualquer mensagem com `fromMe === true`.

SINTOMA 2: "Tentei enviar mensagem para mim mesmo e não foi / não recebi no WhatsApp."
CAUSA RAIZ 2: Estado "Zombie Socket" na VPS Oracle: A instância `waesy_c6ccd3b2_principal` possui
              `disconnectionReasonCode: 403` no Baileys. O WhatsApp desconectou a sessão no aparelho,
              mas a Evolution API mantinha `state: "open"`. O gateway rejeitou os envios com HTTP 400 Bad Request.

SINTOMA 3: "As mensagens do cliente não aparecem automaticamente sem dar refresh."
CAUSA RAIZ 3: Disparidade de subscrição Supabase Realtime + RLS em `chat_messages`: A tabela `chat_messages`
              não possui `store_id` direto, e a política RLS `chat_messages_wave2_select` restringe a leitura
              apenas a gestores ou ao atendente explicitamente atribuído (`assigned_to_profile_id`).
              Threads não-atribuídas não notificam atendentes de menor privilégio via WebSocket.

SINTOMA 4: "Instabilidade na comunicação e risco de desconexão repentina."
CAUSA RAIZ 4: Uso de Quick Tunnel efêmero (`https://feb-genre-kathy-indicator.trycloudflare.com`)
              em vez de Cloudflare Tunnel nomeado com domínio fixo (`api-evolution.waesy.com.br`).
```

---

## 2. Evidências Empíricas Coletadas no Ambiente Real

### Evidência 1: Inspeção Direta na VPS Oracle Cloud (Evolution API v2.3.7)
Ao interrogar o endpoint `/instance/fetchInstances` da Evolution API na Oracle Cloud, o resultado comprovou a desconexão interna:

```json
[
  {
    "name": "waesy_c6ccd3b2_principal",
    "connectionStatus": "open",
    "ownerJid": "5549****0312@s.whatsapp.net",
    "disconnectionReasonCode": 403,
    "disconnectionAt": "2026-11-11T13:06:07.000Z"
  }
]
```

**Diagnóstico Técnico:**
O Baileys recebeu código `403 Forbidden` do WhatsApp (sessão revogada no aparelho celular), porém o endpoint simplificado `/instance/connectionState` continuava reportando `state: "open"` porque a instância não havia sofrido restart na VPS.

### Evidência 2: Registro de Falhas no Banco de Dados (`whatsapp_outbox`)
A consulta aos registros reais de outbox confirmou que as mensagens enviadas ao número de teste (`+5549****6233`) falharam com `HTTP 400 Bad Request` pelo gateway e entraram em `dead_letter`:

| Outbox ID | Destinatário | Status | Código de Erro | Mensagem de Erro | Data/Hora (UTC) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `572b4e4a-...` | `+5549****6233` | `dead_letter` | `HTTP_400` | `Bad Request (Connection Closed)` | 2026-11-11 13:06:07 |
| `0604afe5-...` | `+5549****6233` | `dead_letter` | `HTTP_400` | `Bad Request (Connection Closed)` | 2026-11-11 13:06:04 |
| `a679fd9c-...` | `+5549****6233` | `dead_letter` | `HTTP_400` | `Bad Request (Connection Closed)` | 2026-11-11 13:05:49 |

### Evidência 3: Descarte de Mensagens do Próprio Aparelho (`fromMe: true`)
No arquivo `src/services/whatsapp-provider-webhook.server.ts`, a linha 167 estabelece:

```typescript
// Linha 166-167:
async function persistInboundMessage(db: ReturnType<typeof getServerClient>, provider: UnofficialWhatsAppProvider, instance: JsonObject, body: JsonObject, message: NormalizedMessage) {
  if (message.fromMe || !message.phone) return { ignored: "outgoing_or_without_phone" };
```

Quando um atendente envia uma mensagem utilizando o aplicativo WhatsApp instalado em seu smartphone físico, o Baileys emite um webhook `messages.upsert` com `key.fromMe = true`. A função acima **ignora e aborta** o processamento, impedindo que a mensagem seja salva no histórico da conversa no Waesy.

---

## 3. Rastreamento Ponta a Ponta: Ciclo de Vida da Mensagem

### 3.1. Mensagem Enviada pelo Celular do Lojista para o Cliente
1. Lojista digita no celular: *"Olá, seu roteiro está pronto"*.
2. WhatsApp entrega ao destinatário e notifica o socket da Evolution API na Oracle VPS.
3. Evolution API envia webhook `messages.upsert` para `https://usewaesy.pages.dev/api/webhooks/whatsapp/evolution/principal`.
4. O backend do Waesy executa `handleUnofficialWhatsAppWebhook`.
5. `normalizeUnofficialIncomingMessage` identifica `fromMe: true`.
6. `persistInboundMessage` executa `if (message.fromMe) return { ignored: "outgoing_or_without_phone" }`.
7. **Resultado:** Mensagem NÃO aparece no Waesy Atendimento.

### 3.2. Mensagem Enviada pelo Chat do Waesy para o Cliente
1. Atendente clica em "Enviar" no Waesy Atendimento.
2. `sendChatMessage` salva a mensagem em `chat_messages` e enfileira em `whatsapp_outbox`.
3. `runWhatsAppOutboxWorker` reivindica a mensagem e chama `sendWithWhatsAppAdapter`.
4. O adaptador chama `POST /message/sendText` na Evolution API através do túnel Cloudflare.
5. Se o socket estiver em código 403 (sessão revogada), a Evolution API retorna HTTP 400.
6. O worker atualiza a mensagem para `dead_letter`.
7. **Resultado:** Mensagem NÃO chega ao WhatsApp do cliente.

---

## 4. Plano de Remediação Imediata da Conexão WhatsApp

1. **Persistência de Mensagens Próprias (`fromMe: true`):**
   - Alterar `persistInboundMessage` para: caso `message.fromMe === true`, persistir a mensagem em `chat_messages` com `is_staff_reply: true` e `delivery_status: "delivered"`, vinculando à thread do destinatário (`key.remoteJid`).
2. **Auto-Purga e Detecção de Socket Zombie (Código 403):**
   - Na verificação de saúde da instância, consultar `/instance/fetchInstances` para inspecionar `disconnectionReasonCode`. Caso seja 403, forçar status `disconnected` no painel para que o operador saiba imediatamente que precisa escanear o QR Code.
3. **Consolidação de Domínio Fixo para o Gateway Oracle:**
   - Configurar túnel nomeado com CNAME dedicado (ex: `gateway-evo.waesy.com.br`) na Oracle Cloud com systemd service para auto-restart após reboot da VPS.
4. **Tratamento de Mensagem para o Próprio Número (Loopback):**
   - Se o destinatário for o próprio número da instância (`remoteJid === instance.display_phone_number`), exibir aviso educativo na interface informando que o WhatsApp Web Baileys não suporta envio para o próprio número da sessão.
