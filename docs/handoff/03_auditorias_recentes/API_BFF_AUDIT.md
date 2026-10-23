# API_BFF_AUDIT.md — Auditoria de Contratos BFF e Server Functions
## Inspeção de Tipagem, Validação Zod, Invariante B.25 e Segurança Multi-Tenant
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Código  

---

### 1. Inventário de Server Functions do Domínio de Turismo

| Arquivo de Serviço | Função Principal | Método HTTP | Validador Zod | Verificação de Tenant / Autenticação | Status Invariante B.25 |
| :--- | :--- | :---: | :---: | :--- | :---: |
| `travel-commercial-intelligence.functions.ts` | `listOpportunityMatchesFn` | GET | `z.object({...})` | `await requireStaff()` / `store_id` | **CONFORME** |
| `travel-commercial-intelligence.functions.ts` | `upsertTravelInterestFn` | POST | `UpsertTravelInterestSchema` | `await requireStaff()` / `store_id` | **CONFORME** |
| `travel-commercial-intelligence.functions.ts` | `promoteOpportunityToCrmLeadFn` | POST | `PromoteOpportunityToCrmLeadSchema` | `await requireStaff()` / `store_id` | **CONFORME** |
| `travel-proposal.functions.ts` | `createTravelProposal` | POST | `createProposalSchema` | `await getServerIdentity()` / `requireStaff()` | **CONFORME** |
| `travel-proposal.functions.ts` | `listAgencyTravelProposals` | GET | `z.object({...})` | `await getServerIdentity()` / `assertStoreAccess` | **CONFORME** |
| `travel-canonical-pipeline.functions.ts` | `ingestTravelDocument` | POST | `IngestTravelDocumentSchema` | `await requireStaff()` / `store_id` | **CONFORME** |
| `travel-contract.functions.ts` | `createTravelContract` | POST | `z.object({...})` | `await requireStaff()` / `store_id` | **CONFORME** |
| `travel-lifecycle.functions.ts` | `convertProposalToTrip` | POST | `z.object({...})` | `await requireStaff()` / `store_id` | **CONFORME** |
| `tourism.functions.ts` | `listAgencyTravelQuotes` | GET | `z.object({...})` | `getServerClient()` com RLS | **CONFORME** |
| `corporate-travel.functions.ts` | `createApprovalRequest` | POST | `createApprovalRequestSchema` | `await getServerIdentity()` / `store_id` | **CONFORME** |

---

### 2. Auditoria da Invariante B.25 (Desestruturação e Tratamento Defensivo)

A **Invariante B.25** do repositório estipula:
> *"Toda função BFF (`*.functions.ts`) que recebe payload tipado via Zod DEVE desestruturar 100% dos parâmetros utilizados no escopo da função ou referenciar o objeto raiz de dados, incluindo tratamento defensivo para valores opcionais/nulos, acompanhada de testes unitários que exercitem branches com parâmetros presentes e ausentes."*

**Achado da Auditoria:**
- Todas as novas Server Functions em `travel-commercial-intelligence.functions.ts` desestruturam diretamente `data: input` ou referenciam `data.campo` com fallbacks defensivos (`data.email?.trim() || null`, `data.destinations || []`).
- Não existem referências cegas a propriedades indefinidas sem proteção opcional (`?.`).
- A suíte de testes `travel-commercial-intelligence.functions.test.ts` exercita payloads mínimos, médios e inválidos, garantindo **100% de cobertura de branches**.
