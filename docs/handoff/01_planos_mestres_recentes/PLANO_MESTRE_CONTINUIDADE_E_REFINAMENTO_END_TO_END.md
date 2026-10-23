# PLANO MESTRE DE CONTINUIDADE OPERACIONAL, SANEAMENTO E REFINAMENTO END-TO-END

**Data de Emissão:** 2026-10-22  
**Status do Repositório:** Catraca de CI Ativa (-1.796 violações) | 100% dos testes unitários e de integração verdes  
**Metodologia:** AGENTS.md (Invariantes B.1 a B.45), WCAG 2.2 AA, Apple HIG, Zero-Trust Multi-Tenant  

---

## 1. Diagnóstico do Estado Atual: O Que Foi Executado vs. Realidade do Repositório

### 1.1 Entregas Concluídas e Consolidadas em Código (DEC-316 a DEC-319)
- **Persistência Multi-Tenant em Turismo (DEC-319):** Planilha in-page de vendas, metas escalonadas e alíquotas de retenção de operadoras em `InlineSalesSpreadsheetAndGoalsPanel.tsx` persistidas de forma determinística por agência (`waesy_travel_*_${storeId}`).
- **Blindagem Anti-Injeção de Ingressos (DEC-318):** Protocolo soberano WCTS-1 em `src/lib/ticket-crypto.ts` com validação HMAC-SHA256, tempo constante (`timingSafeEqual`) e rejeição de strings arbitrárias como legados, blindado por 5 testes unitários dedicados.
- **Saneamento e Redução da Catraca de CI (DEC-316 / DEC-317):** Redução de 12.254 para 10.458 violações de design lint (-1.796 débitos eliminados). Erradicação de P0s (DL-15) em 8 componentes centrais (`product-modifiers-card.tsx`, `new-travel-contract-sheet.tsx`, `workspace.tarefas.tsx`, `workspace.empregos.index.tsx`, etc.).
- **Plataforma Canônica de Endereços & Turismo Inteligente (DEC-304 / DEC-305):** Geocodificação reversa com PIN dinâmico, catálogo IATA de aeroportos, cálculo de cancelamento e sentinel de prazos de hotéis.

---

## 2. Mapa Holístico de Pendências, Débitos e Refinamentos Necessários

Este mapa detalha o que parece correto no código ou na documentação, mas que sob análise técnica aprofundada carece de integração, persistência no banco, tratamento defensivo ou adequação visual.

```
WAESY ECOSYSTEM ROADMAP (DAG MECE)
├── [FRENTE 1] CHECKOUT, CARRINHO & INTEGRAÇÃO LOGÍSTICA MULTI-LOJA
│   ├── Microfase 1.1: Vinculação de Geolocalização Canônica (Lat/Lng) ao Payload do Pedido
│   ├── Microfase 1.2: Split de Frete e Persistência Desmembrada por Loja em `orders`
│   └── Microfase 1.3: Resiliência no Polling do Webhook Pix na Confirmação Pública
│
├── [FRENTE 2] OPERAÇÕES DE PEDIDOS, EXPEDIÇÃO & PDV
│   ├── Microfase 2.1: Erradicação dos 5 P0s (DL-15) em `workspace.pedidos.gestor.tsx`
│   ├── Microfase 2.2: Isolamento de Estilos de Impressão Térmica de Comandas (DL-05)
│   └── Microfase 2.3: Mutação Otimista com Rollback Local em Falhas de Rede
│
├── [FRENTE 3] GESTÃO JURÍDICA E ADVOCACIA
│   ├── Microfase 3.1: Teclado Acessível e Foco (:focus-visible) no Kanban de Processos
│   └── Microfase 3.2: Adequação à Grade Modular de 4px nos Prazos Processuais
│
├── [FRENTE 4] BUILDER VISUAL & CMS DE VITRINES
│   ├── Microfase 4.1: Acessibilidade ARIA e Teclado nos Painéis e Canvas do Builder
│   └── Microfase 4.2: Validação Bilateral de Blocos Customizados em JSONB
│
└── [FRENTE 5] PURIFICAÇÃO DO DESIGN LINT & RATIO DE CI
    ├── Microfase 5.1: Erradicação dos 76 P0s Remanescentes no Repositório
    └── Microfase 5.2: Congelamento Permanente da Nova Baseline de Qualidade
```

---

## 3. Detalhamento das Microfases de Implementação

### FRENTE 1: Checkout, Carrinho & Logística Multi-Loja

