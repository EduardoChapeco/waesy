# EVIDENCE.md — Fundamentação Teórica e Matriz de Evidências

Este documento mapeia cada regra operacional do sistema de design Waesy à sua fundamentação empírica, bibliográfica ou metodológica estabelecida na literatura técnica.

| Origem / Estudo | Princípio Aplicável | Regra Operacional Derivada | ID de Detecção |
| --- | --- | --- | --- |
| **Grid Systems (Müller-Brockmann)** | Grade de colunas e módulos | Grade espacial fixa de 4px/8px por classe de janela. Alinhamento modular obrigatório. | DL-02, DL-03 |
| **Material 3 · Cor HCT (CAM16 + L\*)** | Paleta perceptual por tom | Escala tonal neutra e semântica; papéis por luminância perceptual, não por julgamento estético. | DL-01, DL-18 |
| **Material 3 · Window Size Classes** | Classes de janela adaptativa | Compacto (<600px), Médio (600–839px) e Expandido (>=840px). Três produtos especializados. | DL-29 |
| **Material 3 · Layouts Canônicos** | Padrões canônicos de layout | Lista-detalhe, feed vertical e painel de apoio lateral. Proibido improvisar disposições. | DL-29 |
| **Material 3 · Motion Tokens** | Durações e curvas de física | Escala de 100ms a 300ms com curvas cubic-bezier desaceleradas. Teto máximo em 300ms. | DL-26 |
| **Apple HIG** | Ergonomia móvel e toque | Alvo de toque de 44pt (44px), tipografia proporcional, folhas com detentes e safe areas. | DL-14 |
| **Apple · Designing Fluid Interfaces** | Física e gestualidade | Gesto direto reversível sem interrupção de entrada. Movimento cancelável no meio do caminho. | DL-26, DL-28 |
| **IBM Carbon Design System** | Governança 2x Grid | Grade de 8px com submúltiplo de 4px. Requisitos de conformidade técnica e lint determinístico. | DL-03, DL-30 |
| **Microsoft Fluent 2** | Elevação e luz | Borda antes de sombra; elevação em duas camadas (key + ambient) restrita a superfícies modais. | DL-07 |
| **Shopify Polaris · Conteúdo** | Linguagem e voz de ação | Termos de ação diretos, sem adjetivação ou jargão técnico. Rótulo de botão em até 3 palavras. | DL-19, DL-24 |
| **Atlassian Design System** | Coerência espacial | Escala de espaço baseada em 4px/8px, com espaçamento semântico declarado em tokens. | DL-03 |
| **W3C DTCG** | Formato de tokens | Padrão formal com $type, $value e aliases semânticos por referência. Proibido hardcode. | DL-01, DL-02 |
| **WCAG 2.2 AA (1.4.3, 1.4.11, 2.4.7, 2.4.11, 2.5.8, 2.3.3)** | Piso de acessibilidade universal | Contraste de texto >= 4.5:1, UI >= 3:1, foco visível de 2px, alvo >= 44px e cancelamento de animação. | DL-14, DL-15, DL-16, DL-17, DL-28 |
| **APCA / OKLCH** | Percepção de contraste | Luminância uniforme calculada via espaço OKLCH, eliminando disparidades cromáticas. | DL-16, DL-17 |
| **Fitts (1954)** | Lei de Fitts | Tempo de ação decresce com proximidade e tamanho do alvo: ações primárias grandes e perto do polegar. | DL-14, DL-24 |
| **Hick (1952)** | Lei de Hick | Tempo de decisão cresce com o número de opções: exatamente uma ação primária em evidência por tela. | DL-19 |
| **Miller (1956) / Cowan (2001)** | Capacidade de trabalho mental | Limite de memória ativa em ~4 blocos: agrupamento de formulários em no máximo 5 campos visíveis. | DL-22 |
| **Jakob's Law (Nielsen)** | Expectativa de usabilidade | Usuários preferem que interfaces funcionem de acordo com padrões conhecidos da indústria. | DL-25 |
| **Gestalt (Proximidade e Região)** | Percepção espacial | Divisórias sutis e espaçamentos agrupam entidades com maior eficiência que bordas coloridas. | DL-05, DL-07 |
| **Nielsen Heurísticas 1, 5, 9** | Visibilidade e prevenção | Matriz completa de 4 estados obrigatória (carregando, dados, vazio, erro). | DL-11, DL-12, DL-13 |
| **Nielsen Limites de Resposta** | Resposta temporal cognitiva | <0.1s instantâneo, <1s fluido, >10s com progresso explicativo. | DL-26 |
| **Steven Hoober** | Uso móvel com uma mão | Zona do polegar: ações primárias posicionadas na parte inferior da viewport móvel. | DL-14 |
| **Parhi, Karlson, Bederson (2006)** | Ergonomia de alvo de toque | Dimensão de toque de aproximadamente 9mm (44px) para prevenir erros mecânicos de clique. | DL-14 |
| **Dyson & Haselgrove (2001)** | Medida de leitura | Largura de linha de leitura contínua fixada entre 45 e 75 caracteres para retenção. | DL-22 |
| **Bringhurst (The Elements of Typographic Style)** | Ritmo e entrelinha | Escala modular Major Third, entrelinha proporcional de 1.4–1.6 no corpo e 1.1–1.25 no display. | DL-10 |
| **Refactoring UI (Wathan & Schoger)** | Hierarquia por contraste | Ênfase por peso tipográfico e cor suave, nunca por tamanho gigantesco ou sombras exageradas. | DL-07, DL-10 |
| **Atomic Design (Brad Frost)** | Modularidade em camadas | Componentes como contratos estáveis de interface; isolamento entre primitives e templates. | DL-25 |
| **Edward Tufte** | Data-Ink Ratio | Erradicação de ruído visual: cada pixel na tela deve carregar informação ou relação de estado. | DL-08, DL-21 |
| **Harry Brignull** | Padrões escuros (Dark Patterns) | Proibição de indução ou manipulação: fluxos de cancelamento imediatos sem atrito falso. | DL-24 |
