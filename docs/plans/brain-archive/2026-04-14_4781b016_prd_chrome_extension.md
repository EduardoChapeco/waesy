# PRD v2: CloudBlock Extension + Email Intelligence
## WhatsApp Web CRM Bridge + Gmail Automation — Especificação Técnica Completa
**Versão:** 2.0 | **Data:** 14/04/2026

---

## 1. Visão Geral

### 1.1 Escopo da v2 (expandido)

Além do painel lateral no WhatsApp Web, esta versão cobre:

| Módulo | Descrição |
|---|---|
| **WA CRM Bridge** | Painel lateral no WhatsApp Web com ficha do cliente, viagens, tarefas |
| **Email Intelligence** | Gmail integrado: auto-cria tickets a partir de emails de cancelamento/operadora |
| **Ticket Email Coding** | Sistema `[TCKR-XXXX]` para vincular respostas de email a tickets existentes |
| **Operator Page Scraper** | Lê páginas da Orinter/CVC/Flytour e extrai dados para o CRM |
| **Quick Replies** | Templates de mensagem rápida com dados do CRM preenchidos automaticamente |
| **Quotation → WhatsApp** | Upload de orçamento (PDF/imagem) → IA extrai → mensagem WA formatada |
| **Security Vault** | Criptografia AES-256, auditoria de acesso, compliance LGPD |
| **WA Business API Ready** | Abstração de canal para migrar sem refatoração |

---

## 2. Módulo: Email Intelligence

### 2.1 Sistema de Codificação de Tickets

**Conceito:** Todo ticket gerado pelo CloudBlock recebe um código único no formato `[TCKR-{8chars}]`. Este código é incluído automaticamente em:
- Assunto de emails enviados pela plataforma
- Histórico de tickets
- Modelos de resposta para operadoras

Quando um email chega com esse código no assunto ou corpo, o sistema **automaticamente vincula ao ticket** correto.

```
Exemplo de fluxo:

[Agente envia email para GOL]
Assunto: Solicitação de reacomodação - Booking ABC123 [TCKR-A3F9B2C1]

[GOL responde]
Assunto: Re: Solicitação de reacomodação - Booking ABC123 [TCKR-A3F9B2C1]

[Sistema detecta [TCKR-A3F9B2C1] → ticket #234 atualizado automaticamente]
[Agente notificado: "GOL respondeu sobre o ticket #234"]
```

### 2.2 Geração do Código na Tabela `tickets`
```sql
-- Adicionar campo ticket_code à tabela tickets existente
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ticket_code TEXT UNIQUE 
    DEFAULT 'TCKR-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));

-- Index para busca rápida pelo código
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(ticket_code);
```

### 2.3 Auto-Detecção em Emails Recebidos

```typescript
// Edge function: email-ingest/index.ts
// Estratégias de vinculação (em ordem de prioridade):

async function linkEmailToContext(email: ParsedEmail, orgId: string) {
  // 1. Busca código [TCKR-XXXXXXXX] no assunto e corpo
  const ticketCodeMatch = (email.subject + ' ' + email.body_text)
    .match(/\[TCKR-([A-Z0-9]{8})\]/);
    
  if (ticketCodeMatch) {
    const code = `TCKR-${ticketCodeMatch[1]}`;
    const ticket = await db.tickets.findByCode(code, orgId);
    if (ticket) return { ticket_id: ticket.id, method: 'ticket_code' };
  }

  // 2. Busca localizador (PNR) de voo no corpo do email
  // Padrão PNR: 6 caracteres alfanuméricos maiúsculos
  const pnrMatch = email.body_text.match(/\b([A-Z]{2}[A-Z0-9]{4})\b/g);
  if (pnrMatch) {
    for (const pnr of pnrMatch) {
      const flight = await db.trip_flights.findByLocator(pnr, orgId);
      if (flight) return { trip_id: flight.trip_id, client_id: flight.client_id, method: 'pnr' };
    }
  }

  // 3. Busca por email do remetente em clients
  const client = await db.clients.findByEmail(email.from_email, orgId);
  if (client) return { client_id: client.id, method: 'email' };

  // 4. Não vinculado — entra na fila de triagem
  return { method: 'unlinked' };
}
```

### 2.4 Criação Automática de Tickets por Email

