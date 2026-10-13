# Waesy

## Estado operacional e fonte de verdade — 2026-10-12

Este README preserva o **briefing histórico do produto**. O escopo atual da árvore é maior e inclui Marketplace, Workspace/ERP, turismo, Copilot/IA, CMS/Studio, CRM, financeiro e integrações. Para execução e release, a fonte operacional é a matriz `W0–W17` em [`docs/audits/END-TO-END-REPOSITORY-AUDIT-20261012.md`](docs/audits/END-TO-END-REPOSITORY-AUDIT-20261012.md), complementada por [`docs/audits/PRODUCTION-READINESS-BACKLOG-20261012.md`](docs/audits/PRODUCTION-READINESS-BACKLOG-20261012.md).

Os rótulos **“implementado”, “homologado” e “produção” não são equivalentes**: uma fase só pode ser promovida a produção após evidência do código no SHA candidato, replay de migrations, schema/RLS/JWT/grants, testes negativos cross-tenant, browser E2E, providers/Storage/worker, staging, smoke e rollback. Fases antigas F01–F24/S25–S29 permanecem como histórico de produto até serem reconciliadas com W0–W17.

Crie um novo projeto chamado “Waesy Commerce”. Leia integralmente este briefing antes de editar. As imagens anexadas são referências visuais; “Waesy-logo.jpg” é a marca real a ser usada. Não copie conteúdo, fotos de produtos ou identidade de terceiros.

OBJETIVO
Construir a fundação de uma plataforma de ecommerce/CMS/PWA brasileira, mobile-first, para a Waesy. Ela deve ser simples para lojistas leigas e bonita para clientes, mas arquitetada como produto real: vitrine pública, painel administrativo, área da cliente, catálogo flexível, estoque por variação, checkout, pedidos, CRM, conteúdo e integrações futuras. O sistema começa com uma organização/loja, mas o domínio deve ser multi-tenant-ready por organization_id e store_id, sem criar uma tela de SaaS agora.

REGRA DE ENTREGA DESTA PRIMEIRA ITERAÇÃO
Não tente implementar todos os módulos de uma vez. Nesta primeira execução:

1. Crie o design system canônico e a documentação completa da arquitetura e roadmap.
2. Implemente o shell funcional da vitrine pública e do painel, com rotas reais, responsividade e estados vazios honestos.
3. Implemente somente componentes reutilizáveis e fluxos de navegação da Fase 0.
4. Não use dados fictícios, mock APIs, produtos inventados, imagens externas aleatórias, fallbacks falsos ou botões sem destino. Funcionalidade ainda não construída deve aparecer como “Em breve” apenas no painel interno, nunca simulada como concluída.
5. Não processe pagamento, frete, preço, desconto, comissão ou estoque no cliente. Defina contratos e serviços para processamento server-side na fase seguinte.
6. Não acesse tabelas Supabase diretamente a partir dos componentes React. Toda leitura/mutação de domínio deverá passar por uma camada de serviços/BFF/server functions. Supabase será persistência e Auth, protegido por RLS, nunca um atalho de segurança.

ARQUIVOS CANÔNICOS OBRIGATÓRIOS
Crie na raiz:

- DESIGN.md conforme a especificação aberta do Google Labs DESIGN.md: YAML com tokens semânticos + justificativa humana, estados, componentes e regras responsivas.
- AGENTS.md com regras de implementação e fontes únicas de verdade.
  Crie em /docs:
- MASTER_PLAN.md: este briefing normalizado, decisões, escopo, fora de escopo e critérios.
- ARCHITECTURE.md: limites frontend/BFF/domínio/persistência/provedores, cache, filas/outbox e observabilidade.
- DOMAIN_MODEL.md: entidades, relações, invariantes e máquinas de estado.
- ROUTES.md: todas as rotas públicas, cliente e painel listadas abaixo, com permissão e status/fase.
- SECURITY.md: threat model, RBAC/RLS, uploads, segredos, LGPD, logs, auditoria, retenção, idempotência e webhooks.
- ROADMAP.md: fases e critérios de aceite.
- API_CONTRACTS.md: endpoints versionados, schemas, códigos de erro e idempotency_key.
- COMPONENT_CATALOG.md: componentes canônicos e estados.
- TEST_STRATEGY.md: unidade, integração, contrato, E2E, RLS e acessibilidade.
  Nenhuma regra crítica deve existir só no chat.

