# SPEC-AFFILIATE-CREATOR-PROFILE-DECOUPLING — Desacoplamento Semântico e Isolamento entre Perfil de Parceiro Afiliado e Perfil de Criador

## 1. Contexto e Diagnóstico
Identificou-se que o módulo de Afiliados (`/afiliados`, implementado em `_store.afiliados.tsx`) apresentava vazamento cruzado e confusão de identidade com o módulo de Criadores (`_store.conta.criadores.tsx`):
1. **Sobreposição de Conceitos:** Ao clicar em "Editar Perfil" dentro do módulo de Afiliados (`/afiliados`), o usuário era confrontado com uma gaveta/modal intitulada **"Editar Perfil de Criador"**, exigindo **"Nome Artístico / Marca Pública"** e com a descrição **"Defina sua identidade visual, segmento de atuação e canais para curar vitrines."**.
2. **Invariante B.37 Violada:** A Invariante B.37 do `AGENTS.md` (Isolamento Semântico Estrito de Nichos & Erradicação de Vazamento Cruzado) proíbe categoricamente que termos, badges ou lógicas de um contexto (ex.: influenciador/criador com "shows", "nome artístico", "vitrine de curadoria") vazem para contextos não correlacionados (como parceiros afiliados focados em links de recomendação, comissões, PIX e extrato de vendas).
3. **Acoplamento no Componente de Edição:** O componente `CreatorProfileSheetEditor` possuía títulos, ícones, descrições e rótulos de campos hardcoded para "Criador", sem qualquer suporte a polimorfismo ou modo contextual.

## 2. Requisitos em Sintaxe EARS
- **REQ-01 (Ubiquitous — Suporte Contextual no Editor de Perfis):** O componente `CreatorProfileSheetEditor` **SHALL** aceitar a propriedade `mode?: "affiliate" | "creator"` (com fallback padrão `"creator"` para retrocompatibilidade).
- **REQ-02 (State-Driven — Modo Parceiro Afiliado no Editor):** Quando `mode === "affiliate"`, o componente **SHALL**:
  - Apresentar título: `"Editar Perfil de Parceiro"` (ou `"Ativar Perfil de Parceiro"` se `isNew`);
  - Apresentar ícone contextual de parceria (`UserCheck` ou `Handshake`) em vez de estrela de celebridade/criador;
  - Apresentar descrição: `"Defina sua identificação de parceiro, dados de divulgação e canais de indicação."`;
  - Rótulo de identificação: `"Nome de Exibição do Parceiro *"` (com placeholder `"Ex: Nome ou Marca de Divulgação"`);
  - Rótulo de nicho: `"Área de Atuação / Divulgação *"`;
  - Feedback em toasts: `"Perfil de parceiro atualizado com sucesso!"`.
- **REQ-03 (State-Driven — Modo Criador de Conteúdo no Editor):** Quando `mode === "creator"`, o componente **SHALL** preservar a identidade visual de criador de conteúdo:
  - Apresentar título: `"Editar Perfil de Criador & Marca"`;
  - Apresentar ícone `Star`;
  - Apresentar descrição: `"Defina sua identidade visual, segmento de atuação e canais para curar vitrines."`;
  - Rótulo de identificação: `"Nome Artístico / Marca Pública *"`.
- **REQ-04 (Ubiquitous — Higienização de Nomenclatura em `/afiliados`):** Na rota `_store.afiliados.tsx`, o sistema **SHALL**:
  - Configurar explicitamente `mode="affiliate"` ao invocar `CreatorProfileSheetEditor`;
  - Atualizar botões de ação para `"Editar Perfil de Parceiro"`;
  - Atualizar o card da aba de configurações para `"Perfil do Parceiro Afiliado"` com a descrição `"Identificação pública utilizada em seus links de indicação e parcerias com lojas."`.
- **REQ-05 (Ubiquitous — Acessibilidade e Pisos Táteis):** Todos os controles, botões e tabs **SHALL** respeitar touch targets mínimos de 44px (`min-h-11`), foco com `:focus-visible:ring-2` e conformidade WCAG 2.2 AA.

## 3. Invariantes e Evidências Esperadas
- Invariantes: B.1 (Missão e Escopo), B.4 (Gates de Design), B.8 (Proibição de jargões técnicos), B.9 (Definition of Done), B.22 (CTAs Táteis 44px), B.37 (Isolamento Semântico Estrito).
- Verificação: `npm run typecheck` (Exit Code 0), `node scripts/design-lint.test.mjs` (100% Pass), testes unitários verdes e build limpo.
