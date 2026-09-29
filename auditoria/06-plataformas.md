# Split Nativo Mobile × Nativo Desktop

## 1. Diretrizes por Shell
- **Nativo Mobile (<640px):**
  - Margem milimétrica de 1px da borda (`px-[1px]`). Proibição de margem dupla.
  - WhatsApp List Edge-to-Edge com `divide-y divide-border/40`.
  - Thumb Zone fixa no terço inferior com alvos de toque mínimos de 44px (`h-11`).
  - Navegação por Bottom Sheets (`100dvh`) em vez de modais flutuantes.
  - Ausência de TopBar global poluída em telas de checkout, pedidos e entregas (`isCleanMobileAppPage`).
- **Nativo Desktop (>1024px):**
  - Sidebar persistente de 260px com fundo suave e cantos arredondados.
  - Atalhos de teclado (F2 para busca, F4 para pagamento, ESC para fechar).
  - Split View / Master-Detail (Lista de itens à esquerda e ticket de conferência à direita).
  - Densidade alta com tabelas ordenáveis e ações contextuais por linha.

## 2. Divergências Intencionais
| Módulo | Mobile | Desktop | Justificativa |
| --- | --- | --- | --- |
| Carrinho PDV | Floating Drawer expansível no polegar | Painel lateral direito fixo | Ergonomia de toque vs visualização de conferência contínua |
| Planta de Salão | Grid de rolagem horizontal com snap por mesa | Bento Grid 2D de alta resolução com zoom | Dimensão de tela útil |