IDENTIDADE E DESIGN
Use a logo anexada. Direção: moda feminina contemporânea, minimalista, leve e editorial; fundo off-white quente, rosa vivo da marca como acento, grafite para texto, muito espaço em branco, fotos grandes quando existirem. Não transformar tudo em rosa. Defina os valores somente em DESIGN.md/tokens e faça Tailwind/CSS consumir esses tokens; nunca espalhe hex/radius/shadows.
Sugestão inicial a calibrar pela logo: brand pink próximo de #FF4FB8, warm canvas próximo de #F5F3F0, ink próximo de #292729. Tipografia: uma sans altamente legível para UI e uma serif editorial apenas para títulos/campanhas. A logo é imagem, não tente recriar a palavra como texto.
Mobile first; excelente também em desktop. Touch targets >=44px. Grid fluido, safe-area, sticky bottom nav apenas no mobile, sidebar recolhível no painel desktop. Não pode haver sobreposição, corte de texto, scroll horizontal involuntário ou conteúdo escondido por barras fixas. Respeitar WCAG 2.2 AA, foco visível, teclado, reduced motion, contraste, labels e mensagens de erro.
As referências anexadas orientam: clareza da vitrine, cards limpos, produto com imagem protagonista, navegação móvel rápida e dashboard arejado. Não misture todos os estilos. Evite aparência genérica de template, gradientes decorativos, glassmorphism, cards aninhados e animações gratuitas.

ARQUITETURA CANÔNICA

- TypeScript strict. React, TanStack Start, Tailwind CSS v4 e shadcn/ui; roteamento e data fetching centralizados.
- Separar /components/ui, /components/commerce, /components/admin, /features, /routes, /lib, /services e /types. Nada de um App.tsx monolítico.
- Domain services tipados; validação compartilhada por schema; DTOs distintos das entidades persistidas.
- Dinheiro sempre integer cents + currency BRL; nunca float. Datas ISO UTC, exibição America/Sao_Paulo.
- UUID em entidades internas. Tokens sensíveis aleatórios, armazenados somente como hash. IDs externos de provedores em campos próprios.
- Toda operação financeira/estoque/pedido transacional e idempotente. Totais do carrinho e pedido sempre recalculados no servidor.
- Ledger append-only para estoque, créditos, gift card e caixa. Saldo é derivado/materializado, nunca editado sem movimento.
- Audit log append-only com actor, action, entity, before/after redigido, request_id, IP/UA quando permitido, timestamp.
- Event outbox para webhooks, notificações, feeds e integrações; retries com backoff e dead-letter.
- Feature flags e integration_connections com status unconfigured/testing/active/error. Se não houver credencial, mostrar configuração ausente; nunca simular sucesso.
- Media assets privados durante upload, validação MIME real, tamanho/dimensão/duração, antivírus quando disponível, processamento assíncrono, derivados WebP/AVIF e URLs assinadas. Crop com focal point; original preservado.
- Observabilidade: logs estruturados com correlation_id, métricas e erros sem PII/sigilos.
- Performance: code splitting por rota, imagens responsivas lazy, skeletons sem layout shift, cache com invalidação por versão publicada. Evite rerenders por seletores estreitos e consultas estáveis; não aplicar memoização aleatória.

MODELO DE CATÁLOGO FLEXÍVEL
O cadastro deve funcionar para calçados, roupas, acessórios e tipos futuros:

- Núcleo genérico Product: título, slug, status, descrição, marca, tipo, categorias, tags, SEO, canais, fornecedor, custo, preço, preço comparativo, dimensões/peso, política de encomenda.
- ProductType define schema de atributos e opções usando JSON Schema/field definitions versionadas: texto, rich text sanitizado, número, medida, boolean, data, seleção única/múltipla, cor, tamanho, referência e arquivo. Campos podem ser obrigatórios, filtráveis, comparáveis e exibíveis.
- ProductOption/OptionValue e ProductVariant geram combinações; cada variante tem UUID, SKU único, código de barras opcional, preço override, custo, peso/dimensões, mídia, status e estoque.
- UI de cadastro: escolher tipo -> formulário adaptativo; opção “Produto genérico” com formulário base. Gerador de matriz de variantes editável em lote. Nunca guardar tamanho/cor como colunas fixas.
- Media gallery com múltiplas imagens e vídeos, ordenação drag-and-drop, capa, alt text, crop/focal point e mídia por variante.
- Categoria em árvore com parent_id, ordenação, imagem/capa, SEO e filtros derivados de atributos.
- Encomenda/preorder com data ou prazo, limite e regra de estoque claramente separados de “em estoque”.

