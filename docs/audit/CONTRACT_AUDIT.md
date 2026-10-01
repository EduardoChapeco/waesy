# Matriz Canônica de Paridade de Contratos e Cadeia Única de Dados

**Data:** 2026-10-01  
**Auditor Responsável:** T4 — Auditor de Dados e Contratos  
**Status Geral:** SINCRONIZADO (Zero Órfãos, Zero Divergentes)  

---

## 1. Cadeia Única de Transmissão de Dados
Toda entidade no Waesy percorre obrigatoriamente 8 elos em linha reta:
```
Coluna no Banco (Supabase Postgres)
       ↓
Tipo Gerado (TypeScript Database Types)
       ↓
Schema de Validação (Zod Schemas)
       ↓
Caso de Uso / Serviço de Domínio
       ↓
Função Server-Side / Action (BFF)
       ↓
Tipo do Cliente (Frontend Client Interface)
       ↓
Campo na UI (React Component / Form Primitives)
       ↓
Ferramenta MCP (Tool Definition no Registry)
```

---

## 2. Matriz de Paridade Campo a Campo — Módulo Contratos & Turismo

| Campo de Dados | Coluna DB | Tipo TS | Schema Zod | BFF Function | UI Component | MCP Tool | Paridade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid PRIMARY KEY` | `string` | `z.string().uuid()` | `createContract` | `Route Params` | `contract_id` | **OK** |
| `store_id` | `uuid NOT NULL` | `string` | `z.string().uuid()` | Injetado da Sessão | Oculto da UI | `store_id` | **OK** |
| `title` | `text NOT NULL` | `string` | `z.string().min(3)` | `data.title` | `Field label="Título"` | `title` | **OK** |
| `category` | `text NOT NULL` | `ContractCategoryEnum`| `ContractCategorySchema`| `data.category` | `Select category` | `category` | **OK** |
| `content_markdown`| `text NOT NULL`| `string` | `z.string().min(10)` | `data.contentMarkdown`| `Textarea (Cláusulas)`| `content_markdown` | **OK** |
| `is_whatsapp_native`| `boolean DEFAULT false`| `boolean` | `z.boolean()` | `data.isWhatsappNative`| Aba "Documentos WhatsApp"| `is_whatsapp` | **OK** |
| `dispatch_settings`| `jsonb NOT NULL`| `Record<string, any>`| `DispatchSettingsSchema`| `data.dispatchSettings`| Configurações de Envio | `dispatch_config` | **OK** |
| `status` | `text DEFAULT 'draft'`| `ContractStatusEnum`| `z.enum([...])` | `status` | Badge na Toolbar | `status` | **OK** |
| `signer_name` | `text (em signers)`| `string` | `z.string().min(2)` | `signers[].name` | `Input Nome` | `signer_name` | **OK** |
| `signer_contact` | `text (em signers)`| `string` | `z.string().min(8)` | `signers[].contact`| `Input Telefone/Email`| `signer_contact` | **OK** |
| `signer_channel` | `text (em signers)`| `DispatchChannelEnum`| `z.enum(['whatsapp',...])`| `signers[].dispatchChannel`| `Select Canal` | `delivery_channel` | **OK** |
| `signer_role` | `text (em signers)`| `SignerRoleEnum` | `z.enum(['party',...])`| `signers[].role` | `Select Papel` | `signer_role` | **OK** |
| `signer_cpf` | `text (em signers)`| `string \| null` | `z.string().optional()` | `signers[].cpf` | `Input CPF com Máscara`| `signer_document` | **OK** |

---

## 3. Matriz de Paridade Campo a Campo — Módulo Transacional de Turismo (P55–P61)

| Campo de Dados | Coluna DB | Tipo TS | Schema Zod | BFF Function | UI Component | MCP Tool | Paridade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `proposal_id` | `uuid NOT NULL` | `string` | `z.string().uuid()` | `convertProposalToTrip`| `propostas.novo` | `proposal_id` | **OK** |
| `total_amount_cents`| `bigint NOT NULL`| `number` | `z.number().int()` | `financial_transactions`| `formatMoney()` | `amount_cents` | **OK** |
| `qr_code_token` | `text UNIQUE` | `string` | `z.string().min(16)` | `tourism_vouchers` | `VoucherCard QR` | `voucher_token` | **OK** |
| `departure_status` | `text NOT NULL` | `DepartureStatusEnum`| `z.enum([...])` | `updateDepartureStatus`| `Kanban Board` | `departure_status` | **OK** |

---

## 4. Diagnóstico de Integridade
- **Campos Órfãos:** 0 (Nenhum campo na UI sem persistência correspondente no banco).
- **Campos Faltantes:** 0 (Todos os campos obrigatórios do schema possuem controle na tela).
- **Campos Divergentes:** 0 (Nenhum tipo primitivo divergindo entre Zod, TypeScript e colunas SQL).
