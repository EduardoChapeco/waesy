# SPEC-20261028-COMMUNITIES-THREADS-PARITY-AUDIT-AND-ENHANCEMENT.md

## 1. Contexto e Motivação
A auditoria comparativa entre as capturas de referência enviadas pelo usuário (UI Threads / "Design Threads Beta Community") e a implementação atual em `src/routes/_store.c.$slug.tsx` e `src/components/community/` revelou divergências visuais, ergonômicas e funcionais críticas:
1. **Espaço Fantasma Lateral e Superior no Mobile:** A rota de comunidades sofria acúmulo de padding no `<main>` do `AppShell` (`px-2`) e na casca do `ThreadsCommunityHeader` (`px-4 pt-3`), isolando a capa do topo e dos lados do frame móvel com cantos arredondados nos 4 lados. No design canônico de referência, a capa é **100% full-bleed / edge-to-edge** (topo e laterais encostadas no frame móvel), possuindo curvatura squircle exclusivamente na borda inferior (`rounded-b-[2rem]`).
2. **Sistema Bidirecional (Mobile vs. Desktop):** No desktop (>= 1024px), a casca deve manter centralização ergonômica com capa horizontal expansiva (aspect-ratio panorâmico 21:9 / 16:6) e suporte a upload de imagem de alta definição no Supabase Storage.
3. **Contraste Dinâmico Automático:** A tipografia sobre a capa ("Beta Community", título, participantes e ícones) deve calcular ou impor contraste alto (WCAG 2.2 AA >= 4.5:1) independentemente de a capa ser um gradiente vibrante (Blue-Lime, Pink-Cyan) ou uma foto personalizada.
4. **Composição Minimalista Estilo Threads:** O composer de publicações deve detectar automaticamente posts do tipo "Tópico" (apenas texto), "Texto + Mídia Única" (com proporção natural preservada) e "Texto + Múltiplas Mídias" (com carrossel de fotos estilo Threads com snap tátil e indicadores).
5. **Formatador Rich Text com Marca-Texto Colorido:** Expandir o renderizador `RichPostContent` e o composer para permitir escolha de cores do marca-texto (Amarelo, Ciano, Rosa, Verde, Lavanda, Laranja) com intensidade, além de formatação inline estilo WhatsApp/Markdown (`*negrito*`, `_itálico_`, `~tachado~`, `` `código` ``).
6. **Telemetria e Métricas Comunitárias:** Ativar contadores de visualização (`views_count`), curtidas (`likes_count`), comentários (`comments_count`) e reposts (`shares_count`), permitindo a exportação de métricas para a moderação e governança.

---

## 2. Requisitos EARS

- **[EARS-1: Capa Edge-to-Edge no Mobile (Ubíquo)]**
  O sistema DEVE renderizar a capa da comunidade ocupando 100% da largura útil da viewport móvel (`w-full px-0 pt-0`) sem espaçamentos laterais ou superiores fantasmas, com arredondamento squircle estritamente na base inferior (`rounded-b-[2rem] sm:rounded-b-3xl`).

- **[EARS-2: Header Bidirecional Desktop (Estado-Dependente)]**
  QUANDO a viewport for de desktop (`>= 1024px`), O sistema DEVE renderizar a capa em container centralizado (`max-w-3xl`) com aspecto panorâmico horizontal e raio de canto harmonioso (`rounded-3xl`), garantindo nitidez e proporção adequada para fotos enviadas via upload.

- **[EARS-3: Controles de Topo e Contraste Adaptativo (Condicional)]**
  SE a capa for renderizada (gradiente ou imagem fotográfica), O sistema DEVE autoaplicar camada de contraste escurecedora sutil (`bg-gradient-to-t from-black/60 via-black/20 to-black/10`) e estilos legíveis para a pílula de busca `[Q Search]` (translucidez frosted glass `bg-white/20 backdrop-blur-md text-white`) e botão circular de criação rápida `[+]` no topo direito.

- **[EARS-4: Composer Minimalista com Bifurcação de Tópico e Carrossel (Event-Driven)]**
  QUANDO o usuário compuser uma publicação:
  - Se apenas texto for inserido, o sistema DEVE publicar como tópico puro sem containers de imagem vazios.
  - Se 1 imagem for anexada, o sistema DEVE renderizá-la em tamanho amplo respeitando a proporção da mídia.
  - Se 2 ou mais imagens forem anexadas, o sistema DEVE compor automaticamente um carrossel deslizante com snap horizontal e indicadores de página.

- **[EARS-5: Marca-Texto Cromático e Formatação WhatsApp (Ubíquo)]**
  O sistema DEVE processar e renderizar marca-texto com cores selecionáveis através da sintaxe `==cor:texto==` ou `==texto==` (amarelo padrão), bem como negrito (`*texto*`), itálico (`_texto_`), tachado (`~texto~`) e código (`` `mono` ``), disponibilizando controles flutuantes minimalistas no composer.

- **[EARS-6: Telemetria Completa de Engajamento (Ubíquo)]**
  O sistema DEVE registrar e exibir contadores de visualização, curtidas, comentários e compartilhamentos em cada publicação da comunidade, alimentando os dados da moderação.

---

## 3. Arquitetura de Componentes e Arquivos no Escopo

1. `src/components/shell/app-shell.tsx`:
   - Adicionar `/c/` à lista `isCleanMobileAppPage` para erradicar o padding mobile do `<main>`.
2. `src/components/community/ThreadsCommunityHeader.tsx`:
   - Transformar casca externa para edge-to-edge no mobile (`px-0 pt-0 sm:px-4 sm:pt-4`), com `rounded-b-[2.5rem] sm:rounded-3xl`.
   - Reposicionar pílula de busca `[Q Search]` e botão `[+]` na linha superior com frosted glass.
   - Atualizar tipografia display do título e subtítulo com contraste garantido.
3. `src/components/community/rich-post-content.tsx`:
   - Expandir regex de parser para suporte a marca-texto colorido (`==cor:texto==`) e formatação estilo WhatsApp (`*bold*`, `_italic_`, `~strike~`, `` `code` ``).
4. `src/components/community/CommunityPostComposer.tsx`:
   - Adicionar barra de ferramentas minimalista com botão de marca-texto (popover de cores: Amarelo, Ciano, Rosa, Verde, Lavanda, Laranja) e botões de formatação rápida.
5. `src/components/community/CommunitySettingsModal.tsx`:
   - Reforçar o upload de imagem de capa direto no bucket Supabase com preview em tempo real e indicador de contraste.
6. `src/routes/_store.c.$slug.tsx`:
   - Ajustar container principal eliminando folgas de margem no topo mobile e garantindo passagem dos handlers.

---

## 4. Critérios de Aceite e Verificação
- [ ] Mobile `< 600px`: Zero gaps laterais e superiores na capa da comunidade (edge-to-edge estrito).
- [ ] Desktop `>= 1024px`: Capa horizontal com largura máxima de 3xl/4xl e cantos arredondados elegantes.
- [ ] Marca-texto: Renderização fiel de cores personalizadas e formatações `*bold*`, `_italic_`, `~strike~`.
- [ ] Zero erros de compilação TypeScript (`npm.cmd run typecheck` com Exit Code 0).
- [ ] Suite de testes unitários dedicada aprovada.
- [ ] Zero regressões visuais no Design Lint (`node scripts/design-lint.mjs --ratchet`).
