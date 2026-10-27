# Plano de Correção — Plataforma Turis (Estabilização & Performance)

Este plano detalha as ações corretivas para os problemas identificados na auditoria de tráfego de rede (HAR) e segurança do Turis OS. O foco principal é otimizar a segurança, corrigir bugs funcionais, eliminar chamadas HTTP redundantes (branding, auth, polling) e preparar a plataforma para escala.

---

## User Review Required

> [!IMPORTANT]
> **Defesa em Profundidade do RLS (Item 2):**
> A análise de tráfego HAR sugeriu vulnerabilidade no RLS. Contudo, nossa auditoria local no arquivo [strict_rbac_isolation.sql](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/supabase/migrations/20260615000019_strict_rbac_isolation.sql) confirmou que a tabela `leads` (e outras como `trips` e `proposals`) possuem políticas ativas e restritivas baseadas na função `public.is_agency_member(auth.uid(), agency_id)`. Mesmo que um atacante manipule o `agency_id` na URL, o PostgREST barará o acesso retornando `[]`. O item é, portanto, um falso positivo do HAR (pois o cabeçalho na URL é normal, mas a validação ocorre no banco).

> [!TIP]
> **Otimização do OCR de Proposta (Item 10):**
> Para evitar trafegar PDFs de 2.7MB em base64 via Edge Functions (o que causa latência de 26s no cliente e estouro de CPU), faremos o upload do arquivo temporariamente para a pasta `ocr_temp` no bucket `proposals_exports_bucket`. A Edge Function de OCR apenas lerá do bucket através do link e depois excluirá o arquivo. Caso haja falhas de permissão no storage, incluiremos um fallback automático no frontend para o envio original em base64.

---

## Proposed Changes

### 🛡️ Banco de Dados (Supabase Migrations)

#### [NEW] [20260900000016_add_unread_count_to_conversations.sql](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/supabase/migrations/20260900000016_add_unread_count_to_conversations.sql)
Criação da coluna `unread_count` e lógica de trigger para contagem em tempo real das mensagens não lidas por conversa.
* Adiciona a coluna `unread_count integer DEFAULT 0 NOT NULL` na tabela `public.conversations`.
* Função de trigger `public.handle_new_message_unread_count()`: Incrementa `unread_count` na tabela `conversations` quando uma nova mensagem com `direction = 'inbound'` é inserida em `messages`.
* Trigger `on_message_inserted_unread_count` na tabela `public.messages`.
* Query de atualização retroativa para recalcular o `unread_count` das conversas existentes com base em mensagens não lidas (`status != 'read'`).

---

### 📬 Inbox & Mensagens

#### [MODIFY] [useUnreadConversations.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/hooks/inbox/useUnreadConversations.ts)
* Remove o `refetchInterval` da query do TanStack Query para eliminar o polling redundante em background (Item 9). A sincronização dependerá agora exclusivamente das notificações em tempo real do canal Realtime do Supabase.

#### [MODIFY] [inbox.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.inbox.tsx)
* **Item 12 (Otimização de Mensagens):** Modifica a query principal de listagem lateral de conversas. O `.select(...)` aninhado trará apenas a última mensagem de cada conversa limitando o retorno a 1, em vez de baixar todo o histórico de mensagens:
  ```typescript
  messages(id, body, direction, status, created_at)
  ```
  ordenando e limitando a 1:
  ```typescript
  .order("created_at", { referencedTable: "messages", ascending: false })
  .limit(1, { referencedTable: "messages" })
  ```
* **Item 4 (Marcar como lido & Sincronizar unread_count):** Adiciona um `useEffect` acionado quando uma conversa (`selectedId`) é aberta:
  1. Zera o `unread_count` na tabela `conversations` para o ID selecionado.
  2. Atualiza o `status` das mensagens `inbound` daquela conversa para `'read'`.
  3. Invalida as chaves do TanStack Query `"conversations"` e `"unread-conversations-count"`.
* **Item 9 (Realtime update):** Na escuta PostgreSQL de mensagens em tempo real (`inbox-realtime-v3`), adiciona a invalidação da query `"unread-conversations-count"` para manter o contador global sempre em sincronia imediata quando uma mensagem chega.

---

### ⚡ Redução de Chamadas HTTP (Caching & Providers)

#### [MODIFY] [__root.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/__root.tsx)
* **Item 6 (`platform_branding` 46x):** Modifica o hook `beforeLoad` da rota raiz para usar um cache singleton global `cachedBrandPromise`. Isso evita que cada transição de rota faça uma nova requisição SQL à tabela de branding, reduzindo para exatamente **1 consulta** na carga inicial do app.

#### [MODIFY] [auth.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/lib/auth.ts)
* **Item 7 (`/auth/v1/user` 14x):** Otimiza o hook `useAuth()` e as requisições de auth. Introduz um cache de sessão na memória que evita chamadas redundantes a `supabase.auth.getUser()` no ciclo de vida de múltiplos componentes montados simultaneamente.

---

### 🧠 Edge Functions & OCR de Proposta

#### [MODIFY] [proposals.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/services/proposals.ts)
* **Item 10 (OCR via Storage):**
  * Antes de invocar a Edge Function `ai-orchestrator`, realiza o upload do arquivo PDF/imagem para a pasta `ocr_temp` no bucket `proposals_exports_bucket`.
  * Passa o `file_path` ("proposals_exports_bucket/ocr_temp/uuid.pdf") no payload para a Edge Function.
  * Mantém fallback automático para envio em base64 (`file_base64`) caso ocorra algum erro no upload (garantindo robustez).

#### [MODIFY] [ai-orchestrator/index.ts](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/supabase/functions/ai-orchestrator/index.ts)
* Modifica a Edge Function para aceitar `file_path`. Se recebido, baixa o arquivo do storage usando a chave de administrador local, converte para base64 e realiza o fluxo de processamento de IA.
* Após a resposta, remove o arquivo do storage temporário para não acumular arquivos inativos.
* **Redução de Preflight OPTIONS:** Adiciona `"Access-Control-Max-Age": "86400"` aos cabeçalhos de CORS (`corsHeaders`), cacheando a requisição preflight OPTIONS no cliente por 24 horas.

---

### 📈 Escalabilidade & Paginação

#### [MODIFY] [crm.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Music/travelagencias/src/routes/agency.$slug.crm.tsx)
* **Item 11 (Paginação do Kanban):** Adiciona limite padrão de carregamento de leads por coluna no Kanban (ex: 20 leads) com suporte a paginação assíncrona ("Ver Mais" ou infinite scroll), prevenindo gargalos de render em agências com alto volume de negociações.

---

## Verification Plan

### Automated Tests
* Rodar o compilador TypeScript para validar contratos:
  ```bash
  powershell -ExecutionPolicy Bypass -Command "npm run typecheck"
  ```
* Validar o empacotamento completo de produção:
  ```bash
  powershell -ExecutionPolicy Bypass -Command "npm run build"
  ```

### Manual Verification
* **Segurança (RLS):** Executar o comando de teste manual no Console do Navegador trocando a agência e validar se o retorno é `[]` (barrado).
* **Marcar como Lido:** Selecionar uma conversa com mensagens não lidas no Inbox e verificar se as mensagens mudam de status no banco para `read` e se o badge de conversas não lidas decrementa instantaneamente.
* **Branding Cache:** Abrir o DevTools (Network), navegar por 5-10 telas e confirmar que ocorre apenas **uma** única requisição de `platform_branding`.
* **OCR de Proposta:** Fazer o upload de uma proposta de viagem e acompanhar o progresso rápido de rede (apenas dados leves de path) e a resposta estruturada correta da IA.
