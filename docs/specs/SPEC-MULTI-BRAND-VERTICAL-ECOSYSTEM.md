# SPEC-MULTI-BRAND-VERTICAL-ECOSYSTEM — Arquitetura de Ecossistema Multi-Marca, Verticais Especializadas & Desacoplamento Soberano de Marketplace

## 1. Contexto e Objetivo
Transformar a plataforma Waesy em um ecossistema de **Núcleo Único (Single Core Engine)** com **Múltiplas Marcas Verticais Soberanas (Multi-Brand SaaS)** e **Desacoplamento Explícito de Marketplace (Opt-In)**. Qualquer melhoria em módulos fundacionais (Financeiro, RH/DP, Contabilidade, GED, Contratos, Fiscal, Estoque/BOM, CRM e IA Copilot) propaga-se instantaneamente para todas as verticais sem duplicação de código.

## 2. Requisitos Normativos (Sintaxe EARS)

- **[EARS-01] (Ubíquo — Núcleo Compartilhado):** O sistema DEVE manter um único repositório e banco de dados relacional unificado, onde todas as marcas verticais consomem as mesmas Server Functions (`src/services/*.functions.ts`) e primitivos de interface (`src/components/`).
- **[EARS-02] (State-Driven — Desacoplamento de Marketplace no Nível da Empresa):** ENQUANTO a flag `waesy_marketplace_enabled` (ou `publish_to_marketplace`) de uma empresa estiver definida como `false`, o sistema DEVE ocultar a empresa das buscas públicas, diretórios comunitários e trilhos do Marketplace Civil Waesy, mantendo seu ERP, PDV e link direto White-Label 100% operacionais.
- **[EARS-03] (State-Driven — Opt-In no Nível de Produto/Serviço):** ENQUANTO a flag `is_published_to_marketplace` de um produto ou serviço estiver definida como `false`, o sistema DEVE mantê-lo disponível apenas para operação interna (PDV, comandas, controle de estoque e cardápio direto da loja) e omiti-lo da vitrine agregada do Marketplace Waesy.
- **[EARS-04] (Event-Driven — Resolução de Marca por Hostname):** QUANDO uma requisição HTTP atingir o Cloudflare Worker (`src/server.ts`), o sistema DEVE inspecionar o cabeçalho `Host` e resolver deterministicamente a marca vertical ativa (`waesy`, `wowbook`, `tableway`, `turis`, `passhub`, `lexcloud`, `talentlink`, `omnipage`, `signflow`, `waesy_news`, `waesy_copilot`, `waesy_studio`), injetando os metadados de contexto da marca.
- **[EARS-05] (Condicional — Adaptação Semântica por Marca Vertical):** SE a empresa operar sob uma marca vertical especializada (ex: `wowbook` para beleza/saúde ou `tableway` para gastronomia), ENTÃO o sistema DEVE aplicar automaticamente o preset de nicho, nomenclatura de entidades e módulos padrão correspondentes àquela vertical.
- **[EARS-06] (State-Driven — Empacotamento por Planos / Entitlements):** ENQUANTO uma empresa estiver vinculada a um plano específico (`starter`, `pro`, `enterprise`), o utilitário canônico `canAccessModule(store, moduleKey)` DEVE validar o acesso aos módulos contratados e add-ons habilitados, preservando retrocompatibilidade (`enterprise` por padrão para lojas existentes).
- **[EARS-07] (Event-Driven — Governança Bilateral no Workspace):** QUANDO o gestor da empresa alterar as chaves de publicação no Marketplace, visibilidade de itens ou vertical de operação na tela de Configurações (`/workspace/configuracoes`), o BFF DEVE persistir atomicamente as alterações em `public.stores`, `public.products` e `public.directory_listings`.
- **[EARS-08] (Ubíquo — Piso Visual e Acessibilidade WCAG 2.2 AA):** Todos os controles de governança multi-marca e opt-in de marketplace DEVEM respeitar altura mínima tátil de 44px (`h-11`), anel de foco `:focus-visible`, zero cores hexadecimais literais (DL-01) e zero valores arbitrários entre colchetes (DL-02).

## 3. Catálogo de Marcas Verticais Canônicas
1. **Waesy** (`waesy.com.br`): Marketplace Local, Classificados & Super App Civil.
2. **WowBook** (`wowbook.com.br`): Barbearias, Salões de Beleza, Estética & Clínicas (`healthcare` / `services`).
3. **TableWay** (`tableway.com.br`): Restaurantes, Pizzarias, Bares, KDS & Delivery (`gastronomy`).
4. **Turis** (`turis.com.br`): Agências de Viagens, Operadoras, Receptivo & Fretamento (`tourism`).
5. **PassHub** (`passhub.com.br`): Eventos, Produtoras, Ingressos & Portaria QR (`events`).
6. **LexCloud** (`lexcloud.com.br`): Escritórios de Advocacia, Processos, GED & Compliance Jurídico (`services`).
7. **TalentLink** (`talentlink.com.br`): Recrutamento, Vagas, Admissão Digital Sem Papel & DP (`services`).
8. **OmniPage** (`omnipage.com.br`): Construtor de Sites, Landing Pages & BioLinks (`creator`).
9. **SignFlow** (`signflow.com.br`): Contratos, Assinatura Eletrônica Biométrica & Dossiê ICP-Brasil (`services`).
10. **Waesy News 360** (`news.waesy.com.br`): Portais de Notícias, Jornalismo Local & Ad Server (`creator`).
11. **Waesy Copilot** (`copilot.waesy.com.br`): Agente Autônomo de IA, Mineração & Execução Cloud (`generic`).
12. **Waesy Studio Business** (`studio.waesy.com.br`): ERP All-in-One Multi-Nicho para Operações Híbridas e Franquias (`generic`).

## 4. Invariantes e Evidências de Aceite
- Migration SQL idempotente criando colunas e índices em `stores`, `products`, `services` e `directory_listings`.
- Motor puro `src/lib/multi-brand-engine.ts` com 100% de cobertura de testes unitários em `src/lib/__tests__/multi-brand-engine.test.ts`.
- BFF `src/services/multi-brand.functions.ts` com validação Zod e isolamento multi-tenant.
- Zero regressões no `design-lint --ratchet` e `tsc --noEmit`.
