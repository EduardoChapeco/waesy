# SPEC-MEUS-ANUNCIOS-PERFORMANCE.md — Central de Performance Comercial do Anunciante

## 1. Contexto e Benchmarking
- **Plataformas de Referência:** Meta Ads Manager (mensuração, segmentação agregada, atribuição e coortes anônimas), Mercado Livre (visitas, conversões, vendas brutas e promoções), OLX (leads de classificados, histórico temporal e destaques).
- **Missão:** Transformar "Meus Anúncios" de uma simples lista de gerenciamento em uma central de inteligência comercial, crescimento, telemetria de alta resolução, gestão de ciclo de vida e monetização com tráfego pago local.
- **Diretrizes de Design Bidirecional:**
  - **Mobile Native App (<640px):** Sem efeito sanfona, sem cards conversacionais, tipografia limpa, cards squircle com área de toque mínima de 44x44px (`h-11`), telemetria clara, drawer/sheet analítico nativo (100dvh ou bottom sheet elástico).
  - **Desktop Native System App (>=640px):** Bento grid de alta densidade informacional, sparklines clicáveis com dados reais, painel analítico com filtros temporais (Hoje, 7d, 30d, 90d), funil comercial e breakdown com supressão de privacidade.

## 2. Dicionário Oficial de Métricas
1. **Impressão (`impression`):** Anúncio efetivamente renderizado na viewport de uma superfície elegível (busca, feed, categoria, recomendações, mapa, perfil).
2. **Visita (`view`):** Usuário abriu a página de detalhes do anúncio (`/classificados/:id`).
3. **Visitante Único (`unique_visitor`):** Usuário ou sessão deduplicada via hash (IP + UserAgent + Salt de sessão diária) ou `user_id`.
4. **Tempo Ativo de Permanência (`duration_seconds`):** Tempo em que a aba esteve visível (`document.visibilityState === 'visible'`) com janela ativa, medido por heartbeat a cada 5 segundos.
5. **Engajamento (`engagement`):** Interação significativa (galeria de fotos, vídeo, expansão de descrição, visualização de mapa, favoritar, compartilhar).
6. **Lead / Contato (`lead`):** Iniciação de contato comercial (abertura de chat, clique/revelação de telefone, clique no WhatsApp, solicitação de proposta/orçamento).
7. **Conversão (`conversion`):** Conclusão do objetivo conforme nicho (compra, reserva, agendamento, proposta aceita, marcado como vendido).
8. **CTR (`Click-Through Rate`):** Razão percentual `(visitas / impressões) * 100`.
9. **Taxa de Contato:** Razão percentual `(contatos / visitas) * 100`.
10. **Taxa de Conversão:** Razão percentual `(conversões / visitas) * 100`.
11. **Alcance Orgânico vs Patrocinado:** Separação mandatória entre exposições espontâneas e exposições originadas de campanhas de impulsionamento (`is_boosted = true`).

## 3. Especificação EARS (Easy Approach to Requirements Syntax)

### EARS-01: Ingestão de Telemetria e Deduplicação Antifraude
- **Quando:** Um usuário acessar a vitrine, busca, catálogo ou detalhe de um anúncio classificado.
- **O Sistema DEVE:** Ingerir o evento de telemetria correspondente (`impression`, `view`, `duration`, `contact`, `conversion`) via função BFF segura, validando idempotência pelo par `(session_hash, classified_id, event_type, date)` para evitar inflação artificial de contadores.
- **Invariante:** Se o visitante for o próprio anunciante (`author_profile_id === current_user.id`), o evento é marcado como `is_author_view = true` e excluído dos relatórios de performance comercial do anunciante.

### EARS-02: Dashboard de Performance e Funil Comercial
- **Quando:** O anunciante clicar na telemetria, no sparkline ou no botão de estatísticas de um anúncio.
- **O Sistema DEVE:** Abrir o painel analítico com:
  1. KPIs principais: Impressões, Visitas, Visitantes Únicos, Contatos, Conversões.
  2. Funil de Conversão visual por etapas: Impressões -> Visitas -> Engajamentos -> Contatos -> Conversões.
  3. Gráfico temporal de tendência por período selecionado (Hoje, 7 dias, 30 dias, 90 dias) com cálculo de variação percentual vs período anterior.
  4. Origens de Tráfego: Busca, Feed, Categorias, Recomendações, Compartilhamento, Link Direto.
  5. Seção "O que posso melhorar?": Recomendações com base nos dados (ex: fotos, preço comparável, taxa de conversão).

