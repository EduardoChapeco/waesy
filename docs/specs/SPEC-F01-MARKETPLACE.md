# SPEC-F01: Rota Mãe do Marketplace e Seletor Canônico de Vitrines Nichadas

## 1. Contexto e Motivação
A plataforma Waesy possuía desarticulação entre o Diretório de Empresas (`Places`), os anúncios avulsos (`Classificados`) e o comércio transacional de empresas ativas (`Marketplace`).

A Fase F01 estabelece a rota mãe canônica do **Marketplace** (`/_store/marketplace/`), ativando o hub central de vitrines por nicho (Turismo, Gastronomia, Varejo, Serviços, Imóveis e Veículos), exibindo ofertas exclusivas de lojistas com Workspace ativo (Painel Pro), selo de Empresa Verificada e suporte a transação/checkout.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F01-01] Rota Canônica do Marketplace
- **EARS (Quando acessado):** Ao navegar para `/marketplace`, o sistema deve carregar a rota `src/routes/_store.marketplace.index.tsx` dentro do layout público unificado da cidade.

### [REQ-F01-02] Seletor de Vitrines Nichadas
- **EARS (Ubíquo):** A página inicial do Marketplace deve fornecer seletor tátil de vitrines por nicho com ícones canônicos e contadores de ofertas ativas para:
  1. Turismo & Viagens
  2. Gastronomia & Bares
  3. Lojas & Comércio Local
  4. Serviços Profissionais
  5. Imóveis & Temporada
  6. Veículos & Mobilidade

### [REQ-F01-03] Distinção Visual e Selo de Empresa Verificada
- **EARS (Ubíquo):** Todo item listado no Marketplace deve obrigatoriamente exibir o selo semântico de "Empresa Verificada (Workspace)", diferenciando-se de forma inequívoca dos anúncios avulsos do Classificados.

### [REQ-F01-04] Matriz de Estados e Acessibilidade
- **EARS (Ubíquo):** A interface deve fornecer a matriz completa de 4 estados (dados, skeleton de carregamento, empty state quando não houver ofertas no nicho e erro com recarregamento), touch targets mínimos de 44px (`h-11`) e anéis de foco `:focus-visible`.

---

## 3. Invariantes
1. Nenhum anúncio informal de pessoa física do Classificados pode aparecer na listagem do Marketplace.
2. Todo lojista exibido deve ter perfil empresarial vinculado ao Workspace (`has_workspace_pro === true`).
3. Zero classes arbitrárias com colchetes e zero violações no Design Lint.

---

## 4. Critérios de Aceite
- [ ] `src/components/marketplace/marketplace-hub.tsx` implementado com seletor de vitrines e grid de ofertas de empresas.
- [ ] `src/routes/_store.marketplace.index.tsx` implementada e registrada no roteador TanStack Router.
- [ ] Testes unitários cobrindo o Hub do Marketplace em `src/components/marketplace/marketplace-hub.test.ts`.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