ESTOQUE E PEDIDOS

- Estoque por variant_id + location_id.
- inventory_movements imutáveis: purchase, sale, reserve, release, return, exchange_in/out, adjustment, transfer, damage.
- Reserva de checkout com expiração; available = on_hand - reserved. Confirmação paga converte reserva em saída de venda; expiração libera; devolução aprovada gera entrada.
- Pedido guarda snapshots de produto, variante, preço, desconto, endereço e frete; mudanças posteriores no catálogo não alteram o histórico.
- Máquina de estado explícita: draft -> awaiting_shipping_quote/awaiting_payment -> paid -> processing -> ready_for_pickup/shipped -> delivered -> completed; caminhos de cancelled, payment_failed, returned e refunded com transições autorizadas.
- Impressão A4 do pedido e etiqueta térmica 100x150mm/4x6; adapters para Correios/Melhor Envio no futuro, sem inventar etiqueta oficial antes de integração.

CHECKOUT E FRETE
Carrinho persistente para visitante e cliente, com merge após login. Checkout curto:

1. identificação;
2. entrega: endereço, retirada ou cotação;
3. revisão;
4. pagamento;
5. confirmação.
   Frete por estratégia configurável:

- retirada em ponto/loja;
- tabela manual por bairro, faixa de CEP, cidade/zona, subtotal/peso, valor e prazo;
- cotação manual: cliente envia endereço e pedido; lojista informa valor/prazo; cliente aceita e segue para pagamento;
- provider adapter futuro Correios/Melhor Envio.
  Mapa é ajuda visual, não fonte jurídica do endereço. Endereço estruturado com CEP, logradouro, número, complemento, bairro, cidade, UF, country, lat/lng e provider_place_id. Estado de cotação tem expiração e snapshot. Nunca prometer “valor aproximado” como final sem marcar claramente; o pedido não paga até aceitar a cotação final.

PAGAMENTOS
PaymentProvider interface para Mercado Pago, Asaas e Stripe; implementar somente quando credenciais e documentação estiverem configuradas. Cartão tokenizado pelo SDK seguro do provedor; o sistema nunca recebe/guarda PAN/CVV. Pix, cartão e pagamento manual por comprovante.
payments e payment_attempts com status; webhooks autenticados, deduplicados por provider_event_id e idempotentes. A tela nunca considera o redirect do navegador como confirmação; somente evento/consulta server-side.
Comprovante manual: upload, pending_review, accepted/rejected com motivo, actor e auditoria.
“Carnê/ficha” será uma carteira de parcelas/lançamentos interna, não crédito bancário: schedule, installments, receipts, overdue e baixa manual auditada.
Customer credit e gift cards usam ledger. Gift card: compra, tema, mensagem, destinatário, link com token opaco, código único hash, animação acessível e um único resgate atômico; nunca revelar token em logs.

CMS E PÁGINAS DINÂMICAS
Inspirar-se no princípio Wix de coleções + páginas dinâmicas + datasets/blocos, sem copiar o produto:

- page, page_version, section_instance, navigation_menu, theme_settings.
- Editor básico por seções preexistentes, não editor HTML arbitrário.
- Blocos: hero/banner, banners em slide/scroll, category rail, product carousel, product grid/gallery, promoção, stories/highlights, editorial image+text, reviews, FAQ, benefits/trust, newsletter/CTA, map/contact, custom links.
- Cada section_type possui schema versionado, defaults válidos, preview, limite e renderer único compartilhado com a vitrine. Draft/publish/schedule/rollback. Somente uma versão publicada ativa por página/canal.
- Filtros de seção por coleção, categoria, tipo, atributo, tamanho, cor, tag, promoção, disponibilidade e ordenação.
- Não permitir código/HTML arbitrário da lojista; rich text sanitizado.
- Tudo alterado no painel reflete no cliente após publicação e invalidação de cache.
- Editor de tema: logo, ícones PWA, favicon, cores semânticas, tipografia permitida, radius, densidade, botões, cabeçalho/rodapé, navegação. Preview por viewport e validação de contraste antes de publicar.

