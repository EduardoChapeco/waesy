# 🏛️ Plano Diretor de Engenharia BigTech: Auditoria Completa, Diagnóstico de Recursos & Expansão de Módulos (Waesy Super App)

> **Documento Executivo de Auditoria e Especificação Funcional**  
> Emitido pelo Conselho Executivo de Engenharia (BigTech Board) em resposta à análise minuciosa de requisitos, consistência de dados, fluxos de negócio reais e referências visuais móveis (iFood / Super App Engine).

---

## 📊 1. Matriz de Auditoria e Diagnóstico Funcional (O que existe vs. O que expandir)

| Módulo / Pergunta do Usuário | Status Atual no Código | Banco de Dados / Supabase | Ações Imediatas de Expansão |
| :--- | :---: | :---: | :--- |
| **1. Banners & Hotpages Editáveis no Admin Master** | ✅ **Funcional** | `public.banners`, `public.hotpages` | Adicionar suporte a **Banners Verticais de Início de Trilho** (iFood-Style) e cards quadrados squircle. |
| **2. Categorias Master com Imagens Grandes** | 🟡 **Parcial** | `DEFAULT_MASTER_CATEGORIES` | Implementar os **Big Squircle Cards** no topo da Home (ex: Restaurantes vs. Mercados) com sub-pills. |
| **3. Empregos: Candidatura, Currículos & Entrevistas** | 🟡 **Parcial** | `public.job_postings`, `public.job_applications` | Criar pipeline de triagem (Bom/Ruim/Notas), agendador de reunião com link de vídeo e conversão em funcionário. |
| **4. Eventos: Ingressos por Lotes & Patrocinadores** | 🟡 **Parcial** | `public.events`, `public.event_tickets` | Expandir virada automática de lotes de ingressos e expositor de cotas de patrocinadores. |
| **5. Imóveis: Locação, Contratos & Manutenção** | ✅ **Funcional** | `public.classifieds`, `public.deals`, `contracts` | Adicionar aba de **Chamados de Manutenção & Vistoria** com envio de comprovantes de pagamento do aluguel. |
| **6. Logística, Frotas & Pontos de Retirada (PUDO)** | ✅ **Funcional** | `public.fleet_orders`, `driver_profiles` | Implementar módulo de parceria comercial entre lojas para Ponto de Retirada e logística reversa com checklists. |
| **7. Notícias: Formato Feed Editorial (Sem Grids Frios)** | 🟡 **Parcial** | `public.news_articles`, `public.news_categories` | Refatorar para estilo Feed Social dinâmico com carrosséis temáticos por editoria e matérias com patrocinador. |
| **8. Painel de Pedidos / Cozinha (iFood-Style)** | ✅ **Funcional** | `public.orders`, `public.order_items` | Aprimorar o cockpit de despacho com abas `Novos`, `Em Preparo`, `Prontos`, timers regressivos e impressão térmica. |
| **9. Barreira para Não-Logados em Ações** | ✅ **Funcional** | `useAuthGuard`, `AuthModal` | Garantir que todas as ações (agendar, candidatar, propor, comprar) abram o modal de autenticação sem perder o contexto. |

---

## 🎨 2. Design System & Transformação Visual da Home (Inspiração iFood)

Com base nas referências visuais enviadas pelo usuário, a Home (`/_store/`) receberá:
1. **Hero Squircle Master Banners**:
   - Dois cards gigantes lado a lado no topo:
     - 🍔 **Restaurantes & Delivery** (`Vermelho/Laranja Vibrante`, foto em alta definição, botão "Ver opções >")
     - 🛒 **Mercado & Essenciais** (`Verde/Esmeralda`, foto de hortifrúti/carrinho, botão "Buscar lojas >")
   - Abaixo, carrossel de **Pills Squircle** com ícones 3D (`Bebidas`, `Farmácia`, `Pet Shop`, `Ofertas Relâmpago`, `Beleza`, `Moda`).
2. **Trilhos Temáticos com Card Vertical Líder (Feature Card)**:
   - Trilho "Top Mais Pedidos" com um banner vertical 100% preenchido à esquerda seguido por 4 cards horizontais de produtos com preço, tempo de entrega e botão de adicionar.

