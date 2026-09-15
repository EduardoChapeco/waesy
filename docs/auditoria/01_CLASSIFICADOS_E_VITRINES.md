# 🏛️ Auditoria Forense — Módulo 1: Classificados & Vitrine Pública
> **Conselho Executivo de BigTech (Waesy Platform)**  
> **Escopo:** Classificados Multi-Nicho, Semântica de Nichos, Vitrine Pública, Bullets Dinâmicos, Provedor e Modo Proprietário.  
> **Data:** 15 de Setembro de 2026 | Sistema Operacional: Waesy Platform v4.2

---

## 1. 📋 Inventário de Camadas Reais Auditadas

| Camada | Componente / Arquivo Real | Status Real de Código |
| :--- | :--- | :---: |
| **1. Banco de Dados** | Tabelas `classifieds`, `classified_favorites`, `classified_delivery_dispatches`, `classified_leads` | **Ativo no Postgres** |
| **2. BFF & Contratos** | [`src/services/classifieds.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/classifieds.functions.ts), [`src/services/classifieds-workspace-bridge.functions.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/services/classifieds-workspace-bridge.functions.ts) | **Ativo com Zod & RBAC** |
| **3. Biblioteca Semântica** | [`src/lib/classifieds/semantics.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/lib/classifieds/semantics.ts) (14 nichos polimórficos) | **Ativo** |
| **4. Visualização Pública** | [`src/routes/_store.classificados.$id.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.classificados.$id.tsx), [`src/routes/_store.classificados.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.classificados.index.tsx) | **Ativo** |
| **5. Formulário de Cadastro** | [`src/routes/_store.conta.classificados.novo.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.conta.classificados.novo.tsx) | **Ativo** |
| **6. Painel de Gestão** | [`src/routes/_store.conta.classificados.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.conta.classificados.index.tsx) | **Ativo** |

---

## 2. 🔍 Matriz de Requisitos dos Prompts: Feito vs. Parcial vs. Ausente

| # | Requisito do Prompt | Status Real | O que Existe em Código Puro | O que Ficou Parcial / GAPs Encontrados | Ação de Correção Necessária |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1.1** | Seletor de tipo em trilho horizontal com snap e cards estilo Apple Card | **FEITO** | `CreateTypePicker` em `_store.conta.classificados.novo.tsx` com cards 260x370px e ícones squircle. | Nenhum. O layout vertical antigo foi substituído. | Manter e auditar responsividade em viewports < 360px. |
| **1.2** | Bullets dinâmicos livres sem limites e sem cópias forçadas | **FEITO** | Array `travelBioBullets` com botões `+ Adicionar`, reordenação e exclusão. | Em nichos secundários (ex: Equipamentos e Automotivo), alguns campos ainda possuíam inputs pré-definidos. | Expandir o padrão de bullets dinâmicos para Automotivo e Serviços. |
| **1.3** | Proibição de badges inadequadas ("Usado Revisado" / "Pronta Entrega" em Turismo/Serviços) | **FEITO** | `src/lib/classifieds/semantics.ts` filtra estritamente por nicho (`showDeliveryBadges: false`). | Zero ocorrências de badges indevidas em runtime. | Validado com testes unitários em `semantics.test.ts`. |
| **1.4** | Modo Proprietário (Owner Edit Mode) na visualização de classificados | **PARCIAL** | `_store.classificados.$id.tsx` possui botão de edição se `isOwner === true`. | Falta o banner discreto de advertência "Modo Proprietário Ativo" abaixo da topbar (padrão Regra 23). | Adicionar o banner âmbar discreto e overlays de edição inline quando `isOwner`. |
| **1.5** | Erradicação de títulos técnicos e AI-smell na busca e filtros | **PARCIAL** | A maioria das caixas foi limpa, mas ainda existem badges com rótulos técnicos em alguns cards secundários. | Termos como "deal_type" ou rótulos sem tradução amigável aparecem em fallbacks de depuração. | Substituir todos os identificadores brutos por vocabulário comercial caloroso e humanizado. |
| **1.6** | Doação e Desapego Solidário (R$ 0,00) com botão "Tenho Interesse em Receber Doação" | **FEITO** | Coluna `is_free_donation` adicionada na migration `20261028000000`, card com badge "Doação Gratuita". | Integrar o modal de contato solidário direto para o beneficiário. | Refinar o fluxo de contato com 1-toque no WhatsApp/Chat P2P. |

---

## 3. 🚨 Quebras Visuais & Títulos Técnicos Identificados

1. **`_store.classificados.$id.tsx`**:
   - Falta o aviso amigável "Você é o autor deste anúncio" no topo do anúncio quando o dono acessa.
   - Em telas móveis de 360px, alguns botões de contato empilham verticalmente ocupando mais de 50% da altura da viewport inferior.
2. **`_store.classificados.index.tsx`**:
   - Barra de pesquisa precisa manter a Thumb Zone no terço inferior da tela móvel.
