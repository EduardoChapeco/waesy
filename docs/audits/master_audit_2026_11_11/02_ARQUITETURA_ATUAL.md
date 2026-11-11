# DOCUMENTO 02 — ARQUITETURA ATUAL E FLUXOS REAIS DE COMUNICAÇÃO
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Comitê Técnico:** Arquiteto Principal de Software e Engenheiros de Sistemas Distribuídos  

---

## 1. Visão Geral da Arquitetura Distribuída

O Waesy opera sob uma arquitetura híbrida Edge-Serverless com Gateway Dedicado em Cloud Externa:

```mermaid
flowchart TD
    subgraph Cliente["Cliente Final & Dispositivos"]
        WA["WhatsApp Mobile / Web"]
        BROWSER["Navegador Atendente (Waesy SAC)"]
    end

    subgraph Oracle["Oracle Cloud Infrastructure (OCI)"]
        EVO["Evolution API v2.3.7 (Baileys Node)"]
        TUNNEL["Cloudflare Tunnel (trycloudflare.com)"]
    end

    subgraph Edge["Cloudflare Pages / Workers (Edge BFF)"]
        HOOK["Webhook Route: /api/webhooks/whatsapp/evolution/$instance"]
        BFF["Server Functions (TanStack Start / Nitro)"]
        OUTBOX_WORKER["Outbox Worker (whatsapp-outbox.worker.ts)"]
    end

    subgraph DataLayer["Supabase Managed Cloud"]
        DB[(PostgreSQL 15+ Transacional)]
        REALTIME["Supabase Realtime (WebSocket / Walrus)"]
        VAULT["Crypto Vault (DEK / KEK)"]
    end

    WA <-->|Protocolo WhatsApp| EVO
    EVO -->|HTTP Webhook| TUNNEL
    TUNNEL -->|HTTPS Edge| HOOK
    HOOK -->|Service Role DB Write| DB
    DB -->|CDC Logical Replication| REALTIME
    REALTIME -.->|WebSocket Broadcast| BROWSER
    BROWSER -->|Mutation POST| BFF
    BFF -->|Insert Pending| DB
    BFF -->|Trigger Worker| OUTBOX_WORKER
    OUTBOX_WORKER -->|HTTPS API Outbound| TUNNEL
    TUNNEL -->|HTTP Message Send| EVO
    EVO -->|Baileys Outbound| WA
```

---

## 2. Fluxo Real de Comunicação: Mensagem Recebida (Inbound)

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (WhatsApp)
    participant Evo as Evolution API (Oracle VPS)
    participant Tunnel as Cloudflare Tunnel
    participant Webhook as BFF Webhook Handler
    participant DB as PostgreSQL (Supabase)
    participant RT as Supabase Realtime (WebSocket)
    actor Atendente as Atendente (Waesy SAC)

    Cliente->>Evo: Envia Mensagem WhatsApp
    Evo->>Tunnel: POST /api/webhooks/whatsapp/evolution/principal
    Tunnel->>Webhook: Encaminha Payload HTTPS
    Note over Webhook: Valida API Key, normaliza número e JID
    alt key.fromMe == true (Enviado pelo celular do lojista)
        Note over Webhook: Linha 167: if (message.fromMe) return IGNORED!
        Webhook-->>Evo: Retorna 200 { ignored: "outgoing_or_without_phone" }
        Note over DB: Mensagem NÃO é persistida! (FALHA DE SINCRONIZAÇÃO)
    else key.fromMe == false (Enviado pelo cliente)
        Webhook->>DB: Resolve Identidade (resolveWhatsAppIdentity)
        Webhook->>DB: Localiza ou Cria chat_threads
        Webhook->>DB: Criptografa texto e grava em chat_messages
        DB->>RT: Evento CDC INSERT na tabela chat_messages
        RT-->>Atendente: Transmite payload via WebSocket
        Atendente->>Atendente: Atualiza lista e balão em tempo real
    end
```

---

## 3. Fluxo Real de Comunicação: Mensagem Enviada pelo Chat (Outbound)

```mermaid
sequenceDiagram
    autonumber
    actor Atendente as Atendente (Waesy SAC)
    participant BFF as sendChatMessage (Server Fn)
    participant DB as PostgreSQL (Supabase)
    participant Worker as Outbox Worker
    participant Tunnel as Cloudflare Tunnel
    participant Evo as Evolution API (Oracle VPS)
    actor Cliente as Cliente (WhatsApp)

    Atendente->>BFF: Digita mensagem e clica Enviar
    BFF->>DB: INSERT em chat_messages (status: pending, is_staff_reply: true)
    BFF->>DB: UPSERT em whatsapp_outbox (status: pending)
    BFF->>Worker: Invoca runWhatsAppOutboxWorker({ batchSize: 5 })
    Worker->>DB: Reivindica mensagens via RPC claim_whatsapp_outbox
    Worker->>Tunnel: POST /message/sendText/waesy_c6ccd3b2_principal
    Tunnel->>Evo: Encaminha requisição à Evolution API
    alt Socket Baileys Ativo (state == open && disconnection == null)
        Evo->>Cliente: Despacha mensagem via WebSocket WhatsApp
        Evo-->>Worker: HTTP 200 { key: { id: "ext-123" } }
        Worker->>DB: Atualiza outbox e chat_messages (status: accepted)
    else Socket Zombie (state == open mas disconnectionReasonCode == 403)
        Evo-->>Worker: HTTP 400 Bad Request / Connection Closed
        Worker->>DB: Registra tentativa falha (status: dead_letter)
        Note over Atendente: Balão na tela continua sem entrega!
    end
```

---

## 4. Pontos Únicos de Falha (SPOF) & Lacunas Estruturais

1. **Dependência de Túnel Efêmero (`trycloudflare.com`):**
   - A URL base do gateway é um Quick Tunnel sem domínio dedicado (`feb-genre-kathy-indicator.trycloudflare.com`). Se o processo `cloudflared` na VPS for reiniciado, a URL muda e o backend perde total comunicação com o WhatsApp.
2. **Descarte Silencioso de Mensagens do Próprio Aparelho (`fromMe: true`):**
   - A regra de descarte no webhook impede que o histórico de mensagens enviadas pelo aplicativo WhatsApp no celular do atendente seja importado para o sistema.
3. **Ausência de Revalidação Real de Socket (Zombie State 403):**
   - A verificação de status confia no endpoint `/instance/connectionState`, que relata `open` mesmo após o WhatsApp ter desconectado a sessão por código 403.
4. **Acoplamento Realtime com Políticas RLS Estritas:**
   - O canal WebSocket de `chat_messages` exige sessão autenticada com vínculo explícito em `workspace_members`. Se o token JWT do atendente expirar ou se a thread for desatribuída, eventos em tempo real deixam de ser entregues silenciosamente.
