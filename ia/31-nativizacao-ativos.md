# Relatório Normativo — PROMPT 31: Nativização e Deduplicação de Ativos Entre Projetos

## 1. Visão Geral e Escopo
- **ID do Plano**: Plano #41 (PROMPT 31).
- **Missão**: Triagem exaustiva dos diretórios `legacy_quarantine/` (66 arquivos) e `scratch/`, deduplicação estrutural de componentes dispersos e nativização canônica de componentes de alto valor para a árvore `src/`.
- **Governança**: Zero perda de capacidade funcional, conformidade estrita com Apple HIG, design tokens canônicos (zero inline hex), alvos de toque >= 44px (`h-11`), tratamento de movimento reduzido (`motion-reduce:animate-none`), e proteção de catraca de CI.

---

## 2. Matriz de Triagem e Classificação de Ativos

| Diretório / Ativo Original | Destino Canônico em `src/` | Status da Triagem | Justificativa Arquitetural |
| :--- | :--- | :--- | :--- |
| `legacy_quarantine/tourism_trips/` | `src/components/tourism/`, `src/routes/workspace.turismo.viagens.$id.tsx` | ABSORVIDO | Rotas nativas do TanStack Router já implementadas com Server Functions tipadas e validação Zod. |
| `legacy_quarantine/tourism_proposals/` | `src/components/tourism/proposal-canvas-renderer.tsx` | ABSORVIDO | Renderizador canônico de propostas comerciais de turismo já integrado ao ecossistema. |
| `legacy_quarantine/tourism_boarding/` | `src/components/tourism/boarding-list-view.tsx` | ABSORVIDO | Controle de embarque, manifesto de passageiros e validação de assentos já nativizados. |
| `legacy_quarantine/tourism_crm/` | `src/services/tourism.functions.ts` | ABSORVIDO | Gestão de contatos e leads operacionais já centralizada na camada BFF. |
| `legacy_quarantine/restaurante/GarcomApp.tsx` | `src/components/pos/quick-waiter-order-modal.tsx` | ABSORVIDO | Lançamento rápido de pedidos de garçom para mesas já incorporado ao módulo POS. |
| `legacy_quarantine/restaurant/TablesTab.tsx` | `src/routes/workspace.restaurante.mesas.tsx` | ABSORVIDO | Painel de visualização de mesas e ocupação física já integrado à área de trabalho. |
| Leitor Óptico / Barcode Scanner | `src/components/scanner/barcode-scanner-modal.tsx` | NATIVIZADO | Componente canônico unificado com classificação pura (`classifyScannedCode`), câmera com lanterna e entrada manual. |
| Kitchen Display System (KDS) Card | `src/components/pos/kds-order-card.tsx` | NATIVIZADO | Cartão de pedido em tempo real com cronômetro de preparo, badges de prioridade e alternância de itens concluídos. |
| `scratch/` | — | DESCARTADO | Arquivos temporários e rascunhos de testes manuais, sem nenhuma referência ativa no código-fonte. |

---

## 3. Ativos Nativizados e Validados

### 3.1 `src/components/scanner/barcode-scanner-modal.tsx`
- Classificador determinístico de códigos: EAN-13, EAN-8, UPC, NF-e (44 dígitos), PIX EMV (código `000201`), cupons, credenciais e URLs de produto.
- Captura de vídeo responsiva via `navigator.mediaDevices.getUserMedia` com botão de lanterna (tocha) quando suportado pelo hardware.
- Alternativa por digitação manual com confirmação por teclado (`Enter`) e sanitização de dados.
- Design tokens semânticos, ausência de valores mágicos arbitrários e conformidade estrita com `scripts/design-lint.mjs` (0 violações).

### 3.2 `src/components/pos/kds-order-card.tsx`
- Componente de exibição de comandas de cozinha com contagem de minutos em tempo real.
- Diferenciação visual por estados: normal, atenção (10 a 14 min) e atrasado (>= 15 min com `text-destructive`).
- Suporte a múltiplas origens de pedidos: Balcão (`pdv`), Entrega (`delivery`), Mesas (`table`) e Aplicativos de Terceiros (`marketplace`).
- Controle granular de itens finalizados com acessibilidade por teclado (`:focus-visible:ring-2`).

---

## 4. Evidências de Teste e Integração

- **Testes Unitários**:
  - `src/components/scanner/barcode-scanner.test.ts`: 6 testes aprovados (classificação EAN, PIX, NF-e, cupons, URLs e digitação vazia).
  - `src/components/pos/kds-order-card.test.ts`: 3 testes aprovados (cálculo de atraso, badges de origem e status de preparo).
- **Design Lint**: 0 violações introduzidas, catraca aprovada com 38.444 violações mantidas (`node scripts/design-lint.mjs --ratchet`).
- **TypeScript**: 0 erros em 1.546 arquivos compilados (`npm run typecheck`, Exit Code 0).
- **Produção**: Build limpo do worker único Cloudflare Pages em `dist/_worker.js` (`npm run build`, Exit Code 0).
