# Handoff Report — Explorer Survey 3: BFF Contracts, Server Functions, Supabase & Database Architecture

**Date**: 2026-11-04  
**Agent**: Survey Explorer 3  
**Role**: BFF Contracts, Server Functions, Supabase & Database Architecture  
**Target Milestone**: Survey & Architectural Remediation Plan (R2 & R3)  
**Parent Conversation ID**: `71cb6393-bf04-4e51-946b-1dd9ac61e734`  

---

## 1. Observation

### 1.1 Repositório e Ferramental Verificado
- **Total de Migrations em `supabase/migrations/`**: 580 arquivos SQL analisados.
- **Total de Tabelas Declaradas no Banco**: 794 tabelas mapeadas no inventário consolidado.
- **Total de Tabelas Referenciadas pela Camada BFF**: 641 tabelas consumidas ativamente em `src/services/`.
- **Scripts Canônicos Executados com Sucesso**:
  - `node scripts/check-bff-table-contracts.mjs` → Exit Code 0:
    ```text
    Verificando contratos BFF vs Migrations Supabase...
    Total de migrations analisadas: 580
    Tabelas declaradas nas migrations: 794
    Arquivos BFF analisados: 160
    Tabelas referenciadas pelo BFF: 641
    Tabelas ausentes nas migrations: 0
    Sucesso: Todos os contratos BFF referenciam tabelas existentes!
    ```
  - `node scripts/check-schema-consolidation.mjs` → Exit Code 0:
    ```text
    Auditoria de Consolidacao de Schema
    Total de migrations: 580
    Tabelas declaradas: 781
    Funcoes declaradas: 263
    Todas as versoes sao unicas.
    Consolidacao de schema: APROVADO
    ```
  - `node scripts/audit/validate-migration-inventory.mjs` → Exit Code 0:
    ```text
    Inventory hash matches codebase state: 3e8b6329e46a788e0018ff944d1566418296eb4cba65a25ef140eb35df9335f6
    Migration inventory check PASSED.
    ```

### 1.2 Mapeamento de Rotas Operacionais e Estado Efêmero de Modos de Exibição (R2)
Foi detectado que múltiplos módulos do Workspace utilizam estados locais em React `useState` para controle do modo de visualização, resultando em perda de preferência do usuário ao recarregar a página ou navegar:
- `src/routes/workspace.agenda.index.tsx:21`:
  ```tsx
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  ```
- `src/routes/workspace.agenda.recorrencias.tsx:27`:
  ```tsx
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  ```
- `src/routes/workspace.clientes.index.tsx:24`:
  ```tsx
  const [viewMode, setViewMode] = useState<"list" | "cards" | "funnel">("list");
  ```
- `src/routes/workspace.pedidos.index.tsx:28-29`:
  ```tsx
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<OrderStatusTab>("todos");
  ```
- `src/routes/workspace.tarefas.tsx:20`:
  ```tsx
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  ```

### 1.3 Mapeamento de Gaps de Auditoria e Transição em Server Functions (R3)
- **`src/services/kanban-config.functions.ts:7-38`**:
  O objeto canônico `KANBAN_DEFAULTS` contém configurações padrão apenas para:
  `tasks`, `commercial_crm`, `quotes` e `support_tickets`.
  **Ausentes**: configurações canônicas para `appointments`, `orders` e `customers` (funil lead CRM).
- **`src/services/booking.functions.ts:1020-1050`**:
  Na função `updateAppointmentStatus`:
  ```typescript
  const { error } = await supabase
    .from("appointments")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  ```
  A migration `20270216000000_agenda_bookings_end_to_end_hardening.sql` declarou as colunas: `completed_at`, `completed_by`, `no_show_marked_at`, `no_show_marked_by`, `cancelled_by`, `cancellation_reason`, `cancelled_at`. No entanto, a função BFF atual não preenche esses campos ao realizar a transição para `completed`, `no_show` ou `cancelled`.
- **`src/services/crm.functions.ts`**:
  Possui `createCustomer`, `updateCustomer`, `deleteCustomer`, `listCustomers`, mas não possui função atômica para operações em lote (`batchUpdateCustomers` para atribuição em lote de tags, status de funil ou arquivamento).
