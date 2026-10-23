# MODULE_MAP.md — Mapa Estrutural de Módulos e Submódulos
## Inventário Arquitetural, Responsabilidades e Limites de Cada Camada
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Arquitetura  

---

### 1. Mapa de Camadas Arquiteturais

```mermaid
flowchart TD
    subgraph UI_Layer [Camada de Interface]
        DesktopWorkspace["Desktop Workspace (/workspace/turismo/*)"]
        MobilePWA["Mobile Native App (/_store/*, /viajante/*)"]
        FlyerStudio["Story 9:16 & Flyer Studio"]
    end

    subgraph Component_Primitives [Blocos de Construção de Interface]
        TetrisGrid["TeteterisGrid Engine"]
        SquirclePrimitives["Squircle Primitives"]
        LiquidGlass["Liquid Glass Optics Surface"]
        WorkspaceToolbar["WorkspaceCanonicalToolbar"]
    end

    subgraph BFF_Layer [Camada BFF / Server Functions]
        BFF_CommIntel["travel-commercial-intelligence.functions.ts"]
        BFF_Tourism["tourism.functions.ts"]
        BFF_Proposal["travel-proposal.functions.ts"]
        BFF_Contract["travel-contract.functions.ts"]
        BFF_Lifecycle["travel-lifecycle.functions.ts"]
    end

    subgraph Pure_Domain [Camada de Domínio Puro (Sem UI / Sem DOM)]
        Domain_Offer["excelencia-offer-engine.ts"]
        Domain_Intel["travel-commercial-intelligence.ts"]
        Domain_Glass["liquid-glass-engine.ts"]
        Domain_Money["money.ts"]
    end

    subgraph Data_Layer [Banco de Dados & Armazenamento]
        Postgres_Tables["Tabelas Supabase (travel_*, classifieds, leads_crm)"]
        RLS_Policies["Políticas RLS Multi-Tenant (store_id)"]
        Storage_Buckets["Buckets de Mídia & Documentos"]
    end

    UI_Layer --> Component_Primitives
    UI_Layer --> BFF_Layer
    BFF_Layer --> Pure_Domain
    BFF_Layer --> Data_Layer
    Component_Primitives --> Pure_Domain
```

---

### 2. Inventário de Módulos e Responsabilidades

| Módulo | Diretório Principal | Responsabilidade Estrita | O que é PROIBIDO fazer |
| :--- | :--- | :--- | :--- |
| **Domínio Puro (`src/lib/travel/`)** | `src/lib/travel/` | Cálculos matemáticos, parsing de lâminas, contratos de oferta, scoring algébrico e física de vidro. | Importar bibliotecas de UI (React, Tailwind, Lucide), manipular DOM ou chamar APIs de rede diretamente. |
| **Serviços BFF (`src/services/`)** | `src/services/` | Server Functions tipadas (TanStack Start), validação Zod, autenticação `requireStaff()`, queries no Supabase. | Renderizar componentes de UI ou armazenar estado efêmero de sessão em variáveis globais. |
| **Componentes de UI (`src/components/`)** | `src/components/tourism/`, `classifieds/` | Apresentação visual, interações táteis, acessibilidade (WCAG AA), animações suaves e layouts adaptativos. | Declarar regras de negócio brutas, cores literais hexadecimais ou executar mutações diretas sem passar pelo BFF. |
| **Rotas de Aplicação (`src/routes/`)** | `src/routes/workspace.turismo.*` | Definição de rotas do TanStack Router, carregamento de dados em loaders e composição de páginas. | Declarar schemas SQL ou acoplar persistência direta sem passar pela camada BFF. |
| **Banco de Dados (`supabase/migrations/`)** | `supabase/migrations/` | Definição de tabelas, chaves estrangeiras, restrições `CHECK`, índices GIN/B-Tree e políticas RLS `DENY-ALL`. | Permitir inserções anônimas em tabelas confidenciais de clientes e contratos. |
