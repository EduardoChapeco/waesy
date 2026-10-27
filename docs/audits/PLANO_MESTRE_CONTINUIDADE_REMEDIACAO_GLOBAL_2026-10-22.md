# PLANO MESTRE DE CONTINUIDADE E REMEDIAÇÃO GLOBAL WAESY
**Data:** 2026-10-22  
**Status:** Documento Normativo para Commit e Execução Contínua  
**Alinhamento:** AGENTS.md (B.1 a B.41), Apple HIG, Silent Design, WCAG 2.2 AA, Zero-Trust RLS  

---

## 1. Missão e Princípios Operacionais

O Waesy é um ecossistema operacional de comércio, serviços, mobilidade, turismo e governança local para cidades e comunidades.
Qualquer evolução no código deve preservar três pilares inegociáveis:
1. **Completude Máxima (Zero Código Órfão):** Nenhuma tabela, coluna de schema ou função BFF (`*.functions.ts`) pode existir sem interface visual (UI) acessível, funcional e bidirecional.
2. **Honestidade de Dados (Zero Mocks / Zero Fake Fallbacks):** Proibido o uso de dados sintéticos, imagens de estoque não cadastradas ou avaliações artificiais. Dados inexistentes resultam na omissão limpa do bloco ou em empty state honesto.
3. **Silent Design & Ergonomia Mobile Nativa:** Interfaces limpas, silenciosas, sem prolixidade conversacional, sem gradientes espalhafatosos e sem quebra em telas compactas (< 600px). Alvos de toque rigorosamente `>= 44px` (`h-11 min-h-11`), cards em squircle suave (`rounded-2xl`) com física anti-jank e tipografia Inter com quebra natural de linha (anti-truncamento).

---

## 2. Balanço Forense: O Que Foi Executado vs. O Que Permanece Pendente

