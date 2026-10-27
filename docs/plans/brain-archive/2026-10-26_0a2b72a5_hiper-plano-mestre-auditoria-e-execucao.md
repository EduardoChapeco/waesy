# Hiper Plano Mestre Executivo: Redesign, Rebranding e Refatoração Holística do Ecossistema Waesy (2026)

## 1. Visão Geral e Alinhamento Estratégico

Este documento constitui o Plano de Execução Normativo para a refatoração holística de frontend e UI do ecossistema Waesy, orientado pelo inventário exaustivo das 81 referências visuais da pasta `drive-download-20261026T142912Z-1-001`.

O objetivo é transformar o produto em uma experiência **mobile-first nativa** (com a ergonomia e silêncio visual do iFood, 99Pay, Threads, BlaBlaCar, Wix Owner e iOS Reminders) e **desktop workstation integrado** (estilo Arc Browser, macOS e Linear), mantendo 100% da rastreabilidade bilateral com o Admin Master CMS, com zero quebra e zero perda de regras de negócio.

---

## 2. Invariantes de Design e Arquitetura Bidirecional

1. **Bifurcação Nativa Congelada:**
   - **Mobile (`<600px`):** Gavetas inferiores (bottom sheets com snap-points), alvos de toque mínimos de 44x44px (`h-11 min-h-11`), teclado numérico nativo in-app para valores, botão hambúrguer no canto superior esquerdo para acesso imediato ao catálogo do SuperApp e aba "Conta" na barra inferior abrindo gaveta de alternância de perfis e identidades.
   - **Desktop (`>=840px`):** Sidebar ultrafina integrada ao fundo, conteúdo elevado em cartão imersivo, busca global ⌘K centralizada e layouts de densidade profissional sem distorção.
2. **Squircles Anti-Truncate:** Curvatura contínua Apple HIG (`rounded-2xl` / `rounded-3xl`). Proibido truncamento de rótulos de valores ou especificações com reticências (`...`) ou classe `truncate`; contêineres adotam quebra de linha inteligente (`text-wrap: pretty/balance`).
3. **Anti-Jank & Zero CLS:** Aspect ratios fixados estritamente no CSS (`aspect-[4/3]`, `aspect-square`, `aspect-[16/9]`, `aspect-[28/9]`) antes do carregamento de qualquer mídia externa. Layout shift nulo (CLS < 0.01).
4. **Bilateralidade CMS Master:** Todos os trilhos, seções, botões e hotpages são alimentados pelas tabelas Supabase (`marketplace_surfaces`, `marketplace_sections`, `marketplace_buttons`, `hotpages`). Se uma mídia customizada não estiver carregada, aciona fallback automático para ícones semânticos vetoriais (Phosphor/Lucide) mantendo a geometria squircle.
5. **Erradicação do AI Smell & Honestidade de Dados:** Zero textos prolixos de boas-vindas, zero gradientes decorativos cafonas, zero fallbacks sintéticos de imagens ou estrelas falsas de estabelecimentos sem review.

---

## 3. Inventário Taxonômico dos Ativos Visuais e Destino Arquitetural

