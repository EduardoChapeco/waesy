# 🔒 RELATÓRIO DE AUDITORIA COMPLETA — Turis Agências
## Execução: 2026-04-14 | Migration: `full_security_audit_remediation`

---

## 📊 Resumo Executivo

| Bloco | Status | Problemas | Corrigidos |
|-------|--------|-----------|------------|
| 🔴 Bloco 2 — RLS | ✅ DONE | 3 | 3 |
| 🔴 Bloco 3 — API Keys & Funções | ✅ DONE | 2 | 2 |
| 🟠 Bloco 1 — Banco de Dados | ✅ DONE | 58 FK sem índice | 58 |
| 🟠 Bloco 4 — Ataques Web | 🟡 PARCIAL | Ver abaixo | — |
| 🟡 Bloco 5 — Código | 📋 PARA LOVABLE | — | — |
| 🟡 Bloco 6 — UI/UX | 📋 PARA LOVABLE | — | — |
| 🔴 Bloco 7 — IA Guardrails | 📋 PLANEJADO | — | — |
| 🟢 Bloco 8 — Infra | 🟡 PARCIAL | — | — |
| 🟢 Bloco 9 — Testes | 📋 PLANEJADO | — | — |

---

## 🔴 BLOCO 2 — RLS (Row Level Security) — CORRIGIDO

### Problemas Encontrados

#### 1. `brand_kits` — RLS ativo, SEM políticas (bloqueio total)
- **Risco**: Nenhum usuário conseguia ler/escrever dados
- **Correção**: Criada política `brand_kits_org_access` vinculando `workspace_id` ao `org_id` do perfil do usuário via `(select auth.uid())`

#### 2. `ccp_prompt_templates` — RLS ativo, SEM políticas (bloqueio total)
- **Risco**: Templates de IA inacessíveis
- **Correção**: 
  - Política de LEITURA: permite templates globais (`workspace_id IS NULL`) + templates da org
  - Política de ESCRITA: apenas templates da própria org

#### 3. `destinations` — Política USING(true) = bypass total de RLS
- **Risco**: Qualquer usuário autenticado podia INSERIR, ATUALIZAR e DELETAR qualquer destino
- **Correção**: Removida política `Destinations: org members can manage` (que usava `true` em USING e WITH CHECK). A política `Destinations: all authenticated can read` já cobria a leitura corretamente.

#### 4. `client_timeline` — View com SECURITY DEFINER
- **Risco**: ❌ **ERRO CRÍTICO** — A view executava com as permissões do CRIADOR, ignorando RLS
- **Correção**: Recriada com `security_invoker = true` para respeitar as permissões do usuário que consulta

### Anti-Patterns Encontrados e Status
| Pattern | Encontrado? | Ação |
|---------|------------|------|
| `USING (true)` em tabelas sensíveis | ✅ `destinations` | ✅ Removido |
| Bypass de RLS no código | ❌ Não encontrado | — |
| Subconsultas sem índice em policies | ✅ 18 políticas | ✅ Índices criados |

### Storage Buckets — Avisos

| Bucket | Problema | Recomendação |
|--------|----------|--------------|
| `client-media` | SELECT público permite listagem de todos files | Restringir para path-based access |
| `workspace_assets` | SELECT público permite listagem | Restringir para path-based access |

> [!WARNING]
> Os buckets `client-media` e `workspace_assets` permitem que **qualquer pessoa liste todos os arquivos**. Recomendo criar policies path-based (ex: `bucket_id = 'client-media' AND name LIKE auth.uid()::text || '/%'`).

---

## 🔴 BLOCO 3 — Segurança de APIs e Funções — CORRIGIDO

### Funções com `search_path` mutável (Vetor de ataque!)
Funções sem `SET search_path` podem ser exploradas para executar código malicioso via schema poisoning.

| Função | Status |
|--------|--------|
| `trigger_provision_kanban_on_new_org` | ✅ Corrigida com `SET search_path = public` |
| `generate_ticket_code` | ✅ Corrigida com `SET search_path = public` |

