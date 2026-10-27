# Viaja — Auditoria Arquitetural Completa
**Data:** 2026-04-13 | **Auditor:** Antigravity  
**Projeto Supabase:** `xhdoupxnpjbzkzuhucpp` (SWdb)

---

## 🔴 RESULTADO GERAL: SISTEMA NÃO ESTÁ PRONTO PARA PRODUÇÃO

A auditoria identificou **1 falha crítica de nível bloqueador** e **9 problemas de severidade alta/média** que impedem o funcionamento correto do sistema em produção.

---

## PILAR 1 — BANCO DE DADOS: SCHEMA NÃO APLICADO

### 🔴 CRÍTICO #1 — Migrações Viaja NÃO constam no banco de produção

**Severidade:** BLOQUEADOR TOTAL

**O que foi verificado:**
- Listagem de todas as migrations aplicadas ao banco (`supabase_migrations.schema_migrations`)
- Listagem de todas as tabelas no schema `public`

**Resultado chocante:**
As **29 migrations do projeto** (`supabase/migrations/*.sql`) estão nos arquivos locais, mas **ZERO delas foram aplicadas ao banco de produção**. O banco contém apenas migrations de outros módulos do SWdb (Simwork, SimLab, BioLinks, VideoStudio etc.).

**Tabelas Viaja que DEVERIAM existir e NÃO existem:**

| Tabela | Migration | Status |
|---|---|---|
| `quotations` | `20260409195000_mvp_hardening_and_modules.sql` | ❌ AUSENTE |
| `clients` | `20260409195000_...` | ❌ AUSENTE |
| `organizations` | `20260409195000_...` | ❌ AUSENTE |
| `hotels_bank` | `20260409195000_...` | ❌ AUSENTE |
| `destinations` | `20260412230000_viaja_full_schema.sql` | ❌ AUSENTE |
| `flights` | `20260412230000_...` | ❌ AUSENTE |
| `flight_segments` | `20260412230000_...` | ❌ AUSENTE |
| `itinerary_days` | `20260412230000_...` | ❌ AUSENTE |
| `itinerary_items` | `20260412230000_...` | ❌ AUSENTE |
| `quote_hotels` | `20260412230000_...` | ❌ AUSENTE |
| `quote_price_items` | `20260412230000_...` | ❌ AUSENTE |
| `quote_includes` | `20260412230000_...` | ❌ AUSENTE |
| `quote_transfers` | `20260413020000_...` | ❌ AUSENTE |
| `policy_cache` | `20260413030000_...` | ❌ AUSENTE |
| `experiences` | `20260413030000_...` | ❌ AUSENTE |
| `quote_experiences` | `20260413030000_...` | ❌ AUSENTE |
| `kanban_cards` | `20260411050000_...` | ❌ AUSENTE |
| `kanban_columns` | `20260411050000_...` | ❌ AUSENTE |
| `destination_guides` | `20260411054000_...` | ❌ AUSENTE |
| `ai_keys_pool` | `20260409195000_...` | ❌ AUSENTE |
| `guide_pages` | `20260412230000_...` | ❌ AUSENTE |

**Impacto:** Todo o sistema frontend está chamando tabelas que não existem no banco. Toda operação de leitura e escrita falha silenciosamente ou com erro 42P01 (table does not exist).

**Ação corretiva:**
```bash
# No terminal, dentro do projeto
npx supabase db push --project-ref xhdoupxnpjbzkzuhucpp
```
Ou aplicar cada migration manualmente via `apply_migration`.

---

## PILAR 2 — FRONTEND: ANÁLISE PÁGINA POR PÁGINA

### ✅ App.tsx — Roteamento
**Status: CORRETO**
- Todas as rotas das páginas públicas (`/q/:token`, `/f/:token`, `/c/:token`, `/p/guide/:slug`, `/p/info/:slug`) estão registradas.
- Lazy loading implementado corretamente em todos os 28 componentes.
- Guards de autenticação (`ProtectedRoute`, `OnboardingGuard`, `RoleGuard`) bem estruturados.
- Rota `/portal/:org_slug` existe mas sem proteção de org — apenas `ProtectedRoute`.

### ⚠️ ALTA #2 — PublicGuide.tsx: tabela errada consultada

**Severidade:** ALTA