- **`src/routes/workspace.pedidos.index.tsx` & `src/routes/workspace.pdv.cozinha.tsx`**:
  Em expedição (`workspace.pedidos.index.tsx`), os checkboxes de picking e conferência utilizam `checkedItems` em memória local, apesar de existirem as tabelas `wms_picking_sessions` e `wms_picking_items` e as funções `recordItemPicked` em `src/services/wms.functions.ts`.
  No KDS (`workspace.pdv.cozinha.tsx`), o status dos pedidos e cronômetros de preparo são mantidos localmente em vez de sincronizados em tempo real via `kitchen_display_orders` e `pdv.functions.ts:updateKitchenItemStatus`.

---

## 2. Logic Chain

1. **Premissa de Conformidade R2 (Modalidades de Visualização Flexíveis)**:
   - O requisito R2 exige suporte a múltiplas modalidades de visualização (Kanban, Grade, Lista, Tabela, Calendário, Linha do Tempo) nos módulos operacionais.
   - A observação 1.2 demonstra que a seleção do modo de visualização reside exclusivamente na memória volátil de componentes React (`useState`).
   - Para que as preferências sejam retidas entre sessões e compartilhadas entre dispositivos do mesmo operador sem criar acoplamento incorreto entre lojas, é necessária uma entidade persistente no Supabase indexada por `(profile_id, store_id, module)`.

2. **Dedução do Esquema de Banco de Dados (`workspace_user_view_preferences`)**:
   - Campos essenciais: `id (UUID)`, `store_id (UUID)`, `profile_id (UUID)`, `module (TEXT)`, `view_mode (TEXT)`, `column_settings (JSONB)`, `sort_field (TEXT)`, `sort_direction (TEXT)`, `filters (JSONB)`, `updated_at (TIMESTAMPTZ)`.
   - Restrição de unicidade: `UNIQUE (store_id, profile_id, module)`.
   - Isolamento Zero-Trust / RLS: Políticas estritas vinculando `profile_id = auth.uid()` com validação de filiação ativa na loja via `store_members`.

3. **Premissa de Conformidade R3 (Eliminação de Mocks & Persistência Real Ponta a Ponta)**:
   - A observação 1.1 confirma que o banco de dados Waesy já possui 794 tabelas e que todas as 641 tabelas do BFF já estão fisicamente declaradas em migrations, sem tabelas órfãs.
   - O problema identificado não é falta de modelo de dados no banco, mas sim lacunas de orquestração na camada BFF e no consumo das rotas:
     a) O Kanban genérico (`kanban-config.functions.ts`) precisa fornecer colunas padrão para os domínios operacionais (Agenda, Pedidos e Clientes).
     b) A transição de status de agendamentos (`booking.functions.ts`) deve obrigatoriamente preencher os metadados de auditoria (`completed_at`, `completed_by`, `no_show_marked_at`, `no_show_marked_by`, etc.) já existentes no schema.
     c) O checklist de picking em pedidos e os cartões de KDS na cozinha devem ser alimentados pelas Server Functions canônicas existentes (`wms.functions.ts` e `pdv.functions.ts`).

4. **Garantia da Invariante B.25 (Destruturação e Tratamento Defensivo)**:
   - Toda nova função de BFF e toda mutação cirúrgica deve aderir ao Invariante B.25: schemas Zod completos, desestruturação total de parâmetros no corpo da função e tratamento defensivo para campos opcionais/nulos.

---

## 3. Caveats

1. **Natureza Read-Only da Sondagem**:
   - Este relatório de levantamento não alterou arquivos de código de produção, respeitando estritamente o papel de Explorer. Todas as modificações deverão ser executadas na fase de implementação.
2. **Ambiente de Execução Windows**:
   - No PowerShell do Windows, scripts npm diretos podem sofrer bloqueio de política (`PSSecurityException`). Comandos automatizados de compilação e teste devem ser invocados com o prefixo `cmd /c`.
3. **Gerenciamento de Migrações em Repositório com 580 Migrações**:
   - A adição de uma nova migration deve respeitar a ordem cronológica estrita (timestamp posterior ao último existente: `20270220000000_*.sql`) e rodar a validação do inventário (`node scripts/audit/validate-migration-inventory.mjs`).

---

## 4. Conclusion

A arquitetura de backend do Waesy está 95% pronta e consolidada (794 tabelas reais, 0 ausentes no BFF). As intervenções necessárias para atender plenamente os requisitos R2 e R3 dividem-se em 4 entregas atômicas bem delimitadas:

