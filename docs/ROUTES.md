# ROUTES.md — Plataforma Waesy

> Espelho legível do registro tipado em `src/lib/routes.ts` (fonte de verdade
> programática). Rotas futuras existem no registro e aqui, mas não renderizam
> telas falsas: no painel abrem um estado "Planejado para a Fase X"; na vitrine
> mostram estados vazios honestos. Nenhum link quebrado.

> [!IMPORTANT]
> **CÉREBRO DAS ROTAS E ACESSOS:** Para entender _quem_ pode acessar o que (Customer vs Admin vs Owner) e como as políticas RLS atuam sobre cada rota, consulte a **[Matriz de Acessos](PAGE_ACCESS_MATRIX.md)**. O `ROUTES.md` serve apenas como catálogo de URLs.

## Convenções

- `:param` (docs) equivale a `$param` (arquivos TanStack).
- Permissão `visitor` = acesso público.
- "Página estrutural" = shell/página real já existe na Fase 0.
- "Planejado" = rota registrada e navegável, exibe estado honesto.

## Rotas públicas

| Rota                               | Descrição                  | Permissão | Fase | Status Fase 0     |
| ---------------------------------- | -------------------------- | --------- | ---- | ----------------- |
| `/`                                | Vitrine principal da loja  | visitor   | 0    | Página estrutural |
| `/buscar`                          | Busca de produtos          | visitor   | 1    | Página estrutural |
| `/catalogo`                        | Todos os produtos          | visitor   | 1    | Página estrutural |
| `/categoria/:slug`                 | Produtos por categoria     | visitor   | 1    | Página estrutural |
| `/colecao/:slug`                   | Produtos por coleção       | visitor   | 1    | Página estrutural |
| `/produto/:slug`                   | Página de produto          | visitor   | 1    | Página estrutural |
| `/promocoes`                       | Ofertas ativas             | visitor   | 1    | Página estrutural |
| `/stories`                         | Conteúdo em stories        | visitor   | 3    | Página estrutural |
| `/destaques/:slug`                 | Destaque permanente        | visitor   | 3    | Página estrutural |
| `/perfil-da-loja`                  | Portfólio público da loja  | visitor   | 3    | Página estrutural |
| `/links`                           | Link da bio                | visitor   | 3    | Página estrutural |
| `/faq`                             | Dúvidas comuns             | visitor   | 3    | Página estrutural |
| `/contato`                         | Fale com a loja            | visitor   | 0    | Página estrutural |
| `/carrinho`                        | Itens no carrinho          | visitor   | 2    | Página estrutural |
| `/checkout/identificacao`          | Checkout: identificação    | visitor   | 2    | Página estrutural |
| `/checkout/entrega`                | Checkout: entrega          | visitor   | 2    | Página estrutural |
| `/checkout/cotacao`                | Checkout: cotação de frete | visitor   | 2    | Página estrutural |
| `/checkout/revisao`                | Checkout: revisão          | visitor   | 2    | Página estrutural |
| `/checkout/pagamento`              | Checkout: pagamento        | visitor   | 2    | Página estrutural |
| `/pedido/:publicToken/confirmacao` | Confirmação do pedido      | visitor   | 2    | Página estrutural |
| `/gift-card/:claimToken`           | Resgate de gift card       | visitor   | 4    | Página estrutural |
| `/instalar`                        | Instruções PWA             | visitor   | 3    | Página estrutural |
| `/politicas/:slug`                 | Página de política         | visitor   | 0    | Página estrutural |
| `/privacidade`                     | Política de privacidade    | visitor   | 0    | Página estrutural |
| `/termos`                          | Termos de uso              | visitor   | 0    | Página estrutural |
| `/trocas-e-devolucoes`             | Política de trocas         | visitor   | 0    | Página estrutural |

## Rotas da cliente

| Rota                   | Descrição             | Permissão | Fase | Status Fase 0     |
| ---------------------- | --------------------- | --------- | ---- | ----------------- |
| `/entrar`              | Login da cliente      | visitor   | 1    | Página estrutural |
| `/cadastro`            | Criar conta           | visitor   | 1    | Página estrutural |
| `/recuperar-senha`     | Recuperação de senha  | visitor   | 1    | Página estrutural |
| `/conta`               | Painel da cliente     | customer  | 1    | Página estrutural |
| `/conta/perfil`        | Dados pessoais        | customer  | 1    | Página estrutural |
| `/conta/enderecos`     | Endereços salvos      | customer  | 2    | Página estrutural |
| `/conta/pedidos`       | Histórico de pedidos  | customer  | 2    | Página estrutural |
| `/conta/pedidos/:id`   | Detalhe do pedido     | customer  | 2    | Página estrutural |
| `/conta/pagamentos`    | Pagamentos da cliente | customer  | 2    | Página estrutural |
| `/conta/creditos`      | Saldo de créditos     | customer  | 4    | Página estrutural |
| `/conta/gift-cards`    | Gift cards da cliente | customer  | 4    | Página estrutural |
| `/conta/avaliacoes`    | Avaliações enviadas   | customer  | 3    | Página estrutural |
| `/conta/trocas`        | Solicitações de troca | customer  | 4    | Página estrutural |
| `/conta/suporte`       | Atendimento           | customer  | 4    | Página estrutural |
| `/conta/conversas/:id` | Thread de conversa    | customer  | 4    | Página estrutural |
| `/conta/privacidade`   | Consentimentos e LGPD | customer  | 3    | Página estrutural |