```tsx
// PublicGuide.tsx, linha 35
const { data, error } = await supabase
  .from('destination_guides')  // ❌ TABELA ERRADA
  .select('*')
  .eq('is_published', true);
```

A migration `20260411054000_destination_guides_expansion.sql` cria tabelas para guides, mas o schema do PRD usa `guide_pages` (que referencia `organizations`) e é populado via IA. A tabela `destination_guides` tem schema diferente (usa `city`, `country`, `intro`, `attractions`, `itinerary` como JSONB) enquanto o restante do sistema usa o schema relacional (`places`, `route_stops`, `tips`, `activities`).

**Resultado:** `PublicGuide` funciona com um schema flat/JSONB legado, incompatível com o schema relacional criado em `20260412230000_viaja_full_schema.sql`.

**Ação corretiva:**
- Decidir: manter `destination_guides` (JSONB flat) ou migrar para `guide_pages` + tabelas relacionais?
- Se manter JSONB: remover tabelas relacionais desnecessárias (`places`, `route_stops`, etc.).
- Se migrar para relacional: reescrever `PublicGuide.tsx` para usar o schema correto.

### 🔴 CRÍTICO #3 — PublicGuide.tsx: weather 100% hardcoded

**Severidade:** ALTA (UX/Credibilidade)

```tsx
// PublicGuide.tsx, linhas 602-607
{['Seg','Ter','Qua','Qui','Sex'].map((d, i) => (
  <div key={d} className="vj-wd">
    <div>{['☀️','☀️','⛅','☀️','🌦️'][i]}</div>
    <div>{[28,30,26,31,27][i]}°</div>  // 🔴 HARDCODED: sempre mostra 28-31°C
  </div>
))}
```

Os dados de clima são sempre idênticos independente do destino. Para um destino como Ushuaia (-5°C) ou Noruega, exibirá 28°C. Isso é **erosão de confiança** com o cliente.

**Ação corretiva:** Usar a tabela `weather_data` que já existe no schema, ou chamar a API OpenWeatherMap via edge function, ou simplesmente **ocultar o bloco** até ter dados reais.

### ⚠️ ALTA #4 — PublicQuotation.tsx: excursions sempre vazio

**Severidade:** ALTA

```tsx
// PublicQuotation.tsx, linha 117
excursions: [],  // 🔴 HARDCODED VAZIO
```

A seção "Passeios & Serviços" nunca renderiza porque `quote_experiences` não está sendo consultada no select principal (linha 64-92). A tabela foi criada na migration `20260413030000_...` mas a query não inclui o join.

**Ação corretiva:** Adicionar ao select:
```tsx
quote_experiences(
  id, nome, tipo, fornecedor, data_inicio, data_fim,
  adultos, criancas, valor_total, order_position
),
```
E mapear em `excursions` na linha 117.

### ⚠️ ALTA #5 — extract-quotation: transfers não são persistidos

**Severidade:** ALTA

```typescript
// extract-quotation/index.ts
// Persiste voos ✅ (linha 356-388)
// Persiste itinerário ✅ (linha 336-353)
// Persiste transfers? ❌ AUSENTE
```

A edge function extrai `transfers` no schema JSON (linha 127-144), mas o bloco de persistência (linhas 297-391) **nunca insere em `quote_transfers`**. Os transfers ficam apenas em `ai_raw_response` (JSONB), invisíveis para o frontend que lê a tabela relacional.

**Ação corretiva:** Adicionar bloco de inserção em `quote_transfers` após o bloco dos voos:
```typescript
if (extracted.transfers?.length) {
  for (let ti = 0; ti < extracted.transfers.length; ti++) {
    const tr = extracted.transfers[ti];
    await supabaseClient.from('quote_transfers').insert({
      quote_id: quoteId,
      tipo: tr.tipo || 'round',
      nome: tr.nome,
      fornecedor: tr.fornecedor,
      data_inicio: tr.data_inicio || null,
      data_fim: tr.data_fim || null,
      instrucoes: tr.instrucoes,
      ponto_encontro: tr.ponto_encontro,
      limite_bagagem_kg: tr.limite_bagagem_kg || null,
      adultos: tr.adultos || 1,
      criancas: tr.criancas || 0,
      order_position: ti,
    });
  }
}
```