STORIES, CONTEÚDO E PERFIL

- Story sets/items gerais e por produto, foto/vídeo, duração, expiração, CTA e produtos marcados. Modo Story opcional na abertura, com limite de frequência e botão pular; nunca bloquear a compra.
- Destaques permanentes.
- Perfil/Portfólio público: capa, logo, bio, horário, endereço, mapa, contato, redes, formas de pagamento, políticas, produtos/coleções e avaliações aprovadas; fonte canônica também para SEO LocalBusiness e futura sincronização Google Business Profile.
- Link da bio reutiliza o mesmo renderer de seções em rota própria.
- Posts: editor futuro com canvas maior que o frame, formatos 1:1, 4:5, 9:16 e 16:9, safe zones, camadas e exportação via html2canvas; botão criar arte a partir de produto usa dados canônicos. Não implementar agora.

CLIENTES, CRM E SUPORTE
Cliente: cadastro/login, perfil, endereços, consentimentos, pedidos, pagamentos, créditos, gift cards, avaliações, conversas, solicitações de troca/devolução e reclamações.
Painel: lista 360 da cliente com idade apenas se data de nascimento tiver base legal/finalidade; timeline, tags, anotações internas separadas, pedidos, pagamentos, suporte e consentimentos.
Avaliações com moderação pending/approved/rejected, compra verificada e resposta da loja.
Chat cliente-painel com threads, participantes, anexos validados, leitura, notificações e SLA; sem misturar nota interna com mensagem visível.

CAIXA, EQUIPE E COMISSÕES
Organization -> stores -> locations -> users/memberships. Papéis: owner, admin, manager, seller, stock, finance, content, support, customer.
Cada vendedora pode ter usuário, turno de caixa e atribuições; catálogo é da loja/canal, não duplicado por vendedora sem necessidade. cash_register, cash_shift, cash_entry e settlement; entradas online, vendas balcão, sangria, suprimento e despesa (ex.: motoboy) com comprovante.
Comissão configurável e versionada; cálculo server-side a partir de venda líquida, com estorno em cancelamento/devolução. Relatório e aprovação, nunca editar o total diretamente.

MARKETING E INTELIGÊNCIA
Cupons com escopo, período, limite global/cliente, elegibilidade, não cumulatividade e aplicação server-side.
Carrinho abandonado com consentimento, janelas e opt-out.
PWA instalável com manifest, ícones da marca, service worker leve, offline somente para shell/último catálogo seguro e Web Push opt-in.
Match Time futuro: swipe love/pass/skip em produtos elegíveis; registrar preference_events com peso, contexto, variant/category/attribute embeddings/features. Começar com score explicável por afinidade/recência/diversidade, cold start por escolhas explícitas e popularidade segmentada; nunca inferir atributo sensível. Feedback e exclusão LGPD.
Feeds futuros: Meta catálogo CSV/TSV/Google Sheets e CAPI; Google Merchant; Pixel/GA configuráveis com consentimento. Product/ProductGroup, Offer, Review, MerchantReturnPolicy e LocalBusiness structured data.
Google Business Profile é integração futura por connector/OAuth; nunca prometer sincronização sem aprovação/credenciais.

LGPD E SEGURANÇA
Consentimento por finalidade e versão; termos, privacidade, cookies, troca/devolução, compartilhamento e política de frete com versões e aceite auditável.
Data inventory, base legal, minimização, retenção, exportação/correção/exclusão/anônimização, incident workflow e canal de privacidade.
RLS deny-by-default em toda tabela exposta; policies por organization_id/store_id e papel. Testes positivos e negativos de RLS. Service role somente no servidor e nunca no bundle/log.
RBAC no servidor; UUID não substitui autorização. Rate limit, CSRF conforme arquitetura, CSP, HTTPS, secrets vault, proteção contra enumeração, lockout/risk controls, validação de input/output, sanitização e cabeçalhos.
Uploads: allowlist, magic bytes, limites, nomes gerados, bucket isolado, sem execução, scan e quarantine.
Webhooks: assinatura, timestamp/replay window, dedupe, inbox e processamento assíncrono.
Backups, restore testado e migrações versionadas.
Logs redigem tokens, senhas, cartão, comprovantes e PII desnecessária.

