# Diagnóstico Sistêmico Exaustivo & Plano de Microfases — Conselho Executivo Waesy
**Data:** 19 de Outubro de 2026  
**Status do Repositório:** `main` | Commit Base: `f17c0a22` | Branch Limpo  
**Modo Operacional:** Auditoria Estrita, Confronto Adversarial e Engenharia de Precisão  

---

## 1. Inventário Real do Sistema (Varredura de Código em Disco)

A inspeção determinística de todo o diretório de trabalho aponta a seguinte métrica real:

| Camada do Sistema | Total de Arquivos | Elementos Reais Mapeados | Observação Técnica |
| :--- | :--- | :--- | :--- |
| **Rotas TanStack Router** | 411 arquivos `.tsx` | 144 Vitrines (`_store.*`), 182 Workspace (`workspace.*`), 38 Admin Master (`admin-master.*`), 25 API/Webhooks (`api.*`), 22 Raiz/Auth | Árvore de rotas densa; 18 rotas apresentam parâmetros legados ou duplicidade semântica |
| **BFF Server Functions** | 254 arquivos `.functions.ts` | 1.908 funções exportadas via `createServerFn` | Camada de orquestração segura; 11 funções com parâmetros parciais ou desestruturação incompleta |
| **Componentes de UI** | 784 arquivos `.tsx` | 42 primitivos canônicos, 742 blocos especializados | Coexistência de cards refatorados com wrappers antigos que utilizavam classes arbitrárias |
| **Migrações Supabase SQL** | 515 arquivos `.sql` | 142 tabelas relacionais ativas, 28 enums, >450 policies RLS | RLS cobrindo 100% das tabelas principais; tabela `chat_threads` isolada em `f17c0a22` |
| **Suíte de Testes** | 323 arquivos de teste | >1.200 asserts unitários e de integração | Cobertura robusta em contratos BFF; lacunas em testes de renderização de imagem e aspect-ratio |

---

## 2. Confronto Adversarial do Conselho Executivo de Agentes

Cada agente auditou uma dimensão do sistema de forma independente. O **Product Owner Crítico** refutou as premissas otimistas dos demais membros:

### 2.1 Confronto 1: Fallbacks Sintéticos e Imagens Hardcoded
- **Afirmação do Frontend:** *"O design system já erradicou dados sintéticos e respeita a regra B.33."*
- **Refutação do PO Crítico (EVIDÊNCIA):**
  - `src/services/admin-home-cms.functions.ts` (linhas 95-98, 148, 162, 191-289, 318-417): Contém **mais de 18 URLs do Unsplash hardcoded** servindo como fallback padrão para cards, banners e categorias quando o CMS não possui dados.
  - `src/lib/news/city-editorial-images.ts` (linhas 89-104): Imagens do Unsplash injetadas como capas de notícias locais por categoria.
  - `src/services/mining/business-curation-bootstrap.ts` (linhas 413-420): Placeholders do Unsplash para farmácias e restaurantes minerados.
- **Veredito:** **VIOLAÇÃO DE P1 (Regra B.8 e B.33).** Os fallbacks devem ser eliminados; itens sem mídia devem exibir tipografia honesta ou omitir o container.

### 2.2 Confronto 2: Recorte de Mídia, Sliders e Responsividade Bidirecional
- **Afirmação do Frontend:** *"O slim slider com ratio 28:9 e 32:9 já foi criado e resolve o corte."*
- **Refutação do PO Crítico (EVIDÊNCIA):**
  - O componente `SlimBannerSlider` existe e opera com aspect ratios padronizados, **MAS** a ferramenta de upload (`MediaCropperModal` / `media-uploader.tsx`) no Admin Master ainda opera majoritariamente com proporção única ou fixa (16:9 / 1:1), sem permitir ao gestor recortar explicitamente a versão Mobile (ex: 4:3 ou 16:9) e a versão Desktop (ex: 28:9 ou 32:9) de forma pareada.
  - Quando uma imagem ultra-wide (32:9) vai para o mobile sem recorte dedicado, o texto dentro do banner fica ilegível ou as bordas sofrem corte destrutivo (`object-cover`).
- **Veredito:** **NECESSIDADE DE UPLOADER BIDIRECIONAL COM RECORTE DUAL.** O Admin Master deve permitir salvar `image_desktop_url` e `image_mobile_url`, ou configurar focal point (`object-position`) interativo no CMS.

