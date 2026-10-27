# COMPONENT_ARCHITECTURE_AUDIT.md — Auditoria de Componentes e Telas
## Inventário de Telas, Matriz de Estados (4 Estados), Refatoração e Primitivos
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Rotas TanStack Router  

---

### 1. Inventário de Telas do Workspace de Turismo

| Rota TanStack Router | Propósito da Tela | Persona Principal | Objeto de Domínio | Matriz de 4 Estados | Ação Recomendada |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `/workspace/turismo/cotacoes` | Central de cotações, Kanban de atendimento e importador OCR. | Corretor / Agente | `travel_quotes` | **COMPLETA** (Skeleton, Empty, Data, Error) | **KEEP (Estável)** |
| `/workspace/turismo/oportunidades` | Radar de Inteligência Comercial e matching determinístico de ofertas. | Corretor / Gestor | `travel_opportunity_matches` | **COMPLETA** (Skeleton, Empty, Data, Error) | **KEEP (Canônico)** |
| `/workspace/turismo/propostas` | Lâminas Studio para montagem e envio de orçamentos visuais. | Corretor | `travel_proposals` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/destinos` | Catálogo central de cidades turísticas, fotos e atrativos. | Operador | `destinations` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/hoteis` | Banco central de hotéis, resorts, políticas de CHD e aliases. | Operador | `global_hotels` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/radar` | Inteligência de destinos, segurança, tendências de demanda e alertas. | Gestor de Risco | `destination_intelligence` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/viagens` | Operação de viagens fechadas, itinerários e cronogramas. | Guia / Operador | `tourism_trips` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/embarques` | Manifesto de passageiros, check-in e despacho de grupos. | Despachante | `trip_passengers` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/contratos` | Gestão de contratos digitais e assinaturas GovBR/ICP. | Jurídico / Gestor | `contracts` | **COMPLETA** | **KEEP (Estável)** |
| `/workspace/turismo/corporativo` | Portal de viagens B2B, saldo EMD e aprovação de alçadas. | Gestor B2B | `corporate_contracts` | **COMPLETA** | **KEEP (Estável)** |

---

### 2. A Matriz Obrigatória de 4 Estados (Invariante B.4 / DL-11, DL-12, DL-13)

Nenhuma tela ou componente de dados é aprovado se faltar qualquer um dos 4 estados:
1. **Loading State (Skeleton):** Skeletons com proporções idênticas aos cards finais, evitando quebras de Cumulative Layout Shift (CLS < 0.05).
2. **Data State (Conteúdo):** Cards squircles com anti-truncamento, preços destacados e CTAs táteis de 44px.
3. **Empty State (Vazio Honesto):** Ilustração limpa ou ícone com texto objetivo e botão primário de ação (ex.: "+ Novo Interesse"). Proibido tela em branco silenciosa.
4. **Error State (Tratamento Defensivo):** Alerta claro com mensagem de suporte e botão de tentar novamente (`refetch`), sem travar a aplicação.
