# DOCUMENTO 01 — INVENTÁRIO TÉCNICO DO SISTEMA ALL-IN-ONE
**Projeto:** Waesy All-in-One Platform / Excelência Tour  
**Data da Auditoria:** 2026-11-11  
**Comitê Técnico:** Arquiteto Principal de Software, Especialistas em Redes/Oracle, WhatsApp, CRM, Banco de Dados, IA e Segurança  
**Repositório:** `usewaesy`  

---

## 1. Stack Tecnológico & Infraestrutura Real

| Camada | Tecnologia Real | Versão Identificada | Função no Sistema |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React + TanStack Router + Vite | React 19 / TanStack Router 1.161 / Vite 8.2 | SPA reativo com SSR híbrido, roteamento tipado e code-splitting |
| **Estilização & UI System** | Tailwind CSS v4 + Radix UI + Lucide/Phosphor | Tailwind 4.1 / Radix Primitives | Design System com conformidade WCAG 2.2 AA e piso de toque 44px |
| **BFF & Server Functions** | TanStack Start (Nitro Preset `cloudflare-pages`) | Nitro 2.9 / Node ESNext | Camada Backend-for-Frontend executada na edge Cloudflare |
| **Edge Runtime / Hosting** | Cloudflare Pages + Workers | Wrangler 4.136 | Hospedagem global de assets estáticos e execução de server functions |
| **Banco de Dados Principal** | PostgreSQL (Supabase Gerenciado) | PostgreSQL 15+ com RLS e extensões | Persistência relacional, isolamento multi-tenant e ledger imutável |
| **Tempo Real & WebSockets** | Supabase Realtime (Walrus Engine) | Realtime v2 | Mensageria WebSocket baseada em publicações lógicas do Postgres |
| **Storage de Arquivos** | Supabase Storage (S3-compatible) | Buckets com políticas RLS | Documentos, vouchers, contratos e mídias de chat |
| **Gateway WhatsApp Unofficial** | Evolution API (Baileys Engine) | v2.3.7 (Node.js) | Conexão multi-device WhatsApp Web via QR Code em VPS externa |
| **Infraestrutura Gateway** | Oracle Cloud Infrastructure (OCI) / VPS | IP 147.15.61.45 (Porta 8080) | Hospedagem da Evolution API e túnel Cloudflare |
| **Túnel Seguro de Gateway** | Cloudflare Quick Tunnel (`trycloudflare.com`) | Cloudflared Daemon | Encaminhamento HTTPS edge Cloudflare -> VPS Oracle interna |
| **Gateway WhatsApp Oficial** | Meta Cloud API (Graph API) | Graph API v21.0 | Conexão oficial por WABA ID, Access Token e Webhooks Meta |
| **Orquestração de IA** | Portão Único (`ai-core-gateway.functions.ts`) | OpenRouter, Groq, SteelDev, Firecrawl | Execução de LLMs multi-provedor com isolamento e rotação de chaves |
| **Automação & Workers** | Outbox Pattern Serverless (`whatsapp-outbox.worker.ts`) | TypeScript / Node cron | Despacho confiável de mensagens WhatsApp com idempotência e backoff |

---

## 2. Mapa Estrutural do Repositório

```
waesy/
├── src/
│   ├── components/                # Componentes visuais atômicos e compostos
│   │   ├── chat/                  # Hub de Atendimento, Customer 360, QR Connect, Copilot
│   │   ├── commerce/              # Gestão comercial, pedidos, cupons, motolink
│   │   ├── tourism/               # Motores verticais de turismo, hotéis, aéreos e reservas
│   │   ├── workspace/             # Telas de retaguarda operacional multi-tenant
│   │   └── admin/                 # Painel master e governança de integrações
│   ├── routes/                    # Rotas TanStack Router e Endpoints API
│   │   ├── api.webhooks.whatsapp.evolution.$instance.ts  # Webhook Inbound Evolution
│   │   ├── api.webhooks.whatsapp.ts                      # Webhook Inbound Meta Cloud API
│   │   ├── api.webhooks.meta-ads.ts                      # Webhook Inbound Meta Lead Ads
│   │   ├── api.internal.whatsapp-outbox-worker.ts        # Endpoint Cron do Worker
│   │   ├── workspace.atendimento.index.tsx               # Hub Omnichannel / SAC
│   │   ├── workspace.comercial.tsx                       # Kanban Comercial & CRM Leads
│   │   └── workspace.clientes.tsx                        # Carteira 360 de Clientes
│   ├── services/                  # Camada BFF Server Functions
│   │   ├── chat.functions.ts                             # Operações de threads e mensagens
│   │   ├── whatsapp-channel-instances.functions.ts       # Gestão de conexões WhatsApp
│   │   ├── whatsapp-outbox.worker.ts                     # Worker outbox assíncrono
│   │   ├── whatsapp-outbound-adapters.server.ts          # Adaptadores Evolution e Meta
│   │   ├── whatsapp-provider-webhook.server.ts           # Normalizador e processador de webhooks
│   │   ├── crm.functions.ts                              # Carteira, Leads e LTV
│   │   ├── travel-proposal-conversion.functions.ts       # Propostas e orçamentos
│   │   ├── financial-ledger.functions.ts                 # Faturas, boletos e transações
│   │   └── ai-core-gateway.functions.ts                  # Porta única de IA
│   └── lib/                       # Utilitários puros, segurança e clientes
│       ├── supabase.ts            # SSR Client e Browser Client singleton
│       ├── crypto-vault.server.ts # Encriptação de secrets em repouso (AES-256-GCM)
│       └── conversation-crypto.server.ts # Criptografia ponta a ponta por thread
├── supabase/
│   └── migrations/                # 100+ arquivos SQL de migração e RLS
├── docs/                          # SSOTs de arquitetura, design e auditorias
└── scripts/                       # Ferramentas de lint, build e validação de CI
```

---

## 3. Mapeamento de Dependências Externas

1. **Evolution API v2.3.7 na Oracle Cloud:**
   - **Localização:** VPS Oracle Cloud (IP `147.15.61.45:8080`).
   - **Túnel Ativo:** `https://feb-genre-kathy-indicator.trycloudflare.com`.
   - **Autenticação:** Header `apikey: [REDACTED_EVOLUTION_MASTER_KEY]` (exposto anteriormente em fallback de código; requer rotação).
   - **Dependência:** Essencial para conexões WhatsApp via QR Code (Baileys).

2. **Supabase Cloud (PostgreSQL + Realtime + Storage):**
   - **Autenticação:** JWT Bearer (Anon Key para browser, Service Role Key para BFF).
   - **Canal WebSocket:** `wss://[supabase-project].supabase.co/realtime/v1/websocket`.
   - **Dependência:** Fonte Única da Verdade (SSOT) para todos os dados transacionais.

3. **Cloudflare Pages Runtime:**
   - **Execução:** Cloudflare Worker único encapsulado (`dist/_worker.js`).
   - **Compatibilidade:** Node.js Compatibility Flags ativadas para `node:crypto`.

4. **Provedores de IA (OpenRouter, Groq, Google AI):**
   - **Orquestração:** Chaves gerenciadas em `api_keys_pool` no banco de dados.
   - **Túnel de Saída:** HTTPS direto via fetch edge seguro.
