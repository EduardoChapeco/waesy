# STATE_MANAGEMENT_AUDIT.md — Auditoria de Gestão de Estado
## Server State, Client Form State, Estado Efêmero e Invalidação Reativa
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado e Validado  

---

### 1. Separação Estrita de Níveis de Estado

```mermaid
flowchart TD
    subgraph Server_State [Server State: TanStack Query]
        Q1[useQuery: travel-opportunities]
        Q2[useQuery: travel-interests]
        Q3[useQuery: commercial-contacts]
    end

    subgraph Client_Form_State [Client Form State: React Controlled / Zod]
        F1[NewInterestSheet Form]
        F2[EditAgencyNotes]
    end

    subgraph Ephemeral_UI_State [Estado Efêmero de Interface]
        E1[activeTab: opportunities | interests | contacts]
        E2[search: query string]
        E3[selectedMatch: modal inspector]
    end

    M1[useMutation: promoteOpportunityToCrmLeadFn] -->|Invalidates| Q1
    M1 -->|Invalidates| Q2
```

---

### 2. Auditoria de Problemas Crônicos de Estado (Zero Memory Leaks)

1. **Zero Stores Monstruosas / Zero Redux Inflado:**
   - Dados que pertencem ao banco de dados residem no banco e são consultados via TanStack Query.
   - Não há duplicação de dados em stores globais fora de sincronia.
2. **Invalidação Reativa Consciente:**
   - Após executar `promoteOpportunityToCrmLeadFn`, o cliente chama `queryClient.invalidateQueries({ queryKey: ["travel-opportunities"] })` e `["travel-interests"]`. O card muda de status instantaneamente sem necessidade de recarregar a página inteira.
3. **Estado de Formulário Isolado em Folhas:**
   - Modais e sheets controlam seu próprio estado de preenchimento (`name`, `phone`, `destinations`). Fechar a gaveta reseta o rascunho sem poluir o estado da página mãe.
