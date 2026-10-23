# BIDIRECTIONAL_UI_MATRIX.md — Matriz de Design Bidirecional
## Paridade de Domínio entre Desktop Native System e Mobile Native App
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado e Especificado  

---

### 1. Princípio Arquitetural das Duas Superfícies

> **O design NÃO é apenas responsivo de uma coluna.**  
> O **Desktop Native** é um workspace denso de produtividade com múltiplos painéis, tabelas, atalhos de teclado e preview em tempo real.  
> O **Mobile Native** é um aplicativo tátil ergonômico com 100dvh, bottom sheets, barras inferiores flutuantes (`z-30`) e safe-areas de hardware.  
> Ambos manipulam o **mesmo objeto de domínio**; uma alteração feita no Mobile aparece instantaneamente no Desktop e vice-versa, sem perda de dados.

---

### 2. Matriz Bidirecional por Feature

| Capacidade / Feature | Padrão Desktop Native | Padrão Mobile Native | Domínio Compartilhado | Estado Compartilhado | Roundtrip Safe? | Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Criação de Pacote de Viagem** | Formulário em 2 colunas com live preview lado a lado e auto-complete de hotéis. | Wizard por etapas em full-viewport (100dvh) com bottom sheet de seleção. | `TravelOffer` | `classifieds.attributes.excelencia_offer` | **SIM** | **IMPLEMENTADO** |
| **Radar de Oportunidades** | Grid 3 colunas com inspetor lateral em Sheet e atalhos de cópia rápida. | Cards táteis em coluna única com toque direto no WhatsApp e ação na barra inferior. | `TravelOpportunityMatch` | `travel_opportunity_matches` | **SIM** | **IMPLEMENTADO** |
| **Story Builder 9:16** | Artboard central com barra de ferramentas lateral, seletor de glass e preview 1080×1920. | Editor adaptado com tabs inferiores (Fundo, Texto, Vidro, Exportar) e preview com pinch-zoom. | `StoryDocument` | `classifieds.attributes.story_document` | **SIM** | **IMPLEMENTADO** |
| **Central de Cotações** | Funil Kanban multi-coluna com drag-and-drop e alternador de tabela densa. | Lista de intenções agrupadas por status com badges táteis e swipe actions. | `TravelQuoteRequestDTO` | `travel_quotes` | **SIM** | **IMPLEMENTADO** |
| **Assinatura de Contrato** | Visualizador de minuta com painel de conferência de cláusulas e carimbo de tempo. | Experiência fluida tipo GovBR com leitura scroll-to-accept e assinatura na tela. | `ContractDTO` | `contracts` | **SIM** | **IMPLEMENTADO** |
| **Despacho de Embarque** | Mapa de assentos do ônibus interativo com clique e status de cada passageiro. | Visualizador vertical de assentos com leitor de QR Code pela câmera nativa do celular. | `TripPassengerDTO` | `tourism_trips` e `trip_passengers` | **SIM** | **IMPLEMENTADO** |

---

### 3. Garantias de Não-Degradação

1. **Zero Efeito Borboleta:** Salvar um pacote no mobile nunca sobrescreve ou apaga trechos aéreos ou fotos que só foram editadas no desktop.
2. **Safe Area e Z-Index (Invariante B.34):** No mobile, modais e bottom sheets possuem `z-50` e `pt-safe`, garantindo que barras fixas de rodapé (`z-30`) nunca ocluam os controles de toque.
