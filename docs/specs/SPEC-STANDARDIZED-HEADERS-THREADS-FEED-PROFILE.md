# SPEC-STANDARDIZED-HEADERS-THREADS-FEED-PROFILE
## Padronização Canônica de Headers, Feed no Padrão Threads/TikTok e Perfil Sem Cards

### 1. Contexto e Motivação
A auditoria visual das superfícies móveis e desktop da plataforma Waesy identificou inconsistências críticas nos cabeçalhos, na visualização de feed e na estrutura de perfis públicos:
1. **Header Principal vs Subpáginas:** Telas de visualização detalhada (como posts de mural, matérias jornalísticas e classificados) utilizavam botões de retorno ad-hoc ou ausência de cabeçalho padronizado.
2. **Feed e Menu de Abas:** O feed social (`/_store/feed`) apresentava abas em formato de caixa fechada com borda e fundo (`bg-muted/50 rounded-xl border`), um alternador inadequado de modos (threads vs grid), e o composer de postagem ocupando 120px do topo da tela.
3. **Card-in-Card e Containeritis no Feed e Perfil:** Publicações no feed e no perfil público (`/_store/membro/$id`) estavam encapsuladas em cartões com borda e fundo (`bg-card border border-border/50 rounded-2xl`), em desconformidade com o design flat contínuo do Threads.
4. **Ausência de Gatilho Contextual (+):** A criação de postagens deve operar via botão flutuante contextual `(+)` (idêntico ao FAB de mensagens no chat), acionando modal/drawer canônico no estilo "Nova Thread".

### 2. Requisitos em Sintaxe EARS

#### [REQ-HDR-01] Padronização Canônica de Cabeçalhos de Subpáginas e Detalhes
- **QUANDO** o usuário navegar para uma rota de detalhe ou subpágina descritiva (`/publicacao/$id`, `/noticias/$slug`, `/classificados/$id`, etc.)
- **O SISTEMA DEVE** renderizar um `NativeMobileHeader` padronizado contendo botão de retorno `<-` (touch target mínimo de 44x44px, `:focus-visible:ring-2`, sem cor de fundo sólida), título conciso centralizado e ferramentas internas minimalistas com botões sem fundo (`bg-transparent hover:bg-muted/50`).

#### [REQ-HDR-02] Ocultação Defensiva do TopBar Global em Páginas de Detalhe
- **ENQUANTO** a viewport for mobile (`< 768px`) e a rota ativa for uma página de detalhe de publicação ou notícia
- **O SISTEMA DEVE** ocultar a barra de topo global (`TopBar`) para prevenir sobreposição de cabeçalhos duplos.

#### [REQ-FEED-01] Abas Discretas no Topo Estilo TikTok/Threads
- **QUANDO** o usuário acessar o Feed Social (`/feed`)
- **O SISTEMA DEVE** renderizar as abas de navegação ("Para Você", "Seguindo", "Explorar", "Viagens", "Fotos") em tipografia discreta no topo, sem contêiner cinza com borda, com indicador sublinhado na aba ativa e cor atenuada nas inativas (`text-muted-foreground hover:text-foreground`).

#### [REQ-FEED-02] Erradicação do Seletor de Modo Grid no Feed
- **O SISTEMA DEVE** remover o alternador de visualização Feed/Grid no feed social, mantendo o fluxo unificado em linha contínua do Threads.

#### [REQ-FEED-03] Gatilho Contextual Flutuante (+) e Modal Nova Thread
- **QUANDO** o usuário estiver no Feed Social
- **O SISTEMA DEVE** ocultar o composer inline do topo do feed e exibir um botão flutuante contextual `(+)` posicionado acima da barra inferior (`bottom-20 md:bottom-8 right-4 md:right-8 z-30 size-14 rounded-full bg-primary text-primary-foreground`).
- **QUANDO** o usuário clicar no botão `(+)`
- **O SISTEMA DEVE** abrir o modal/drawer de criação de publicação no padrão "Nova thread" (com Cancelar, título central, Publicar, avatar do autor, área de texto com quebra automática, anexo de imagem e regras de privacidade).

#### [REQ-FEED-04] Feed Flat Contínuo sem Containeritis (Threads Parity)
- **QUANDO** renderizar itens de publicação (`FeedThreadPostCard`) no feed ou no perfil
- **O SISTEMA DEVE** omitir cascas de cartão com bordas externas pesadas e fundos destacados (`rounded-2xl border bg-card`), adotando divisores finos horizontais (`border-b border-border/40 py-4`), avatar com linha conectora vertical e barra de ações de engajamento (curtir, responder, repostar, compartilhar).

#### [REQ-PROF-01] Perfil Público no Padrão Threads
- **QUANDO** renderizar o perfil público do membro (`_store.membro.$id.tsx` / `_store.u.$username.tsx`)
- **O SISTEMA DEVE** apresentar cabeçalho limpo com nome em destaque, badge `@username`, biografia sem truncamento, contagem de seguidores, botões de ação sutis contornados ("Editar perfil" / "Compartilhar perfil") e abas com indicador sublinhado ("Publicações", "Mídia", "Sobre & Currículo"), exibindo o stream de posts sem envolver cada item em cartões `bg-card` duplicados.

### 3. Matriz de Rastreabilidade e Arquivos no Escopo Atômico
| Componente / Rota | Ação | Invariante Aplicável |
| :--- | :--- | :--- |
| `src/components/navigation/native-mobile-header.tsx` | Refinar botões sem fundo e touch target de 44px | B.26, DL-14 |
| `src/components/shell/app-shell.tsx` | Registrar `/publicacao/` e `/noticias/` em `isDetailPage` | B.8, B.34 |
| `src/routes/_store.feed.tsx` | Adotar abas estilo TikTok, remover seletor de grid, adicionar FAB (+) e modal | B.8, B.31 |
| `src/components/community/FeedThreadPostCard.tsx` | Remover card de fundo e adotar layout Threads flat com divisores | B.8, B.33 |
| `src/routes/_store.publicacao.$id.tsx` | Standardizar `NativeMobileHeader` e layout de thread com comentários | B.8, B.26 |
| `src/routes/_store.noticias.$slug.tsx` | Adicionar `NativeMobileHeader` com botão `<-` e ferramentas sem fundo | B.26, DL-15 |
| `src/routes/_store.membro.$id.tsx` | Descontinuar cartões de fundo nas publicações do perfil e adotar tabs sublinhadas | B.8, B.35 |
| `docs/design/DECISIONS.md` | Registrar DEC-410 | B.11 |
