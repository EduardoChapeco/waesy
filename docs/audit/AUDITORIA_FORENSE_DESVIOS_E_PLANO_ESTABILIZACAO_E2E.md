# AUDITORIA FORENSE DE DESVIOS, ARQUITETURA DOS 4 PILARES E PLANO MESTRE DE ESTABILIZAÇÃO E2E

> **Data de Emissão:** 02 de Outubro de 2026  
> **Órgão Deliberativo:** BigTech Executive Board & Red Team (CPO, Architect, CISO, Design Director, QA Gatekeeper)  
> **Status:** HOMOLOGADO E VINCULANTE  
> **Alvo:** Ecossistema Waesy (Classificados, Marketplace, Places, Workspace e Vertical Turismo)

---

## 1. PARECER DO CONSELHO EXECUTIVO BIGTECH & RED TEAM

### 1.1 Voto do Chief Product Officer (CPO) — Desentrelaçamento dos 4 Pilares
> *"O usuário diagnosticou a falha raiz com exatidão cirúrgica: houve uma mistura conceitual inaceitável entre Catálogo de Empresas (Places), Feed Informal (Classificados), Vitrines Transacionais (Marketplace) e o ERP/SaaS de Gestão (Workspace).  
> Classificados é C2C e micro-comércio informal. Marketplace é B2C de empresas com estoque e checkout, filtrado por nicho. Places é o diretório da cidade. O lojista deve ter a prerrogativa de começar no Cadastro Rápido e, com 1 clique, ser promovido ao Painel Pro (Workspace), convertendo seus anúncios avulsos em produtos avançados de catálogo sem perda de histórico."*

### 1.2 Voto do Chief Software Architect (Engenharia de Software)
> *"Identificamos 151 rotas monólitos com mais de 500 linhas, encabeçadas por `_store.conta.classificados.novo.tsx` (9.286 linhas / 473 KB) e `workspace.turismo.viagens.$id.tsx` (103 KB). Essa sobrecarga de responsabilidade gerou bifurcações em duplicidade e quebrou o fluxo ponta a ponta do Turismo.  
> A solução exige: (1) Criar a rota mãe `/marketplace` com seletor de vitrines nichadas; (2) Isolar `/classificados` exclusivamente para anúncios avulsos; (3) Isolar `/places` (`_store.diretorio`) para perfis cadastrais de estabelecimentos; (4) Desmembrar os monólitos em componentes modulares e contratos Zod limpos."*

### 1.3 Voto do Chief Information Security Officer (CISO)
> *"A separação de contextos é uma exigência de Segurança e RLS (Row Level Security). Um anúncio de classificados pertence a um `user_id` pessoal (ou perfil rápido). Uma oferta de marketplace pertence a um `store_id` corporativo com chave fiscal e regras de conciliação bancária. A promoção de anúncio avulso para Workspace deve validar estritamente a posse do tenant (`assertTenantOwnership`), impedindo qualquer injeção cruzada."*

### 1.4 Voto do Design Director (Apple HIG & Design System)
> *"As vitrines nichadas do Marketplace foram ofuscadas ou dispersas em rotas soltas. Elas precisam voltar ao centro do palco com as primitivas canônicas (`CanonicalPage`, `CanonicalBentoGrid`, `AdaptiveViewportContainer`), garantindo navegação fluida em 320px, 390px, 768px, 1280px e 1920px, sem AI-Smell, sem `!important` e com zero regressões no Design Lint."*

### 1.5 Voto do QA Gatekeeper
> *"O critério de aprovação deste plano é a comprovação pelas Quatro Provas (PR1 Código, PR2 Fluxo E2E, PR3 Visual e PR4 Contrato). Cada fase só será encerrada com Vitest 100% verde, Typecheck zero erros e catraca de Design Lint inalterada."*

---