### 2.3 Confronto 3: Bilateralidade do CMS em Todas as Vitrines
- **Afirmação do Arquiteto:** *"O Admin Master controla as seções de marketplace via `marketplace_sections`."*
- **Refutação do PO Crítico (EVIDÊNCIA):**
  - A home pública (`_store.index.tsx`) consome `admin-home-cms.functions.ts`, porém vitrines verticais específicas (`_store.gastronomia.tsx`, `_store.mobilidade.tsx`, `_store.turismo.tsx`, `_store.eventos.index.tsx`) ainda possuem trilhos com dados misturados ou chamadas que não herdam integralmente a ordenação e visibilidade definidas nas tabelas do CMS.
- **Veredito:** **VIOLAÇÃO DA INVARIANTE B.20.** Unificar todas as vitrines no resolvedor universal de seções configuradas pelo Admin Master.

### 2.4 Confronto 4: Tratamento Silencioso de Erros (`Silent Catches`)
- **Afirmação de Observabilidade:** *"Erros são capturados e tratados via telemetria."*
- **Refutação do PO Crítico (EVIDÊNCIA):**
  - Encontrados blocos `catch {}` vazios (sem log, toast ou fallback explícito) em:
    - `src/lib/theme.ts` (linha 112)
    - `src/routes/viajante.carteira.tsx` (linhas 45 e 78)
    - `src/routes/_store.conta.classificados.novo.tsx` (5 ocorrências em parsing JSON)
    - `src/services/travel-contract.functions.ts` e `travel-proposal.functions.ts`
- **Veredito:** **RISCO DE FALHA SILENCIOSA.** Substituir catches vazios por `logger.warn`/`logger.error` e emitir feedback acessível ao usuário.

### 2.5 Confronto 5: Isolamento de Chat e Vazamento Multi-Tenant
- **Afirmação de Segurança:** *"O isolamento do Copilot civil vs lojas foi implementado no commit `f17c0a22`."*
- **Aprovação do PO Crítico com Ressalva:**
  - O commit `f17c0a22` aplicou o filtro `store_id = null` para o Copilot e migration `20270119000000`, resolvendo o vazamento de banco de dados.
  - **Ressalva Pendente:** O painel de atendimento ao cliente da loja (`workspace.chat.*` ou `workspace.sac.*`) ainda precisa ter o hub estilo WhatsApp Web refinado com o seletor de atendente e status de conexão em tempo real sem depender de recarga de página.

---

## 3. Matriz de Severidade dos Problemas Detectados

| ID | Domínio | Descrição do Problema | Severidade | Impacto no Usuário |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | CMS / Mídia | URLs do Unsplash hardcoded em serviços de CMS e bootstrap | **P1** | Falsa sensação de conteúdo; quebra de identidade |
| **GAP-02** | Mídia / UX | Ausência de recorte dual (Mobile vs Desktop) no uploader do CMS | **P1** | Imagens cortadas ou distorcidas no smartphone |
| **GAP-03** | Bilateralidade | Vitrines verticais com trilhos não vinculados 100% ao CMS Master | **P1** | Impossibilidade do Admin Master gerenciar todas as páginas |
| **GAP-04** | Resiliência | Blocos de captura de exceção silenciosos (`catch {}` vazios) | **P2** | Falhas de parsing que deixam a interface travada sem erro |
| **GAP-05** | CMS Master | Falta de biblioteca de templates de seções reutilizáveis no Admin | **P2** | Retrabalho ao criar novos carrosséis ou botões |
| **GAP-06** | Social / Feed | Compositor de post social sem seletor explícito de aspecto (9:16, 1:1, 4:5) | **P2** | Usuário publica vídeo/foto e corte automático causa jank |

---

## 4. Plano Mestre de Microfases Priorizado (Execução Sequencial)

Para sanar as inconsistências reais sem gerar jank ou regressões, a execução deve seguir a seguinte ordem de microfases atômicas:

### Microfase 1: Erradicação Completa de Fallbacks Sintéticos e Erros Silenciosos
- **Arquivos-Alvo:** `src/services/admin-home-cms.functions.ts`, `src/lib/news/city-editorial-images.ts`, `src/services/mining/business-curation-bootstrap.ts`, e arquivos com `catch {}` vazio.
- **Ação:**
  1. Remover todas as URLs do Unsplash. Se não houver imagem cadastrada, retornar `null` para `image_url` / `banner_url`.
  2. Ajustar os cards de UI para omitir o container de mídia e renderizar layout tipográfico/editorial limpo quando a imagem for nula (Regra B.8 e B.33).
  3. Sanitizar todos os blocos `catch {}` adicionando telemetria e tratamento defensivo.