ROTAS PÚBLICAS
/, /buscar, /catalogo, /categoria/:slug, /colecao/:slug, /produto/:slug, /promocoes, /stories, /destaques/:slug, /perfil-da-loja, /links, /faq, /contato, /carrinho, /checkout/identificacao, /checkout/entrega, /checkout/cotacao, /checkout/revisao, /checkout/pagamento, /pedido/:publicToken/confirmacao, /gift-card/:claimToken, /instalar, /politicas/:slug, /privacidade, /termos, /trocas-e-devolucoes.

ROTAS DA CLIENTE
/entrar, /cadastro, /recuperar-senha, /conta, /conta/perfil, /conta/enderecos, /conta/pedidos, /conta/pedidos/:id, /conta/pagamentos, /conta/creditos, /conta/gift-cards, /conta/avaliacoes, /conta/trocas, /conta/suporte, /conta/conversas/:id, /conta/privacidade.

ROTAS DO PAINEL
/admin, /admin/onboarding, /admin/catalogo/produtos, /admin/catalogo/produtos/novo, /admin/catalogo/produtos/:id, /admin/catalogo/tipos, /admin/catalogo/categorias, /admin/catalogo/colecoes, /admin/catalogo/atributos, /admin/midias, /admin/estoque, /admin/estoque/movimentos, /admin/estoque/alertas, /admin/pedidos, /admin/pedidos/:id, /admin/fretes, /admin/fretes/tabelas, /admin/fretes/cotacoes, /admin/pagamentos, /admin/comprovantes, /admin/clientes, /admin/clientes/:id, /admin/suporte, /admin/conversas, /admin/trocas, /admin/avaliacoes, /admin/cms/paginas, /admin/cms/paginas/:id/editor, /admin/cms/navegacao, /admin/cms/tema, /admin/stories, /admin/destaques, /admin/perfil-publico, /admin/link-da-bio, /admin/marketing/cupons, /admin/marketing/gift-cards, /admin/marketing/carrinhos, /admin/marketing/notificacoes, /admin/marketing/feed, /admin/match-time, /admin/criador, /admin/caixa, /admin/caixa/turnos, /admin/caixa/lancamentos, /admin/comissoes, /admin/equipe, /admin/relatorios, /admin/integracoes, /admin/configuracoes/loja, /admin/configuracoes/politicas, /admin/configuracoes/lgpd, /admin/configuracoes/auditoria, /admin/configuracoes/seo.
As rotas futuras devem existir no registro tipado e na documentação, mas não renderizar telas falsas. No painel podem abrir um estado claro de “planejado para a Fase X”.

FASES
Fase 0 agora: documentos canônicos, tokens, layout, navegação, registry de rotas, páginas públicas estruturais, shell admin, componentes e estados vazios verdadeiros.
Fase 1: banco/Auth/RBAC/RLS + catálogo/tipos/variantes/mídia/categorias/estoque.
Fase 2: carrinho, checkout, frete manual/retirada/cotação, pedido, reserva e pagamentos manual/Pix provider.
Fase 3: CMS builder, stories, perfil/link bio, reviews/FAQ/SEO/PWA.
Fase 4: CRM/chat/trocas/caixa/comissão/gift cards/carnê.
Fase 5: integrações Meta/Google/logística, recuperação, Match Time e criador de posts.
Não avance de fase sem critérios de aceite, migração, testes e revisão de segurança.

CRITÉRIOS DA FASE 0

- A logo Waesy aparece corretamente e as referências não viram conteúdo da loja.
- Home mobile e desktop refinada, usando seções reais conectáveis e estados vazios sem produtos falsos.
- Navegação pública, cliente e admin sem links quebrados.
- Painel mobile-first e desktop com sidebar/bottom navigation responsivos.
- DESIGN.md e todos os docs listados existem e não se contradizem.
- Componentes têm loading/empty/error/permission/disabled/unconfigured.
- Nenhum cálculo comercial no cliente; nenhuma chave secreta; nenhuma chamada direta a tabela Supabase em componente.
- TypeScript/lint/build passam.
- Testes mínimos do registry de rotas e dos componentes críticos.
  Ao final, relate exatamente o que foi criado, o que ficou planejado e qualquer limitação real.

## Desenvolvimento Local

Para rodar o projeto localmente:

```sh
npm install
npm run dev
```