```typescript
// Classificação por IA + regras:

const EMAIL_TO_TICKET_RULES = {
  // Palavras-chave no assunto → tipo de ticket
  patterns: [
    { regex: /cancelamento|cancel/i, type: 'cancelamento_voo', priority: 'urgente' },
    { regex: /reacomoda|realoca/i, type: 'realocacao', priority: 'urgente' },
    { regex: /reembolso|refund/i, type: 'reembolso', priority: 'alta' },
    { regex: /atraso|delay/i, type: 'atraso_voo', priority: 'alta' },
    { regex: /confirma|confirm/i, type: 'confirmacao', priority: 'normal' },
    { regex: /modifica|altera/i, type: 'alteracao', priority: 'alta' },
  ]
};
// Se IA ou regex detecta problema urgente: cria ticket automaticamente
// Se apenas informativo: salva como email_message sem criar ticket
```

### 2.5 Accounts de Email a Monitorar

```json
{
  "accounts": [
    { "email": "contato@agencia.com", "label": "Geral", "auto_ticket": true },
    { "email": "cancelamentos@agencia.com", "label": "Cancelamentos", "auto_ticket": true, "priority": "urgente" },
    { "email": "eduardo@agencia.com", "label": "Eduardo (pessoal)", "auto_ticket": false }
  ]
}
```

Configurável em **Settings > Email Intelligence**.

---

## 3. Módulo: Operator Page Scraper

### 3.1 Conceito

Ao entrar em páginas de sistemas de operadoras (Orinter, CVC, Flytour, Zupper, etc.), a extensão detecta a URL e ativa o modo scraping:

```typescript
// background/service-worker.ts
const OPERATOR_URLS = {
  'orinter.com.br': { name: 'Orinter', parser: 'orinter_v1' },
  'cvc.com.br': { name: 'CVC', parser: 'cvc_v1' },
  'flytour.com.br': { name: 'Flytour', parser: 'flytour_v1' },
  'agaxtur.com.br': { name: 'Agaxtur', parser: 'agaxtur_v1' },
  'zupper.com.br': { name: 'Zupper', parser: 'zupper_v1' },
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = new URL(tab.url);
  const operator = Object.keys(OPERATOR_URLS).find(k => url.hostname.includes(k));
  if (operator && changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_OPERATOR', operator });
  }
});
```

### 3.2 O que é extraído das páginas

```typescript
interface OperatorPageData {
  operator_name: string;
  page_type: 'booking' | 'reservation' | 'passenger' | 'voucher';
  
  // Dados da reserva
  locator?: string;           // PNR/Localizador
  booking_ref?: string;       // Referência interna da operadora
  destination?: string;
  check_in?: string;
  check_out?: string;
  hotel_name?: string;
  
  // Passageiros
  passengers?: Array<{
    name: string;
    cpf?: string;
    passport?: string;
  }>;
  
  // Financeiro
  total_price?: number;
  currency?: string;
  
  // Extras
  meal_plan?: string;
  room_type?: string;
}
```

### 3.3 Fluxo pós-extração

1. Dados extraídos → painel lateral abre automaticamente
2. "Encontrei uma reserva — vinculá-la a um cliente?"
3. Busca cliente por PNR no CRM (trip_flights.locator)
4. Se encontra: mostra ficha + opção de atualizar dados
5. Se não encontra: sugere criar nova viagem com dados preenchidos
6. Salva screenshot da página em `trip_documents` (para auditoria)

### 3.4 Aprendizado contínuo

Cada extração bem-sucedida alimenta o modelo local de scraping:
- Sistema aprende variações de layout das operadoras
- Melhora precisão com o tempo
- Compartilhado entre todos os agentes da org (não entre orgs)

---

## 4. Módulo: Quick Replies

### 4.1 Templates pré-definidos

Categoria | Template | Variáveis
|---|---|---|
| Check-in | "Olá {nome}! Seu check-in para {destino} abre {dias} dias!" | nome, destino, dias |
| Cotação | "Olá {nome}, preparei uma cotação especial para {destino}. Acesse: {link}" | nome, destino, link |
| Documentação | "Oi {nome}, para sua viagem precisamos de: {docs_pendentes}" | nome, docs_pendentes |
| Confirmação | "Tudo certo {nome}! Sua viagem para {destino} em {data} está confirmada ✅" | nome, destino, data |
| Cancelamento | "Olá {nome}, recebi sua solicitação de cancelamento. Protocolo: {ticket_code}" | nome, ticket_code |
| Voo cancelado | "⚠️ {nome}, informamos que seu voo {flight} foi cancelado. Estamos trabalhando na reacomodação." | nome, flight |

### 4.2 UI na extensão

```
┌─────────────────────────────┐
│ ⚡ Resposta Rápida          │
│ ─────────────────────────── │
│ Filtro: [Todas ▼]           │
│                             │
│ ✈️ Check-in abre amanhã     │
│ 📋 Cotação disponível       │
│ ⚠️ Voo cancelado            │
│ 📄 Documentação pendente    │
│                             │
│ [Criar novo template]       │
└─────────────────────────────┘
```