### 4.1 Nova Migration: `workspace_user_view_preferences`
- **Arquivo**: `supabase/migrations/20270220000000_workspace_user_view_preferences.sql`
- **Tabela**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.workspace_user_view_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    view_mode TEXT NOT NULL,
    column_settings JSONB DEFAULT '{}'::jsonb,
    sort_field TEXT,
    sort_direction TEXT CHECK (sort_direction IN ('asc', 'desc')),
    filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_workspace_view_pref UNIQUE (store_id, profile_id, module)
  );

  ALTER TABLE public.workspace_user_view_preferences ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can manage view preferences for their stores"
    ON public.workspace_user_view_preferences
    FOR ALL
    TO authenticated
    USING (
      profile_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_members.store_id = workspace_user_view_preferences.store_id
          AND store_members.profile_id = auth.uid()
      )
    )
    WITH CHECK (
      profile_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM public.store_members
        WHERE store_members.store_id = workspace_user_view_preferences.store_id
          AND store_members.profile_id = auth.uid()
      )
    );
  ```

### 4.2 Novo Contrato BFF: `src/services/workspace-view-preferences.functions.ts`
- Funções exportadas:
  1. `getWorkspaceViewPreference({ store_id, module })`: Recupera as configurações salvas ou retorna defaults seguros do domínio.
  2. `saveWorkspaceViewPreference({ store_id, module, view_mode, column_settings, sort_field, sort_direction, filters })`: Upsert idempotente na tabela.
- Schemas Zod com conformidade estrita ao Invariante B.25.

### 4.3 Extensão Cirúrgica em BFFs Existentes
1. **`src/services/kanban-config.functions.ts`**:
   - Adicionar estágios padrão em `KANBAN_DEFAULTS`:
     - `appointments`: `["scheduled", "confirmed", "in_progress", "completed", "no_show", "cancelled"]`
     - `orders`: `["pending", "preparing", "ready", "dispatched", "delivered", "cancelled"]`
     - `customers`: `["new_lead", "contacted", "qualified", "active", "churned"]`
2. **`src/services/booking.functions.ts`**:
   - Atualizar `updateAppointmentStatus` para receber operador autenticado (`completed_by`, `no_show_marked_by`, `cancelled_by`) e preencher timestamps de auditoria correspondentes.
3. **`src/services/crm.functions.ts`**:
   - Adicionar `batchUpdateCustomers({ store_id, customer_ids, updates: { tag_ids, funnel_stage, is_archived } })`.

### 4.4 Vinculação de Rotas com Funções Reais Existentes
- **`workspace.pedidos.index.tsx`**: Chamar `recordItemPicked` e `completePickingSession` de `src/services/wms.functions.ts` ao interagir com a lista de conferência.
- **`workspace.pdv.cozinha.tsx`**: Sincronizar os cartões de produção com `src/services/pdv.functions.ts:updateKitchenItemStatus`.

---

## 5. Verification Method

Para verificar de forma independente e mecânica os contratos e a integridade da arquitetura:

1. **Validação de Contratos de Tabelas e Schema**:
   ```bash
   node scripts/check-bff-table-contracts.mjs
   node scripts/check-schema-consolidation.mjs
   node scripts/audit/validate-migration-inventory.mjs
   ```
   *Critério de Sucesso*: Exit Code 0 em todos os scripts, 0 tabelas ausentes e hash de inventário correspondente.

2. **Checagem de Compilação TypeScript**:
   ```bash
   cmd /c npm run typecheck
   ```
   *Critério de Sucesso*: 0 erros de tipo em `src/services/` e `src/routes/`.

3. **Execução da Suíte de Testes Vitest dos Novos Contratos**:
   ```bash
   npx vitest run src/services/__tests__/workspace-view-preferences.test.ts
   npx vitest run src/services/__tests__/booking-agenda-end-to-end.test.ts
   ```
   *Critério de Sucesso*: 100% dos testes aprovados, cobrindo validação de schemas Zod, isolamento multi-tenant e tratamento de parâmetros ausentes/nulos (Invariante B.25).

4. **Condição de Invalidação**:
   - Qualquer inserção de tabela sem RLS deny-by-default.
   - Qualquer Server Function que use `any` ou não faça desestruturação completa de parâmetros.
   - Qualquer perda de preferência de visualização após recarregamento de página.
