# Proposta de Aprendizado — Guardrails Arquiteturais, Padronização Visual & Agendamento CMS

## 1. Classificação
- **Tipo**: Regras Operacionais de Repositório (`Rule`) & Extensões de Governança
- **Alvo**: `AGENTS.md` (Adição das regras B.26 a B.30) e `.agents/skills/design-ops/`

## 2. Diagnóstico da Causa Raiz
1. **Desalinhamento Vertical no Cabeçalho Global:** Elementos de busca (`py-2`, ~36px), pílula de localização (`h-11`, 44px) e botões de ação utilitária (`size-8`, 32px) possuíam alturas desiguais, quebrando o alinhamento visual e violando o piso tátil de 44px (DL-14).
2. **Falha Silenciosa de Renderização de Avatar:** O Radix UI Avatar entra em estado fallback síncrono e não renderiza a foto se a carga assíncrona sofrer delay ou se a foto estiver apenas no registro de perfil, forçando a exibição da inicial em vez da foto real.
3. **Assimetria de Layout de Cards em Vitrines:** O componente `OfferCard` utilizava layout horizontal split comprimido com informações truncadas, em contraste com cards verticais de classificados.
4. **Ausência de CTAs Proeminentes em Anúncios e Quebra de Altura do Card Líder:** Cards de classificados não possuíam botão de ação primária, e o card líder editorial (`HitsLeadCard`) ficava mais curto que os demais cards da linha.
5. **Feed Social com Imagens Órfãs:** Renderização direta de tags `<img>` vazias sem verificação prévia de URL gerava caixas de imagem quebrada do navegador no feed social da vitrine.
6. **Ausência de Agendamento Temporal de Campanhas:** As tabelas `hotpages` e `marketplace_sections` não possuíam controle de datas (`starts_at`, `ends_at`), impedindo a criação de campanhas programadas e auto-ocultamento de conteúdo expirado.

---

## 3. Regras Normativas Propostas para AGENTS.md

### B.26 Invariante de Altura Canônica de Controles de Cabeçalho (Piso 44px)
- Todos os controles interativos na barra de topo global (`TopBar`, `UtilityCluster`, `LocationMasterPill`, campo de busca global, botões de ação e gatilho de perfil) DEVEM compartilhar a altura canônica exata de 44px (`h-11 min-h-11`), com área de toque mínima de 44x44px (`size-11`) e anéis de foco `:focus-visible:ring-2`.

### B.27 Invariante de Renderização Direta de Avatar Civil com Fallback Sem Fricção
- O gatilho de perfil do cabeçalho e superfícies públicas DEVE renderizar a imagem de perfil (`profiles.avatar_url`) diretamente via elemento `<img>` com tratamento defensivo de erro (`onError`), sem depender de máquinas de estado assíncronas externas que fiquem presas na inicial, caindo para a inicial apenas se a imagem não existir ou falhar.

### B.28 Invariante de Padronização Vertical e CTA Proeminente de Cards de Ofertas e Vitrines
- Cards de marketplace, produtos e classificados em trilhos públicos DEVEM compartilhar proporções verticais canônicas uniformes (`aspect-[4/3]` ou `aspect-square`), com título, preço formatado, localização e CTA primário obrigatório (`h-11 min-h-11`) com texto descritivo claro ("Ver Oferta" / "Ver Anúncio" / "Comprar"). Cards editoriais líderes (`HitsLeadCard`) DEVEM ocupar a altura exata dos cards da fileira sem lacunas.

### B.29 Invariante de Programação Temporal e Auto-Arquivamento de Campanhas CMS
- Banners, seções de marketplace (`marketplace_sections`) e hotpages (`hotpages`) DEVEM suportar agendamento temporal (`starts_at`, `ends_at`, `auto_archive_at`), onde itens fora do intervalo são automaticamente omitidos pelas queries BFF e seções vazias são completamente ocultadas da interface sem quebrar o layout.

### B.30 Invariante de Integridade Visual do Feed Social em Trilhos de Vitrine
- Cards do feed social em trilhos de descoberta DEVEM ser renderizados com estrutura completa de post social (autor, avatar com fallback, handle, badge, data relativa, texto formatado, contadores de engajamento e CTA tátil). Imagens inexistentes ou inválidas NUNCA devem renderizar elementos de imagem quebrada (`<img>` vazio/órfão).