Clicar em um template:
1. Preenche variáveis com dados do cliente atual
2. Exibe preview editável
3. Botão "📤 Enviar no WA" → cola no campo de mensagem do WA Web (via `document.execCommand` ou clipboard API)

---

## 5. Módulo: Quotation → WhatsApp

### 5.1 Fluxo completo

```
Agente recebe PDF/imagem do orçamento da operadora
    ↓ (no painel da extensão)
Upload do arquivo
    ↓
Chama API /ext-process-quotation (reutiliza extract-quotation)
    ↓
IA extrai:
  - Destino, hotel, datas
  - Valor total e parcelamentos
  - Políticas de cancelamento
    ↓
Gera texto WA formatado:
  "✈️ *ORÇAMENTO — {DESTINO}*
   📅 Check-in: {data} | Check-out: {data}
   🏨 Hotel: {hotel} ({stars}⭐) — {regime}
   👥 {adultos} adultos
   💰 De R$ {valor_cheio} por *R$ {valor_desconto}*
   ─────────────────────────
   ✅ Inclui: {inclusos}
   ❌ Não inclui: {excluidos}
   📋 Parcelamento: {parcelas}
   ─────────────────────────
   ⏰ Válido até: {validade}
   📌 Ver cotação completa: {link_publico}"
    ↓
Cola no WA Web → agente revisa → envia
    ↓
Cotação automaticamente criada no CRM se não existia
```

### 5.2 Link Público de Cotação

Cada cotação tem uma URL pública: `https://app.cloudblock.com.br/cotacao/{public_token}`
A IA insere automaticamente esse link na mensagem WA.

---

## 6. Segurança e Compliance

### 6.1 Arquitetura de Segurança

```
DADOS ULTRA SENSÍVEIS (Passaportes, CPFs, dados de viagem):
  → Nunca armazenados na extensão local
  → Sempre buscados via API autenticada (em tempo real)
  → Token JWT com expiração de 1h
  → Refresh automático em background

DADOS DE SESSÃO (token de auth):
  → chrome.storage.local com criptografia AES-256
  → Chave derivada de device fingerprint + usuário
  → Invalidado ao deslogar / ao detectar acesso não autorizado

CONVERSAS WA:
  → NUNCA armazenadas sem consentimento explícito do agente
  → Quando autorizadas: enviadas criptografadas (TLS 1.3)
  → Hash para RAG (nunca texto plano em storage externo)
  → Retção: 90 dias (configurável pelo gestor)

AUDITORIA:
  → Log completo: quem acessou qual dado, quando, de onde
  → Alertas de acesso suspeito (novo device, horário incomum)
  → Relatório mensal de acesso para compliance LGPD
```

### 6.2 Tabela de Auditoria
```sql
CREATE TABLE public.ext_access_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  agent_id    UUID REFERENCES public.profiles(id),
  
  action      TEXT NOT NULL,  -- 'view_client' | 'send_message' | 'upload_doc' | 'analyze_convo'
  entity_type TEXT,           -- 'client' | 'ticket' | 'quotation'
  entity_id   UUID,
  
  device_fp   TEXT,           -- fingerprint do dispositivo
  ip_address  TEXT,
  user_agent  TEXT,
  
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- Retenção automática: deleta logs > 1 ano
CREATE INDEX idx_ext_logs_agent ON public.ext_access_logs(agent_id, created_at DESC);
```

### 6.3 Política de Zero-Knowledge para RAG

O banco de memória RAG para IA **nunca** armazena:
- CPFs, passaportes, números de cartão
- Localizadores completos de viagem
- Dados de pagamento

O que armazena:
- Padrões de comportamento (anonimizados)
- Preferências de destino
- Histórico de tópicos de conversa (sem texto bruto)

---

## 7. WhatsApp Business API — Preparação

### 7.1 Abstração de Canal

Todo o código usa uma interface `IMessagingChannel`:
```typescript
interface IMessagingChannel {
  sendMessage(to: string, message: string): Promise<void>;
  sendMedia(to: string, mediaUrl: string, caption?: string): Promise<void>;
  getConversation(phone: string): Promise<Message[]>;
}

// Implementação atual (WA Web DOM):
class WAWebChannel implements IMessagingChannel { ... }

// Futura implementação (WA Business API):
class WABusinessAPIChannel implements IMessagingChannel { ... }

// Para trocar: apenas muda qual classe é instanciada
```

### 7.2 WA Business API (Meta)