### ⚠️ MÉDIA #6 — extract-quotation: campos expandidos não persistidos

**Severidade:** MÉDIA

A migration `20260413020000_performance_indexes_and_quote_expansion.sql` adicionou colunas a `quotations`:
- `cancelamento_data_limite`, `cancelamento_valor_multa`, `cancelamento_texto_raw`
- `pax_adultos`, `pax_criancas`, `pax_infantil`, `pax_seniores`
- `id_operadora`, `operadora_nome`, `tarifa_base`, `taxas`, `impostos`

A edge function **extrai esses campos** (linhas 55-82) mas **não os insere no banco** (bloco de insert, linhas 299-330). Eles são descartados em `ai_raw_response`.

**Ação corretiva:** Adicionar ao insert da `quotations`:
```typescript
cancelamento_data_limite: extracted.cancelamento_data_limite || null,
cancelamento_valor_multa: extracted.cancelamento_valor_multa || null,
cancelamento_texto_raw: extracted.cancelamento_texto_raw || null,
pax_adultos: extracted.pax_adultos || 1,
pax_criancas: extracted.pax_criancas || 0,
pax_infantil: extracted.pax_infantil || 0,
pax_seniores: extracted.pax_seniores || 0,
id_operadora: extracted.id_operadora || null,
operadora_nome: extracted.operadora || null,
tarifa_base: extracted.tarifa_base || null,
taxas: extracted.taxas || null,
impostos: extracted.impostos || null,
```

---

## PILAR 3 — SEGURANÇA: RLS

### ⚠️ ALTA #7 — RLS Anon em quotations: política permissiva demais

**Severidade:** ALTA (Segurança)

```sql
-- viaja_full_schema.sql, linha 301-303
CREATE POLICY "Anon quotes valid token" ON public.quotations 
FOR SELECT TO anon 
USING (true);  -- 🔴 Permite ler TODAS as cotações sem validar token
```

O comentário diz "validação acontece na camada de aplicação", mas isso significa que qualquer pessoa pode fazer `SELECT * FROM quotations` via PostgREST e ver todas as cotações de todas as agências sem autenticação.

**Ação corretiva:**
```sql
DROP POLICY "Anon quotes valid token" ON quotations;
CREATE POLICY "Anon quotes valid token" ON public.quotations 
FOR SELECT TO anon 
USING (public_token IS NOT NULL AND valid_until > now());
```
Ou melhor ainda: usar um RPC/function autenticada para validar token:
```sql
USING (public_token = current_setting('request.jwt.claims', true)::json->>'token');
```

### ⚠️ MÉDIA #8 — confirm_public_quotation RPC não verificada

**Severidade:** MÉDIA

A migration `20260412231000_confirm_quote_rpc.sql` provavelmente cria a função `confirm_public_quotation`. O frontend a chama diretamente via `supabase.rpc()` sem JWT (usuário anônimo). Se a função não tiver `SECURITY DEFINER` e `SET search_path = public` corretos, pode ser vulnerável a privilege escalation.

**Ação corretiva:** Verificar a migration `20260412231000_confirm_quote_rpc.sql` e garantir que a função valida `p_token` antes de fazer UPDATE.

---

## PILAR 4 — PERFORMANCE E QUALIDADE

### ⚠️ MÉDIA #9 — QueryClient: staleTime Infinity é agressivo demais

**Severidade:** MÉDIA

```tsx
// App.tsx, linhas 61-67
staleTime: Infinity,           // ❌ Dados NUNCA ficam stale
refetchOnWindowFocus: false,   // ❌ Nunca re-busca ao voltar para a aba
refetchOnReconnect: false,     // ❌ Nunca re-busca ao reconectar
refetchOnMount: false,         // ❌ Nunca re-busca ao montar
```

Com `staleTime: Infinity` e todas as flags de refetch desativadas, o sistema **jamais atualiza dados automaticamente**. Se um agente abre `/quotations`, e outro agente cria uma cotação nova, o primeiro não verá a atualização até forçar refresh manual (F5). Para um CRM multi-agente isso é um problema real.

**Ação corretiva:**
```tsx
staleTime: 2 * 60 * 1000,       // 2 minutos (razoável para CRM)
gcTime: 30 * 60 * 1000,         // mantém em cache por 30min sem uso
retry: 1,
refetchOnWindowFocus: true,     // Re-busca ao voltar para a aba (padrão TanStack)
refetchOnReconnect: true,
refetchOnMount: 'always',       // Garante dados frescos ao navegar
```

