# Plano de Implementação — Auditoria do Design System, Vitrines Multi-Modo & Perfis Mobile-First

Este plano estabelece a auditoria forense e reengenharia visual da experiência pública da Waesy, cobrindo as 4 frentes alinhadas no `/grill-me` com o Conselho Executivo:
1. **Página `/home` Mobile-First**: eliminação da moldura 3D aninhada no smartphone, tornando os blocos fluidos e perfeitamente responsivos no mobile.
2. **Vitrines & Saneamento de Modos de Visualização**: universalização dos 3 modos canônicos (**Feed** com carrosséis horizontais e snap scroll, **Grade** densa de 2 colunas e **Lista** de largura máxima), resolvendo o GAP de anúncios de turismo/viagens, gastronomia e digitais que estavam omitidos nos classificados.
3. **Perfis de Lojas e Membros (Instagram/Threads Standard)**: preservação da estrutura com foto 1:1 e banner 21:9 ao lado com scroll interno e stats abaixo, aliada à eliminação de poluição na bio (removendo textos confusos de "abre amanhã/ver horário" do cabeçalho e mantendo-os exclusivamente na aba "Sobre & Atendimento"), redimensionamento dos botões para escala compacta (`h-8`/`h-9`) e prevenção de quebra de linhas desarmônica.
4. **Auditoria Universal de Rotas & Botões**: varredura de links e padronização dos botões conforme as regras de silêncio visual e ultra-minimalismo do `DESIGN.md` e `AGENTS.md`.

---

## 🏛️ Diretrizes do Conselho Executivo (BigTech Architecture)

- **Regra de Ouro (Ergonomia Mobile-First)**: Em smartphones (360px a 430px), nenhum elemento pode forçar overflow horizontal involuntário nem exibir um "celular dentro de outro celular". Componentes com proporções de tela fixa adaptam-se para cards fluidos no mobile.
- **Isolamento de Informações no Perfil**: O topo do perfil deve conter apenas Identidade (Nome, @arroba, Categoria resumida, Localização) e Bio enxuta com link. Informações operacionais extensas (grades de horários semanais, regras de delivery/retirada, dados bancários) pertencem à aba canônica **"Sobre & Atendimento"**.
- **Contrato Universal dos 3 Modos de Vitrine**:
  - **Feed**: seções modulares e trilhos horizontais com snap scroll (`HorizontalRail`) por departamento/categoria.
  - **Grid**: visualização em grade densa de cartões compactos (2 colunas no mobile, 3-4 no desktop).
  - **Lista**: linhas horizontais de largura total com dados textuais e ação rápida de conversão (WhatsApp / Ver Detalhes).
- **Taxonomia Completa nos Classificados**: Erradicação do filtro estático que omitia anúncios com `category: 'travel'`, `'food'` ou `'digital'`.

---

## 📋 Decomposição dos Requisitos [REQ-1] a [REQ-6]

- `[REQ-1]`: **`/home` Responsiva Mobile-First**: Refatorar `src/components/landing/launch-home-view.tsx` e `src/components/landing/founder-smartphone-mockup.tsx` para que, em telas móveis (`< 640px`), o mockup de smartphone renderize como um cartão fluido nativo (`w-full`), mantendo o preview interativo sem a moldura pesada preta que aperta o conteúdo.
- `[REQ-2]`: **Correção e Taxonomia Completa de Classificados (`_store.classificados.index.tsx`)**:
  - Incluir todas as categorias ativas no modo Feed (`travel`, `food`, `digital`, além de `real_estate`, `vehicle`, `business`, `sale`, `service`, `donation`).
  - Garantir que anúncios cadastrados (como pacotes de viagens) sejam renderizados imediatamente no feed principal.
- `[REQ-3]`: **Padronização Real dos 3 Modos nas Vitrines (`_store.mercado.tsx`, `_store.classificados.index.tsx`)**:
  - No modo **Feed**: agrupar os produtos/anúncios por departamento/nicho em trilhos horizontais com scroll lateral suave (`HorizontalRail`).
  - No modo **Grid**: renderizar a grade tradicional de cards.
  - No modo **Lista**: renderizar linhas compactas full-width.
