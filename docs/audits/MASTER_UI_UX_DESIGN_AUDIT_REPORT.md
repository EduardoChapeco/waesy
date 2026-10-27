# Relatório Executivo de Auditoria & Remediação de UI/UX (Waesy Platform)
**Data:** 22 de Outubro de 2026  
**Escopo:** Auditoria empírica de 17 capturas de tela reais (`Downloads/printstela`), erradicação de bugs táteis e estruturais, e incorporação de padrões dos 10 maiores repositórios de UI/UX mobile da comunidade.

---

## 1. Resumo Executivo das Falhas Diagnosticadas nas 17 Capturas

| Imagem | Módulo / Rota | Problema Visual / Ergonômico Diagnosticado | Causa Raiz Técnica | Status da Correção |
|---|---|---|---|---|
| `085340.png` | Perfil CDL Jovem (`/empresa/...`) | Esmagamento de botões de ação ("Dúvidas e Sugestões...", "Orçamento", etc.), textos truncados e touch targets minúsculos. | Container `flex items-center gap-2` tentando acomodar 4+ botões em 360px sem quebra proporcional. | **Corrigido:** Criado `TetrisActionGrid` (grid 100% full-fill 2x2/2+3 com touch targets de 44px). |
| `092351.png` | Perfil Excelência Tour (`/empresa/...`) | Endereço formatado com vírgulas órfãs e repetição (`S/N - , São Miguel do Oeste - SC • São Miguel do Oeste - SC`). | Concatenação ingênua de strings no componente sem sanitização de tokens ou deduplicação geográfica. | **Corrigido:** Implementado `formatCanonicalAddress` com suite de testes unitários dedicada. |
| `090151.png` | Carrinho de Compras (`/carrinho`) | Duplo cabeçalho no mobile (cabeçalho AppShell + sub-header interno do carrinho com 2 botões de voltar empilhados). | Ausência de bifurcação de cabeçalho: o sub-header interno renderizava botão de voltar mesmo com AppShell ativo. | **Corrigido:** Sub-header interno tornado desktop-only (`hidden sm:flex`), delegando mobile ao `NativeMobileHeader`. |
| `093359.png` | Cofre de Contratos (`/conta/contratos`) | Duplo cabeçalho idêntico "Meus Contratos" com 2 botões voltar idênticos no mobile. | `/conta/contratos` faltava na lista `prefixCustomRoutes` do `checkHasCustomPageMobileHeader` no `AppShell`. | **Corrigido:** Adicionado `/conta/contratos` ao registro de rotas com cabeçalho nativo e teste de regressão. |
| `090732.png` | Detalhe de Evento (`/evento/...`) | Repetição de endereço no bloco de localização e ícone `Sparkles` no header de "Sobre o Evento". | Falta de deduplicação de endereço e uso de ícone proibido pelas diretrizes de Anti-AI Smell. | **Corrigido:** Integrado `formatCanonicalAddress` e substituído `Sparkles` por `Info` e `Ticket`. |
| `090742.png`, `090800.png` | Detalhe de Evento (`/evento/...`) | Risco de quebra de layout quando capa ou imagens de atrações falham (404/broken image). | Tags `<img>` puras sem handler `onError` defensivo. | **Corrigido:** Adicionado estado defensivo `heroImageFailed` com fallback para container temático sem quebra de DOM. |
| `091132.png` | Detalhe de Evento (`/evento/...`) | Ingressos e abas com empilhamento e perda de hierarquia. | Abas de ancoragem sem alinhamento contínuo estrito. | **Verificado:** Validada regra B.39 (linha única horizontal contínua com scroll snap). |
| `090540.png` | Meus Anúncios (`/conta/classificados`) | Thumbnails minúsculas (64px) e quebra prematura de título colidindo com badges de status. | Thumbnail `size-16` muito pequena para produtos reais e título dividindo linha horizontalmente com badges. | **Corrigido:** Thumbnail ampliada para `size-20` (80px), título em bloco de 2 linhas (`line-clamp-2`) e badges em linha dedicada. |
| `091332.png` | Itinerário de Voo Turismo (`/turismo/...`) | Partida, linha de duração e chegada empilhados em 3 linhas verticais desconexas no mobile com "9" solto. | `grid-cols-1 sm:grid-cols-12` forçando empilhamento vertical e duração sem unidade formatada. | **Corrigido:** Grade fixada em 12 colunas no mobile (`col-span-3`, `col-span-6`, `col-span-3`) e função `formatFlightDuration` ("9" -> "9h"). |
| `091453.png` | Detalhe Mansão Maromba (`/produto/...`) | Esmagamento de seções e sensação de "caixas dentro de caixas" (containeritis). | Múltiplos cartões com bordas pesadas empilhados em viewport compacta de 360px. | **Ajustado:** Eliminação de bordas duplicadas e padronização de padding uniforme. |
| Várias | Detalhe de Produtos e Classificados | Botão flutuante "Assessor" (Waesy Copilot) cobrindo a barra de compra/reserva fixa no rodapé. | O botão do Copilot era renderizado fixo incondicionalmente em todas as telas com `bottom-20 right-4`. | **Corrigido:** Ocultação automática do botão flutuante em páginas de detalhe (`isDetailPage`) e no próprio Copilot. |

---

## 2. Componentes e Módulos Centrais Criados & Aprimorados

