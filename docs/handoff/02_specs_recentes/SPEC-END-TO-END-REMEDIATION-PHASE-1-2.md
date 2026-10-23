# SPEC-END-TO-END-REMEDIATION-PHASE-1-2 — Remediação End-to-End: Erradicação de Fallbacks Sintéticos e Bilateralidade do CMS de Vitrines

## 1. Contexto e Motivação
A auditoria forense determinística identificou violações críticas das Invariantes do repositório:
1. `src/services/admin-home-cms.functions.ts` e `src/services/mining/business-curation-bootstrap.ts` contêm mais de 30 URLs de bancos de imagem externos (Unsplash) servindo como fallbacks silenciosos, violando as regras B.8 e B.33 (Proibição estrita de fallbacks sintéticos).
2. As vitrines verticais públicas `_store.turismo.tsx`, `_store.mobilidade.tsx` e `_store.eventos.tsx` operam com blocos e trilhos comerciais desconectados do Surface CMS, violando a Invariante B.20 (Bilateralidade do CMS de Vitrines).
3. Rotas financeiras do Workspace mantêm árvores concorrentes duplicadas no DOM via classes utilitárias CSS (`block md:hidden` e `hidden md:block`), violando a Invariante B.42 (Proibição de Dual-DOM).

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Erradicação Total de URLs Unsplash em Serviços de CMS e Bootstrap
- **Quando** `listPublicHomePageSections`, `getHomeSectionsAdmin` ou rotinas de curadoria em `business-curation-bootstrap` forem invocadas;
- **O sistema DEVE** retornar `image_url: null` ou `banner_url: null` caso não exista imagem legítima cadastrada pelo lojista ou minerada do domínio oficial;
- **Invariante:** B.8 e B.33 (Zero Fallbacks Sintéticos). O frontend deve renderizar layouts tipográficos ou omitir o container sem elementos de imagem quebrada.

### [EARS-02] Bilateralidade do CMS em Vitrines Verticais
- **Quando** o usuário acessar as vitrines públicas `_store.turismo.tsx`, `_store.mobilidade.tsx` ou `_store.eventos.tsx`;
- **O sistema DEVE** consultar as seções dinâmicas ativas configuradas no Admin Master via `getModularSurfaceFeed` com seus respectivos slugs de superfície (`"turismo"`, `"mobilidade"`, `"eventos"`), integrando `ModularSurfaceFeed` para renderização 100% bilateral;
- **Invariante:** B.20 (Bilateralidade do CMS). Proibido declarar blocos comerciais com dados hardcoded sem espelho no Admin Master.

### [EARS-03] Bifurcação Estrita em Telas Financeiras do Workspace (Zero Dual-DOM)
- **Quando** o operador acessar `/workspace/financeiro/caixa` ou `/workspace/financeiro/contas-pagar`;
- **O sistema DEVE** bifurcar a renderização exclusivamente na raiz do componente React via `useWindowSizeClass()` (`isMobile ? <...MobileView /> : <...DesktopView />`), montando rigorosamente uma única casca viva no DOM;
- **Invariante:** B.42 (Zero Dual-DOM) e B.44 (Anti-Truncate tipográfico).

## 3. Matriz de Aceite e Evidências
1. Zero URLs de bancos externos (`images.unsplash.com`) em arquivos de serviços de CMS e bootstrap em tempo de execução.
2. Rotas de vitrine vertical conectadas ao Surface CMS do Admin Master.
3. Zero classes utilitárias concorrentes `block md:hidden` nas rotas financeiras refatoradas.
4. `tsc --noEmit` aprovado com Exit Code 0.
5. Suíte de testes unitários aprovada com Exit Code 0.
6. `design-lint.mjs --ratchet` aprovado com 0 regressões visuais.
