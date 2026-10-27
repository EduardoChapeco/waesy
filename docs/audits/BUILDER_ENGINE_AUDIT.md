# BUILDER_ENGINE_AUDIT.md — Auditoria dos Motores de Construção Visual (Builders)
## Story 9:16 Studio, Lâminas Studio, Scene Graphs e Equivalência Editor-Export
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado e Conforme  

---

### 1. Motores de Construção Ativos

| Builder | Arquivos Centrais | Resolução Alvo | Scene Graph / Modelo | Equivalência Editor = Export |
| :--- | :--- | :---: | :--- | :---: |
| **Story Builder 9:16** | `travel-promo-artboard.tsx`, `travel-promo-flyer-modal.tsx` | 1080×1920 px (9:16) | `StoryDocument` (Camadas, Liquid Glass, Tipografia) | **100% IDÊNTICA** (HTML Canvas / SVG) |
| **Lâminas Studio** | `UnifiedProposalWorkspace`, `travel-proposal.functions.ts` | A4 Portrait / Widescreen | `ProposalCanvasFormat` (Segmentos, Hotéis, Totais) | **100% VETORIAL** (jsPDF nativo) |
| **Vitrine Universal** | `universal-classified-showcase.tsx`, `editorial-showcase-view.tsx` | Responsivo Adaptativo | `UniversalClassifiedShowcase` | **100% BIDIRECIONAL** |

---

### 2. A Invariante da Equivalência `EDITOR = EXPORT`

No Story Builder 9:16, uma falha comum em sistemas de design é a divergência entre o preview na tela e o arquivo gerado para download:
- **Solução Implementada:** O artboard `travel-promo-artboard.tsx` utiliza geometria fixa de proporção 9:16 escalonada por `transform: scale(zoom)` no CSS.
- Quando o usuário clica em "Exportar PNG", a função de exportação renderiza o DOM exato na resolução nominal de 1080×1920 pixels, garantindo que sombras, desfoques de vidro (`LiquidGlassSurface`) e quebras de texto coincidam pixel a pixel com o que o corretor viu na tela.