### ⚠️ BAIXA #10 — PublicGuide: leitura sem filtro de org

**Severidade:** BAIXA

```tsx
// PublicGuide.tsx, linha 37
const { data, error } = await supabase
  .from('destination_guides')
  .select('*')
  .eq('is_published', true)  // Busca TODOS os guias publicados de TODAS as orgs
```

Sem filtro de org, um guia de uma agência pode aparecer para usuários de outra agência se souberem o slug. Deve filtrar por `org_id` junto com o slug.

---

## RESUMO EXECUTIVO — PRIORIZAÇÃO

| # | Problema | Severidade | Esforço | Bloqueador? |
|---|---|---|---|---|
| 1 | Migrações não aplicadas no banco | 🔴 CRÍTICO | Baixo (1 comando) | ✅ SIM |
| 3 | Weather hardcoded | 🔴 ALTA | Baixo (ocultar bloco) | Não |
| 2 | PublicGuide usa tabela errada | 🔴 ALTA | Médio | Parcial |
| 4 | Excursions sempre vazio | 🟡 ALTA | Baixo | Não |
| 5 | Transfers não persistidos na IA | 🟡 ALTA | Baixo | Não |
| 7 | RLS Anon permissiva | 🟡 ALTA | Baixo | ✅ SEGURANÇA |
| 6 | Campos expandidos não persistidos | 🟡 MÉDIA | Baixo | Não |
| 8 | RPC confirm sem validação auditada | 🟡 MÉDIA | Baixo | Não |
| 9 | QueryClient staleTime=Infinity | 🟢 MÉDIA | Trivial | Não |
| 10 | PublicGuide sem filtro de org | 🟢 BAIXA | Trivial | Não |

---

## PLANO DE REMEDIAÇÃO — 3 FASES

### FASE 1 — DESBLOQUEIO (hoje, ~30 min)
1. **Aplicar todas as migrations** ao banco de produção via `supabase db push`
2. **Corrigir RLS Anon** na tabela `quotations` para validar token
3. **Ocultar bloco de weather** hardcoded no `PublicGuide.tsx`

### FASE 2 — INTEGRIDADE DE DADOS (esta semana, ~3h)
4. **Corrigir edge function** `extract-quotation`:
   - Persistir transfers em `quote_transfers`
   - Persistir campos expandidos (cancelamento, pax, operadora) em `quotations`
5. **Corrigir query** do `PublicQuotation.tsx` para incluir `quote_experiences`
6. **Corrigir QueryClient** staleTime para 2 min

### FASE 3 — ARQUITETURA DO GUIA (próxima sprint, ~1 dia)
7. **Decidir e consolidar schema** do `destination_guides`:
   - Opção A: Manter JSONB flat → remover tabelas relacionais não usadas
   - Opção B: Migrar para relacional → reescrever `PublicGuide.tsx`
8. **Adicionar filtro de org** na query do `PublicGuide.tsx`
9. **Auditar `confirm_public_quotation` RPC** e adicionar validação de token

---

## ASPECTOS POSITIVOS (O QUE ESTÁ BEM)

- ✅ **Design System CSS** (`viaja-public.css`, 1572 linhas): Tokens limpos, tipografia premium, sem hardcoding de cores fora das variáveis CSS. Boa separação de responsabilidades.
- ✅ **`extract-quotation` edge function**: Arquitetura multi-provider com round-robin é sólida. Schema JSON de extração é preciso e alinhado com PRD.
- ✅ **Roteamento `App.tsx`**: Lazy loading correto, guards de autenticação bem estruturados, cobertura de todas as páginas públicas.
- ✅ **`usePoliciesAndExperiences.ts`**: Hook bem estruturado, multi-operador, soft-delete via `is_active`.
- ✅ **`PublicQuotation.tsx`**: Lógica de exibição de urgência (countdown), modal de confirmação, suporte a voos relacionais com segmentos — tudo correto **quando o banco existir**.
- ✅ **Migrações locais**: O schema desenhado é completo, profissional e alinhado com o PRD. O problema é apenas a **falta de push para o banco**.