## 2. A MATRIZ DE DESENTRELAÇAMENTO DOS 4 PILARES

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ECOSSISTEMA WAESY                                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
        ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
        ▼                   ▼                               ▼                   ▼
 ┌──────────────┐    ┌──────────────┐                ┌──────────────┐    ┌──────────────┐
 │   PLACES     │    │ CLASSIFICADOS│                │ MARKETPLACE  │    │  WORKSPACE   │
 │ (/places ou  │    │(/classificados│               │(/marketplace)│    │ (/workspace) │
 │  /diretorio) │    │              │                │              │    │              │
 └──────┬───────┘    └──────┬───────┘                └──────┬───────┘    └──────┬───────┘
        │                   │                               │                   │
  Catálogo Local      Feed Informal                   Vitrines B2C        Painel Pro Max
  - Perfil Empresa    - Pessoa Física                 - Empresas Pro      - ERP Completo
  - Telefone / Whats  - Comércio Rápido               - Nichadas (Turismo,- CRM & Funil
  - Endereço / Mapa   - Sem ERP / Sem NF                Gastronomia, etc) - Emissão NFe
  - Horários e Fotos  - Ciclo 30 dias                 - Checkout Transac. - Gestão Nichos
        │                   │                               ▲                   ▲
        │                   │        PONTE CANÔNICA         │                   │
        └───────────────────┴─────── DE UPGRADE ────────────┴───────────────────┘
                               (Promover Empresa Rápida ➔ Painel Pro)
                               (Promover Anúncio Rápido ➔ Produto de Workspace)
```

| Dimensão | Places (`/places` / `/diretorio`) | Classificados (`/classificados`) | Marketplace (`/marketplace`) | Workspace (`/workspace`) |
| :--- | :--- | :--- | :--- | :--- |
| **Público / Usuário** | Cidadão buscando comércio local | Cidadão ou vendedor casual | Consumidor comprando online | Lojista / Operador / Equipe |
| **Entidade Central** | `StoreProfile` / `DirectoryPlace` | `ClassifiedAd` (avulso) | `UnifiedListing` (empresa) | ERP / CRM / Estoque / Fiscal |
| **Origem do Dado** | Cadastro rápido ou curadoria | Publicação rápida em 1 min | Catálogo ativo do Workspace | Gestão interna da empresa |
| **Monetização** | Destaque e reputação | Taxa de anúncio / Boost | Comissão de checkout / split | Mensalidade SaaS / módulos |
| **Vitrines de Nicho** | Mapa e categorias de guia | Filtros básicos de desapego | **Vitrines Ricas por Nicho** | Editores especializados |
| **Checkout / Pagamento** | Inexistente (visita física/Whats)| Opcional / Negociação direta | **Obrigatório e Integrado** | Gestão de caixa e DRE |

---

## 3. AUDITORIA DETALHADA DAS QUEBRAS E DESVIOS NO REPOSITÓRIO

### 3.1 Desvio 1: A Ausência da Rota Mãe `/marketplace` e Dispersão de Vitrines
- **Diagnóstico:** Não existe `src/routes/marketplace.tsx` ou `src/routes/_store.marketplace.tsx`.
- **Efeito Colateral:** As vitrines transacionais de empresas ficaram desarticuladas em rotas secundárias (`_store.gastronomia.tsx`, `_store.turismo.index.tsx`, `_store.mercado.tsx`), enquanto o diretório (`_store.diretorio.tsx`) passou a ser confundido com marketplace.
- **Ação Reparadora:** Criar a rota mãe canônica `/marketplace` com cabeçalho de navegação por vitrines nichadas e integração direta com o motor unificado de ofertas B2C.

### 3.2 Desvio 2: O Monólito `_store.conta.classificados.novo.tsx` (9.286 linhas)
- **Diagnóstico:** O arquivo possui 473 KB e mais de 9.000 linhas de código contendo simultaneamente formulários de turismo, veículos, imóveis, validações ad-hoc e chamadas diretas de banco de dados.
- **Efeito Colateral:** Qualquer alteração no cadastro de classificados quebra os nichos específicos, além de estourar a memória de lint e impedir reaproveitamento de código.
- **Ação Reparadora:** Decompor em componentes modulares baseados na biblioteca canônica de nichos (`src/lib/ad-engine/niche-packages/`).

### 3.3 Desvio 3: Falta da Ponte Canônica de Promoção (Classificados ➔ Workspace)
- **Diagnóstico:** Embora existam tipos em `workspace-parity-bridge.ts`, não existe uma ação no backend (`promoteClassifiedToWorkspaceProduct`) e na interface que permita ao lojista que começou informal clicar em "Promover para Catálogo do Workspace" e nativizar seus anúncios sem redigitação.
- **Ação Reparadora:** Implementar Server Function transacional com cópia de imagens, precificação e vínculo com o inventário imutável de estoque.

### 3.4 Desvio 4: Rupturas no Fluxo Ponta a Ponta de Turismo
- **Cadeia de 8 Elos:**
  1. `Lead`: Presente em `m.lead.$leadId.tsx` e `workspace.crm.tsx`, porém o botão de "Criar Proposta" ainda opera por redirecionamento de URL com parâmetros frágeis.
  2. `Cotação/Proposta`: `workspace.turismo.propostas.*` possui telas de edição extensas (73 KB e 103 KB) sem reaproveitar a primitiva `CanonicalForm`.
  3. `Conversão em Viagem`: A função `convertProposalToTrip` existe em `travel-lifecycle.functions.ts`, mas o modal de confirmação no CRM não atualiza o Kanban em tempo real sem refresh manual.
  4. `Contrato Digital`: Falta de disparador automático de webhook de assinatura para o viajante após aceite da proposta.
  5. `Embarque e Vouchers`: A geração de QR Code e manifesto de passageiros em `workspace.turismo.embarques.tsx` está isolada da consulta de passageiros do viajante (`viajante.$token.tsx`).
  6. `Reacomodação e Incidentes`: Rotas `workspace.turismo.incidentes.tsx` e `reacomodacao.tsx` operam sem máquina de estados determinística vinculada a `state-machines.ts`.

---

## 4. PLANO MESTRE DE EXECUÇÃO: OPERAÇÃO ESTABILIZAÇÃO TOTAL (F01 A F24)

### BLOCO 1: Separação Arquitetural dos 4 Pilares (F01 a F06)
- **F01:** Criação da Rota Mãe `/marketplace` (`src/routes/marketplace.tsx` e `_store.marketplace.index.tsx`) com seletor canônico de vitrines nichadas e dados restritos a empresas com Workspace.
- **F02:** Blindagem da Rota `/classificados` (`src/routes/_store.classificados.index.tsx`), expurgando empresas formais e mantendo foco estrito em anúncios avulsos/informais com expiração em 30 dias.
- **F03:** Consolidação da Rota `/places` / Diretório Local (`src/routes/_store.diretorio.index.tsx` e `_store.diretorio.$id.tsx`) como guia oficial de estabelecimentos, endereços e reputação.
- **F04:** Construção da Ponte Canônica de Upgrade (`src/services/listing-promotion.functions.ts`), permitindo converter anúncio avulso em produto de Workspace com 1 clique e preservação de assets.
- **F05:** Modal e Assistente de Nativização no Workspace ("Importar Meus Anúncios do Classificados para o Catálogo Pro").
- **F06:** Testes automatizados E2E da separação dos 4 pilares com validação de isolamento de tenants.

### BLOCO 2: Vitrines Nichadas de Marketplace (F07 a F12)
- **F07:** Vitrine de Turismo no Marketplace (`/marketplace/turismo`), consumindo pacotes, excursões, hotéis e passeios de agências ativas no Workspace.
- **F08:** Vitrine de Gastronomia no Marketplace (`/marketplace/gastronomia`), com cardápios, delivery, reservas de mesa e horários de atendimento.
- **F09:** Vitrine de Varejo & Comércio Local (`/marketplace/lojas`), com grade de produtos, cálculo de entrega local e fretes.
- **F10:** Vitrine de Serviços Profissionais (`/marketplace/servicos`), com orçamentos dinâmicos, agendamento de horário e avaliações verificadas.
- **F11:** Vitrine de Imóveis & Temporada (`/marketplace/imoveis`), com mapa de geolocalização, filtro de diárias e agendamento de visitas.
- **F12:** Vitrine de Veículos & Autopeças (`/marketplace/veiculos`), com tabela FIPE integrada e simulação de financiamento.

### BLOCO 3: Decomposição do Monólito de Classificados (F13 a F16)
- **F13:** Decomposição da Seção de Identificação e Nicho de `_store.conta.classificados.novo.tsx` em submódulos isolados (< 300 linhas).
- **F14:** Decomposição da Seção de Galeria e Upload com Trava de Aspect Ratio e Proteção contra CLS.
- **F15:** Decomposição da Seção de Preços, Formas de Negociação e Dados de Contato Direto (WhatsApp/Chat).
- **F16:** Redução de `_store.conta.classificados.novo.tsx` de 9.286 linhas para menos de 400 linhas como casca fina orquestradora.

### BLOCO 4: Blindagem e Nativização do Fluxo de Turismo E2E (F17 a F22)
- **F17:** Unificação da Jornada Lead ➔ Proposta Comercial no CRM de Turismo (`workspace.turismo.propostas.novo.tsx`).
- **F18:** Modal Canônico de Aceite e Conversão em Viagem com disparo de eventos no barramento de domínio (`domain-events.functions.ts`).
- **F19:** Geração Atômica de Contrato de Viagem e Despacho Multicanal (Link Seguro / WhatsApp) com tela de assinatura pública.
- **F20:** Orquestração de Embarque e Emissão de Vouchers com QR Code e manifesto completo de passageiros.
- **F21:** Gestão de Viagens e Frota (`workspace.turismo.viagens.$id.tsx`), decompondo o monólito de 103 KB em abas modulares (Passageiros, Financeiro, Itinerário, Fornecedores).
- **F22:** Módulo Operacional de Incidentes, Reacomodação de Passageiros e Alteração de Itinerário com trilha de auditoria imutável.

### BLOCO 5: Homologação, Certificação e Selo do Conselho (F23 a F24)
- **F23:** Execução das Quatro Provas (Código, Fluxo, Visual e Contrato) em todos os fluxos tocados.
- **F24:** Homologação do Conselho Executivo BigTech com atualização de `docs/design/DECISIONS.md`, `ESTADO.json` e build de produção para Cloudflare Pages.

---

## 5. CRONOGRAMA DE EXECUÇÃO IMEDIATA

O BigTech Executive Board determina o início imediato pela **Fase F01 (Criação da Rota Mãe `/marketplace` com Seletor Canônico de Vitrines Nichadas)**, restaurando a dignidade conceitual da plataforma Waesy e eliminando a confusão de contextos.