## Rotas do workspace (B2B)

| Rota                             | Descrição                    | Permissão                                                       | Fase | Status Fase 0      |
| -------------------------------- | ---------------------------- | --------------------------------------------------------------- | ---- | ------------------ |
| `/admin`                         | Dashboard do painel          | owner, admin, manager, seller, stock, finance, content, support | 0    | Página estrutural  |
| `/admin/onboarding`              | Primeiros passos             | owner, admin, manager                                           | 0    | Página estrutural  |
| `/admin/catalogo/produtos`       | Lista de produtos            | owner, admin, manager, stock, content                           | 1    | Planejado (Fase 1) |
| `/admin/catalogo/produtos/novo`  | Cadastro de produto          | owner, admin, manager, content                                  | 1    | Planejado (Fase 1) |
| `/admin/catalogo/produtos/:id`   | Edição de produto            | owner, admin, manager, content                                  | 1    | Planejado (Fase 1) |
| `/admin/catalogo/tipos`          | Schemas de atributos         | owner, admin, manager                                           | 1    | Planejado (Fase 1) |
| `/admin/catalogo/categorias`     | Árvore de categorias         | owner, admin, manager                                           | 1    | Planejado (Fase 1) |
| `/admin/catalogo/colecoes`       | Coleções curadas             | owner, admin, manager                                           | 1    | Planejado (Fase 1) |
| `/admin/catalogo/atributos`      | Definições de atributos      | owner, admin, manager                                           | 1    | Planejado (Fase 1) |
| `/admin/midias`                  | Biblioteca de mídia          | owner, admin, manager, content                                  | 1    | Planejado (Fase 1) |
| `/admin/estoque`                 | Estoque por variação         | owner, admin, manager, stock                                    | 1    | Planejado (Fase 1) |
| `/admin/estoque/movimentos`      | Movimentos de estoque        | owner, admin, manager, stock                                    | 1    | Planejado (Fase 1) |
| `/admin/estoque/alertas`         | Alertas de estoque           | owner, admin, manager, stock                                    | 1    | Planejado (Fase 1) |
| `/admin/pedidos`                 | Lista de pedidos             | owner, admin, manager, seller, finance                          | 2    | Planejado (Fase 2) |
| `/admin/pedidos/:id`             | Detalhe do pedido            | owner, admin, manager, seller, finance                          | 2    | Planejado (Fase 2) |
| `/admin/fretes`                  | Estratégias de frete         | owner, admin, manager                                           | 2    | Planejado (Fase 2) |
| `/admin/fretes/tabelas`          | Frete manual                 | owner, admin, manager                                           | 2    | Planejado (Fase 2) |
| `/admin/fretes/cotacoes`         | Cotações manuais             | owner, admin, manager                                           | 2    | Planejado (Fase 2) |
| `/admin/pagamentos`              | Pagamentos recebidos         | owner, admin, finance                                           | 2    | Planejado (Fase 2) |
| `/admin/comprovantes`            | Comprovantes manuais         | owner, admin, finance                                           | 2    | Planejado (Fase 2) |
| `/admin/clientes`                | Lista de clientes            | owner, admin, manager, seller, support                          | 4    | Planejado (Fase 4) |
| `/admin/clientes/:id`            | Ficha 360 da cliente         | owner, admin, manager, seller, support                          | 4    | Planejado (Fase 4) |
| `/admin/suporte`                 | Atendimentos                 | owner, admin, manager, support                                  | 4    | Planejado (Fase 4) |
| `/admin/conversas`               | Chat com clientes            | owner, admin, manager, support                                  | 4    | Planejado (Fase 4) |
| `/admin/trocas`                  | Trocas e devoluções          | owner, admin, manager, support                                  | 4    | Planejado (Fase 4) |
| `/admin/avaliacoes`              | Moderação de avaliações      | owner, admin, manager, content                                  | 3    | Planejado (Fase 3) |
| `/admin/cms/paginas`             | Páginas do CMS               | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/cms/paginas/:id/editor`  | Editor por seções            | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/cms/navegacao`           | Menus de navegação           | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/cms/tema`                | Editor de tema               | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/stories`                 | Gestão de stories            | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/destaques`               | Destaques permanentes        | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/perfil-publico`          | Portfólio da loja            | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/link-da-bio`             | Página de links              | owner, admin, content                                           | 3    | Planejado (Fase 3) |
| `/admin/marketing/cupons`        | Cupons de desconto           | owner, admin, manager                                           | 5    | Planejado (Fase 5) |
| `/admin/marketing/gift-cards`    | Gestão de gift cards         | owner, admin, finance                                           | 4    | Planejado (Fase 4) |
| `/admin/marketing/carrinhos`     | Carrinhos abandonados        | owner, admin, manager                                           | 5    | Planejado (Fase 5) |
| `/admin/marketing/notificacoes`  | Push e campanhas             | owner, admin, manager                                           | 5    | Planejado (Fase 5) |
| `/admin/marketing/feed`          | Feeds Meta/Google            | owner, admin, manager                                           | 5    | Planejado (Fase 5) |
| `/admin/match-time`              | Recomendação por swipe       | owner, admin, manager                                           | 5    | Planejado (Fase 5) |
| `/admin/criador`                 | Criador de posts/arte        | owner, admin, content                                           | 5    | Planejado (Fase 5) |
| `/admin/caixa`                   | Caixa e frente de loja       | owner, admin, manager, seller, finance                          | 4    | Planejado (Fase 4) |
| `/admin/caixa/turnos`            | Turnos de caixa              | owner, admin, manager, finance                                  | 4    | Planejado (Fase 4) |
| `/admin/caixa/lancamentos`       | Entradas e saídas de caixa   | owner, admin, manager, finance                                  | 4    | Planejado (Fase 4) |
| `/admin/comissoes`               | Comissões da equipe          | owner, admin, finance                                           | 4    | Planejado (Fase 4) |
| `/admin/equipe`                  | Usuários e papéis            | owner, admin                                                    | 1    | Planejado (Fase 1) |
| `/admin/relatorios`              | Relatórios e métricas        | owner, admin, manager, finance                                  | 4    | Planejado (Fase 4) |
| `/admin/integracoes`             | Conexões externas            | owner, admin                                                    | 5    | Planejado (Fase 5) |
| `/admin/configuracoes/loja`      | Dados da loja                | owner, admin                                                    | 0    | Página estrutural  |
| `/admin/configuracoes/politicas` | Políticas e termos           | owner, admin                                                    | 3    | Planejado (Fase 3) |
| `/admin/configuracoes/lgpd`      | Privacidade e consentimentos | owner, admin                                                    | 3    | Planejado (Fase 3) |
| `/admin/configuracoes/auditoria` | Log de auditoria             | owner, admin                                                    | 4    | Planejado (Fase 4) |
| `/admin/configuracoes/seo`       | Configurações de SEO         | owner, admin, content                                           | 3    | Planejado (Fase 3) |

## Auditoria A1 — Inventário de Rastreabilidade

> **Data da Revisão:** 21/07/2026
> **Commit Analisado:** 5865d731
> **Evidência:** 110 arquivos físicos vs 99 caminhos registrados em src/lib/routes.ts.

### Rotas Órfãs e Desconectadas

Encontradas rotas físicas que não possuem registro no ROUTES.md e não recebem navegação oficial:

- dmin_.pedidos..recibo.tsx (Possível duplicação/legado de impressão de recibo)
- _store.bio..tsx (Rota de Link na Bio não registrada na fonte de verdade pública)
- _store.match-time.tsx (Rota de Match Time não registrada na vitrine)
- _store.paginas..tsx (Consumidor de CMS estático)
- _store.redefinir-senha.tsx (Flow isolado de auth, possivelmente funcionando na camada errada)
- _store.vendedora..tsx (URL de vendedor/afiliado órfã)

### Status Geral

- **Administração (admin.\* / workspace.\*):** Painéis operacionais do lojista e módulos de nicho com isolamento multi-tenant por sessão.
- **Governança Master (admin-master.\*):** Painel executivo do conselho, auditoria, telemetria e valuation.
- **Vitrine e Conta (\_store.\*):** Experiência pública nativa rápida e silenciosa sem barreiras cognitivas.

## Rotas de Governança Master (admin-master.*)

| Rota | Descrição | Permissão | Fase | Status |
| :--- | :--- | :--- | :---: | :---: |
| `/admin-master` | Dashboard Global da Plataforma | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/crescimento` | **Metas Projetadas vs. Dados Reais & Valuation** | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/modulos` | Gestão de Módulos & Features | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/algoritmo` | Calibração do Feed & Afinidade | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/curadoria` | Curadoria & Mystery Shopper | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/lojas` | Gestão Global de Tenants/Lojas | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/usuarios` | Usuários & Moderação | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/faturas` | Faturamento Global da Plataforma | platform_admin | 1 | `✅ Implementado` |
| `/admin-master/seguranca` | Telemetria & Segurança Forense | platform_admin | 1 | `✅ Implementado` |

