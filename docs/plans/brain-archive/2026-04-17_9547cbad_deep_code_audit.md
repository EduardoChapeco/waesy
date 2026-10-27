# Turis Agências — Auditoria Profunda de Código (Real vs. Declarado)

> Verificação linha a linha: o código faz o que afirma fazer?

---

## 1. DASHBOARD (Index.tsx) — Análise do Código Real

### ✅ O que funciona de verdade
- `useDashboardStats`: 6 queries paralelas reais ao Supabase (trips, quotations, tickets, clients, departures, financial_transactions). O retorno é consumido corretamente pelo JSX.
- `useFinancialChart`: Query real em `financial_transactions` com agrupamento por mês. Renderiza `AreaChart` via Recharts.
- `useUpcomingTrips`: Query em `trips` filtrada por data (hoje + 7 dias). Funciona.
- `useRecentActivity`: Retorna os 4 últimos tickets.

### 🔴 TEATRO/SIMULAÇÃO DETECTADA — CRÍTICO

**Bloco "Turis AI Agent Real-time Insights" (linhas 229-252):**
```jsx
<p>"Identifiquei uma oportunidade de upselling em 3 cotações para Maldivas..."</p>
<p>Enviar upgrade de categoria de quarto no hotel 'Soneva Fushi' para o cliente Roberto Silva.</p>
```
**Este texto é 100% hardcoded. Não vem da IA, não é RAG, não é análise real.**  
O botão "Ver todas as automações →" navega para nada (nenhum `onClick` definido).

**Bloco financeiro — tendência enganosa (linha 182):**
```jsx
<p>+12.5% em relação ao mês anterior</p>
```
Valor hardcoded — não calculado.

### 🟡 Problemas de Design System
- Componentes `BentoBlock` e `BentoHeader` declarados nas linhas 310-325 mas **nunca usados** na página. O dashboard usa `premium-card` e `bento-grid-premium` diretamente, ignorando esses helpers.

---

## 2. QUOTATIONS (Quotations.tsx + useQuotations.ts)

### ✅ O que funciona de verdade
- `useQuotations`: Query real com filtros opcionais de status e search. `ilike` no campo `destination` funciona.
- `useDeleteQuotation`: Mutation real com invalidação de cache.
- **Extração por IA**: O fluxo completo funciona:
  1. Upload do arquivo para `supabase.storage` bucket `media`
  2. Conversão para base64 no cliente
  3. Invoca edge function `extract-quotation` com `imageBase64 + mimeType`
  4. Edge function faz chamada real à API de IA
  5. Persiste relacional na tabela `quotations` + sub-tabelas `flights`, `itinerary_days`, `quote_transfers`
  6. Retorna `id` para o frontend navegar para o detalhe

### 🔴 BUG REAL: useQuotations sem org_id filter

```typescript
// useQuotations.ts linha 12-15
let query = supabase
  .from('quotations')
  .select('*, clients(name)')
  .order('created_at', { ascending: false });
```

**Falta `.eq('org_id', organization!.id)`!**  
O hook não filtra por organização. A RLS cuida da filtragem, então não há vazamento de dados de outras orgs — mas se o usuário não tem org_id no perfil, a query retorna registros incorretos ou falha silenciosamente.

### 🟡 QuotationAiImportSheet — campos extraídos não editáveis

A tela de revisão (step 'review') exibe os dados extraídos, mas não oferece inputs para editar antes de confirmar. Se a IA errar um campo (data, valor), o usuário não pode corrigir na UI — precisa ir ao detalhe da cotação depois.

---

## 3. SETTINGS (Settings.tsx + useKnowledgeBase.ts)

### ✅ O que funciona de verdade
- Pool de chaves IA: CRUD real em `ai_keys_pool`. Salva, lista, deleta.
- Membros da equipe: Invite, list, update role — todos com mutations reais.
- Kanban boards: CRUD real para colunas.
- Políticas de operadoras: CRUD real em `policy_cache`.

