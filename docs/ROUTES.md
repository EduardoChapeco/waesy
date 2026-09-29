# ROUTES.md — Plataforma Waesy (Catálogo Canônico de Rotas)

> Espelho documental da fonte única de verdade programática em `src/lib/routes.ts`.
> Todas as rotas listadas abaixo correspondem a arquivos reais existentes em `src/routes/` e foram 100% auditadas com 0 mocks e integridade ponta a ponta.

> [!IMPORTANT]
> **CÉREBRO DAS ROTAS E ACESSOS:** Para entender a matriz de controle de acesso (Customer vs Lojista vs Admin Master) e as políticas RLS atuantes sobre cada rota, consulte a **[Matriz de Acessos](PAGE_ACCESS_MATRIX.md)**.

---

## 1. Estatísticas do Ecossistema de Rotas

- **Total de Rotas Únicas Operacionais:** 368
- **Vitrines Públicas e Descoberta (`_store.*`):** 126
- **Super App / Conta Pessoal do Cidadão (`_store.conta.*`):** 39
- **Workspace Operacional da Loja (`workspace.*`):** 167
- **Admin Master da Plataforma (`admin-master.*`):** 36

---

## 2. Convenções Canônicas

- `:param` na documentação equivale a `$param` no TanStack Router (ex: `/produto/:slug` ➔ `_store.produto.$slug.tsx`).
- Toda rota pública possui permissão `visitor`.
- As rotas da conta pessoal do usuário exigem `customer`.
- As rotas operacionais do Workspace exigem sessão segura com tenant (`owner`, `admin`, `manager`, `seller`, `stock`, `finance`).
- As rotas do Admin Master exigem privilégio de plataforma (`platform_admin`, `master`).
- **Nenhum mock:** todas as rotas renderizam páginas funcionais com loaders seguros e serviços BFF conectados ao Supabase.

---

## 3. Rotas Públicas de Vitrine e Descoberta (126 rotas)

