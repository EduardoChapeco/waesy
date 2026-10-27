# Plano de Refatoração Global: Nativização Mobile, Erradicação de AI-Smell e Padronização de Layouts

## 1. Contexto e Motivação
A plataforma Waesy requer uma experiência estritamente fluida, nativa e comercial (padrão Apple HIG, Stripe, Linear e iFood). Foram identificados desvios pontuais como:
- Caixas de texto explicativas redundantes ("AI-smell") que violam o princípio do design silencioso;
- Textos com tipografia reduzida abaixo do piso acessível de 12px (`text-[9px]`, `text-[10px]`, `text-[11px]`);
- Estrangulamento de grids em telas móveis por acúmulo de paddings ("grid dentro de grid" e margens duplas);
- Inconsistências de botões de ação e alvos de toque em drawers e menus;
- Uso excessivo do comando global de compilação TypeScript (`npm run typecheck`), gerando lentidão desnecessária de feedback durante ciclos iterativos.

---

## 2. Estratégia de Execução & Economia de Recursos
Para evitar consumo excessivo de tempo e créditos com checagens repetitivas de TypeScript:
1. **Verificação Semântica Focada**: Análise estática precisa e checagem pontual por arquivo/módulo apenas quando houver alteração de tipagem complexa.
2. **Typecheck Global Único**: O comando `npm run typecheck` será executado exclusivamente como gate final de homologação antes do commit/push final.
3. **Execução Dividida em 4 Fases Claras e Determinísticas**.

---

## 3. Fases de Execução

### Fase 1: Shells, Cabeçalhos e Alvos Táteis Globais (Piso 44px & Tipografia >= 12px)
- `src/components/navigation/native-mobile-header.tsx`:
  - Elevar subtítulo de `text-[11px]` para `text-xs` (`12px`).
  - Garantir anéis de foco (`focus-visible`) e alvos de toque mínimos de 44x44px em todos os botões de ação e voltar.
- `src/components/shell/top-bar.tsx`:
  - Corrigir badge BETA e tags auxiliares de `text-[9px]` para `text-xs font-mono font-medium`.
- `src/components/shell/mobile-nav.tsx`:
  - Elevar rótulos das abas de `text-[10px]` para `text-xs` com espaçamento ergonômico.
  - Manter piso de 44px de altura tátil nos botões da barra inferior.

### Fase 2: Drawers, Modais & Menus de Navegação (Padronização Nativa)
- `src/components/shell/global-menu-hub.tsx`:
  - Eliminar microfontes `text-[10px]` e converter para `text-xs font-medium`.
  - Padronizar itens de lista como controles diretos com `h-11 min-h-11` ou `py-2.5` com área de toque mínima de 44px.
- `src/components/chat/waesy-copilot-drawer.tsx`:
  - Limpar cabeçalho do Drawer para padrão nativo (sem sub-banners prolixos).
  - Ajustar botões de sugestão rápida para rótulos diretos e táteis.
- `src/components/navigation/context-sidebar.tsx`:
  - Garantir consistência nas listas laterais, padding limpo e ausência de caixas explicativas em cards de menu.

### Fase 3: Purificação Visual & Eliminação de AI-Smell em Rotas Principais
- `src/routes/_store.diretorio.index.tsx`:
  - **Eliminação de AI-Smell**: Remover o bloco explicativo "Desambiguação Canônica dos 4 Pilares" (linhas 125-144) que explica a própria tela com jargão técnico.
  - **Remoção de Margens Duplas Mobile**: Ajustar containers de `px-4 sm:px-5` para preenchimento fluido `px-0 sm:px-4` no mobile.
- `src/routes/_store.explorar.tsx`:
  - Purificar cabeçalhos e rótulos de busca, eliminando termos de desenvolvimento técnico.
  - Otimizar o grid de canais e trilhos de descoberta evitando estrangulamento lateral.
- `src/routes/_store.index.tsx` & vitrines:
  - Garantir que cards e trilhos usem o padrão de 1px da borda mobile sem quebras horizontais ou gaps mortos.

### Fase 4: Auditoria de RLS, Permissões e Validação Final
- Inspeção de consistência de rotas e segurança (RLS/Auth Guards).
- Execução do script de Design Lint (`node scripts/design-lint.mjs`).
- 1 única checagem de build/typecheck global (`npm run typecheck`).
- Registro da decisão no histórico arquitetural (`docs/design/DECISIONS.md`).

---

## 4. Critérios de Aceite
- [ ] Zero micro-fontes abaixo de 12px (`text-[9px]`, `text-[10px]`, `text-[11px]` eliminados).
- [ ] Todos os botões e links de navegação com alvos táteis de no mínimo 44px no mobile.
- [ ] Eliminação de caixas de boas-vindas/explicações redundantes de tela.
- [ ] Telas móveis aproveitando 100% da largura útil sem margens duplas ou grids espremidos.
- [ ] Build e Design Lint 100% aprovados sem erros P0/P1.