| ID | Arquivo de Origem | Plataforma / App | Módulo / Padrão Identificado | Componente / Rota no Waesy |
|:---|:---|:---|:---|:---|
| FIN-01 | `Captura de tela 2026-10-16 155858.png` | 99Pay / Fintech | Home da Carteira / Waesy Bank (Saldo com toggle, 120% CDI, 5 ações squircle, cartão de crédito, feed) | `src/components/finance/FinancialHeroCard.tsx`<br>`src/components/finance/FinancialActionGrid.tsx`<br>`src/routes/_store.conta.financas.tsx` |
| FIN-02 | `Captura de tela 2026-10-16 155905.png` (Tela 1) | 99Pay / Fintech | Área Pix Unificada (6 cartões squircle, chaves Pix, limites) | `src/components/finance/PixHubDrawer.tsx`<br>`src/components/finance/PixKeysList.tsx` |
| FIN-03 | `Captura de tela 2026-10-16 155905.png` (Tela 2) | 99Pay / Fintech | Tela de Sucesso Transacional (Check verde animado, valor gigante, dados do recebedor) | `src/components/finance/PaymentSuccessReceipt.tsx` |
| FIN-04 | `Captura de tela 2026-10-16 155905.png` (Tela 3) | 99Pay / Fintech | Fatura de Cartão de Crédito (Meses JUL/AGO/SET/OUT, limite bicolor, pagar fatura) | `src/components/finance/CreditCardInvoiceView.tsx` |
| FIN-05 | `Captura de tela 2026-10-16 155905.png` (Tela 4) | 99Pay / Fintech | Ajustes do Cartão e Segurança (Cartão virtual, bloqueio temporário, ajuste de limite) | `src/components/finance/CardSettingsDrawer.tsx` |
| FIN-06 | `images (14).jpg` | 99Pay App | Wallet Hero & Quick Pay (Hambúrguer top-left, botão Carregar, barra amarela Pix/QR/Boleto) | `src/components/finance/WaesyBankDashboard.tsx` |
| FIN-07 | `images (15).jpg` & `dfggdfg.jpg` | 99Pay / Empréstimos | Simulação e Contratação de Crédito (Limite pré-aprovado, parcelas 1x a 36x, cashback) | `src/components/finance/LoanSimulationSheet.tsx` |
| FIN-08 | `images (16).jpg` & `sdfsdfsdf.jpg` | 99Pay / Parcelamento | Cronograma de Vencimento de Parcelas (Timeline vertical de vencimentos) | `src/components/finance/InstallmentTimelineDrawer.tsx` |
| FIN-09 | `Screenshot_2026-10-26-08-34-12-868...` | 99Pay / Sucesso | Confirmação P2P / Depósito (Fundo amarelo, checkmark, link comprovante) | `src/components/finance/PaymentSuccessReceipt.tsx` |
| FIN-10 | `Screenshot_2026-10-26-08-34-20-285...` | 99Pay / Detalhes | Comprovante Canônico de Depósito/Pix (Agência 0001, ID solicitação, canvas PNG/PDF) | `src/lib/financial-receipt-canvas.ts`<br>`src/components/finance/TransactionReceiptModal.tsx` |
| FIN-11 | `hero-tela-lat-esq.jpg` | Noh / Conta Conjunta | Headroom e Alternador de Contas (Pílula dupla avatar com dropdown, abas Histórico/A pagar) | `src/components/shell/AccountSwitcherDrawer.tsx` |
| FIN-12 | `image.png` | Banco Inter SuperApp | Pontos Loop, Moedas e Acesso Rápido (Seletor moedas R$/US$/Loop, cashback e milhas) | `src/components/finance/LoyaltyRewardsCard.tsx` |
| RET-01 | `unnamed (2).webp` | Conta Digital / Porquinho | Pílulas de Ação e Metas Financeiras (Saldo, Pix/Pagar/Cartões, Recargas, Porquinho) | `src/components/finance/SavingsGoalPill.tsx` |
| RET-02 | `unnamed (3).webp` | App Pix | Hub Pix com Seguro e Cartão (Botões Pagar/Receber, Seguro Pix com toggle) | `src/components/finance/PixHubDrawer.tsx` |
| RET-03 | `unnamed (4).webp` | Supermercado / Havan | Hub da Conta do Cliente (Avatar, compras, endereços, leitor de código de barras) | `src/routes/_store.conta.index.tsx`<br>`src/components/account/CivilianAccountHub.tsx` |
| RET-04 | `unnamed (5).webp` | Cartão de Loja | Gestão de Cartão com Progresso Duplo (Fatura, vencimento, barra bicolour de limite) | `src/components/finance/CreditCardInvoiceView.tsx` |
| RET-05 | `unnamed (6).webp` | Minhas Compras | Acompanhamento Multiloja (Busca compras, trilho em andamento, agrupamento por mês) | `src/routes/_store.conta.pedidos.tsx` |
| RET-06 | `unnamed (8).webp` & `(9).webp` | Presentes / Eventos | Lista de Presentes e Saldo Vinculado (Contagem regressiva evento, saldo presentes) | `src/routes/_store.conta.presentes.tsx` |
| RET-07 | `unnamed (10).webp` | Catálogo Supermercado | Busca, Categorias e Grade 2 Colunas (Leitor código barras, carrossel de categorias) | `src/routes/_store.mercado.tsx`<br>`src/components/commerce/SupermarketCatalogGrid.tsx` |
| RET-08 | `unnamed (11).webp` | Saldo Vale-Presente | Cartão Virtual de Saldo com Extrato (Cartão azul, saldo disponível e bônus) | `src/components/finance/GiftCardWalletCard.tsx` |
| RET-09 | `unnamed (14).webp` | Lojas e Cashback | Lista de Parceiros com Cashback (Busca, abas, distância em km, badge de cashback) | `src/components/commerce/CashbackMerchantRail.tsx` |
| MOB-01 | `Telas-de-carona-com-mapa-e-coleta.png` | BlaBlaCar | Carona com Mapa e Ponto de Coleta (Mapa com raio, pino embarque, sheet 3 snap-points) | `src/routes/_store.mobilidade.tsx` |
| MOB-02 | `ifood-thumb.jpg` | iFood Entregador | Painel do Condutor / MotoLink (Hambúrguer, pill Disponível, máquina Bluetooth) | `src/components/courier/CourierDashboardHeader.tsx` |
| NAV-01 | `images (10).jpg` | Noor SuperApp | Header SuperApp & Bento Verticals (Hambúrguer top-left, localização, grid de verticais) | `src/components/shell/top-bar.tsx` |
| WIX-01 | `spaces-by-wix-app.jpg` | Spaces by Wix | Comunidades, Sessões e Loja (Abas: Discussões, Agendamentos e Loja com Add to Cart) | `src/routes/_store.comunidade.$slug.tsx` |

