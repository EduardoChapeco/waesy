# SPEC-NEWS-CARD-POST-STYLE-REENGINEERING: Reestruturação Canônica do NewsCard & Seção de Notícias em Estilo Post

## 1. Contexto e Motivação
A seção pública de notícias (`waesy.com.br` / Início e trilhos de descoberta) apresentava uma composição visual invertida e sobrecarregada:
- Cabeçalho com 2 linhas empilhadas espremendo categoria e cidade em espaço estreito (`w-80`/`w-68`), gerando truncamentos visuais deselegantes ("SANTA CATARINA • BR").
- Título e subtítulo/resumo posicionados acima da imagem, criando uma parede de texto de 4 a 5 linhas.
- Mídia fotográfica empurrada para o rodapé do cartão, comprimida entre o resumo e a barra de leitura.
- Setas flutuantes de rolagem do `HorizontalRail` colidindo e sobrepondo o conteúdo fotográfico dos cartões.

Esta especificação define a refatoração do `NewsCard` (modo grid/padrão) para uma arquitetura "Clean Post Style", inspirada nas melhores práticas de feeds editoriais modernos (Substack, Apple News, Threads e Instagram), reposicionando a foto como âncora visual central logo abaixo do cabeçalho unificado, eliminando quebras desnecessárias de linha e garantindo conformidade com o Design System Waesy.

---

## 2. Requisitos em Sintaxe EARS

### REQ-EARS-01: Cabeçalho Canônico em Linha Única (Ubiquitous)
O componente `NewsCard` **SHALL** renderizar o cabeçalho do cartão em uma linha única e horizontal contínua (`flex items-center justify-between gap-2`), contendo avatar circular da fonte/portal, nome da fonte em negrito com selo verificado (`CheckCircle2`), separador `•`, data relativa formatada, badge de categoria tonal (`bg-primary/10 text-primary`) e botão de compartilhamento com área tátil $\ge 44$px (`size-11 min-h-11 min-w-11`).

### REQ-EARS-02: Mídia Fotográfica Estilo Post como Elemento Central (Event-Driven)
**WHEN** o artigo possuir imagem de capa (`cover_media_url`), o componente `NewsCard` **SHALL** renderizá-la imediatamente abaixo do cabeçalho em proporção canônica `aspect-16/10` ou `aspect-video`, com bordas arredondadas (`rounded-lg`), borda sutil (`border border-border/50`) e zoom suave no hover (`group-hover/img:scale-102`), posicionando o micro-badge de localidade/cidade como chip discreto sobreposto no canto inferior da mídia.

### REQ-EARS-03: Honestidade Anti-Fake na Ausência de Imagem (State-Driven)
**IF** o artigo não possuir mídia fotográfica real (`!cover_media_url`), o componente `NewsCard` **SHALL** omitir o contêiner de imagem por completo e transicionar diretamente para a tipografia editorial, sendo estritamente proibido injetar imagens sintéticas ou placeholders decorativos (Invariante B.33).

### REQ-EARS-04: Tipografia e Manchete sem Quebras Forçadas (Ubiquitous)
O componente `NewsCard` **SHALL** exibir o título da matéria logo abaixo da imagem com escala tipográfica equilibrada (`text-sm sm:text-base font-bold leading-snug`), quebra natural de palavras (`break-words text-wrap`) e limitador de no máximo 2 linhas (`line-clamp-2`), seguido por subtítulo opcional conciso somente quando este divergir do título e enriquecer o contexto.

### REQ-EARS-05: Rodapé Minimalista com Ações Táteis (Ubiquitous)
O componente `NewsCard` **SHALL** exibir rodapé delimitado por divisória sutil (`border-t border-border/40`), apresentando tempo de leitura com ícone `Clock`, contador de visualizações quando aplicável e CTA primário "Ler matéria" com ícone `ArrowRight`, altura mínima de 44px (`min-h-11`) e anel de foco teclado (`:focus-visible:ring-2`).

### REQ-EARS-06: Desobstrução de Setas Flutuantes no Carrossel (Ubiquitous)
O componente `HorizontalRail` **SHALL** priorizar a navegação de topo via botões no cabeçalho quando o cabeçalho estiver visível (`!hideHeader`), prevenindo que setas flutuantes repousem sobre a mídia dos cartões nos extremos da tela.

---

## 3. Invariantes do Repositório (AGENTS.md)
- **Invariante B.8 / B.9:** 0 classes arbitrárias de colchetes, 0 `!important`, cores 100% semânticas via tokens, grade de 4px e touch targets $\ge 44$px.
- **Invariante B.22:** CTA primário proeminente com touch target canônico $\ge 44$px (`h-11 min-h-11`) e affordance clara.
- **Invariante B.33:** Zero fallbacks sintéticos ou imagens artificiais em artigos reais.
- **Invariante B.38:** Proibição de classes `truncate` destrutivas em manchetes de destaque (uso de `break-words text-wrap leading-snug`).

---

## 4. Evidências de Aceite
1. Design Lint com 0 violações P0 e 0 violações P1 em `scripts/design-lint.mjs`.
2. Testes de regressão `anti-jank.test.ts` e suíte de testes aprovados com Exit Code 0.
3. Build de produção limpo (`npm run build`) com Exit Code 0.
4. Registro de decisão técnica em `docs/design/DECISIONS.md`.