---

## 💼 3. Especificação do Módulo de Vagas & Recrutamento (ATS Integrado)

```text
[ Vaga Publicada ] ──> [ Candidato Aplica com Currículo PDF ]
                                │
                                ▼
                       [ Workspace da Loja ]
                   ( Pipeline Kanban de Recrutamento )
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
      [ Triagem ]      [ Agendar Entrevista ]    [ Reprovado ]
    ( Bom / Ruim )    ( Link Meet / Jitsi )
            │                   │
            └─────────┬─────────┘
                      ▼
            [ Contratar Candidato ]
                      │
                      ▼
   [ Criação Automática de Membro da Loja ]
   ( Cargo, Salário, Horários e Permissões RBAC )
```

---

## 🏡 4. Especificação PropTech: Aluguel, Contratos & Manutenção

1. **Ciclo de Locação**:
   - Anúncio em Classificados (`deal_type = 'aluguel'`) ➔ Proposta Formal (`deals`) ➔ Contrato Digital com Assinatura Eletrônica (Módulo 19) ➔ Carnê de Mensalidades (`receivable_installments`).
2. **Central de Manutenção & Vistoria**:
   - O inquilino abre chamado de reparo (vazamento, fiação, pintura) com fotos/vídeos.
   - O proprietário/imobiliária recebe notificação, aprova orçamento ou abate o valor no próximo aluguel.
   - Upload de comprovantes de pagamento bancário/PIX com conciliação manual ou automática.

---

## 📦 5. Logística, Pontos de Retirada (PUDO) & Despacho

1. **Rede de Retirada (Pick Up & Drop Off)**:
   - Lojas locais podem se cadastrar como "Ponto Oficial de Retirada" de encomendas.
   - Contratos digitais bilaterais entre operador logístico e lojista com remuneração por pacote custodiado (ex: R$ 3,00/pacote).
2. **Cockpit de Cozinha / Expedição**:
   - Tela estilo iFood com colunas: **Novos Pedidos** (com alerta sonoro e botão Aceitar), **Em Preparo** (com timer e botão Despachar) e **Prontos / Despachados**.
   - Impressão térmica automática de comandas e etiquetas em 58mm / 80mm.

---

## 📰 6. Refatoração do Portal de Notícias (Feed Editorial Dinâmico)

- Substituição de grids estáticos por uma experiência editorial dinâmica:
  - **Destaque Principal com Banner Imersivo** (Manchete do Dia).
  - **Trilhos Temáticos em Carrossel Horizontal**: *Cotidiano & Cidade*, *Economia Regional*, *Cultura & Noite*, *Esportes & Chapecoense*.
  - **Módulos de Patrocinadores Locais** integrados aos artigos com telemetria de cliques e impressões.

---

## 🚀 7. Plano de Execução Imediato

1. [x] **Passo 1 (Home & UI iFood)**: Criado componente de **Big Master Cards Squircle** (`MasterSquircleHero`) e pills de acesso rápido no topo da Home (`src/routes/_store.index.tsx`). *(Homologado — DEC-160)*
2. [x] **Passo 2 (Portal de Notícias)**: Refatorada a página de notícias (`src/routes/_store.noticias.index.tsx`) para formato Feed Editorial Dinâmico e eliminadas classes arbitrárias. *(Homologado — DEC-160)*
3. [x] **Passo 3 (Cockpit de Pedidos)**: Aprimorado o painel de pedidos no Workspace (`src/routes/workspace.pedidos.index.tsx`) com interface de cozinha KDS detalhando itens, quantidades e observações em tempo real com touch targets higienizados. *(Homologado — DEC-160)*
4. [x] **Passo 4 (ATS & Vagas)**: Tela de gestão de candidaturas e entrevistas no Workspace (`src/routes/workspace.empregos.candidatos.tsx`) com touch targets $\ge 44\text{px}$ e remoção de colchetes arbitrários. *(Homologado — DEC-160)*
5. [ ] **Passo 5 (Build, Validação & Deploy)**: Validação e publicação sob comando explícito do usuário.

