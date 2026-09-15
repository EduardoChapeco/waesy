# 🏛️ Auditoria Forense — Módulo 2: Turismo, Excursões & Roteiros
> **Conselho Executivo de BigTech (Waesy Platform)**  
> **Escopo:** Agências de Viagens, Pacotes Turísticos, Ônibus & Poltronas, Rooming List, Vouchers, Clima Real, Seguro e Paridade CMS ↔ View.  
> **Data:** 15 de Setembro de 2026 | Sistema Operacional: Waesy Platform v4.2

---

## 1. 📋 Inventário de Camadas Reais Auditadas

| Camada | Componente / Arquivo Real | Status Real de Código |
| :--- | :--- | :---: |
| **1. Banco de Dados** | Tabelas `tourism_experiences`, `group_tours`, `group_tour_boardings`, `group_tour_seats`, `group_tour_enrollments`, `group_tour_cash_ledger`, `group_tour_passenger_tokens` | **Ativo no Postgres** |
| **2. BFF & Contratos** | [`src/services/tourism.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/tourism.functions.ts), [`src/services/group-tours.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/group-tours.functions.ts) | **Ativo com Zod & RBAC** |
| **3. Visualização Pública** | [`src/routes/_store.turismo.$id.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.turismo.$id.tsx), [`src/routes/_store.turismo.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.turismo.index.tsx) | **Ativo com Clima Real via wttr.in** |
| **4. Gestão Operacional** | [`src/routes/workspace.turismo.viagens.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.turismo.viagens.index.tsx), [`src/routes/workspace.turismo.embarques.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.turismo.embarques.tsx), [`src/routes/workspace.turismo.hoteis.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.turismo.hoteis.tsx) | **Ativo no Workspace** |
| **5. Mobile do Viajante** | [`src/routes/viajante.$token.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/viajante.$token.tsx), [`src/routes/m.excursao.$token.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/m.excursao.$token.tsx) | **Ativo via Token Seguro** |

---

## 2. 🔍 Matriz de Requisitos dos Prompts: Feito vs. Parcial vs. Ausente

| # | Requisito do Prompt | Status Real | O que Existe em Código Puro | O que Ficou Parcial / GAPs Encontrados | Ação de Correção Necessária |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **2.1** | Paridade CMS ↔ View (Zero Silent Fallback - Regra 19) | **FEITO** | Em `_store.turismo.$id.tsx`, o bloco de roteiro só renderiza se `itinerary.length > 0`. | Zero fallbacks hardcoded (`"5D / 4N"` eliminado). | Mantido e testado em `travel-package.functions.test.ts`. |
| **2.2** | Previsão do tempo real por cidade sem mock | **FEITO** | `WeatherWidget` integrado consumindo a API `wttr.in` com base em `destination_city` ou `location`. | Sem fallback silencioso de previsão inventada. | Garantido pela Regra 21. |
| **2.3** | Mapa de assentos interativo do ônibus | **FEITO** | Tabela `group_tour_seats` e seletor gráfico de poltronas (janela/corredor/leito). | Visualização móvel em telas estreitas (360px) exige scroll horizontal tátil suave. | Refinar o snap do mapa de assentos para evitar quebra de proporção no mobile. |
| **2.4** | Rooming List para hotéis e pousadas | **FEITO** | Coluna `rooms` JSONB em `tourism_experiences` e interface em `workspace.turismo.hoteis.tsx`. | Falta exportação direta da lista de quartos em PDF/Excel para a recepção do hotel em 1 clique. | Adicionar ação de exportação rápida na tela de hotéis. |
| **2.5** | Voucher digital com QR Code e Modo Offline para o passageiro | **FEITO** | Rota `/viajante/$token` e `/m/excursao/$token` com token criptográfico de embarque. | O cache service worker em modo offline ainda pode expirar em áreas remotas de serra. | Endurecer a estratégia de cache PWA para dados do voucher. |

---

## 3. 🚨 Quebras Visuais & Títulos Técnicos Identificados

1. **`workspace.turismo.viagens.index.tsx`**:
   - Cabeçalhos de tabela com jargões como `status_code` em vez de badges semânticas "Embarque Confirmado", "Vagas Esgotadas", "Cancelado".
2. **`_store.turismo.$id.tsx`**:
   - Em conexões lentas, o carregamento do `WeatherWidget` precisa exibir skeleton elegante em vez de texto cru.
