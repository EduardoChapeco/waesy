# 08 — Auditoria da Experiência Mobile-Native (< 600px)

## 1. Piso Tátil de 44px (WCAG 2.2 / Apple HIG)
- **Total de Violações Mapeadas:** 152 páginas contêm botões ou links interativos com altura de 32px ou 36px (`h-8` ou `h-9`) sem padding compensatório de toque.
- **Impacto:** Em smartphones de telas compactas (<390px), botões pequenos causam toques acidentais e frustração operacional.
- **Remediação:** Toda ação em ambiente mobile deve receber utilitário canônico `min-h-11` (44px) ou invólucro tátil de 44x44px.

---

## 2. Modais vs. Bottom Sheets com Safe Area
- Em rotas móveis, formulários densos devem ser apresentados como Bottom Drawers com área de segurança superior (`pt-safe`) e botão de fechar posicionado abaixo do entalhe de hardware (`top-safe`).
- Apenas as rotas de detalhe de classificados e as 5 telas canônicas adotam esse padrão com conformidade total.