- `[REQ-4]`: **Higienização do Perfil Comercial (`canonical-store-profile-view.tsx`)**:
  - Manter a composição de Logo 1:1 + Capa 21:9 ao lado com scroll interno e stats reais.
  - Remover textos prolixos de horários ("abre amanhã", "ver horário", etc.) e de modalidades do cabeçalho da bio, mantendo apenas a categoria e cidade concisas (`Gastronomia • Chapecó, SC`).
  - Compactar botões de ação e links da bio para escala `h-8`/`h-9`, com alinhamento flexível e sem quebras de linha desalinhadas.
  - Assegurar que os botões de proprietário (`isOwner`) fiquem limpos em uma única barra compacta.
- `[REQ-5]`: **Higienização do Perfil de Membro (`_store.membro.$id.tsx`)**:
  - Aplicar a mesma escala compacta nos botões de ação do membro (Seguir, Mensagem, Compartilhar, Editar Perfil).
  - Limpar a bio e links sociais, mantendo o visual leve e harmonioso padrão Threads/Instagram.
- `[REQ-6]`: **Auditoria de Rotas, Links e Compilação com 0 Erros**:
  - Garantir integridade de links internos e compilação sem erros no TypeScript (`npm run build`).

---

## 🛠️ Arquivos a Modificar

### 1. Landing `/home` Mobile-First
#### [MODIFY] [launch-home-view.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/landing/launch-home-view.tsx)
- Otimizar paddings e margens do container no mobile.
- Ajustar formulário de consulta de bilhete e hero para fluidez total em 360px.
#### [MODIFY] [founder-smartphone-mockup.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/landing/founder-smartphone-mockup.tsx)
- Em telas `sm:hidden`, renderizar o perfil preview como um card nativo fluido sem a moldura aninhada de 2.5rem/notch, eliminando o efeito de celular duplicado. Em desktop (`sm:block`), manter a moldura elegante Apple.

### 2. Vitrines & Modos de Visualização
#### [MODIFY] [_store.classificados.index.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.classificados.index.tsx)
- Atualizar a lista de categorias no modo Feed para incluir `"travel"`, `"food"` e `"digital"`.
- Assegurar que os anúncios existentes de viagens (como Jericoacoara, Resort All Inclusive, Oktoberfest) apareçam no trilho horizontal de Viagens & Turismo no Feed.
#### [MODIFY] [_store.mercado.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.mercado.tsx)
- Refatorar o modo `feed` para agrupar produtos por corredor/departamento (Carnes & Açougue, Hortifrúti, Laticínios, Bebidas, etc.) em carrosséis horizontais com `HorizontalRail`, diferenciando concretamente o modo `feed` do modo `grid`.

### 3. Perfis Comerciais e Sociais
#### [MODIFY] [canonical-store-profile-view.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/commerce/canonical-store-profile-view.tsx)
- Preservar o Logo 1:1 + Capa 21:9 ao lado com scroll interno e os stats abaixo.
- Limpar o bloco de metadados da Bio: retirar a repetição confusa de horários ("abre amanhã", "ver horário") do topo. Todos os detalhes e turnos permanecem na aba "Sobre & Atendimento".
- Redimensionar os botões de ação (WhatsApp, Orçamento, Compartilhar) para altura compacta `h-8` a `h-9` com tipografia `text-xs font-semibold`, organizados em linha única responsiva.
- Redimensionar a barra de ferramentas do proprietário (`isOwner`) para evitar botões gigantes ou quebras estranhas.
#### [MODIFY] [_store.membro.$id.tsx](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.membro.$id.tsx)
- Ajustar os botões de ação e links da bio para o padrão compacto `h-8`/`h-9`.
- Limpar a hierarquia da bio para visualização leve padrão Threads/Instagram.

---

## 🧪 Plano de Verificação

### 1. Verificação Automatizada e Compilação
- `cmd /c npm run build`: Compilação completa com 0 erros de TypeScript e de bundling Nitro/esbuild.

### 2. Verificação Visual e Comportamental
- **Página `/home`**: Testar viewport mobile (375x667 e 390x844) verificando que o preview é fluido e sem barras de rolagem horizontais espúrias.
- **Classificados (`/classificados`)**: Verificar que o modo Feed exibe os pacotes de viagem e turismo no trilho correspondente, e que a alternância entre Feed, Grade e Lista funciona perfeitamente.
- **Mercado (`/mercado`)**: Verificar que o modo Feed renderiza trilhos horizontais por corredor, enquanto o modo Grade renderiza a matriz de cartões.
- **Perfil de Loja (`/perfil-da-loja` ou `/loja/$slug`)**: Confirmar que a bio exibe apenas categoria e cidade, sem textos confusos de horário, e que os botões de ação possuem altura proporcional e não quebram linhas.