### 🔴 BUG CRÍTICO: Knowledge Base sem embedding

```typescript
// useKnowledgeBase.ts linha 33-39
await supabase.from('ai_knowledge_base').upsert({
  ...payload,
  org_id: organization!.id,
  // Note: embedding is handled by DB triggers or edge functions usually
})
```

**O comentário "handled by DB triggers" é mentira.** Não existe trigger no banco para gerar embeddings. A tabela `ai_knowledge_base` tem uma coluna `embedding vector(768)` mas ela fica `null` em todos os registros inseridos pelo frontend.  

**Consequência prática:** O RAG usa `match_documents()` que filtra por similaridade de vetor. Com `embedding = null`, nenhum documento é encontrado pela busca vetorial — o fallback retorna os primeiros 5 por data, o que é inútil semanticamente.

### 🔴 BUG: Settings → Scroll do KanbanTab só mostra 'sales' e 'departures'

```typescript
// Settings.tsx linha 216
const [boardSlug, setBoardSlug] = useState<'sales' | 'departures'>('sales');
```

Hardcoded com TypeScript union. O board 'tasks' foi adicionado ao banco mas não aparece nas configurações de Kanban.

### 🟡 Webhook "toggle" é decorativo

```jsx
// Settings.tsx linha 422-426
<div className="w-10 h-5 bg-vj-green rounded-full...">
  <div className="absolute right-1 top-0.5 w-4 h-4 bg-white rounded-full..."></div>
</div>
```
O toggle de "Automação de Datalake" é um div estático, não é um `<input type="checkbox">`. Não tem estado, não tem `onClick`. É teatro visual.

---

## 4. AI CHAT (AIChat.tsx + ai-chat-agent edge function)

### ✅ Depois do fix aplicado nesta sessão
- A lógica `getAiConfig` agora é chamada ANTES do bloco RAG.
- Embedding gerado com Gemini quando disponível.
- Match documents com `match_documents()` RPC quando há embedding.
- Fallback por texto quando sem embedding.

### 🟡 Problema: Histórico de conversas não persiste

O `conversation_history` é state local em `AIChat.tsx`. Ao fechar/recarregar, perdido. Nenhuma tabela de histórico de sessão é usada (`wa_conversation_logs` existe mas não é chamada pelo frontend).

### 🟡 Problema: maxTokens só 5 mensagens de histórico

```typescript
// AIChat.tsx linha 36
body: { message: input, conversation_history: messages.slice(-5) }
```
O histórico enviado é sempre as últimas 5 mensagens. Na edge function, `conversation_history.slice(-8)` pega 8. Há desincronização.

---

## 5. DESIGN SYSTEM — Conformidade com Bento PRD

### Análise do CSS:

**Tokens definidos no `index.css`:**
```css
--bg: #f7f7f5; --white: #ffffff; --border: #e5e4e0;
--txt: #111110; --txt2: #6b6a66; --txt3: #9b9a96;
--green: #1a7a4a; --orange: #d4511a; --blue: #1a5fa8;
```

**Tokens definidos no `premium-design.css`:**
```css
--premium-shadow --premium-border --glass-bg --vj-green-gradient
```

### 🔴 PROBLEMA: Tokens duplicados e misturados

O código usa misturas de:
- `text-vj-green` (Tailwind CSS var → `hsl(--primary)`)
- `bg-vj-green` (Tailwind)
- `var(--green)` (CSS nativo)
- `color: '#1a7a4a'` (hardcoded)

Isso cria inconsistência visual quando uma dessas fontes muda. Não há single source of truth.

### 🔴 bento-grid-premium vs bento-grid: DOIS SISTEMAS

```css
/* index.css: sistema legado */
.bento-grid { display: grid; gap: 12px; }
.bento-cell { background: var(--white); border: 1px solid var(--border); }

/* premium-design.css: sistema novo */
.bento-grid-premium { display: grid; grid-template-columns: repeat(4, 1fr); }
.premium-card { background: var(--white); border-radius: 24px; }
```