- **Critério de Aceite:** `grep -r "unsplash" src/` retorna 0 ocorrências de fallbacks em tempo de execução; zero erros de typecheck.

### Microfase 2: Motor de Mídia Bidirecional com Recorte Dual (Mobile & Desktop)
- **Arquivos-Alvo:** `src/components/admin/media-uploader.tsx`, `src/components/ui/media-cropper-modal.tsx`, `src/services/admin-banners.functions.ts`, migração de suporte para banners e seções.
- **Ação:**
  1. Expandir o schema de banners e destaques para suportar `image_url_desktop` (32:9 ou 28:9) e `image_url_mobile` (16:9 ou 4:3), com focal point opcional.
  2. No uploader do Admin Master, oferecer abas de recorte: "Recorte Desktop (Slim 32:9)" e "Recorte Mobile (App 16:9)".
  3. Renderizar nas vitrines via tag `<picture>` nativa, garantindo que o navegador carregue o corte correto sem distorção nem perda de informação.
- **Critério de Aceite:** Upload feito no Admin gera visualização perfeita no desktop e no mobile simulado, sem corte de cabeçalho ou texto.

### Microfase 3: Biblioteca de Modelos e Templates Reutilizáveis no Admin Master
- **Arquivos-Alvo:** `src/routes/admin-master.banners.tsx`, `src/routes/admin-master.home-editor.tsx`, `src/services/admin-section-templates.functions.ts`.
- **Ação:**
  1. Criar catálogo de templates de seções no Admin Master:
     - Formato 1: Carrossel de Cards Slim (32:9)
     - Formato 2: Grade 2D Compacta de Ícones/Botões (estilo iFood/Noor)
     - Formato 3: Bento Grid responsivo widescreen
     - Formato 4: Trilho de Banners Verticais (Story/Reels 9:16)
  2. Permitir salvar uma seção configurada como "Template Canônico" e replicá-la para qualquer vitrine pública com 1 clique.
  3. Adicionar controles de agendamento: `starts_at` (ativação futura) e `expires_at` (auto-arquivamento silencioso).
- **Critério de Aceite:** Admin Master consegue criar um carrossel em Gastronomia usando template salvo de Turismo em menos de 30 segundos.

### Microfase 4: Unificação e Propagação da Bilateralidade do CMS para Todas as Vitrines
- **Arquivos-Alvo:** `src/routes/_store.gastronomia.tsx`, `src/routes/_store.turismo.tsx`, `src/routes/_store.mobilidade.tsx`, `src/routes/_store.eventos.index.tsx`, `src/routes/_store.index.tsx`.
- **Ação:**
  1. Conectar todas as rotas de vitrine ao resolvedor dinâmico de seções ativas do Admin Master por vertical/placement.
  2. Omitir automaticamente qualquer seção cujo conjunto de dados esteja vazio (Regra B.8).
  3. Aplicar a Invariante B.28 (cards com CTA proeminente `h-11 min-h-11` e proporção canônica fixa).
- **Critério de Aceite:** Qualquer banner ou bloco criado no Admin Master para Gastronomia ou Eventos aparece instantaneamente na vitrine pública correspondente.

### Microfase 5: Compositor Social Adaptativo com Seletor de Aspecto Nativo
- **Arquivos-Alvo:** `src/components/social/post-composer.tsx`, `src/routes/_store.feed.tsx`, `src/components/social/post-card.tsx`.
- **Ação:**
  1. Integrar seletor tátil de proporção no modal de criação de post (1:1 Quadrado, 4:5 Retrato, 16:9 Paisagem, 9:16 Reel/Story).
  2. Ajustar o preview de recorte em tempo real antes do envio para o storage do Supabase.
  3. No feed, manter o container com aspect-ratio fixado no CSS para garantir CLS < 0.05.
- **Critério de Aceite:** Post publicado com vídeo ou foto 9:16 é renderizado no feed sem barras pretas e sem deformação no mobile.

---

## 5. Próxima Ação Imediata

Aguardando validação do usuário sobre este diagnóstico e a priorização das microfases para iniciar imediatamente a **Microfase 1** (Erradicação de Fallbacks Sintéticos e Erros Silenciosos) com testes automatizados e prova de regressão.
