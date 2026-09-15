# 🏛️ Auditoria Forense — Módulo 4: PDV, Gestor de Pedidos & Expedição
> **Conselho Executivo de BigTech (Waesy Platform)**  
> **Escopo:** Frente de Caixa (PDV), KDS Cozinha, Gestor de Pedidos, Expedição, Motoboys (MotoLink) e Impressão Térmica ESC/POS.  
> **Data:** 15 de Setembro de 2026 | Sistema Operacional: Waesy Platform v4.2

---

## 1. 📋 Inventário de Camadas Reais Auditadas

| Camada | Componente / Arquivo Real | Status Real de Código |
| :--- | :--- | :---: |
| **1. Banco de Dados** | Tabelas `orders`, `order_items`, `kds_orders`, `kds_order_items`, `dispatches`, `couriers` | **Ativo no Postgres** |
| **2. BFF & Contratos** | [`src/services/pdv.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/pdv.functions.ts), [`src/services/order.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/order.functions.ts), [`src/services/dispatch.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/dispatch.functions.ts) | **Ativo com Zod & RBAC** |
| **3. Interface do PDV** | [`src/routes/workspace.pdv.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.pdv.index.tsx), [`src/routes/workspace.pdv.comandas.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.pdv.comandas.tsx) | **Ativo com Teclado Numérico & Pesquisa Rápida** |
| **4. KDS (Cozinha & Produção)** | [`src/routes/workspace.pdv.cozinha.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.pdv.cozinha.tsx) | **Ativo com Áudio de Alerta & Status em Cores** |
| **5. Gestor de Pedidos & Expedição** | [`src/routes/workspace.pedidos.gestor.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.pedidos.gestor.tsx), [`src/routes/workspace.pedidos.expedicao.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.pedidos.expedicao.tsx) | **Ativo** |
| **6. Impressão Térmica** | [`src/lib/thermal-printer.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/lib/thermal-printer.ts) (ESC/POS e ZPL 80mm/58mm) | **Ativo** |

---

## 2. 🔍 Matriz de Requisitos dos Prompts: Feito vs. Parcial vs. Ausente

| # | Requisito do Prompt | Status Real | O que Existe em Código Puro | O que Ficou Parcial / GAPs Encontrados | Ação de Correção Necessária |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **4.1** | PDV Clean com teclado rápido e busca de produto sem latência | **FEITO** | Layout responsivo em grid com busca instantânea e atalhos de teclado. | O fechamento de caixa diário por operador requer impressão do resumo cego. | Adicionar botão de impressão de fechamento cego no final do turno. |
| **4.2** | KDS com temporizador por pedido (Verde, Amarelo, Vermelho) | **FEITO** | `workspace.pdv.cozinha.tsx` possui cards com cronômetro dinâmico em tempo real. | Notificação sonora em navegadores que bloqueiam autoplay sem interação prévia. | Garantir desbloqueio de áudio no primeiro clique do operador. |
| **4.3** | Modo Garçom Móvel com Comandas e Mesas | **FEITO** | Rota `_store.garcom.tsx` e `workspace.pdv.comandas.tsx` para abertura e lançamento de itens na mesa. | Transferência de itens entre mesas diferentes precisa de modal rápido de 2 toques. | Refinar o fluxo de transferência de comandas. |
| **4.4** | Rastreamento de Entregadores (MotoLink) e Despacho | **FEITO** | Rotas `_store.entrega.$token.tsx` e `workspace.pedidos.frota.tsx`. | O botão de chamada de motoboy autônomo deve exibir taxa dinâmica estimada antes de chamar. | Integrar a skill `dynamic-surge-pricing` na visualização de despacho. |
| **4.5** | Impressão térmica de comandas sem pop-up de navegador | **FEITO** | Utilitário `thermal-printer.ts` gera bytes ESC/POS diretos para impressoras de rede/USB. | Driver WebUSB exige permissão de porta do Chrome/Edge. | Fornecer fallback gracioso para diálogo padrão de impressão do sistema. |

---

## 3. 🚨 Quebras Visuais & Títulos Técnicos Identificados

1. **`workspace.pdv.index.tsx`**:
   - Evitar textos com siglas fiscais (ex: `CFOP`, `NCM`) na frente de caixa dos operadores de balcão.
2. **`workspace.pedidos.expedicao.tsx`**:
   - Ajustar o padding mobile para não sobrepor o botão flutuante de bipar código de barras.