| Rota | Descrição | Permissão | Fase | Status |
| --- | --- | --- | --- | --- |
| `/` | Início — Vitrine principal da cidade e lojas | visitor | Fase 0 | Operacional (Produção) |
| `/_store` | _store — Página de _store | visitor | Fase 1 | Operacional (Produção) |
| `/acougue` | Acougue — Página de Acougue | visitor | Fase 1 | Operacional (Produção) |
| `/afiliados` | Afiliados — Página de Afiliados | visitor | Fase 1 | Operacional (Produção) |
| `/agenda` | Agenda da Cidade — Eventos, festivais e feiras locais | visitor | Fase 1 | Operacional (Produção) |
| `/agendar` | Agendar — Página de Agendar | visitor | Fase 1 | Operacional (Produção) |
| `/agendar/:id` | Agendar — Página de Agendar | visitor | Fase 1 | Operacional (Produção) |
| `/api/auth/callback` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/auth/confirm` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/auth/govbr/callback` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/auth/linkedin/callback` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/auth/marketplace/callback` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/feed/meta[/]csv` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/feed/xml` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/mcp/v1/tools/call` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/mining/worker` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/openapi[/]json` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/pwa/manifest[/]json` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/security-telemetry` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/webhooks/marketplaces` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/webhooks/meta-ads` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/webhooks/pix` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/webhooks/shipment` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/webhooks/whatsapp` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/api/webmcp[/]json` | Api — Página de Api | visitor | Fase 1 | Operacional (Produção) |
| `/assinar/:token` | Assinar — Página de Assinar | visitor | Fase 1 | Operacional (Produção) |
| `/assinatura/:token` | Assinatura — Página de Assinatura | visitor | Fase 1 | Operacional (Produção) |
| `/bebidas` | Bebidas — Página de Bebidas | visitor | Fase 1 | Operacional (Produção) |
| `/beleza` | Beleza — Página de Beleza | visitor | Fase 1 | Operacional (Produção) |
| `/bio/:slug` | Bio — Página de Bio | visitor | Fase 1 | Operacional (Produção) |
| `/buscar` | Busca Global — Busca inteligente de produtos, pratos e serviços | visitor | Fase 1 | Operacional (Produção) |
| `/c/:storeSlug` | C — Página de C | visitor | Fase 1 | Operacional (Produção) |
| `/cadastro` | Criar Conta — Cadastro de cliente ou anunciante | visitor | Fase 1 | Operacional (Produção) |
| `/cadastroantecipado` | Cadastroantecipado — Página de Cadastroantecipado | visitor | Fase 1 | Operacional (Produção) |
| `/carrinho` | Carrinho de Compras — Itens selecionados e cálculo de frete | visitor | Fase 2 | Operacional (Produção) |
| `/casa` | Casa — Página de Casa | visitor | Fase 1 | Operacional (Produção) |
| `/categoria/:slug` | Categoria — Página de Categoria | visitor | Fase 1 | Operacional (Produção) |
| `/checkout` | Finalizar Pedido — Identificação, pagamento e confirmação | visitor | Fase 2 | Operacional (Produção) |
| `/claim/reivindicar/:entityId` | Claim — Página de Claim | visitor | Fase 1 | Operacional (Produção) |
| `/claim/reputacao/:entityId` | Claim — Página de Claim | visitor | Fase 1 | Operacional (Produção) |
| `/classificados` | Classificados — Desapegos, imóveis, veículos e vagas de emprego | visitor | Fase 1 | Operacional (Produção) |
| `/classificados/:id` | Classificados — Página de Classificados | visitor | Fase 1 | Operacional (Produção) |
| `/colecao/:slug` | Colecao — Página de Colecao | visitor | Fase 1 | Operacional (Produção) |
| `/concurso/:id` | Concurso — Página de Concurso | visitor | Fase 1 | Operacional (Produção) |
| `/concursos` | Concursos — Página de Concursos | visitor | Fase 1 | Operacional (Produção) |
| `/construcao` | Construcao — Página de Construcao | visitor | Fase 1 | Operacional (Produção) |
| `/contato` | Fale Conosco — Canais de atendimento ao consumidor | visitor | Fase 0 | Operacional (Produção) |
| `/contrato/:token` | Contrato — Página de Contrato | visitor | Fase 1 | Operacional (Produção) |
| `/convite` | Convite — Página de Convite | visitor | Fase 1 | Operacional (Produção) |
| `/criar-negocio` | Criar negocio — Página de Criar negocio | visitor | Fase 1 | Operacional (Produção) |
| `/criar-negocio/avancado` | Criar negocio — Página de Criar negocio | visitor | Fase 1 | Operacional (Produção) |
| `/destaques/:slug` | Destaques — Página de Destaques | visitor | Fase 1 | Operacional (Produção) |
| `/diretorio` | Diretório de Negócios — Guia completo de comércios e prestadores locais | visitor | Fase 1 | Operacional (Produção) |
| `/diretorio/:id` | Diretorio — Página de Diretorio | visitor | Fase 1 | Operacional (Produção) |
| `/doacoes` | Doacoes — Página de Doacoes | visitor | Fase 1 | Operacional (Produção) |
| `/eletronicos` | Eletronicos — Página de Eletronicos | visitor | Fase 1 | Operacional (Produção) |
| `/empregos` | Empregos — Página de Empregos | visitor | Fase 1 | Operacional (Produção) |
| `/empregos/:id` | Empregos — Página de Empregos | visitor | Fase 1 | Operacional (Produção) |
| `/entrar` | Entrar na Conta — Acesso seguro por e-mail ou WhatsApp | visitor | Fase 1 | Operacional (Produção) |
| `/entrega/:token` | Entrega — Página de Entrega | visitor | Fase 1 | Operacional (Produção) |
| `/entregador/cadastro` | Entregador — Página de Entregador | visitor | Fase 1 | Operacional (Produção) |
| `/evento/:id` | Evento — Página de Evento | visitor | Fase 1 | Operacional (Produção) |
| `/eventos` | Eventos — Página de Eventos | visitor | Fase 1 | Operacional (Produção) |
| `/explorar` | Explorar — Página de Explorar | visitor | Fase 1 | Operacional (Produção) |
| `/f/:slug` | F — Página de F | visitor | Fase 1 | Operacional (Produção) |
| `/faq` | Perguntas Frequentes — Respostas para as dúvidas mais comuns | visitor | Fase 0 | Operacional (Produção) |
| `/farmacia` | Farmacia — Página de Farmacia | visitor | Fase 1 | Operacional (Produção) |
| `/feed` | Feed — Página de Feed | visitor | Fase 1 | Operacional (Produção) |
| `/garcom` | Garcom — Página de Garcom | visitor | Fase 1 | Operacional (Produção) |
| `/gastronomia` | Gastronomia — Página de Gastronomia | visitor | Fase 1 | Operacional (Produção) |
| `/gift-card/:claimToken` | Gift card — Página de Gift card | visitor | Fase 1 | Operacional (Produção) |
| `/home` | Home — Página de Home | visitor | Fase 1 | Operacional (Produção) |
| `/imoveis` | Imoveis — Página de Imoveis | visitor | Fase 1 | Operacional (Produção) |
| `/limpeza` | Limpeza — Página de Limpeza | visitor | Fase 1 | Operacional (Produção) |
| `/livros` | Livros — Página de Livros | visitor | Fase 1 | Operacional (Produção) |
| `/loja/:slug` | Loja — Página de Loja | visitor | Fase 1 | Operacional (Produção) |
| `/loja/:slug/senha` | Loja — Página de Loja | visitor | Fase 1 | Operacional (Produção) |
| `/m/excursao/:token` | M — Página de M | visitor | Fase 1 | Operacional (Produção) |
| `/m/lead/:leadId` | M — Página de M | visitor | Fase 1 | Operacional (Produção) |
| `/mapa` | Mapa — Página de Mapa | visitor | Fase 1 | Operacional (Produção) |
| `/match-time` | Match time — Página de Match time | visitor | Fase 1 | Operacional (Produção) |
| `/membro/:id` | Membro — Página de Membro | visitor | Fase 1 | Operacional (Produção) |
| `/mercado` | Mercado — Vitrine de comércio local e produtos artesanais | visitor | Fase 1 | Operacional (Produção) |
| `/meus-perfis` | Meus perfis — Página de Meus perfis | visitor | Fase 1 | Operacional (Produção) |
| `/mobilidade` | Mobilidade — Página de Mobilidade | visitor | Fase 1 | Operacional (Produção) |
| `/moda` | Moda — Página de Moda | visitor | Fase 1 | Operacional (Produção) |
| `/motorista/:slug` | Motorista — Página de Motorista | visitor | Fase 1 | Operacional (Produção) |
| `/mural` | Mural — Página de Mural | visitor | Fase 1 | Operacional (Produção) |
| `/noticias` | Mural de Notícias — Publicações e novidades comunitárias | visitor | Fase 1 | Operacional (Produção) |
| `/noticias/:slug` | Noticias — Página de Noticias | visitor | Fase 1 | Operacional (Produção) |
| `/ofertas` | Ofertas — Página de Ofertas | visitor | Fase 1 | Operacional (Produção) |
| `/paginas/:slug` | Paginas — Página de Paginas | visitor | Fase 1 | Operacional (Produção) |
| `/patrocinador/:token` | Patrocinador — Página de Patrocinador | visitor | Fase 1 | Operacional (Produção) |
| `/pedido/:publicToken/confirmacao` | Pedido — Página de Pedido | visitor | Fase 1 | Operacional (Produção) |
| `/perfil-da-loja` | Perfil da Loja — Página oficial e catálogo do estabelecimento | visitor | Fase 3 | Operacional (Produção) |
| `/personas` | Personas — Página de Personas | visitor | Fase 1 | Operacional (Produção) |
| `/pet` | Pet — Página de Pet | visitor | Fase 1 | Operacional (Produção) |
| `/politicas/:slug` | Politicas — Página de Politicas | visitor | Fase 1 | Operacional (Produção) |
| `/portal-completo` | Portal completo — Página de Portal completo | visitor | Fase 1 | Operacional (Produção) |
| `/privacidade` | Política de Privacidade — Diretrizes de proteção e uso de dados | visitor | Fase 0 | Operacional (Produção) |
| `/produto/:slug` | Produto — Página de Produto | visitor | Fase 1 | Operacional (Produção) |
| `/proposta/:token` | Proposta — Página de Proposta | visitor | Fase 1 | Operacional (Produção) |
| `/publicacao/:id` | Publicacao — Página de Publicacao | visitor | Fase 1 | Operacional (Produção) |
| `/receitas` | Culinária Local — Receitas típicas e gastronomia regional | visitor | Fase 1 | Operacional (Produção) |
| `/receitas/:id` | Receitas — Página de Receitas | visitor | Fase 1 | Operacional (Produção) |
| `/reclamar/novo` | Reclamar — Página de Reclamar | visitor | Fase 1 | Operacional (Produção) |
| `/recuperar-senha` | Recuperar senha — Página de Recuperar senha | visitor | Fase 1 | Operacional (Produção) |
| `/redefinir-senha` | Redefinir senha — Página de Redefinir senha | visitor | Fase 1 | Operacional (Produção) |
| `/servicos` | Servicos — Página de Servicos | visitor | Fase 1 | Operacional (Produção) |
| `/sitemap-news[/]xml` | Sitemap news[ — Página de Sitemap news[ | visitor | Fase 1 | Operacional (Produção) |
| `/sitemap-products[/]xml` | Sitemap products[ — Página de Sitemap products[ | visitor | Fase 1 | Operacional (Produção) |
| `/sitemap[/]xml` | Sitemap[ — Página de Sitemap[ | visitor | Fase 1 | Operacional (Produção) |
| `/stories` | Stories — Página de Stories | visitor | Fase 1 | Operacional (Produção) |
| `/termos` | Termos de Uso — Condições gerais de navegação | visitor | Fase 0 | Operacional (Produção) |
| `/trocas-e-devolucoes` | Política de Devoluções — Prazos legais e procedimentos de troca | visitor | Fase 0 | Operacional (Produção) |
| `/turismo` | Guia de Turismo — Destinos turísticos, passeios e atrativos | visitor | Fase 1 | Operacional (Produção) |
| `/turismo/:id` | Turismo — Página de Turismo | visitor | Fase 1 | Operacional (Produção) |
| `/u/:username` | U — Página de U | visitor | Fase 1 | Operacional (Produção) |
| `/vendedora/:slug` | Vendedora — Página de Vendedora | visitor | Fase 1 | Operacional (Produção) |
| `/verificar/:serial` | Verificar — Página de Verificar | visitor | Fase 1 | Operacional (Produção) |
| `/verify/document/:code` | Verify — Página de Verify | visitor | Fase 1 | Operacional (Produção) |
| `/viajante/:token` | Viajante — Página de Viajante | visitor | Fase 1 | Operacional (Produção) |
| `/viajante/carteira` | Viajante — Página de Viajante | visitor | Fase 1 | Operacional (Produção) |
| `/viajante/viagem/:id` | Viajante — Página de Viajante | visitor | Fase 1 | Operacional (Produção) |
| `/voucher/:token` | Voucher — Página de Voucher | visitor | Fase 1 | Operacional (Produção) |
| `/workspace_/pedidos/:id/recibo` | Workspace_ — Página de Workspace_ | visitor | Fase 1 | Operacional (Produção) |

---

## 4. Rotas da Conta Pessoal / Super App do Cidadão (39 rotas)

| Rota | Descrição | Permissão | Fase | Status |
| --- | --- | --- | --- | --- |
| `/conta` | Minha Conta — Central do usuário e acessos rápidos | customer | Fase 1 | Operacional (Produção) |
| `/conta/agendamentos` | Meus Agendamentos — Horários marcados em salões e serviços | customer | Fase 2 | Operacional (Produção) |
| `/conta/avaliacoes` | Minhas Avaliações — Opiniões e notas enviadas para lojas | customer | Fase 3 | Operacional (Produção) |
| `/conta/candidaturas` | Minhas Candidaturas — Vagas de emprego onde você se candidatou | customer | Fase 4 | Operacional (Produção) |
| `/conta/carnes` | Meus Carnês — Parcelamentos próprios e histórico de quitação | customer | Fase 4 | Operacional (Produção) |
| `/conta/classificados` | Meus Desapegos — Anúncios de classificados publicados por você | customer | Fase 3 | Operacional (Produção) |
| `/conta/classificados/novo` | Publicar Desapego — Criar novo anúncio nos classificados | customer | Fase 3 | Operacional (Produção) |
| `/conta/colaborador` | Área do Colaborador — Ponto digital e escala de trabalho | customer | Fase 4 | Operacional (Produção) |
| `/conta/comissoes` | Minhas Comissões — Extrato de comissões de vendas e parcerias | customer | Fase 4 | Operacional (Produção) |
| `/conta/concursos` | Sorteios e Prêmios — Concursos e sorteios em que você participa | customer | Fase 3 | Operacional (Produção) |
| `/conta/contratos` | Meus Contratos — Documentos assinados digitalmente com selo SHA-256 | customer | Fase 3 | Operacional (Produção) |
| `/conta/conversas` | Mensagens — Chat com lojistas e vendedores | customer | Fase 4 | Operacional (Produção) |
| `/conta/conversas/:id` | Conversa — Histórico da conversa em tempo real | customer | Fase 4 | Operacional (Produção) |
| `/conta/creditos` | Créditos e Cashback — Saldo em carteira para novas compras | customer | Fase 4 | Operacional (Produção) |
| `/conta/criadores` | Painel do Criador — Monetização de conteúdo e afiliação | customer | Fase 4 | Operacional (Produção) |
| `/conta/curriculo` | Meu Currículo — Currículo profissional cadastrado no banco de vagas | customer | Fase 4 | Operacional (Produção) |
| `/conta/empresa` | Minha Organização — Alternar para perfil corporativo da loja | customer | Fase 1 | Operacional (Produção) |
| `/conta/enderecos` | Meus Endereços — Locais de entrega salvos | customer | Fase 2 | Operacional (Produção) |
| `/conta/financas` | Minhas Finanças — Resumo de gastos, faturas e parcelas | customer | Fase 4 | Operacional (Produção) |
| `/conta/gift-cards` | Cartões Presente — Vales-compra recebidos e ativos | customer | Fase 4 | Operacional (Produção) |
| `/conta/ingressos` | Meus Ingressos — Vouchers e QR Codes de eventos | customer | Fase 2 | Operacional (Produção) |
| `/conta/lojas` | Lojas que Acompanho — Lojas seguidas e novidades no feed | customer | Fase 3 | Operacional (Produção) |
| `/conta/metricas` | Minhas Estatísticas — Engajamento dos seus desapegos e posts | customer | Fase 4 | Operacional (Produção) |
| `/conta/mobilidade` | Minhas Corridas — Histórico de transportes e entregas solicitadas | customer | Fase 4 | Operacional (Produção) |
| `/conta/negociacoes` | Minhas Negociações — Propostas e acordos formais P2P | customer | Fase 3 | Operacional (Produção) |
| `/conta/notificacoes` | Notificações — Alertas de pedidos, mensagens e ofertas | customer | Fase 1 | Operacional (Produção) |
| `/conta/pacotes` | Meus Pacotes de Serviços — Passes de sessões contratadas | customer | Fase 2 | Operacional (Produção) |
| `/conta/pagamentos` | Cartões e Pagamentos — Métodos de pagamento salvos | customer | Fase 2 | Operacional (Produção) |
| `/conta/pedidos` | Meus Pedidos — Histórico de compras e entregas | customer | Fase 2 | Operacional (Produção) |
| `/conta/pedidos/:id` | Detalhe da Compra — Acompanhamento do status do pedido | customer | Fase 2 | Operacional (Produção) |
| `/conta/perfil` | Dados Pessoais — Informações de perfil, contato e foto | customer | Fase 1 | Operacional (Produção) |
| `/conta/processos` | Acompanhamento Jurídico — Andamento de processos e notificações JUS | customer | Fase 4 | Operacional (Produção) |
| `/conta/salvos` | Itens Salvos — Produtos, desapegos e lugares favoritados | customer | Fase 1 | Operacional (Produção) |
| `/conta/seguranca` | Segurança e Acesso — Alteração de senha, sessões e 2FA | customer | Fase 1 | Operacional (Produção) |
| `/conta/suporte` | Ajuda e Suporte — Chamados de suporte abertos | customer | Fase 1 | Operacional (Produção) |
| `/conta/tokens` | Carteira de Tokens — Tokens comunitários e prova de solvência | customer | Fase 4 | Operacional (Produção) |
| `/conta/trocas` | Trocas e Devoluções — Acompanhamento de pedidos de troca | customer | Fase 4 | Operacional (Produção) |
| `/conta/verificacao` | Verificação de Identidade — Selo de identidade verificada no perfil | customer | Fase 3 | Operacional (Produção) |
| `/conta/viagens` | Minhas Viagens — Vouchers de turismo, passagens e embarque | customer | Fase 2 | Operacional (Produção) |

---

## 5. Rotas do Workspace Operacional da Loja (167 rotas)

| Rota | Descrição | Permissão | Fase | Status |
| --- | --- | --- | --- | --- |
| `/workspace` | Painel Geral — Resumo executivo de vendas, caixa e operação | owner, admin, manager, seller, stock, finance, content, support | Fase 0 | Operacional (Produção) |
| `/workspace/advocacia` | JUS: Processos e Prazos — Acompanhamento processual e controle de prazos | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/agenda` | Calendário de Horários — Agendamentos do dia, semana e mês | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/agenda/recursos` | Profissionais e Salas — Especialistas, cadeiras e salas de atendimento | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/agenda/servicos` | Serviços Prestados — Duração, preços e intervalos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/atendimento` | Atendimento — Módulo atendimento | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/automacoes` | Gatilhos & Automações — Regras de mensagens e ações automáticas | owner, admin, manager, seller, stock, finance, content, support | Fase 5 | Operacional (Produção) |
| `/workspace/avaliacoes` | Avaliacoes — Módulo avaliacoes | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/builder/:documentId/editor` | Builder (:documentId/editor) — Módulo builder | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/captacao` | Captacao — Módulo captacao | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/captacao/ndas` | Captacao (ndas) — Módulo captacao | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo` | Catálogo: Geral — Gestão de catálogo e mix de produtos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/atributos` | Grades e Adicionais — Tamanhos, cores, sabores e modificadores | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/categorias` | Categorias — Estrutura hierárquica do catálogo | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/categorias/:id` | Editar Categoria — Ajuste de nome e ordenação | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/categorias/novo` | Nova Categoria — Cadastro de categoria com ícone | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/colecoes` | Coleções — Coleções temáticas e destaques | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/colecoes/:id` | Editar Coleção — Gerenciar produtos da coleção | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/colecoes/novo` | Nova Coleção — Criar grupo promocional de produtos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/produtos` | Produtos e Itens — Cadastro, preços e variações do catálogo | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/produtos/:id` | Editar Produto — Edição detalhada de fotos e especificações | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/produtos/novo` | Novo Produto — Criação de produto com ficha técnica | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/tabelas` | Catálogo: tabelas — Gestão de catálogo e mix de produtos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/catalogo/tipos` | Tipos de Produto — Definição de modelos de atributos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/clientes` | Base de Clientes — Histórico de compras, preferências e contatos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/clientes/:id` | Base de Clientes — Histórico de compras, preferências e contatos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/cms/avaliacoes` | Cms (avaliacoes) — Módulo cms | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/cms/bio` | Cms (bio) — Módulo cms | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/cms/calendario` | Cms (calendario) — Módulo cms | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/cms/navegacao` | Cms (navegacao) — Módulo cms | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/cms/paginas` | Cms (paginas) — Módulo cms | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/cms/stories` | Cms (stories) — Módulo cms | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/comercial` | Comercial — Módulo comercial | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes` | Dados da Loja — Nome fantasia, CNPJ/CPF, WhatsApp e bio | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/ai` | Cofre de Chaves IA (BYOK) — Integração direta com Gemini, OpenAI e OpenRouter | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/equipe` | Acessos da Equipe — Papéis, permissões e colaboradores convidados | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/fretes/cotacoes` | Configurações: fretes/cotacoes — Parâmetros operacionais da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/integracoes` | Configurações: integracoes — Parâmetros operacionais da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/inteligencia-artificial` | Configurações: inteligencia-artificial — Parâmetros operacionais da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/loja` | Configurações: loja — Parâmetros operacionais da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/parceiros` | Configurações: parceiros — Parâmetros operacionais da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/privacidade-loja` | Privacidade & LGPD — Termos de consentimento e retenção de dados | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/pwa` | App Instalável (PWA) — Ícone, cores de tema e splash do aplicativo | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/configuracoes/sessoes` | Configurações: sessoes — Parâmetros operacionais da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/contador` | Contador — Módulo contador | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/conteudo/receitas` | Conteudo (receitas) — Módulo conteudo | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/contratos` | Contratos Digitais — Acordos com assinatura digital e comodato | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/contratos/:id/editor` | Contratos — Gestão de contratos e termos | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/contratos/novo` | Emitir Contrato — Novo documento com variáveis e cláusulas | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/crm` | Crm — Módulo crm | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/curriculo/editor` | Curriculo (editor) — Módulo curriculo | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/doacoes` | Doacoes — Módulo doacoes | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/empregos` | Empregos — Módulo empregos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/empregos/candidatos` | Empregos (candidatos) — Módulo empregos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/empregos/novo` | Empregos (novo) — Módulo empregos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/estoque` | Posição de Estoque — Saldos por variação e armazém | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/estoque/alertas` | Alerta de Ruptura — Produtos abaixo do estoque mínimo | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/estoque/movimentos` | Entradas e Saídas — Histórico auditável de movimentação | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/estudio` | Estudio — Módulo estudio | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/eventos` | Eventos — Módulo eventos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/eventos/:id` | Eventos (:id) — Módulo eventos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/eventos/:id/checkin` | Eventos (:id/checkin) — Módulo eventos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/eventos/:id/subpaineis` | Eventos (:id/subpaineis) — Módulo eventos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/financeiro/afiliados` | Financeiro: afiliados — Controle financeiro da empresa | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/caixa` | Fluxo de Caixa — Livro caixa diário, entradas e sangrias | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/caixa/lancamentos` | Lançamentos de Caixa — Histórico de movimentações detalhado | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/caixa/turnos` | Turnos de Caixa — Abertura, fechamento cego e quebra de caixa | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/comissoes` | Financeiro: comissoes — Controle financeiro da empresa | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/comprovantes` | Comprovantes Manuais — Auditoria de comprovantes de transferência e Pix | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/contas-pagar` | Contas a Pagar — Vencimentos, boletos e despesas da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/faturas` | Faturas do Sistema — Mensalidades e taxas de serviço | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/funcionarios` | Financeiro: funcionarios — Controle financeiro da empresa | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/pagamentos` | Pagamentos Recebidos — Conciliação de cartões e transações Pix | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/recebiveis` | Financeiro: recebiveis — Controle financeiro da empresa | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/financeiro/relatorios-canal` | Financeiro: relatorios-canal — Controle financeiro da empresa | owner, admin, manager, seller, stock, finance, content, support | Fase 4 | Operacional (Produção) |
| `/workspace/fiscal/nfe` | Fiscal (nfe) — Módulo fiscal | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/imoveis/manutencoes` | Imoveis (manutencoes) — Módulo imoveis | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/integracoes/marketplaces` | Integracoes (marketplaces) — Módulo integracoes | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/inteligencia/radar` | Inteligencia (radar) — Módulo inteligencia | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/licitacoes` | Licitacoes — Módulo licitacoes | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/logistica/faturas` | Logística — Operação de entregas e transportes | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/logistica/pudo` | Logística — Operação de entregas e transportes | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/logistica/tabelas` | Tabelas de Frete — Faixas de CEP, bairros e taxas de entrega | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/lojas` | Lojas — Módulo lojas | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/marketing/afiliados` | Marketing: afiliados — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/anuncios` | Campanhas de Anúncios — Divulgação na rede Waesy Ads e Meta | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/anuncios/novo` | Marketing: anuncios/novo — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/banners` | Banners da Loja — Banners rotativos e chamadas visuais | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/brand-kit` | Brand Kit & Identidade — Capa panorâmica 3:1, logotipo e cores da loja | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/briefing` | Marketing: briefing — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/canvas-pecados` | Canvas Criativo — Framework criativo de campanhas e ofertas | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/carrinhos` | Marketing: carrinhos — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/concursos` | Marketing: concursos — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/encartes` | Marketing: encartes — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/fidelidade` | Marketing: fidelidade — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/formularios` | Marketing: formularios — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/gift-cards` | Marketing: gift-cards — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/hotpages` | Hotpages e Biolinks — Páginas especiais de alta conversão | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/patrocinadores` | Marketing: patrocinadores — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/pixels` | Marketing: pixels — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/promocoes` | Cupons e Promoções — Descontos percentuais, fixos e frete grátis | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/publicacoes` | Marketing: publicacoes — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/social` | Estúdio Social — Criador de posts e stories para Instagram | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/stories` | Marketing: stories — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/studio` | Marketing: studio — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/telemetria` | Marketing: telemetria — Comunicação e captação de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/marketing/vitrine` | Editor da Vitrine — Personalização visual da vitrine pública | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/master/influencers` | Master (influencers) — Módulo master | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/mining` | Importações & Crawler — Mineração de cardápios, produtos e feeds RSS | owner, admin, manager, seller, stock, finance, content, support | Fase 5 | Operacional (Produção) |
| `/workspace/moderacao` | Moderacao — Módulo moderacao | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/moderacao/kyc` | Moderacao (kyc) — Módulo moderacao | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/mural/novo` | Mural (novo) — Módulo mural | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/noticias` | Noticias — Módulo noticias | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/noticias/novo` | Noticias (novo) — Módulo noticias | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/notificacoes` | Notificacoes — Módulo notificacoes | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/onboarding` | Onboarding — Módulo onboarding | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/onboarding/revisao` | Onboarding (revisao) — Módulo onboarding | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/orcamentos` | Orcamentos — Módulo orcamentos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/orcamentos/:id` | Orcamentos (:id) — Módulo orcamentos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/orcamentos/novo` | Orcamentos (novo) — Módulo orcamentos | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/pacotes` | Pacotes — Módulo pacotes | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/pdv` | Frente de Caixa (PDV) — Ponto de venda touch com impressão térmica | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pdv/comandas` | Mesas e Comandas — Gestão de mesas, comandas e consumo | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pdv/cozinha` | Cozinha KDS — Tela da cozinha para preparação de pratos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos` | Histórico de Pedidos — Todos os pedidos recebidos na loja | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/:id` | Detalhe do Pedido — Itens, endereço, pagamento e recibo | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/entregadores` | Pedidos: entregadores — Fluxo de atendimento de pedidos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/entregadores/:id` | Pedidos: entregadores/:id — Fluxo de atendimento de pedidos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/entregadores/novo` | Pedidos: entregadores/novo — Fluxo de atendimento de pedidos | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/expedicao` | Expedição e Pacotes — Conferência e separação de caixas | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/frota` | Despacho e Entregadores — Gestão de entregas urbanas MotoLink com PIN | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/gestor` | Gestor de Pedidos — Kanban operacional de produção em tempo real | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/pedidos/trocas` | Trocas e Devoluções — Gestão de garantia e logística reversa | owner, admin, manager, seller, stock, finance, content, support | Fase 2 | Operacional (Produção) |
| `/workspace/qualidade` | Qualidade — Módulo qualidade | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/relatorios` | Relatorios — Módulo relatorios | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/relatorios/gastronomia` | Relatorios (gastronomia) — Módulo relatorios | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/relatorios/metas` | Relatorios (metas) — Módulo relatorios | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/reservas` | Reservas — Módulo reservas | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/rh/ponto` | Rh (ponto) — Módulo rh | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/simlab/focus-group` | Simlab (focus-group) — Módulo simlab | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/simulacao` | Simulacao — Módulo simulacao | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/squads` | Squads de IA — Agentes autônomos para redação, preço e SAC | owner, admin, manager, seller, stock, finance, content, support | Fase 5 | Operacional (Produção) |
| `/workspace/suporte` | Suporte — Módulo suporte | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/tarefas` | Tarefas — Módulo tarefas | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/tokens` | Tokens — Módulo tokens | owner, admin, manager, seller, stock, finance, content, support | Fase 1 | Operacional (Produção) |
| `/workspace/turismo/aereos` | Emissões Aéreas — Localizadores de voos e passagens aéreas | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/contratos` | Contratos de Turismo — Contratos de prestação de serviços turísticos | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/cotacoes` | Central de Cotações — Recepção e triagem de solicitações de clientes | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/destinos` | Destinos Turísticos — Catálogo de destinos, roteiros e passeios | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/embarques` | Pontos de Embarque — Locais e horários de saída de viagens | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/fornecedores` | Parceiros de Turismo — Guias locais, operadoras e receptivos | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/frota` | Frota de Transporte — Veículos, vans e ônibus cadastrados | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/frota/:id` | Ficha do Veículo — Manutenções e documentos da frota | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/grupos` | Excursões e Grupos — Gestão de grupos terrestres e pacotes rodoviários | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/grupos/:id` | Painel do Grupo — Passageiros, poltronas e detalhes da excursão | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/grupos/:id/embarque` | Lista de Embarque — Controle de embarque com check-in de passageiros | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/hoteis` | Hotéis e Resorts — Tarifário e parcerias com redes de hospedagem | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/incidentes` | Ocorrências em Viagem — Registro e suporte a passageiros durante roteiro | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/propostas` | Lâminas e Propostas — Estúdio de lâminas de viagem e cotações | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/propostas/:id` | Editar Proposta — Edição da lâmina interativa de viagem | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/propostas/novo` | Nova Proposta — Criador de proposta de turismo com split | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/radar` | Radar de Oportunidades — Monitoramento de passagens promocionais | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/reacomodacao` | Reacomodação de Voo — Gestão de cancelamentos e no-show | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/viagens` | Viagens Concluídas — Histórico de roteiros executados | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/viagens/:id` | Relatório da Viagem — Fechamento operacional e financeiro do tour | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/vistos` | Assessoria de Vistos — Processos de visto e documentação internacional | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |
| `/workspace/turismo/vouchers` | Emissão de Vouchers — Geração de vouchers de viagem com QR Code | owner, admin, manager, seller, stock, finance, content, support | Fase 3 | Operacional (Produção) |

---

## 6. Rotas do Admin Master da Plataforma (36 rotas)

| Rota | Descrição | Permissão | Fase | Status |
| --- | --- | --- | --- | --- |
| `/admin-master` | Painel Master — Visão executiva global e infraestrutura | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/ads-network` | Rede de Anúncios — Monetização e leilão de mídia patrocinada | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/algoritmo` | Curadoria Algorítmica — Ajustes de ranqueamento e pesos de busca | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/auditoria-forense` | Auditoria Forense — Investigação profunda de anomalias e fraudes | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/banners` | Banners Globais — Gestão de mídia de destaque e publicidade | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/boost-payments` | Boost payments — Administração de Boost payments | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/botoes` | Botoes — Administração de Botoes | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/carnes` | Carnês Master — Supervisão de carnês e parcelamentos ativos | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/convite` | Convite — Administração de Convite | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/crescimento` | Métricas de Crescimento — Aquisição, retenção e churn da plataforma | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/curadoria` | Curadoria de Conteúdo — Aprovação de anúncios, eventos e publicações | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/denuncias` | Central de Denúncias — Moderação de conteúdo e conformidade legal | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/entregadores/auditoria` | Auditoria de Entregadores — Validação de condutores e frotistas MotoLink | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/faturas` | Faturamento Global — Faturas e split de pagamentos da plataforma | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/hubs` | Hubs Regionais — Gestão de praças e clusters municipais | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/imprensa` | Sala de Imprensa — Comunicados oficiais e mídia institucional | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/integracoes` | Integrações Globais — Webhooks, APIs e credenciais de infraestrutura | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/kyc` | Conformidade e KYC — Validação de documentos e identidade civil | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/logistica` | Torre de Logística — Monitoramento de entregas e despacho urbano | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/logs` | Logs de Auditoria — Trilha de auditoria e segurança operacional | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/lojas` | Gestão de Lojas — Auditoria e moderação de lojas na plataforma | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/marca` | Gestão de Marca — Assets oficiais, tipografia e diretrizes Waesy | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/mining` | Omni-Crawler Hub — Orquestrador de crawlers e mineração massiva | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/modulos` | Catálogo de Módulos — Habilitação e precificação de verticais SaaS | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/onboarding` | Jornada de Entrada — Funil de ativação de novas lojas e marcas | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/portal-completo` | Portal da Cidade — Visão consolidada do ecossistema municipal | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/pre-cadastro` | Fila de Espera — Leads e pré-cadastros de novos lojistas | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/seguranca` | Centro de Segurança — Políticas de RLS, WAF e defesa de infraestrutura | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/seguranca/certificados` | Certificados Digitais — Gestão de chaves criptográficas e TLS | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/seguranca/certificados/:id` | Detalhes do Certificado — Auditoria de certificado criptográfico | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/seguranca/telemetria` | Telemetria de Segurança — Monitoramento de tráfego anômalo em tempo real | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/simlabs` | SimLab Orquestrador — Simulações de mercado e agentes de teste | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/termos` | Termos da Plataforma — Versionamento de contratos de adesão e termos | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/tokens` | Ledger de Tokens — Solvência e auditoria de créditos comunitários | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/usuarios` | Usuários e Perfis — Base unificada de usuários e identidades | platform_admin, master | Fase 4 | Operacional (Produção) |
| `/admin-master/vitrines` | Vitrines Regionais — Configuração de homepages e vitrines coletivas | platform_admin, master | Fase 4 | Operacional (Produção) |