As páginas usam `bento-grid-premium` + `premium-card` (novo), mas alguns componentes isolados ainda usam `.bento-cell` (legado). Há dois sistemas coexistindo com comportamentos ligeiramente diferentes.

### 🟡 `stat-value` usa fonte `Instrument Serif` mas a fonte não é carregada corretamente

```css
/* premium-design.css linha 59 */
.stat-value {
  font-family: 'Instrument Serif', serif;
  font-size: 3.5rem;
}
```

```css
/* index.css linha 1 */
@import url('...family=Instrument+Serif:ital@0;1...');
```

A fonte é importada, mas a `@import` do `premium-design.css` vem **depois** do `@tailwind base` — o que pode causar problemas de precedência em certos bundlers.

---

## 6. HOOK ISSUES FUNCIONAIS

### useQuotations — sem `.eq('org_id')`  
RLS compensa, mas é lazy e perigoso. Se RLS falhar por qualquer razão (service role acidental), retorna TUDO.

### useGroupTrips — NÃO EXISTE YET (hook esperado)
O arquivo `useGroupTrips.ts` referenciado em `GroupTrips.tsx` precisa ser verificado se está implementado com as queries certas para as tabelas que acabaram de ser criadas.

### useSettings — `useKanbanBoardColumns` missing 'tasks' board
Só carrega `sales` e `departures`. O board `tasks` recém-criado não tem UI de edição de colunas.

---

## 7. ANÁLISE FUNCIONAL: O QUE REALMENTE FUNCIONA END-TO-END

| Módulo | Funciona E2E? | Observação |
|---|---|---|
| Dashboard KPIs (6 stats) | ✅ Funcional | AI Insights é hardcoded |
| Extração de cotação por IA | ✅ Funcional Real | Upload → edge fn → DB |
| Chat com IA (RAG) | ✅ Funcional após fix | Embedding só Gemini |
| CRM Clientes | ✅ Funcional | CRUD completo |
| Kanban 3 boards | ✅ Funcional | Cards com drag-n-drop |
| Viagens + Viajantes | ✅ Funcional | Forms completos |
| Roteiro Builder | ✅ Funcional | Editor dia a dia |
| Grupos Terrestres | ⚠️ Precisa verificar hook | Tabelas aplicadas agora |
| Finance (transações) | ✅ Funcional | Queries reais |
| Knowledge Base RAG | ❌ Embedding null | Treino não vetoriza |
| Settings Webhooks toggle | ❌ Simulado | Div estático |
| AI Insights Dashboard | ❌ Simulado | Texto hardcoded |
| Assinatura eletrônica | ❌ Não implementado | Tabela existe |
| Scoring de cotações | ❌ Não implementado | Tabela recém-criada |

---

## 8. AÇÕES CORRETIVAS PRIORITÁRIAS

### P0 (Crítico — Teatro que enganam o usuário):
1. **Dashboard AI Insights** → Substituir texto hardcoded por query real em `quotations` (contar por status, identificar mais urgentes)
2. **Settings Webhook toggle** → Conectar a state real + salvar preferência em `organizations`
3. **Dashboard +12.5%** → Calcular real vs mês anterior

### P1 (High — Funcionalidade quebrada):
4. **Knowledge Base embedding** → Criar edge function `generate-embedding` chamada no `useUpsertKnowledge`
5. **useQuotations org_id filter** → Adicionar `.eq('org_id', organization!.id)` explícito
6. **Settings Kanban → tasks board** → Adicionar board 'tasks' na UI de configuração

### P2 (Medium — UX e design):
7. **QuotationAiImportSheet campos editáveis** → Adicionar formulário de revisão editável no step 'review'
8. **Unificar tokens CSS** → Remover `.bento-cell` legado; padronizar em `premium-card`
9. **Histórico de chat** → Salvar em tabela `chat_sessions` (nova)
