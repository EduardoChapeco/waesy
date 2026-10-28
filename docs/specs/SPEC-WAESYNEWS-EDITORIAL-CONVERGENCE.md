# SPEC-WAESYNEWS-EDITORIAL-CONVERGENCE: Convergência Editorial Unificada de Notícias, Ad Server e Micro/Macro Regiões

## 1. Contexto e Motivação
A página editorial `Waesynews` (Prométhée Showcase) foi desenvolvida com alta densidade estética, tipografia refinada, estúdio de geração de posts PNG, telemetria IAB de anunciantes e leitor imersivo. No entanto, o ecossistema mantinha a rota legada `/_store/noticias/` com layout dissociado e botões estáticos, além de resquícios de "Proposta Comercial" em Waesynews.
Esta especificação consolida a convergência total:
1. `/_store/noticias/` torna-se a ÚNICA e oficial página de Notícias do Waesy, integrando 100% da identidade visual Prométhée/Waesynews.
2. Extinção da página legada; a rota `/waesynews` passa a redirecionar de forma transparente para `/noticias`.
3. Erradicação cirúrgica de qualquer botão, modal, texto ou referência a "Proposta".
4. Indexação unificada de notícias mineradas globais e matérias publicadas por portais/jornais parceiros (Consórcio de Imprensa).
5. Seções temáticas e subcategorias com menu de vitrines (Política, Economia, Esportes, Cultura, Tecnologia, Cidades, Segurança, Urgente) com visualização em Grid e Lista/Stream.
6. Gerador de posts PNG mantido de forma minimalista nos cards e leitor.
7. Inteligência regional dinâmica: botões de cidades adaptam-se contextualmente à cidade ativa selecionada (ex: se São Miguel do Oeste estiver ativa, os botões exibem cidades vizinhas da micro/macrorregião como Descanso, Guaraciaba, São José do Cedro, Iporã do Oeste; se Chapecó, exibe cidades vizinhas do Oeste SC; se São José dos Campos, exibe cidades do Vale do Paraíba).
8. Banners verticais e quadrados integrados e editáveis via Admin Master (`placement="noticias"` e Ad Server de patrocinadores com telemetria).

## 2. Requisitos EARS (Easy Approach to Requirements Syntax)

### EARS-01: Extinção da Rota Legada e Unificação Editorial
- **Quando** o usuário acessar a URL `/noticias` ou navegar para a seção de notícias do portal,
- **O sistema DEVE** renderizar a experiência editorial completa baseada no layout Waesynews, com tipografia editorial, leitor limpo, comentários auditáveis e telemetria de visualizações.
- **Quando** o usuário acessar `/waesynews` ou `/valeagoranews`,
- **O sistema DEVE** redirecionar permanentemente (301/302) para `/noticias`, garantindo zero fragmentação legada.

### EARS-02: Erradicação Estrita de Elementos de "Proposta"
- **Em qualquer circunstância**,
- **O sistema NÃO DEVE** exibir botões, modais, rodapés ou links de "Proposta Comercial" ou "Ver Proposta", removendo completamente `isProposalOpen`, `PROPOSAL_DELIVERABLES`, `PROPOSAL_WORKFLOW_STEPS` e qualquer menção correlata.

### EARS-03: Subcategorias, Subvitrines e Modos de Visualização
- **Quando** o usuário explorar o feed de notícias,
- **O sistema DEVE** disponibilizar navegação por abas/subvitrines editoriais dinâmicas (Plantão/Urgente, Economia, Política, Esportes, Cultura, Tecnologia, Cidades, Segurança, Salvos).
- **O sistema DEVE** disponibilizar alternância de modo de visualização entre Grid (cards compactos multi-coluna) e Stream/Lista (layout editorial de leitura contínua).

### EARS-04: Gerador de Posts Minimalista
- **Quando** o usuário desejar compartilhar ou criar artes de uma notícia,
- **O sistema DEVE** permitir o acionamento do estúdio de posts PNG (`PrometheeNewsStudioModal`) de forma minimalista e não intrusiva através de botão de ação nos cartões e na barra de ferramentas do leitor.

### EARS-05: Indexação de Notícias Mineradas e Portais de Notícias
- **O sistema DEVE** indexar no feed principal tanto as notícias mineradas pelo robô quanto as matérias cadastradas por lojas do tipo portal de notícias/imprensa (`stores.is_press_consortium = true`), priorizando matérias locais da cidade ativa quando especificada, sem ocultar notícias globais quando nenhuma cidade for filtrada.

### EARS-06: Inteligência de Cidades Vizinhas e Micro/Macro Regiões
- **Quando** uma cidade ativa for selecionada pelo usuário ou detectada via GPS (ex: "São Miguel do Oeste"),
- **O sistema DEVE** computar dinamicamente a micro/macrorregião e exibir botões de atalho rápido para as cidades vizinhas limítrofes/pertencentes à mesma região geográfica (ex: Descanso, Guaraciaba, São José do Cedro, Iporã do Oeste, Dionísio Cerqueira).
- **Quando** o filtro estiver em "Todas as Cidades",
- **O sistema DEVE** exibir as principais cidades polo regionais.

### EARS-07: Banners Verticais, Quadrados e Anunciantes no Admin Master
- **O sistema DEVE** carregar banners cadastrados no Admin Master com `placement="noticias"`, suportando formatos horizontal/billboard, quadrado (1:1) e vertical (4:5 / 9:16), além de suportar os slots do Editorial Ad Server (`news_sponsors`) com telemetria IAB de impressões e cliques.

## 3. Invariantes do Repositório
- Regra B.8: Proibido containeritis (card dentro de card), proibições absolutas de `!important`, cores hardcoded e valores mágicos entre colchetes.
- Regra B.20: Bilateralidade do CMS de Vitrines & Personalização Master.
- Regra B.26: Altura canônica de 44px (`h-11 min-h-11`) para alvos interativos.
- Regra B.33: Zero fallbacks sintéticos/fake (Unsplash/Pexels); omitir mídia e renderizar cartão textual honesto quando não houver imagem real.

## 4. Matriz de Evidências
- Typecheck limpo com Exit Code 0 (`npm run typecheck`).
- Testes unitários do portal de notícias aprovados sem referências a Proposta e com verificação dos novos recursos.
- Build de produção verificado com Exit Code 0.