**Requisitos para ativar:**
1. Número de telefone da agência verificado pelo Meta
2. Conta Business no Meta Business Suite
3. Aprovação do caso de uso (Travel Agency)
4. Webhook configurado para receber mensagens

**O que muda com a API oficial:**
- Pode receber e enviar sem WA Web estar aberto
- Mensagens de template aprovadas pelo Meta
- Automação completa sem extensão Chrome
- Antecipamos isso na arquitetura desde o início

### 7.3 Bots e Automação com WA API

```
Fase 1 (Agora): Extensão Chrome com DOM scraping
Fase 2 (3 meses): WA Business API + templates aprovados
Fase 3 (6 meses): Bot semi-autônomo:
  "Olá! Sou o assistente virtual da {Agência}.
   Você tem uma consulta sobre sua viagem?
   1️⃣ Status do meu voo
   2️⃣ Documentação necessária  
   3️⃣ Falar com um agente"
Fase 4 (12 meses): Agente IA autonomo que resolve 60% dos atendimentos
```

---

## 8. Linha do Tempo Unificada do Cliente

### 8.1 Conceito

Cada cliente tem uma `timeline` unificada mostrando TODOS os pontos de contato:

```
📅 MARIA SILVA — Timeline de Relacionamento
─────────────────────────────────────────────
📧 14/04 — Email recebido: "Cancelamento de voo GOL" → Ticket #234 criado
💬 13/04 — WA: Conversa sobre Europa 2025 (30min) | Agente: Eduardo
✈️ 10/04 — Viagem "Cancún 2025" confirmada — R$12.500
📋 08/04 — Cotação "Europa 2025" enviada — R$18.000
💬 05/04 — WA: Perguntou sobre passaporte e vacinas
📧 01/04 — Email: Operadora confirmou reserva hotel [TCKR-B7D2]
─────────────────────────────────────────────
```

### 8.2 Schema para Timeline

Não precisamos de uma tabela separada — a timeline é construída via VIEW:

```sql
CREATE OR REPLACE VIEW public.client_timeline AS
SELECT 
  client_id,
  'ticket'     as type, id, title as summary, created_at, NULL::text as agent
FROM public.tickets
UNION ALL
SELECT client_id, 'email', id, subject, received_at, NULL FROM public.email_messages
UNION ALL
SELECT client_id, 'whatsapp', id, ai_summary, started_at, agent_id::text FROM public.wa_conversation_logs
UNION ALL
SELECT primary_client_id, 'trip', id, title, created_at, assigned_agent_id::text FROM public.trips
UNION ALL
SELECT client_id, 'quotation', id, title, created_at, agent_id::text FROM public.quotations
ORDER BY created_at DESC;
```

---

## 9. Casos de Uso de IA/LLM

| Caso de Uso | Input | Modelo Ideal | Output |
|---|---|---|---|
| Extração de cotação PDF | PDF/Imagem | Gemini 1.5 Pro (visão) | JSON estruturado |
| Análise comportamental WA | Texto de conversa | GPT-4o / Claude 3.5 | Perfil + tags |
| Classificação de email | Assunto + corpo | Gemini Flash (rápido) | tipo, prioridade |
| Geração de texto WA | Dados do CRM | Llama 3 / Groq | Texto formatado |
| Scraping de página operadora | HTML da página | Gemini Flash | JSON estruturado |
| Resposta automática (bot) | Mensagem cliente | Claude 3.5 Haiku | Resposta adequada |
| Sumarização de conversa | Histórico WA | Gemini Flash | Resumo + action items |
| Detecção de cancelamento | Email | Gemini Flash | boolean + localizador |

---

## 10. Estrutura de Desenvolvimento

### 10.1 Repositório

Opção A: Monorepo dentro do CloudBlock:
```
plan-fect-harmony/
├── src/                  # App principal
├── extension/            # Chrome Extension
│   ├── manifest.json
│   ├── src/
│   └── vite.config.ts
└── supabase/
    └── functions/
        ├── ext-auth/
        ├── ext-client-lookup/
        ├── ext-create-task/
        ├── ext-ai-analyze/
        ├── ext-process-quotation/
        ├── email-ingest/
        └── email-ticket-linker/
```

Opção B: Repositório separado `cloudblock-extension`

**Recomendação:** Monorepo (Opção A) — facilita compartilhar tipos e funções.

### 10.2 Build System

```json
// extension/package.json
{
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build --mode production", 
    "zip": "node scripts/zip-ext.js"
  }
}
// vite.config.ts: múltiplos entry points:
// - sidepanel/index.html
// - popup/index.html
// - background/service-worker.ts
// - content/index.ts
```
