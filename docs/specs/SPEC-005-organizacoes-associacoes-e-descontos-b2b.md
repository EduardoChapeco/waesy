# SPEC-005 — Ecossistema de Organizações, Associações e Descontos Inter-Associados B2B

## 0. Metadados e Controle
- **ID da Spec:** SPEC-005
- **Título:** Organizações, Associações Comerciais, Entidades de Classe, Rede de Empresas Parceiras e Motor de Descontos B2B
- **Autor / Agente Responsável:** spec-writer & fullstack-architect
- **Data de Aprovação:** 2026-11-02
- **Status:** APROVADO

---

## 1. Missão, Escopo e Não-Objetivos
- **Missão:** Habilitar a criação e gestão de organizações, associações comerciais (ACIs, CDLs, Polos Tech), sindicatos e ONGs na plataforma Waesy, permitindo que empresas se associem a entidades, ofereçam descontos recíprocos entre associados com regra do maior desconto no checkout, exibam a rede de parceiros em aba pública no perfil da entidade e permitam à associação metrificar negócios gerados (transações diretas via plataforma e indiretas/offline).
- **Escopo Incluído:**
  1. Expansão de criação de negócios (`_store.criar-negocio.tsx`, `_store.criar-negocio.avancado.tsx`, `business-segments.ts`) para suportar Organizações, Associações e ONGs.
  2. Nova tabela e migration `store_association_memberships` com fluxo de solicitação, aprovação e definição de percentual de desconto.
  3. Nova tabela e migration `association_b2b_transactions` para registro de negócios diretos e indiretos/offline com valor bruto, desconto e valor líquido.
  4. Server functions em `src/services/association.functions.ts` com Zod estrito e multi-tenant (Rule B.25).
  5. Motor de cálculo de descontos inter-associados com prevalência do maior percentual (`MAX(discount_percent)`).
  6. Aba pública "Empresas Associadas" no perfil da loja/entidade (`_store.loja.$slug.tsx`).
  7. Painel de gestão e metrificação da associação no Workspace (`src/routes/workspace.associacao.tsx`).
- **Não-Objetivos:**
  - Não institui cobrança de mensalidade de associação obrigatória via gateway (a filiação é regida pela entidade).
  - Não altera regras de comissão do Waesy Go (0% de taxa fixa de R$ 0,99 em entregas permanece intocada).

---

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)
- **Ubíquo:** O sistema DEVE identificar lojas do tipo `associacao`, `organizacao`, `ong`, `sindicato` ou `cooperativa` e habilitar a gestão da rede de empresas associadas.
- **Acionado por Evento (Solicitação de Associação):** QUANDO uma empresa solicitar filiação a uma organização/associação, o sistema DEVE registrar o vínculo com status `pending` até que a entidade aprove.
- **Acionado por Evento (Aprovação e Desconto Padrão):** QUANDO a associação aprovar a filiação, o sistema DEVE ativar o status `approved` e registrar o percentual de desconto pactuado entre as partes.
- **Orientado a Estado (Compra Inter-Associados):** ENQUANTO uma empresa compradora associada realizar pedido em uma empresa vendedora associada à mesma entidade, o sistema DEVE aplicar o desconto B2B na finalização.
- **Opcional (Múltiplas Associações):** ONDE o comprador e o vendedor compartilharem múltiplas associações com percentuais de desconto distintos, o sistema DEVE aplicar exclusivamente o MAIOR desconto disponível (`Math.max(...)`).
- **Acionado por Evento (Registro Offline):** QUANDO a empresa ou a associação registrar um negócio gerado offline entre associados, o sistema DEVE computar o volume bruto e o desconto no ledger de métricas mensais da entidade.
- **Exceção:** SE a empresa compradora não tiver status `approved` na associação da vendedora, ENTÃO o sistema DEVE manter o preço de tabela integral sem falha de execução.

---

## 3. Matriz de Estados e Acessibilidade (WCAG 2.2 AA)
- [x] Estado de Dados: Lista de empresas associadas com logotipo 1:1 Squircle, nicho e badge de desconto.
- [x] Estado de Carregamento: Skeleton suave preservando proporção 1:1 sem Cumulative Layout Shift (CLS < 0.05).
- [x] Estado Vazio: Mensagem concisa ("Nenhuma empresa associada ainda", com botão para convidar ou solicitar filiação).
- [x] Estado de Erro: Tratamento resiliente com toast e retry sem tela branca.
- [x] Touch Targets: Todos os botões e links com altura mínima canônica de 44px (`h-11 min-h-11`).
- [x] Contraste: Texto >= 4.5:1 e controles >= 3:1 (tokens semânticos de styles.css).
- [x] Foco: `:focus-visible:ring-2 focus-visible:ring-primary` obrigatório em todos os controles.

---

## 4. Arquivos Impactados e Limites de Alteração
| Arquivo | Ação | Justificativa Técnica |
| :--- | :--- | :--- |
| `supabase/migrations/20261102210000_associations_and_b2b_partnerships.sql` | Criar | DDL das tabelas `store_association_memberships` e `association_b2b_transactions` com RLS |
| `src/lib/constants/business-segments.ts` | Modificar | Adição da categoria `organizacoes` e segmentos `associacao_comercial`, `coletivo_ong`, `cooperativa` |
| `src/services/association.functions.ts` | Criar | Server functions BFF para CRUD, aprovação, cálculo de maior desconto e métricas |
| `src/routes/workspace.associacao.tsx` | Criar | Painel de controle da associação (membros, aprovações, tabela de desconto e métricas de negócios) |
| `src/routes/_store.loja.$slug.tsx` | Modificar | Exibição da aba "Empresas Associadas" no perfil público da organização/entidade |
| `src/routes/_store.criar-negocio.tsx` | Modificar | Suporte à seleção do tipo de entidade (Associação, ONG, Cooperativa) |
| `src/services/__tests__/association-b2b-engine.test.ts` | Criar | Cobertura de testes unitários para fluxo de aprovação, regra do maior desconto e métricas |

---

## 5. Critérios de Aceite e Evidências Esperadas
1. Zero erros de compilação TypeScript (`npm run typecheck` com Exit Code 0).
2. Verificação de contratos BFF (`npm run check:bff` com Exit Code 0).
3. Testes automatizados cobrindo a regra do maior desconto e registro de métricas com 100% de aprovação.
4. Lint visual mecânico sem violações P0/P1 (`node scripts/design-lint.mjs --ratchet`).
5. Build de produção com geração de assets e worker Nitro com Exit Code 0.