### 2.1 Entregas Concluídas e Auditadas Nesta Sessão
- **Desduplicação de Migrations:** Timestamp de `airport_cms_and_intelligence.sql` corrigido para `20270226120000_airport_cms_and_intelligence.sql` (0 colisões em 540 migrations).
- **Esquema Canônico de Viajantes Corporativos:** Criação da migration `20270228000000_canonical_corporate_travelers_and_trips.sql` contendo `corporate_travelers` e `travel_trips` com RLS Zero-Trust.
- **Saneamento de Tabela Inexistente em Contratos (P0):** Criação da migration `20270301000000_travel_contract_templates.sql`, eliminando falha crítica reportada pelo validador de contratos BFF (`check-bff-table-contracts.mjs`).
- **Eliminação de Ciclo Circular:** Desacoplamento entre `rma.functions.ts` e `exchanges.functions.ts` (`check-circular-deps.mjs`: 0 ciclos).
- **Deduplicação de Tipos TypeScript (SSOT):** Unificados tipos duplicados (`ClassifiedTemplateStyle`, `SemanticClassifiedNicheId`, `OrderStatus`, `TravelerDocumentType`, `EventTicketTier`).
- **Acessibilidade de Ações e Foco Teclado (DL-15):** Anel de foco teclado aplicado a 977 botões nativos (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`). Eliminados aninhamentos ilegais de `<Link>` envolvendo `<Button>` sem `asChild`.
- **Nativização da Tabela FIPE (Microfase 1):** Criado `src/components/classifieds/fipe-vehicle-selector.tsx` conectado a `fipe.functions.ts`, integrado ao formulário `_store.conta.classificados.novo.tsx`, com projeção de variação percentual ("X% abaixo da FIPE") em `canonical-specs-resolver.ts`.
- **Nativização de Transações Unificadas:** Hook `use-classified-detail.ts` integrado a `createUnifiedListingTransaction` (`unified-listing-workflow.functions.ts`) para reservas e compras diretas atômicas.

### 2.2 O Que Permanece Pendente no Repositório
- **34 Funções BFF Órfãs de Frontend:** Listadas detalhadamente na Seção 3 com suas respectivas telas de destino.
- **Saneamento de Grids Rígidos em Mobile:** Rotas do workspace que declaram `grid-cols-2` ou `grid-cols-4` estáticos sem colapso para coluna única em telas < 600px.
- **Divs com onClick sem Acessibilidade:** Elementos que atuam como botões mas carecem de tag semântica `<button type="button">`, `tabIndex={0}` e suporte a eventos de teclado (`onKeyDown`).
- **Auditoria de Carga Útil em Mutations:** Eliminação de inputs visuais que não transmitem dados para os payloads das Server Functions.

---

## 3. Catálogo Forense dos 34 Serviços Órfãos e Telas de Destino

| # | Serviço BFF Órfão | Domínio | Rota / Tela Alvo | Ação Requerida de UI |
|---|---|---|---|---|
| 1 | `cash-safes.functions.ts` | Financeiro | `src/routes/workspace.financeiro.caixa.index.tsx` & `turnos.tsx` | Inserir Card Squircle "Cofres Blindados & Dias de Tranquilidade" e Modal de Fechamento Cego de Caixa. |
| 2 | `travel-commission.functions.ts` | Turismo / Financeiro | `src/routes/workspace.financeiro.comissoes.tsx` | Tabela detalhada de comissões por bilhete emitido, taxa over e comprovante auditável de repasse. |
| 3 | `service-orders.functions.ts` | Serviços / Assistência | `src/routes/workspace.servicos.index.tsx` | Painel Kanban de Ordens de Serviço (Abertura, Triagem, Peças, Laudo Técnico e Entrega). |
| 4 | `canonical-catalog.functions.ts` | Catálogo / SKU | `src/routes/workspace.catalogo.index.tsx` | Seletor de SKU Mestre para preenchimento de atributos fiscais (NCM, EAN, dimensões de frete). |
| 5 | `token-quota.functions.ts` | Governança de IA | `src/routes/workspace.configuracoes.inteligencia-artificial.tsx` | Barra de progresso visual de cotas consumidas, saldo de créditos e campo criptografado para BYOK. |
| 6 | `vertical-ai-modules.functions.ts` | IA por Nicho | `src/routes/workspace.skills.tsx` | Grade tátil de ativação de habilidades especializadas por setor (Advocacia, Varejo, Turismo, Gastronomia). |
| 7 | `squad-content.functions.ts` | Squads de IA | `src/routes/workspace.squads.index.tsx` | Painel de moderação e aprovação de rascunhos de publicações e campanhas gerados pelos squads. |
| 8 | `multi-store-checkout.functions.ts` | Checkout / Carrinho | `src/routes/_store.checkout.tsx` | Divisão de pacotes por lojista no carrinho, discriminando frete, cupom e prazo individual por vendedor. |
| 9 | `marketplace-checkout.functions.ts` | Pagamento | `src/routes/_store.marketplace.checkout.tsx` | Resumo de pagamento em squircle com Pix de cópia imediata e validação visual de cartão de crédito. |
| 10 | `marketing-engagement.functions.ts` | Telemetria | `src/routes/workspace.marketing.telemetria.tsx` | Gráfico limpo de retenção, cliques reais e taxa de conversão por criativo sem métricas infladas. |
| 11 | `tourism-operations.functions.ts` | Operação Turística | `src/routes/workspace.turismo.viagens.$id.tsx` | Aba "Manifesto & Embarque" com mapa de assentos do veículo/ônibus e leitor de QR Code para check-in. |
| 12 | `travel-installments.functions.ts` | Simulador de Viagens | `src/components/classifieds/travel-flight-itinerary-card.tsx` | Drawer tátil de simulação de parcelamento (Boleto parcelado, Cartão em até 12x, Pix recorrente). |
| 13 | `travel-reviews.functions.ts` | Reputação | `src/routes/_store.turismo.$id.tsx` | Bloco honesto de avaliações verificadas (somente clientes com viagem concluída), omitido se vazio. |
| 14 | `travel-continuous-flow.functions.ts` | Esteira de Turismo | `src/routes/workspace.turismo.propostas.$id.tsx` | Linha do tempo visual do pedido turístico: Proposta -> Aceite -> Reserva -> Pagamento -> Voucher. |
| 15 | `hotel-mining.functions.ts` | Inteligência Hoteleira | `src/routes/workspace.turismo.hoteis.tsx` | Radar comparativo de tarifas por quarto com alertas visuais de queda de preço para re-emissão. |
| 16 | `travel-credit-intelligence.functions.ts` | Risco de Crédito | `src/routes/workspace.turismo.propostas.$id.tsx` | Badge de classificação de risco do pagador com sugestão de parcelamento seguro. |
| 17 | `nexus-operations.functions.ts` | Logística / Hubs | `src/routes/workspace.logistica.tabelas.tsx` | Painel de gestão de pontos de cross-docking e capacidade física com horário de corte. |
| 18 | `oauth-nexus.functions.ts` | Integrações | `src/routes/workspace.configuracoes.integracoes.tsx` | Grade de conectores OAuth (Google, LinkedIn, Gov.br, Meta) com status e revogação em 1 clique. |
| 19 | `portal-waitlist.functions.ts` | Expansão de Cidades | `src/routes/_store.portal-completo.tsx` | Card com formulário tátil para inscrição de novas cidades com feedback de posição na fila. |
| 20 | `geo-search.functions.ts` | Busca Espacial | `src/routes/_store.busca.tsx` & `_store.mapa.tsx` | Seletor deslizante de raio geográfico (5km, 15km, 50km) com contagem dinâmica de estabelecimentos. |
| 21 | `ibge-market-intelligence.functions.ts` | Inteligência Urbana | `src/routes/workspace.viabilidade.tsx` | Cards comparativos de densidade demográfica, PIB per capita e ticket médio estimado da cidade. |
| 22 | `document-artifacts.functions.ts` | Minutas e NDAs | `src/routes/workspace.contratos.index.tsx` | Visualizador inline de minutas contratuais geradas com suporte a assinatura em tela e download de PDF. |
| 23 | `whatsapp-contact-identity.functions.ts` | CRM WhatsApp | `src/routes/workspace.whatsapp.automacoes.tsx` | Card de perfil de lead enriquecido com histórico de interações e compras no ecossistema. |
| 24 | `classifieds-workspace-bridge.functions.ts` | Ponte de Catálogo | `src/routes/workspace.marketing.anuncios.tsx` | Ação de 1 clique "Publicar na Vitrine Pública" com status de sincronização em tempo real. |
| 25 | `image-proxy.functions.ts` | Otimização de Mídia | `src/components/commerce/` | Componente utilitário `<ResponsiveImage />` com `srcset`, `WebP` automático e lazy-loading nativo. |
| 26 | `workspace-catalog.functions.ts` | Gestão de Produtos | `src/routes/workspace.catalogo.produtos.index.tsx` | Tabela de alta densidade com paginação rápida, filtros multifacetados e ações em lote. |
| 27 | `ai-artifact-compiler.functions.ts` | Copilot | `src/routes/workspace.copilot.tsx` | Drawer lateral de pré-visualização de artefatos gerados pelo Copilot com botão de exportação. |
| 28 | `ai-builder-composition.functions.ts` | OmniBuilder | `src/components/admin/builder/builder-canvas.tsx` | Árvore de blocos com arrastar-e-soltar tátil e pré-visualização responsiva sem recarregamento. |
| 29 | `ai-master-prompts.functions.ts` | Gestão de Prompts | `src/routes/admin-master.modulos.tsx` | Editor de prompts de sistema com versionamento, variáveis parametrizadas e histórico de diffs. |
| 30 | `ai-media-jobs.functions.ts` | Fila de Mídia | `src/routes/workspace.estudio.index.tsx` | Barra de status de jobs de compressão e recorte de mídia com notificações de conclusão. |
| 31 | `ai-memory-curation.functions.ts` | Memória de IA | `src/routes/workspace.configuracoes.ai.tsx` | Lista de memórias aprendidas pelo agente com opção de exclusão manual e edição de fatos canônicos. |
| 32 | `ai-quality-benchmark.functions.ts` | Avaliação de IA | `src/routes/admin-master.algoritmo.tsx` | Painel comparativo de acurácia, latência e custo por modelo (Groq vs OpenAI vs Claude). |
| 33 | `ai-tasks-durability.functions.ts` | Telemetria Backend | `src/routes/admin-master.logs.tsx` | Tabela de telemetria de workers em background com tempo de execução e taxa de sucesso. |
| 34 | `copilot-memory.functions.ts` | Histórico Copilot | `src/components/chat/waesy-copilot-drawer.tsx` | Drawer de histórico de conversas anteriores com pesquisa por palavras-chave e restauração instantânea. |

---

## 4. Roteiro Operacional em Microfases Pequenas e Rastreáveis

### FASE 2: Tesouraria, Caixa e Comissões Financeiras
- **Microfase 2A (Concluída):** Declaração canônica de `travel_contract_templates` via migration `20270301000000`.
- **Microfase 2B:** Nativização de `cash-safes.functions.ts` em `workspace.financeiro.caixa.index.tsx` e `caixa.turnos.tsx`.
  - Componente: `<CashSafesSummaryCard />` com cálculo de Dias de Tranquilidade Financeira.
  - Componente: `<BlindCashRegisterCloseModal />` para conferência cega no fechamento de turno.
- **Microfase 2C:** Nativização de `travel-commission.functions.ts` em `workspace.financeiro.comissoes.tsx`.
  - Tabela responsiva com taxa over, status de repasse e comprovante.

### FASE 3: Governança de IA, Cotas e Módulos Verticais
- **Microfase 3A:** Nativização de `token-quota.functions.ts` em `workspace.configuracoes.inteligencia-artificial.tsx`.
  - Medidor de consumo de tokens, saldo de créditos e cofre de chave BYOK.
- **Microfase 3B:** Nativização de `vertical-ai-modules.functions.ts` em `workspace.skills.tsx`.
  - Alternadores táteis de agentes especializados por nicho de negócio.
- **Microfase 3C:** Nativização de `squad-content.functions.ts` em `workspace.squads.index.tsx`.
  - Painel de aprovação/rejeição de publicações geradas por IA.

### FASE 4: Checkout Multi-Loja & Carrinho Inteligente
- **Microfase 4A:** Nativização de `multi-store-checkout.functions.ts` em `_store.checkout.tsx`.
  - Divisão visual de itens por loja com cotação de frete e prazos segregados.
- **Microfase 4B:** Nativização de `marketplace-checkout.functions.ts` em `_store.marketplace.checkout.tsx`.
  - Fluxo de pagamento com Pix dinâmico e validação de cartão de crédito.

### FASE 5: Operações Turísticas, Manifesto e Parcelamento
- **Microfase 5A:** Nativização de `tourism-operations.functions.ts` em `workspace.turismo.viagens.$id.tsx`.
  - Aba de Manifesto com conferência de passageiros e check-in via QR Code.
- **Microfase 5B:** Nativização de `travel-installments.functions.ts` em `travel-flight-itinerary-card.tsx`.
  - Drawer de simulação de parcelamento sem juros abusivos.
- **Microfase 5C:** Nativização de `travel-reviews.functions.ts` em `_store.turismo.$id.tsx`.
  - Avaliações estritamente verificadas por bilhete de viagem concluído.

### FASE 6: Assistência Técnica, Ordens de Serviço & Catálogo Canônico
- **Microfase 6A:** Nativização de `service-orders.functions.ts` em `workspace.servicos.index.tsx`.
  - Kanban de OS (Abertura, Diagnóstico, Peças, Laudo Técnico e Faturamento).
- **Microfase 6B:** Nativização de `canonical-catalog.functions.ts` em `workspace.catalogo.index.tsx`.
  - Seletor de SKU Mestre para auto-preenchimento de dados fiscais e logísticos.

---

## 5. Diretrizes Ergonômicas Canônicas para Telas Mobile (< 600px)

1. **Zero Colunas Forçadas:** Telas estreitas (< 600px) devem sempre adotar `grid-cols-1` para blocos informativos e cards estruturais, utilizando `sm:grid-cols-2` ou `lg:grid-cols-3` apenas em viewports maiores.
2. **Trilhos Horizontais Táteis:** Quando for necessário exibir múltiplos cards ou chips sem empilhar verticalmente, utilizar rolagem horizontal com snap (`flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 -mx-4`).
3. **Piso Tátil 44px:** Todos os botões, links, abas, inputs e seletores devem conter `h-11 min-h-11` (ou `size-11` se forem ícones solitários) com anéis de foco visíveis (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`).
4. **Anti-Truncamento:** Proibido truncar especificações técnicas (`truncate`). Toda informação relevante de ficha técnica ou preço deve acomodar quebra natural de linha (`break-words text-wrap`).
5. **Cabeçalhos Desobstruídos:** Eliminar controles supérfluos da barra global (ex: alternador de tema claro/escuro no topo, que deve residir nas configurações do usuário).