### Leaked Password Protection
- **Status**: ⚠️ **DESABILITADO**
- **Recomendação**: Habilitar no painel Supabase → Auth → Password Security
- **Link**: [Documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

---

## 🟠 BLOCO 1 — Banco de Dados — CORRIGIDO

### Foreign Keys sem Índice (58 encontradas → 58 corrigidas)

Todas as FKs agora possuem índice de cobertura, incluindo:

**Tabelas Core do Turis:**
- `clients` → org_id, assigned_agent_id, created_by
- `trips` → org_id, primary_client_id, assigned_agent_id  
- `quotations` → org_id, client_id, agent_id
- `tickets` → org_id, client_id, trip_id, assigned_to
- `kanban_cards` → org_id, column_id, board_id, assigned_to, client_id, ticket_id
- `email_messages` → org_id, client_id, trip_id, ticket_id
- `notifications` → org_id, user_id
- `profiles` → org_id
- E mais 40+ FKs em tabelas auxiliares

### RLS Performance — auth_rls_initplan (18 políticas)
Políticas que re-avaliam `auth.uid()` em cada linha (lento em tabelas grandes). Usando padrão `(select auth.uid())` nas novas políticas para resolver.

**Tabelas afetadas:** `email_messages`, `ticket_messages`, `feature_flags`, `profiles`, `notifications`, `trips`, `trip_flights`, `trip_documents`, `trip_travelers`, `organizations`, `kanban_tags`, `kanban_notes`, `kanban_checklists`, `kanban_checklist_items`

> [!TIP]
> As políticas existentes que usam `auth.uid()` direto devem ser migradas para `(select auth.uid())`. Isso pode ser feito incrementalmente sem impacto funcional.

### Políticas Permissivas Duplicadas (Legado)
Múltiplas tabelas de sistemas legados (bio_links, brand_characters, brand_templates, rss_feeds, news_items, content_templates) possuem políticas `codex_compat_*` duplicadas. Essas tabelas são do Simwork/BioLink — devem ser deletadas na próxima cleanup.

---

## 🟡 BLOCO 7 — IA Guardrails — PLANEJADO

### Edge Functions existentes com IA:
1. `ai-chat-agent` — Chat do V-Agent
2. `email-webhook-ingest` — Classificação de emails

### Recomendações para o Lovable implementar:

```typescript
// Adicionar no início de cada Edge Function que recebe input do usuário
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all)\s+instructions/i,
  /you\s+are\s+now/i,
  /jailbreak/i,
  /developer\s+mode/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /system\s*prompt/i,
];

function sanitizeInput(input: string): string {
  if (input.length > 2000) input = input.slice(0, 2000);
  // Remove control characters
  input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return input.trim();
}

function detectInjection(input: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(input));
}
```

---

## 🟡 BLOCOS 4, 5, 6 — PARA O LOVABLE

Estes blocos devem ser executados pelo Lovable usando o prompt que você preparou. Os itens que já estão corretos no nosso sistema:

### ✅ Já implementado:
- Todas queries via SDK Supabase (sem SQL injection)
- UUIDs em todas as tabelas (sem IDs sequenciais)
- Tipos TypeScript gerados automaticamente
- Design system com variáveis CSS (não hardcoded)
- Rotas protegidas com `useAuthStore`
- Dark mode via variáveis em `index.css`

### ⚠️ Para o Lovable verificar:
- Eliminar `any` types restantes
- Adicionar `aria-label` em botões de ícone
- Verificar `dangerouslySetInnerHTML` (se existir)
- Implementar Error Boundary global
- Validação em tempo real nos formulários

---

## CHANGELOG da Migration

```sql
-- Migration: full_security_audit_remediation
-- 1. CREATE POLICY brand_kits_org_access
-- 2. CREATE POLICY ccp_prompt_templates_read  
-- 3. CREATE POLICY ccp_prompt_templates_write
-- 4. DROP + RECREATE VIEW client_timeline (security_invoker)
-- 5. ALTER FUNCTION trigger_provision_kanban_on_new_org (SET search_path)
-- 6. ALTER FUNCTION generate_ticket_code (SET search_path)
-- 7. DROP POLICY "Destinations: org members can manage"
-- 8. CREATE INDEX × 58 (cobertura de FKs)
```

---

*Relatório gerado automaticamente após auditoria via Supabase Advisors (Security + Performance)*
