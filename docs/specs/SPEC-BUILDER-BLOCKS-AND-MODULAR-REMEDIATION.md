# SPEC-303: Remediação Integral de Blocos Modulares do Builder e Live Template Preview

## Status
- **Status:** Aprovado
- **Data:** 2026-10-24
- **Autores:** Antigravity Architect
- **Alvo:** `src/components/builder/blocks/*` e `src/components/builder/LiveTemplatePreviewModal.tsx`

---

## 1. Contexto e Motivação
A auditoria forense do cluster Builder identificou 58 violações de Design Lint distribuídas em 7 componentes modulares de blocos visuais e pré-visualização de templates:
1. `HeroInteractiveCarousel.tsx`: 22 violações (3 P0, 11 P1, 4 P2, 4 P3).
2. `MediaGalleryMosaic.tsx`: 19 violações (3 P0, 11 P1, 4 P2, 1 P3).
3. `PricingTablesClean.tsx`: 5 violações (2 P0, 0 P1, 0 P2, 3 P3).
4. `HeroMinimalSplit.tsx`: 6 violações (0 P0, 4 P1, 2 P2, 0 P3).
5. `BentoAsymmetricGrid.tsx`: 3 violações (0 P0, 3 P1, 0 P2, 0 P3).
6. `LiveTemplatePreviewModal.tsx`: 2 violações (0 P0, 2 P1, 0 P2, 0 P3).
7. `FaqCleanAccordion.tsx`: 1 violação (1 P0, 0 P1, 0 P2, 0 P3).

Total de débitos a eliminar nesta rodada atômica: **58 violações** (9 P0, 26 P1, 10 P2, 13 P3).

---

## 2. Requisitos em Sintaxe EARS (Easy Approach to Requirements Syntax)

### R-01: Anéis de Foco Teclado (:focus-visible)
- **Quando** o usuário navega via teclado (Tab/Shift+Tab) pelos controles de carrossel, acordes de FAQ, lightbox de galeria e alternadores de precificação,
- **o sistema DEVE** projetar o anel de foco teclado de alta visibilidade (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).

### R-02: Piso Móvel de Alvo Tátil (44x44px)
- **Quando** um usuário interage com controles em viewports mobile (<600px) ou periféricos táteis,
- **o sistema DEVE** garantir área tátil mínima de 44x44px (`h-11 min-h-11 min-w-11`), envolvendo indicadores de pontos de carrossel e botões de navegação em áreas táteis conformes.

### R-03: Erradicação de Classes com Colchetes e Gradientes Utilitários
- **Quando** superfícies de layout, imagens ou tipografias forem renderizadas,
- **o sistema DEVE** utilizar tokens semânticos e classes canônicas (`min-h-96`, `min-h-128`, `leading-tight`, `text-2xs`, `aspect-16/10`, `aspect-4/5`, `h-screen-dvh`), eliminando 100% de classes arbitrárias com colchetes e sombras/gradientes decorativos em superfícies utilitárias.

### R-04: Transições Suaves e Acessibilidade de Movimento Reduzido
- **Quando** transições de hover ou estado ocorrerem,
- **o sistema DEVE** limitar transições a propriedades pontuais (`transition-colors`, `transition-transform`) e fornecer desativação estrita sob `motion-reduce:transition-none`.

---

## 3. Critérios de Aceite e Verificação
- [ ] 0 novas violações P0/P1 nos 7 arquivos alvo.
- [ ] 58 violações históricas expurgadas dos 7 componentes modulares.
- [ ] `node scripts/design-lint.test.mjs` permanece com 45/45 testes PASS.
- [ ] `node scripts/design-lint.mjs --ratchet` aprovado com queda substancial na contagem de violações.
- [ ] Atualização permanente da baseline via `--update-baseline`.
