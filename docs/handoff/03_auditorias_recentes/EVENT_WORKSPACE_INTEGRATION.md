# EVENT_WORKSPACE_INTEGRATION — Integração entre Eventos do Classificados e Workspace

## 1. Unificação Operacional (`src/services/events.functions.ts`)

| Operação | Fonte Nativa (`events` + `ticket_lots`) | Fonte Classificados (`classifieds` com `category='event'`) | Resultado Unificado |
| :--- | :--- | :--- | :--- |
| **Listagem no Painel (`/workspace/eventos`)** | `_listAdminEvents` consulta `events` por `store_id`. | `_listAdminEvents` agora consulta em paralelo `classifieds` com `store_id = identity.store_id` e `category = 'event'`. | Ambos aparecem na listagem e nas métricas consolidadas do Cockpit Master da Produtora (`source_type: "workspace_event" | "classified"`). |
| **Página Pública (`/evento/$id` e `/classificados/$id`)** | `_getEventWithLots` carrega `events` + `ticket_lots`. | `_getEventWithLots` faz fallback bidirecional para `classifieds` e delega a renderização para `<EventClassifiedShowcaseView />`. | Ambas as rotas públicas entregam a vitrine completa de evento com lotes, programação, palestrantes, galeria e check-in. |
| **Captura de Inscritos & Funil CRM** | `tickets` + `ticket_lots`. | `classified_applications` + sincronização automática em `leads_crm` quando `store_id` está presente. | O organizador visualiza inscritos, exporta CSV (`exportClassifiedEventLeadsCsv`) e valida QR Codes na portaria. |