---

## 4. O Hiper-Plano de Execução em 12 Ondas e 120 Microfases

### Matriz de Execução e Status:

| Onda | Título e Escopo Principal | Qtd Microfases | Status |
|:---:|:---|:---:|:---:|
| **Onda 1** | Navegação Global, Top-Left SuperApp Drawer & Account Switcher | 10 | **EM EXECUÇÃO** |
| **Onda 2** | Waesy Bank: Hero Card, Saldo com Privacidade & Yield Pill | 10 | A Seguir |
| **Onda 3** | Teclado Numérico In-App, Fluxo Pix & Drawer de Revisão | 10 | Planejada |
| **Onda 4** | Fatura de Cartão de Crédito, Limite Bicolor & Ajustes Virtuais | 10 | Planejada |
| **Onda 5** | Simulação de Empréstimos, Prazos & Timeline de Parcelas | 10 | Planejada |
| **Onda 6** | Comprovante Gráfico em Canvas & Extrato Unificado | 10 | Planejada |
| **Onda 7** | Carrinho Multiloja com Abas por Vendedor (Padrão Mercado Livre) | 10 | Planejada |
| **Onda 8** | Catálogo de Supermercado ("O Super") & Corredores de Mercearia | 10 | Planejada |
| **Onda 9** | Mobilidade Urbana BlaBlaCar & Sheet Multiestágios | 10 | Planejada |
| **Onda 10** | Painel do Entregador MotoLink & Máquina Bluetooth | 10 | Planejada |
| **Onda 11** | Espaços de Comunidade & Agendamentos Wix Spaces | 10 | Planejada |
| **Onda 12** | Auditoria Holística, Design Lint & Fechamento Seguro | 10 | Planejada |

---

## 5. Próximos Passos Imediatos (Execução da Onda 1)
1. **Onda 1 - Microfase 1.1:** Auditoria do cabeçalho móvel (`src/components/navigation/native-mobile-header.tsx`) e `TopBar.tsx`.
2. **Onda 1 - Microfase 1.2:** Inserção do botão Hambúrguer de 44x44px no lado esquerdo do `TopBar` e do `NativeMobileHeader` quando na raiz.
3. **Onda 1 - Microfase 1.3:** Conexão do estado `isSuperAppDrawerOpen` entre o header e o `SuperAppModuleDrawer.tsx`.
4. **Onda 1 - Microfase 1.4:** Suporte a fallback inteligente de ícones Phosphor/Lucide no `SuperAppModuleDrawer` quando não houver PNG customizado no Admin Master.
5. **Onda 1 - Microfase 1.5:** Criação do `AccountSwitcherDrawer.tsx` para alternância de perfis na 5ª aba da barra inferior (`MobileNav.tsx`).
