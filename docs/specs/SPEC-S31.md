# SPEC-S31: Nativização Mobile, Tablet e Desktop nos 5 Viewports Canônicos

## 1. Contexto e Motivação
O Waesy adota uma arquitetura adaptativa universal para cidades e comunidades locais. Não é aceitável que a interface seja meramente "encolhida" em telas móveis gerando scroll horizontal, textos ilegíveis ou botões fora da zona do polegar (Hoober zone). Tampouco é admissível que em desktops ultrawide (1920px) o conteúdo se disperse em linhas infinitas de texto que violam os critérios de leitura confortável (máximo 75 caracteres / linha segundo WCAG e typography-scale).

Esta especificação define os 5 viewports canônicos do sistema, os containers adaptativos correspondentes, o layout Bento Grid desktop e a ancoragem de ações no terço inferior mobile com alvos de toque estritamente conformes (>= 44px).

---

## 2. Requisitos em Sintaxe EARS

### [REQ-S31-01] Viewports Canônicos Normativos
- **EARS (Ubíquo):** O sistema deve reconhecer e validar layouts contra exatamente 5 viewports canônicos de referência:
  1. `compact-sm`: 320px (Mobile Small / iPhone SE / dispositivos ultracompactos)
  2. `compact-md`: 390px (Mobile Modern / iPhone 13/14/15 / Galaxy S)
  3. `medium`: 768px (Tablet portrait / iPad)
  4. `expanded`: 1280px (Desktop / Laptop standard)
  5. `ultrawide`: 1920px (Ultra-Wide / 1080p full / 2K)

### [REQ-S31-02] Prevenção de Overflow Horizontal
- **EARS (Condicional ao Estado):** Enquanto qualquer viewport estiver ativo, a largura máxima do conteúdo não deve ultrapassar 100% da viewport (`overflow-x: hidden` e contenção rígida de largura), proibindo qualquer scroll horizontal acidental em tabelas, formulários e listagens.

### [REQ-S31-03] Zona do Polegar de Steven Hoober (Mobile Thumb Zone)
- **EARS (Guiado por Evento):** Quando renderizado em viewports compactos (< 600px), as ações primárias e navegação frequente devem se ancorar no terço inferior da viewport (`CanonicalHooberThumbZone`), com alvos de toque mínimos de 44x44px (`h-11`) e feedback tátil/visual imediato.

### [REQ-S31-04] Bento Grid Adaptativo
- **EARS (Condicional ao Estado):** Enquanto renderizado em viewports médios e expandidos (>= 768px), o sistema deve dispor dados, KPIs e cards em padrão Bento Grid (1 coluna em compact, 2 colunas em tablet, 3-4 colunas em desktop/ultrawide), mantendo hierarquia visual e densidade de informação sem espaços vazios espúrios.

### [REQ-S31-05] Showcase e Simulador Interativo de Viewports
- **EARS (Guiado por Evento):** Quando o desenvolvedor ou auditor acessar a rota `/workspace/design-system`, uma aba "Viewports" deve permitir a simulação em tempo real dos 5 viewports canônicos com alternador de dimensões e inspeção de conformidade.

---

## 3. Invariantes do Sistema
1. Zero violações DL-01 a DL-30 (zero `!important`, zero cores literais, zero classes com colchetes arbitrários).
2. Todo elemento interativo deve ter altura mínima de 44px (`h-11`) e anel de foco `focus-visible:ring-2`.
3. Máximo de 1 botão de ação primária com `variant="default"` por superfície visível (DL-25).
4. Em ultrawide (1920px), o container de leitura e edição deve ser contido em `max-w-7xl` centralizado, evitando fadiga ocular.

---

## 4. Critérios de Aceite
- [ ] Primitivas `CanonicalBentoGrid`, `AdaptiveViewportContainer` e `CanonicalHooberThumbZone` implementadas em `src/components/ui/canonical/viewport-container.tsx`.
- [ ] Exportadas no barrel `src/components/ui/canonical/index.ts`.
- [ ] Suíte de testes unitários `src/components/ui/canonical/viewport-container.test.ts` cobrindo os 5 viewports com 100% de aprovação.
- [ ] Showcase interativo de viewports integrado em `src/components/design-system/viewports-family.tsx` e na rota `/workspace/design-system`.
- [ ] Execução limpa de `node scripts/design-lint.mjs --ratchet` sem regressão.
- [ ] TypeScript typecheck com Exit Code 0.
- [ ] Build de produção com Exit Code 0.