### 2.1 `src/lib/format-address.ts`
- Função pura `formatCanonicalAddress(rawInput, fallbackCity, fallbackState)`:
  - Sanitiza strings com pontuações órfãs (ex: `, S/N - , Centro`).
  - Detecta e deduplica menções redundantes de cidade e estado.
  - Suporta tanto strings brutas quanto objetos de endereço do banco (`street`, `number`, `neighborhood`, `city`, `state`).
  - Testado com 5 testes unitários em `src/lib/format-address.test.ts`.

### 2.2 `src/components/layout/tetris-action-grid.tsx`
- Algoritmo de grid 100% responsivo para barras de ações de perfis:
  - 1 item: 100% largura.
  - 2 itens: 50% / 50%.
  - 3 itens: 3 colunas de 33.3% ou 2 no topo e 1 em baixo.
  - 4 itens: Grade 2x2 equilibrada.
  - 5 itens: Linha 1 com 2 itens (50/50), Linha 2 com 3 itens (33/33/33).
  - Garante `min-h-11 h-11` (44px) para conformidade estrita com o piso WCAG 2.2 AA.

### 2.3 `src/components/chat/waesy-copilot-drawer.tsx`
- Adicionado filtro de supressão inteligente: não renderiza botão flutuante em rotas `/copilot` e rotas de detalhe com CTA transacional fixo (`isDetailPage`).

### 2.4 `src/components/classifieds/travel-flight-itinerary-card.tsx`
- Layout de voos padronizado no mobile em 3 colunas horizontais limpas padrão Google Flights / Skyscanner.
- Formatação de duração inteligente com unidade canônica ("9h").

### 2.5 `src/routes/_store.conta.classificados.index.tsx`
- Card mobile modernizado: thumbnail de 80x80px (`size-20`), título amplo com até 2 linhas (`line-clamp-2`), badges e nichos sem conflito de espaço.

---

## 3. Síntese dos 10 Repositórios de UI/UX Analisados

A pesquisa nos 10 repositórios selecionados (`mobile-app-ui-design`, `ui-craft`, `tasteful-ui-skill`, `apple-design-skill`, etc.) gerou a nova skill oficial `.agents/skills/mobile-app-ui-design/SKILL.md`. As 4 grandes lições adotadas foram:

1. **Hierarchy over Outlines (Linear Style):** Em telas móveis densas, delimitação por cor de fundo (`bg-muted/30`) e espaçamento é superior a adicionar bordas (`border border-border`) em cada item filho.
2. **Apple HIG Touch Floor:** 44x44px não é recomendação, é piso de usabilidade. Botões de ação rápida de perfil precisam acomodar polegares sem risco de toque acidental no botão vizinho.
3. **Graceful Degradation for Images:** Aplicativos profissionais nunca mostram o ícone nativo de imagem quebrada do navegador nem deixam o layout desmoronar por ausência de mídia.
4. **Honest Typography (Anti-AI Smell):** Textos diretos, ausência de ícones de estrelas mágicas (`Sparkles`) em funcionalidades comuns e eliminação de reticências prematuras (`truncate`) que prejudicam a compreensão do usuário.

---

## 4. Remediações Finais de Propagação Canônica e Catraca Aprovada

### 4.1 Propagação do `TetrisActionGrid` aos Perfis
- Integrado `TetrisActionGrid` no cabeçalho do perfil público de membros e criadores (`src/routes/_store.membro.$id.tsx`), unificando a grade de ações:
  - Modo Proprietário: 1 ação ("Editar Perfil" / "Editar Marca") em 100% full-fill.
  - Modo Visitante: 2 ou 3 ações ("Seguir" + "Mensagem" + "Compartilhar") em grade perfeitamente balanceada (50/50 ou 33/33/33).
  - Piso canônico de 44px (`h-11 min-h-11`) em 100% dos botões de ação com anéis de foco acessíveis.

### 4.2 Blindagem de Preços Anti-Quebra (`whitespace-nowrap tabular-nums`)
- Adicionadas classes canônicas de contenção textual em `PriceBlock` (`src/design-system/commerce/commerce-components.tsx`), `PriceDisplay` (`src/components/commerce/price-display.tsx`), `ConvenienceShowcaseView` (`src/components/classifieds/convenience-showcase-view.tsx`), e `ClassifiedDetailMobile` (`src/components/classifieds/classified-detail-mobile.tsx`).
- Invariante garantida: preços, símbolos monetários (`R$`) e parcelamentos jamais quebram em duas linhas no mobile.

### 4.3 Refatoração do Detalhe de Eventos (`event-classified-showcase-view.tsx`)
- Removido `shadow-lg` do menu suspenso de calendários (DL-07).
- Normalizado espaçamento nos badges de contadores e lotes (`py-1` em vez de `py-0.5`).
- Verificada régua contínua horizontal de abas (`overflow-x-auto flex-nowrap no-scrollbar`) em conformidade estrita com a Regra B.39.

### 4.4 Limpeza de Violações e Aprovação da Catraca (Design Lint Ratchet)
- Corrigidas classes arbitrárias residuais em `_store.carrinho.tsx` (`text-2xs`, `max-w-56`, `transition-colors`) e `_store.conta.classificados.novo.tsx` (`max-w-sm`, `min-h-96`, `rounded-lg`).
- **Resultado da Catraca (`node scripts/design-lint.mjs --ratchet`):** Aprovado com Exit Code 0! Débito visual global reduzido em 11 violações (12.226 vs 12.237 da baseline).
- **Suíte de Testes:**
  - `src/lib/format-address.test.ts`: 5/5 testes aprovados.
  - `src/components/shell/app-shell-mobile-header.adversarial.test.ts`: 13/13 testes aprovados.
  - `src/lib/classifieds/storage-media.test.ts`: 7/7 testes aprovados.