---

## 6. Governança Multi-Agente & Não-Interferência

Para manter a harmonia operacional com os demais agentes trabalhando em paralelo:
- **Áreas Bloqueadas:**
  - `infra/` (Infraestrutura VPS e contêineres).
  - `src/services/gmaps-scraper.functions.ts` e `src/components/admin/gmaps-scraper-panel.tsx`.
  - `src/services/web-agent.functions.ts` e `src/components/admin/web-agent-panel.tsx`.
  - `SPEC-GMAPS-SCRAPER-INTEGRATION.md`, `SPEC-WEB-AGENT.md`, `PLANO-MESTRE-MAPS-E-WEB-AGENT.md`.
  - `SPEC-MASTER-INFOTRAVEL-SYNC-ENGINE-AND-EXTENSION.md`.
  - `src/types/corporate-travel.ts`, `src/lib/format-address.ts`, `src/lib/travel/credit-intelligence.ts`.
  - `src/services/travel-operator-ocr.functions.ts` e `src/components/admin/infotravel-integration-panel.tsx`.
- **Protocolo de Modificação:** Cada microfase só pode alterar arquivos estritamente pertencentes ao módulo ativo, com validação de AST (`scratch-parse.mjs`), contratos de banco (`check-bff-table-contracts.mjs`) e registro formal em `DECISIONS.md`.
