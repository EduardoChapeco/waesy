# SPEC-20261028-ACCOUNT-SWITCHER-TETRIS-GRID.md
## Reformulação Completa do Modal de Perfil & Minha Conta com TetrisGrid

- **Status:** Aprovado para Implementação
- **Data:** 2026-10-28
- **Contexto:** O modal de conta e perfil (`AccountSwitcherDrawer.tsx`) apresentava duplo puxador (drag handle redundante), ausência de diversos serviços essenciais da conta do usuário que foram suprimidos (como Cupons, Ingressos, Viagens, Classificados, Favoritos, Agendamentos, Tokens, Carnês, Gift Cards, Negociações e Currículo), e uma lista vertical monótona em vez do padrão de alta densidade e empacotamento TetrisGrid / BentoGrid.

---

### 1. Requisitos em Sintaxe EARS

#### 1.1 Remoção de Puxador Redundante (Zero Double Grab Handle)
- **Quando** o modal `AccountSwitcherDrawer` for renderizado em bottom sheet, **o sistema deve** confiar exclusivamente no drag handle nativo fornecido por `SheetContent`, eliminando qualquer barra cinza duplicada inserida manualmente no corpo do componente.

#### 1.2 Restauração Integral de Serviços Pessoais
- **O sistema deve** restaurar 100% dos serviços e opções da conta pessoal do ecossistema Waesy:
  1. Carteira & Finanças (`/conta/financas`)
  2. Pedidos & Compras (`/conta/pedidos`)
  3. Clube & Cupons (`/conta/creditos`)
  4. Mensagens & Avisos (`/conta/conversas`)
  5. Notificações (`/conta/notificacoes`)
  6. Endereços Salvos (`/conta/enderecos`)
  7. Favoritos & Salvos (`/conta/salvos`)
  8. Meus Anúncios (`/conta/classificados`)
  9. Ingressos & Eventos (`/conta/ingressos`)
  10. Viagens & Pacotes (`/conta/viagens`)
  11. Agendamentos (`/conta/agendamentos`)
  12. Mobilidade Waesy Go (`/conta/mobilidade`)
  13. Currículo & Carreiras (`/conta/curriculo`)
  14. Tokens WZ & Cashback (`/conta/tokens`)
  15. Carnês & Faturas (`/conta/carnes`)
  16. Gift Cards (`/conta/gift-cards`)
  17. Negociações & Trocas (`/conta/negociacoes`)
  18. Segurança & Senha (`/conta/seguranca`)
  19. Verificação Civil (`/conta/verificacao`)
  20. Central de Ajuda & FAQ (`/conta/suporte`)

#### 1.3 Arquitetura de Layout TetrisGrid / BentoGrid
- **O sistema deve** dispor os serviços em uma composição densa de blocos BentoGrid / TetrisGrid:
  - **Bloco 1 (Destaques Hero 2x1)**: Cards amplos para Carteira/Saldo e Pedidos/Compras.
  - **Bloco 2 (Benefícios & Comunicação)**: Cards com badges para Clube/Cupons e Mensagens.
  - **Bloco 3 (Mosaico Tetris 3 Colunas)**: Cards squircles compactos com ícone e texto para Endereços, Favoritos, Anúncios, Ingressos, Viagens, Agendamentos, Mobilidade, Currículo, Tokens, Carnês, Gift Cards e Negociações.
  - **Bloco 4 (Governança & Segurança)**: Cards horizontais elegantes para Segurança, Verificação Civil e Suporte.

#### 1.4 Conformidade Acessibilidade & Design System
- **O sistema deve** garantir touch targets mínimos de 44x44px em todos os botões (`min-h-11`), anéis `:focus-visible:ring-2`, espaçamentos múltiplos de 4px e zero cores literais fora de tokens semânticos.

---

### 2. Matriz de Arquivos Afetados

| Arquivo | Papel na Correção |
| :--- | :--- |
| `src/components/shell/AccountSwitcherDrawer.tsx` | Redesenho integral com arquitetura TetrisGrid, restauração de todos os módulos de conta e remoção do puxador duplicado. |
| `src/components/shell/account-switcher-drawer.test.tsx` | Atualização dos testes unitários para validar a presença de serviços na grade TetrisGrid. |
| `docs/design/DECISIONS.md` | Registro canônico da decisão DEC-352. |