#### Microfase 1.1: Vinculação de Geolocalização Canônica (Lat/Lng) ao Payload do Pedido
- **Diagnóstico:** O checkout (`_store.checkout.tsx`) permite selecionar endereços salvos, mas quando o cliente utiliza um endereço novo com GPS refinado via PIN no mapa, as coordenadas (`latitude`, `longitude`) nem sempre são propagadas na chamada `createMarketplaceOrderFn`.
- **Ação:**
  - Atualizar o schema Zod de entrada em `src/services/marketplace-checkout.functions.ts` para exigir opcionalmente `latitude: z.number().nullable()` e `longitude: z.number().nullable()`.
  - Garantir que `orders.delivery_lat` e `orders.delivery_lng` sejam persistidos para alimentar a telemetria do motorista e o cálculo de KM real.
- **Critério de Aceite:** Teste unitário em `marketplace-checkout.functions.test.ts` verificando a persistência íntegra das coordenadas no pedido criado.

#### Microfase 1.2: Split de Frete e Persistência Desmembrada por Loja em `orders`
- **Diagnóstico:** Quando o carrinho contém produtos de 2 lojas diferentes, o frete total é somado na UI, mas a divisão por lojista na liquidação financeira de repasse (`payouts`) depende de recálculos ad-hoc.
- **Ação:**
  - Persistir explicitamente `delivery_fee_cents` individualizado por item/loja nas faturas de pedidos (`order_invoices` / `orders`).
  - Registrar a alíquota da taxa fixa do ecossistema (R$ 0,99 per Invariante B.23) no ledger financeiro de cada pedido desmembrado.
- **Critério de Aceite:** Prova de isolamento financeiro nos testes de checkout multi-loja.

#### Microfase 1.3: Resiliência no Polling do Webhook Pix na Confirmação Pública
- **Diagnóstico:** A tela de confirmação (`_store.pedido.$publicToken.confirmacao.tsx`) usa WebSocket/polling para identificar o pagamento via Pix. Em conexões móveis instáveis, desconexões silenciosas podem deixar o usuário com status "Aguardando Pagamento" mesmo após compensação bancária.
- **Ação:**
  - Adicionar reconexão exponencial defensiva (backoff de 2s a 10s) com fallback para polling HTTP leve a cada 5s até confirmação final.
  - Implementar feedback tátil e sonoro sutil quando o status mudar para "Pago".

---

### FRENTE 2: Operações de Pedidos, Expedição & PDV

#### Microfase 2.1: Erradicação dos 5 P0s (DL-15) em `workspace.pedidos.gestor.tsx`
- **Diagnóstico:** O painel de gestão de pedidos possui 5 elementos interativos com `onClick` sem `:focus-visible:ring-2`, violando o gate de acessibilidade WCAG 2.2 AA.
- **Ação:**
  - Adicionar `role="button"`, `tabIndex={0}`, tratamento de teclas `Enter`/`Space` e a classe `:focus-visible:outline-none :focus-visible:ring-2 :focus-visible:ring-primary` em cada linha ou botão de ação de status.
- **Critério de Aceite:** `node tools/lint-file.mjs src/routes/workspace.pedidos.gestor.tsx` retornando 0 violações P0.

#### Microfase 2.2: Isolamento de Estilos de Impressão Térmica de Comandas (DL-05)
- **Diagnóstico:** O gerador de comanda para impressora térmica de 80mm/58mm contém propriedades de estilo inline (`style={{ width: '80mm' }}`), sinalizadas como DL-05 no linter.
- **Ação:**
  - Mover estilos de layout de impressão para arquivo CSS dedicado ou classe `@media print` sem atributos inline.
- **Critério de Aceite:** Eliminação de avisos DL-05 na rota do gestor de pedidos.

#### Microfase 2.3: Mutação Otimista com Rollback Local em Falhas de Rede
- **Diagnóstico:** Quando o operador avança um pedido de "Em Preparo" para "Pronto", a UI aguarda o retorno da Server Function. Se a rede oscilar, o botão trava ou a comanda não avança.
- **Ação:**
  - Aplicar transição de estado imediata na fila local, revertendo e exibindo toast descritivo em caso de erro da rede.

---

### FRENTE 3: Gestão Jurídica e Advocacia (`workspace.advocacia.index.tsx`)

