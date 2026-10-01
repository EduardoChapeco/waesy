# SEGURANCA.md — Matriz Canônica de Segurança, RLS e Blindagem Multi-Tenant

Este documento define a política de segurança absoluta do Waesy. A segurança é server-side e deny-by-default.

---

## 1. Princípios de Segurança Inegociáveis

1. **Zero-Trust Client**: O cliente (navegador/app) nunca manipula tabelas sensíveis diretamente. Operações com impacto financeiro, estoque ou emissão de documentos são restritas a Server Functions (`src/services/`).
2. **RLS Deny-by-Default**: Toda tabela no esquema `public` possui Row Level Security ativado (`ENABLE ROW LEVEL SECURITY`). Tabelas sem políticas explícitas negam todo e qualquer acesso por padrão.
3. **Isolamento Estrito por Tenant**:
   - Para dados de loja: filtragem compulsória por `store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())`.
   - Para dados organizacionais: vinculação a `organization_id`.
   - O bypass de tenant é severidade P0 com veto imediato de release.
4. **Catraca Anti-Vazamento (G24)**:
   - Nenhum campo interno de margem, custo de aquisição, notas confidenciais de fornecedor ou dados contratuais internos vaza para a vitrine pública ou para consultas WebMCP não autenticadas.
   - A função `assertNoInternalLeaks()` faz a checagem matemática dos payloads públicos.

---

## 2. Matriz de Acesso e Permissões por Camada

| Camada | Mecanismo de Controle | Papéis Autorizados | Proteção contra Falhas |
| :--- | :--- | :--- | :--- |
| **Banco Supabase** | Postgres RLS + Triggers | `authenticated`, `service_role` | Deny-by-default, sem DELETE em ledgers imutáveis. |
| **Camada BFF** | TanStack Server Functions | `requireStoreStaff()`, `requireAdmin()` | Validação de sessão JWT e checagem de perfil no banco. |
| **WebMCP Tools** | Registry Access Tiers | `public`, `store_staff`, `admin_only` | Limitação de taxa (Rate Limit) e checagem de escopo OAuth. |
| **Conteúdo / Vitrine** | Content Sanitizer | `public` (consumidor) | Purgamento automático de atributos com `isInternalOnly: true`. |
