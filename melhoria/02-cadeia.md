# 02-CADEIA.md — Inventário de Features Parciais e Elos Faltantes

**Fundamentação:** Uma funcionalidade corporativa íntegra depende de uma cadeia inquebrável de 7 elos:  
`Tabela (1) -> RLS (2) -> BFF Function (3) -> Contrato Zod (4) -> Hook TanStack (5) -> Componente UI (6) -> Rota/Menu (7)`.  
Se qualquer um dos 7 elos estiver quebrado ou ausente, a funcionalidade é uma "feature parcial".

---

## 1. Estatística Global de Elos Quebrados
- **Total de Gaps de Cadeia Identificados:** 300
- **Severidade Alta (Lógica presente sem acesso ou dado gravado sem retorno):** 118
- **Severidade Média (Componentes fora do roteador ou promessas "em breve"):** 120
- **Severidade Baixa (Tabelas de consulta sem tela de input):** 62

---

## 2. Gaps Críticos de Cadeia por Categoria

### Categoria A: Funções Backend Órfãs (Elo 3 presente, Elos 5/6/7 faltantes)
Existem 107 funções exportadas em `src/services/*.functions.ts` que nunca são chamadas por nenhuma rota ou hook:

| Função Backend | Arquivo de Origem | Elo Faltante | Impacto no Usuário |
| --- | --- | --- | --- |
| `cancelDeliveryRunAtomic` | `src/services/dispatch.functions.ts` | Hook e Botão de Cancelamento (Elos 5 e 6) | O comerciante não consegue cancelar corrida já despachada sem chamar suporte técnico |
| `recordOrderCustomerView` | `src/services/checkout.functions.ts` | Disparador no checkout (Elo 5) | Telemetria de visualização de pedido do cliente não é contabilizada |
| `calculateSurgeMultiplierDetailed` | `src/services/surge.functions.ts` | Painel de visualização de taxa dinâmica | O lojista não enxerga a regra de cálculo da taxa de chuva |
| `bulkArchiveClassifieds` | `src/services/classifieds.functions.ts` | Ação em lote na tabela de classificados | Usuário é obrigado a arquivar anúncios um por um manualmente |
| `archiveLegalDeadlineBatch` | `src/services/jus.functions.ts` | Ação em lote no grid de prazos JUS | O advogado não consegue dar baixa em múltiplos prazos simultâneos |

### Categoria B: Componentes Construídos Fora do Roteador (Elo 6 presente, Elo 7 faltante)
Existem 69 componentes em `src/components/` que não possuem nenhuma importação ativa no roteador `src/routes/`:

| Componente Órfão | Arquivo | Elo Faltante | Impacto no Usuário |
| --- | --- | --- | --- |
| `StoreFloorPlanEditorModal` | `src/components/commerce/store-floor-plan-editor-modal.tsx` | Botão "Editar Planta" no PDV (Elo 7) | Comerciante tem modal pronto mas não consegue desenhar mesas |
| `RmaEvidenceViewerModal` | `src/components/rma/rma-evidence-viewer-modal.tsx` | Ação de clique na miniatura de perícia | Perito não consegue ampliar foto em alta resolução |
| `BiolinkAdvancedAnalyticsCard`| `src/components/profile/biolink-advanced-analytics-card.tsx` | Aba "Métricas" no Biolink Creator | Criador não tem acesso ao gráfico de cliques por horário |
| `InventoryBarcodeScannerSheet`| `src/components/inventory/barcode-scanner-sheet.tsx` | Ação de bipar na busca rápida móvel | Estoquista não consegue usar a câmera para buscar produtos |

### Categoria C: Tabelas de Gravação Unidirecional (Elo 1 gravado, Elo 6 faltante)
118 tabelas recebem `insert`/`upsert` no banco, mas não possuem telas de consulta ou relatórios correspondentes:
- `ad_telemetry_events`: Grava impressões e cliques mas não possui dashboard de conversão de anúncios.
- `inventory_audit_log`: Registra todas as perdas e quebras mas não exibe histórico para o gerente.
- `delivery_run_status_history`: Grava cada mudança de status do MotoLink sem timeline visual para a loja.

### Categoria D: Promessas Vazias no Markup ("Em Breve" — Elo 7 sem Elos 1 a 6)
51 ocorrências de botões ou cartões com texto "Em breve" bloqueando a conclusão do usuário:
- Cupom de Primeira Compra no Checkout (texto estático sem campo de ativação).
- Exportação de Extrato Contábil em PDF/Excel no Financeiro.
- Integração com Mercado Livre / Shopee no Catálogo.
