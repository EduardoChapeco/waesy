# 07 — Auditoria da Experiência Desktop-Native (>= 840px)

## 1. Ocupação de Viewport e Densidade Visual
- **Padrão Aprovado (Rotas Canônicas):** Ocupação de 100% da altura da tela (`h-[calc(100vh-theme(spacing.16))]`), permitindo que Kanbans (como o de Pedidos e Tarefas) tenham rolagem horizontal fluida entre colunas e rolagem vertical independente dentro de cada coluna.
- **Padrão Reprovado (Rotas Legadas):** Páginas como `workspace.financeiro.caixa.index.tsx` forçam rolagem global da janela do navegador para visualizar tabelas de extrato, ocultando os filtros de cabeçalho quando o usuário rola para baixo.

---

## 2. Navegação por Teclado e Foco Visível
- O anel de foco `:focus-visible:ring-2 :focus-visible:ring-primary` está ativo em todos os novos componentes canônicos.
- Os atalhos rápidos de navegação (`ESC` para fechar drawers, `Enter` para confirmar modais) operam nas 5 telas aprovadas.
