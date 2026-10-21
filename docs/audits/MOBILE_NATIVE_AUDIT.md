# MOBILE_NATIVE_AUDIT.md — Auditoria da Experiência Mobile Native
## Ergonomia Tátil, Safe Areas, Touch Targets (44px), Gestos e 100dvh
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Componentes  

---

### 1. Diretriz Conceitual Mobile Native

> O Mobile **não é um desktop espremido em uma coluna**.  
> Ele é um **aplicativo tátil de alta fluidez**, com foco em uso com uma única mão (polegar), transições elásticas tipo iOS/Android, respeito a entalhes de hardware (Notch / Dynamic Island) e alvos de toque generosos (mínimo de 44x44px).

---

### 2. Inventário de Recursos Mobile Implementados

1. **Altura Dinâmica de Viewport (`100dvh`):**
   - Elimina o salto de layout (jank) quando a barra de endereços do navegador mobile aparece ou some durante a rolagem.
2. **Desobstrução de Safe Area (Invariante B.34):**
   - Modais, Drawers e Sheets aplicam preenchimento defensivo `pt-[max(1.25rem,env(safe-area-inset-top))]` e `pb-[max(1.25rem,env(safe-area-inset-bottom))]`.
   - O botão de fechar (`<X>`) posiciona-se estritamente abaixo do entalhe de hardware (`top-[max(1rem,env(safe-area-inset-top))]`).
3. **Piso Absoluto de Toque (Touch Target >= 44px / `h-11 min-h-11`):**
   - 100% dos botões de ação primária e secundária compartilham altura canônica mínima de 44px (`h-11`), eliminando cliques errados (DL-14).
4. **Hierarquia de Z-Index e Desconflito:**
   - Barras de ação flutuantes de compra (`ClassifiedFloatingActionBar`) operam em `z-30`.
   - Overlays de diálogo e gavetas operam em `z-50`, cobrindo 100% da viewport e impedindo rolagem fantasma de fundo.
5. **Divulgação Progressiva de Conteúdo (Progressive Disclosure):**
   - Fichas técnicas densas e inclusões de pacotes utilizam abas horizontais contínuas (`overflow-x-auto no-scrollbar`) inspiradas em perfis do Instagram/TikTok, evitando formulários infinitos.
