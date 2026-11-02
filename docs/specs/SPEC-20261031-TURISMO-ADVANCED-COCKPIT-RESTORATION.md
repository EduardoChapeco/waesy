# SPEC-20261031-TURISMO-ADVANCED-COCKPIT-RESTORATION: Restauração Integral do Cockpit Comercial e Onboarding de Turismo

**Status:** Aprovada para Implementação Cirúrgica  
**Data:** 31 de Outubro de 2026  
**Severidade de Débito:** P0 (Regressão de fluxo comercial, perda de gatilho de cadastro de leads e oclusão de onboarding)  
**Autor:** Antigravity / Waesy Core Engineering  

---

## 1. Problema e Motivação
A casca `/workspace/turismo` (`src/routes/workspace.turismo.index.tsx`) omitiu o botão primário de cadastro de oportunidades comerciais (`+ Nova Oportunidade`), desativou a esteira de Onboarding Comercial (formulários `/f/:slug`, magic links e disparo WhatsApp), substituiu o componente canônico `LeadCard` por cartões estáticos sem affordance e transformou o Drawer em visualização somente-leitura. Todo o ecossistema avançado de CRM comercial especializado em agências de turismo (padrão TravelAgências / TravelOS) permaneceu confinado em `workspace.comercial.tsx`.

---

## 2. Requisitos em Sintaxe EARS

### REQ-COCKPIT-01: Cadastro Avançado de Oportunidades Comerciais
- **Quando** o operador ou consultor de viagens acionar a ação primária `+ Nova Oportunidade` no topo do Cockpit de Turismo ou em qualquer coluna do Kanban,
- **o sistema deve** abrir o Sheet lateral completo de criação contendo:
  1. *Contato & Titular:* Nome completo, telefone/WhatsApp, e-mail, canal de origem detalhado e autocomplete para vincular a cliente existente da carteira CRM.
  2. *Especificações da Viagem:* Destino principal, período flexível (mês/ano), datas de ida e volta estimadas, tipo de interesse (pacote aéreo, hotel/resort, rodoviário, cruzeiro, visto, corporativo) e orçamento estimado (R$).
  3. *Passageiros Estruturados:* Contadores de Adultos (ADT), Crianças (CHD 2 a 11 anos), Bebês (INF 0 a 2 anos) e campo de idades das crianças.
  4. *Atendimento & SLA:* Atribuição a consultor da equipe (`assigned_to`), tags comerciais populares e anotações cruciais para a abordagem.

### REQ-COCKPIT-02: Kanban Dinâmico com LeadCard Canônico
- **Quando** a visualização ativa for o funil de "Atendimento",
- **o sistema deve** renderizar cada oportunidade através do componente `LeadCard`, exibindo:
  1. Gatilho de WhatsApp em 1 clique com mensagem contextual personalizada (`https://wa.me/55...`).
  2. Quebra de passageiros padronizada (ex: `2 ADT, 1 CHD`).
  3. Período e destino de viagem formatados.
  4. Telemetria de inatividade (*staleness*): alerta visual de lead frio (>= 10 dias) ou em atenção (>= 5 dias).
  5. Controles de movimentação rápida de estágio (← e →) e menu contextual com: *Abrir Ficha 360°*, *Gerar Proposta Visual*, *Calcular Comissão*, *Malha Aérea & Voos*, *Converter em Cliente* e *Excluir Lead*.

### REQ-COCKPIT-03: Onboarding Comercial & Telemetria do Viajante
- **Quando** o operador abrir a Ficha 360° do Lead e selecionar a aba "Onboarding Comercial",
- **o sistema deve** disponibilizar:
  1. Seleção dos formulários de onboarding configurados na agência (`getStoreOnboardingForms`).
  2. Botão de disparo direto via WhatsApp contendo o link dinâmico da ficha pré-preenchida (`/f/${slug}?leadId=...`).
  3. Botão de cópia rápida do link do formulário.
  4. Magic Link autônomo do viajante (`/m/lead/${token}`).
  5. Emissão de Contrato Digital em 1 clique com link de assinatura para o passageiro (`/viajante/${publicToken}`).

### REQ-COCKPIT-04: Ficha 360° com Edição e Persistência Plena
- **Quando** o operador alterar qualquer campo do Lead no Drawer (Destino, Datas, Passageiros, Orçamento, Consultor, Tags, Checklist, Anotações ou Motivo de Perda),
- **o sistema deve** persistir os dados através de `updateLeadDetails`, atualizando em tempo real a listagem sem recarregamento de página.

### REQ-COCKPIT-05: Barra de Ferramentas & Modais Satélites
- **O sistema deve** integrar na barra de controle do Cockpit de Turismo:
  1. Botão `Importar Leads` abrindo `LeadImportModal` (CSV/Excel).
  2. Botão `Personalizar Colunas` abrindo `KanbanColumnCustomizerModal`.
  3. Modal da Calculadora de Comissões da Agência (`LeadCommissionCalculatorSheet`).
  4. Modal de Consulta de Malha Aérea & Voos (`LeadFlightGridSheet`).
  5. Preservação integral do somatório do pipeline em R$, da aba "Geral" de KPIs executivos (Voos no Dia, Viajantes em Viagem, Próximos Embarques, Faturas) e das abas "Viagens" e "Propostas".

---

## 3. Matriz de Componentes e Arquivos

| Ação | Arquivo | Finalidade |
| :--- | :--- | :--- |
| **Mutação Cirúrgica** | [`src/routes/workspace.turismo.index.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/routes/workspace.turismo.index.tsx) | Enxertar motor completo de leads, onboarding comercial, LeadCard, modais satélites e edição 360° |
| **Reuso Direto** | [`src/components/tourism/crm/LeadCard.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/tourism/crm/LeadCard.tsx) | Componente canônico dos cards do Kanban |
| **Reuso Direto** | [`src/components/commercial/lead-import-modal.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/commercial/lead-import-modal.tsx) | Importador em massa de leads |
| **Reuso Direto** | [`src/components/commercial/lead-commission-calculator-sheet.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/commercial/lead-commission-calculator-sheet.tsx) | Calculadora de comissões |
| **Reuso Direto** | [`src/components/commercial/lead-flight-grid-sheet.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/commercial/lead-flight-grid-sheet.tsx) | Malha aérea |
| **Reuso Direto** | [`src/components/workspace/kanban/kanban-column-customizer-modal.tsx`](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/src/components/workspace/kanban/kanban-column-customizer-modal.tsx) | Customizador de colunas |