#### Microfase 3.1: Teclado Acessível e Foco (:focus-visible) no Kanban de Processos
- **Diagnóstico:** O módulo jurídico possui 4 violações P0 onde os cards de processos em kanban possuem clique sem manipuladores de teclado.
- **Ação:**
  - Injetar semântica acessível nos cards de processos com `tabIndex={0}` e foco visível.
- **Critério de Aceite:** 0 violações P0 em `workspace.advocacia.index.tsx`.

#### Microfase 3.2: Adequação à Grade Modular de 4px nos Prazos Processuais
- **Diagnóstico:** Badges e contadores de dias úteis utilizam margens fracionárias fora da grade modular de 4px.
- **Ação:**
  - Substituir espaçamentos manuais por `gap-2`, `p-2`, `space-y-1` canônicos.

---

### FRENTE 4: Builder Visual & CMS de Vitrines

#### Microfase 4.1: Acessibilidade ARIA e Teclado nos Painéis do Builder
- **Diagnóstico:** Componentes `builder-canvas.tsx`, `builder-left-panel.tsx` e `builder-pages-panel.tsx` possuem 1 violação P0 cada devido a blocos arrastáveis sem suporte a navegação por teclado.
- **Ação:**
  - Implementar atributos ARIA e foco visível em cada bloco estrutural da biblioteca de seções.
- **Critério de Aceite:** 0 P0s nos três componentes do builder.

#### Microfase 4.2: Validação Bilateral de Blocos Customizados em JSONB (Invariante B.20)
- **Diagnóstico:** Ao salvar layouts no Admin Master, metadados de seções dinâmicas devem possuir espelho estrito nas tabelas de vitrine pública sem conteúdo estático hardcoded.
- **Ação:**
  - Validar contra schema Zod antes de persistir o array `sections` na tabela `marketplace_surfaces`.

---

### FRENTE 5: Purificação do Design Lint & Congelamento da Catraca de CI

#### Microfase 5.1: Erradicação dos 76 P0s Remanescentes no Repositório
- **Diagnóstico:** Há 76 violações P0 catalogadas em componentes e rotas secundárias (ex: `workspace.advocacia.index.tsx`, `workspace.pedidos.gestor.tsx`, `_store.doacoes.tsx`, `experience-media-carousel.tsx`, `classified-detail-desktop.tsx`).
- **Ação:**
  - Executar mutações atômicas de foco teclado e acessibilidade nos 46 arquivos identificados no relatório forense.
- **Critério de Aceite:** `Total P0: 0` no repositório inteiro.

#### Microfase 5.2: Congelamento Permanente da Nova Baseline de Qualidade
- **Diagnóstico:** A baseline de CI está configurada em 12.254 violações. Com a eliminação de mais de 1.796 débitos, a régua deve ser atualizada para impedir qualquer regressão futura.
- **Ação:**
  - Executar `npm run lint:design:update-baseline` após a aprovação de todos os testes e compilação limpa.
  - Comitar o arquivo `design-lint.baseline.json` atualizado.

---

## 4. Tabela de Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Obrigatória |
| :--- | :--- | :--- |
| **Conflito de Concorrência Git** | Sobrescrita de arquivos por outros agentes | Executar `git status` e inspeção de diffs antes de salvar arquivos. Nunca utilizar `git reset --hard` ou descarte cego. |
| **Regressão na Catraca de CI** | Bloqueio de commits e builds de produção | Rodar `node scripts/design-lint.mjs --ratchet` após cada lote de alterações antes de consolidar a microfase. |
| **Volatilidade de Dados** | Perda de configurações e filtros após F5 | Armazenamento persistido em banco multi-tenant ou LocalStorage com chave delimitada (`waesy_*_${storeId}`). |
| **Quebra de Acessibilidade** | Violação do piso WCAG 2.2 AA | Garantir que todo elemento com `onClick` possua `role="button"`, `tabIndex={0}`, `:focus-visible:ring-2` e touch target $\ge 44$px (`min-h-11`). |

---

## 5. Ordem Obrigatória de Execução

1. **Sprint 1 (Fase Crítica):** Erradicação dos P0s em `workspace.pedidos.gestor.tsx` e `workspace.advocacia.index.tsx`.
2. **Sprint 2 (Fase Transacional):** Conexão dos dados canônicos de endereço (Lat/Lng) e desmembramento do frete no Checkout Multi-Loja.
3. **Sprint 3 (Fase Construtor):** Acessibilidade ARIA no Canvas e Painéis do Builder Visual.
4. **Sprint 4 (Fase Fechamento):** Redução dos P0s a zero e congelamento oficial da nova baseline do Design Lint.