### EARS-03: Privacidade por Coorte e Supressão Geográfica
- **Quando:** O anunciante consultar relatórios de localização (cidades/bairros) ou audiência.
- **O Sistema DEVE:** Aplicar limiar de privacidade estrito (`privacy_threshold = 5`). Coortes com menos de 5 interações devem ser agrupadas no balde "Outros", impossibilitando a reidentificação de indivíduos.
- **Invariante:** Nenhuma coordenada geográfica individual, nome, e-mail ou número de telefone de visitantes é exposta ao anunciante.

### EARS-04: Ciclo de Vida do Anúncio e Desambiguação de Estados
- **Quando:** O anunciante alterar o estado de um anúncio:
  - `active` (Publicado): Anúncio público na vitrine e buscas.
  - `unlisted` (Não Listado): Acessível exclusivamente via link direto com token de acesso.
  - `paused` (Pausado): Fora de circulação temporariamente; campanhas de impulsionamento ativas são suspensas.
  - `completed` (Vendido): Finalizado; encerra entrega de impulsionamento e cobranças futuras; mantém histórico e telemetria intactos.
  - `archived` (Arquivado): Retirado de circulação; preserva telemetria histórica e métricas para auditoria.

### EARS-05: Gateway de Impulsionamento e UI Comercial Elegante
- **Quando:** O anunciante abrir o modal de impulsionamento ou o gateway estiver temporariamente indisponível.
- **O Sistema DEVE:** Exibir mensagem amigável comercial ("Impulsionamento temporariamente indisponível") em vez de detalhes de infraestrutura técnica interna, registrando a causa nos logs de auditoria do sistema.

### EARS-06: Duplicação Server-Side Segura
- **Quando:** O anunciante duplicar um anúncio existente.
- **O Sistema DEVE:** Criar um novo registro em estado `draft` com o título acrescido de `(Cópia)`, clonando fotos e especificações, porém zerando estritamente métricas, contadores, histórico de eventos, campanhas de boost e leads.

### EARS-07: Resiliência de Mídia (Media Health & Fallback)
- **Quando:** Uma imagem do anúncio falhar no carregamento ou estiver indisponível.
- **O Sistema DEVE:** Tratar o erro via fallback defensivo (`onError`), exibindo placeholder visual neutro sem quebrar o layout nem renderizar ícone de imagem corrompida.

### EARS-08: Rota Dedicada de Performance e Cockpit Geral da Conta (`/conta/classificados/performance`)
- **Quando:** O anunciante acessar a aba ou link "Performance Geral" na barra de ações.
- **O Sistema DEVE:** Renderizar a página de dashboard consolidado da conta com KPIs globais de todo o portfólio (Total de Anúncios Ativos, Total de Impressões, Total de Visitas, Total de Leads, Conversões Totais, Investimento em Impulsionamento e Custo Médio por Lead).

### EARS-09: Ranking do Portfólio e Diagnóstico de Performance
- **Quando:** O anunciante visualizar a performance consolidada da conta.
- **O Sistema DEVE:** Exibir:
  1. Top Anúncios por Visitas, Contatos e Conversão com barras de progresso comparativas.
  2. Seção de Anúncios que demandam atenção (ex: alta visitação sem contatos, ausência de fotos, impulso expirado).
  3. Ordenação avançada na listagem de anúncios por métricas reais (Mais Recentes, Mais Visualizados, Mais Contatos, Maior Conversão, Menor Performance, Maior/Menor Preço).

### EARS-10: Design Bidirecional Estrito (Mobile Native App vs Desktop System App)
- **Mobile Native App (<640px):** Navegação fluida com thumb-zone precisa, sem colunas apertadas, sem efeito sanfona, cards squircles grandes com informações legíveis sem corte (`text-wrap break-words`), botões com área de toque mínima de 44x44px (`h-11 min-h-11`), zero títulos compostos prolixos.
- **Desktop System App (>=640px):** Layout em Bento Grid de alta densidade com números grandes tabulares (`tabular-nums`), sparklines com dados auditados, tabelas analíticas com filtros avançados e cabeçalhos discretos.

## 4. Evidências Requeridas
- Migration aplicada com tabelas e índices criados no Supabase real (`jfuebqmltksyznovhlwa`).
- Funções BFF implementadas em `src/services/classifieds-analytics.functions.ts` (`getClassifiedCommercialPerformance` e `getAccountClassifiedsCommercialDashboard`).
- Rota dedicada `src/routes/_store.conta.classificados.performance.tsx` funcional e conectada.
- Componente de Dashboard Analítico `ClassifiedAnalyticsSheet` com funil comercial, sparkline interativo e supressão de privacidade.
- Testes unitários e de integração cobrindo cálculo de funil, supressão de coortes, ranking da conta e ordenação comercial.
- Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0) e Zero violações de Design Lint.
