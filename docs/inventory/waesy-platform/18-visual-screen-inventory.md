# 18 — Inventário Visual das Telas e Padrões de Interface

O Waesy segue rigorosamente a **Constituição Visual (docs/design/DESIGN.md)** e as diretrizes do **Apple Human Interface Guidelines (HIG)**.

## 1. Famílias de Telas Inspecionadas
1. **Casca de Vitrine Pública (`StorefrontShell`):**
   - Topbar com piso canônico de 44px (`h-11 min-h-11`), botão de localização dinâmica e campo de busca global.
   - Navegação inferior de 5 abas (`mobile-nav.tsx`) no mobile e barra lateral dinâmica no desktop.
   - Visualização de cards em grade de 2 colunas no desktop para evitar distorção horizontal (DL-32).
2. **Casca do Workspace Corporativo (`WorkspaceShell`):**
   - Sidebar retrátil com 38 grupos de ferramentas operacionais.
   - Cabeçalhos de módulo objetivos, sem prolixidade conversacional (anti-AI-smell).
   - Tabelas densas de dados com paginação, filtros por bottom sheet no mobile e ações imediatas com toast.
3. **Casca do Estúdio Builder Omni (`OmniEditor`):**
   - Canvas WYSIWYG com preview para Desktop (1440px), Tablet (768px), Mobile (390px) e App Nativo.
   - Painel esquerdo com seletor guiado de seções, galeria de 15 templates de nicho e explorador de páginas.
   - Inspetor lateral contextual (`UniversalBlockInspector`) para conteúdo, dados, aparência, layout e comportamento.
