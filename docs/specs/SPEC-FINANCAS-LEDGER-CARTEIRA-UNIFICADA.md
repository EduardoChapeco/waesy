# SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA — Arquitetura de Finanças Pessoais, Ledger de Partidas Dobradas e Extrato Unificado

## 0. Metadados e Controle
- **ID da Spec:** SPEC-FINANCAS-LEDGER-CARTEIRA-UNIFICADA
- **Título:** Finanças Pessoais, Ledger de Três Livros, Event Bus Financeiro e Extrato Unificado
- **Autor / Agente Responsável:** Antigravity Architect & PM
- **Data de Aprovação:** 2026-10-21
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Consolidar a arquitetura financeira da conta civil do Waesy através da separação estrita de Três Livros (Financeiro Pessoal, Ledger Econômico e Ledger de Dinheiro Movimentável), motor de partidas dobradas append-only, barramento canônico de eventos financeiros, extrato unificado de extrato bancário com comprovante criptográfico e UI estruturada em 4 pilares ([ Visão Geral ], [ Extrato ], [ Planejamento ], [ Conta ]).
- **Escopo Incluído:**
  - `supabase/migrations/20270219000000_canonical_financial_ledger_and_unified_feed.sql`
  - `src/services/financial-ledger.functions.ts`
  - `src/services/financial-event-bus.service.ts`
  - `src/services/personal-finance.functions.ts`
  - `src/routes/_store.conta.financas.tsx`
  - `src/services/__tests__/financial-ledger-and-unified-feed.test.ts`
  - `docs/design/DECISIONS.md`
- **Não-Objetivos:**
  - Permitir que OCR, upload de recibo, arquivo OFX ou lançamento manual altere ou crie saldo na carteira movimentável.
  - Implementar gateway proprietário ad-hoc fora do ecossistema central de pagamentos.
  - Misturar unidades de recompensa $WZ como se fossem dinheiro fiduciário R$ movimentável.

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo:** O sistema DEVE manter estrita separação entre o Livro Financeiro Pessoal (analítico/informativo), o Ledger Econômico Waesy (operações da plataforma) e o Ledger de Dinheiro Movimentável (partidas dobradas: Débito - Crédito = 0, centavos inteiros).
- **Ubíquo:** O sistema DEVE armazenar todos os valores monetários como inteiros estritos em centavos (`amount_cents`), proibindo frações de centavos ou números de ponto flutuante em persistência contábil.
- **Acionado por Evento:** QUANDO um evento financeiro canônico for emitido (`order_paid`, `ride_completed`, `p2p_transfer`, `ticket_purchased`, `refund_processed`), o sistema DEVE registrar o evento no feed unificado, atualizar o ledger de partidas dobradas e gerar comprovante digital com assinatura HMAC-SHA256 verificável.
- **Acionado por Evento:** QUANDO o usuário importar extrato bancário (OFX/CSV), o sistema DEVE verificar a idempotência via FITID e hash criptográfico, rejeitando duplicidades e registrando os lançamentos exclusivamente no Livro Financeiro Pessoal.
- **Orientado a Estado:** ENQUANTO o usuário estiver visualizando lançamentos na aba [ Extrato ], o sistema DEVE permitir clique em qualquer transação para abrir o drawer de detalhe com link bidirecional para a entidade de origem (pedido, corrida, ingresso) e visualização do comprovante oficial.
- **Orientado a Estado:** ENQUANTO o modal de criação de lançamento estiver ativo, o seletor de categorias DEVE listar categorias normalizadas e deduplicadas sem repetição visual.
- **Exceção:** SE qualquer operação tentar executar `UPDATE balance` diretamente ou debitar conta com saldo insuficiente na carteira movimentável, ENTÃO o sistema DEVE rejeitar a transação de forma atômica com erro estruturado e registrar log de auditoria.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] Estado de Dados (Data/Success): 4 abas estruturadas ([ Visão Geral ], [ Extrato ], [ Planejamento ], [ Conta ]) com valores formatados em R$.
- [x] Estado de Carregamento (Loading/Skeleton): Indicadores de carregamento sem Cumulative Layout Shift (CLS < 0.05).
- [x] Estado Vazio (Empty): Mensagem honesta e botão de ação para adicionar primeiro lançamento ou movimentação.
- [x] Estado de Erro (Error): Toasts e banners de erro com retry seguro.
- [x] Touch Targets: Controles com altura mínima de 44px (`h-11 min-h-11`).
- [x] Contraste: Conforme WCAG 2.2 AA (>= 4.5:1 texto, >= 3.0:1 controles).
- [x] Foco de Teclado: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` em todos os elementos clicáveis.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação Prevista | Justificativa Técnica |
| --- | --- | --- |
| `supabase/migrations/20270219000000_canonical_financial_ledger_and_unified_feed.sql` | Criar | Tabelas de ledger de partidas dobradas, contas, eventos e comprovantes HMAC |
| `src/services/financial-ledger.functions.ts` | Criar | Funções de carteira movimentável, transferências P2P atômicas e reconciliação |
| `src/services/financial-event-bus.service.ts` | Criar | Barramento canônico de eventos e projeção para extrato unificado |
| `src/services/personal-finance.functions.ts` | Modificar | Deduplicação de categorias, importação OFX idempotente e isolamento anti-tamper |
| `src/routes/_store.conta.financas.tsx` | Modificar | Refatoração em 4 pilares: Visão Geral, Extrato, Planejamento, Conta |
| `src/services/__tests__/financial-ledger-and-unified-feed.test.ts` | Criar | Cobertura de testes unitários e de integração contábil |
| `docs/design/DECISIONS.md` | Modificar | Registro DEC-281 da decisão arquitetural |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. Invariante `Debit - Credit = 0` validada por testes e constraint de banco.
2. Deduplicação de categorias confirmada: zero duplicidades no retorno de `listPersonalFinanceCategories`.
3. Deduplicação de extratos bancários por FITID/hash: re-importação do mesmo arquivo não duplica lançamentos.
4. Isolamento estrito: OCR e lançamentos manuais jamais incrementam saldo da carteira movimentável.
5. `npx vitest run src/services/__tests__/financial-ledger-and-unified-feed.test.ts` com 100% dos testes aprovados.
6. `npm run typecheck` com Exit Code 0.
7. `node scripts/design-lint.mjs --ratchet` com 0 violações P0 e 0 violações P1.
8. Registro em `docs/design/DECISIONS.md`.
