# SPEC-20261030 — Motor Canônico de Monetização, Planos, Custos, Tokenomics e Governança de Gateways

## 1. Contexto e Missão
O Waesy é um ecossistema operacional de comércio, serviços e gestão urbana comunitária. Para garantir sustentabilidade econômica, transparência contábil, isolamento multi-tenant e soberania de caixa, este documento estabelece a Fonte Única da Verdade (SSOT) para:
1. Padronização Monetária: Real (R$) vs Moeda Soberana ($WZ) vs Tokens Técnicos de LLM.
2. Matriz de Planos e Modularização (Civil, Business Start, Business Pro, Business Black, Corporate e Add-ons: Business IS, Business Site, Business Hub).
3. Estrutura Canônica de Taxas: 5% de taxa da plataforma no Marketplace + taxa de gateway (Asaas e Mercado Pago).
4. Taxa Administrativa Fixa de R$ 0,99 em Microtransações e Serviços Urbanos (Mobilidade, Caronas, Ônibus, Entregas).
5. Governança Estrita de Gateways: Transações no Marketplace são restritas aos gateways integrados pelo Admin Master. APIs de gateways conectadas pela loja são autorizadas exclusivamente para PDV/Caixa, Faturas Diretas ou comutação opcional para a API Master.
6. PDV com Sincronização Tap to Pay: Transação iniciada no caixa dispara sessão no app móvel para aproximação e liquida o pedido instantaneamente.
7. Motor de Inadimplência com Autodébito Transacional: Vendas no Marketplace via API Master retêm split de liquidação para abater faturas vencidas antes da liberação do saldo.
8. Árvore de Custos Reais de Infraestrutura (Oracle VPS, Cloudwebly, Supabase, LLMs, WhatsApp Meta API, NF-e/NFC-e, R2 Storage).

---

## 2. Padronização Monetária e Tokenomics ($WZ vs Tokens Técnicos)

### 2.1 Princípio de Separação
- **Moeda do Ledger ($WZ):** Moeda transacional interna com paridade fixa e soberana:
  $$\mathbf{1\ \$WZ = R\$\ 0,01\ (1\ centavo)\quad\Longleftrightarrow\quad R\$\ 1,00 = 100\ \$WZ}$$
- **Tokens Técnicos de IA (LLM / Context Window):** Métrica de processamento de inferência técnica (Gemini 2.0 Flash, Claude, OpenAI, OpenRouter).
- **Relação de Calibração Econômica:**
  $$\mathbf{1.000\ tokens\ técnicos\ de\ inferência \approx 1\ \$WZ \approx R\$\ 0,01}$$
  Logo:
  - 1 milhão de tokens técnicos $\approx$ 1.000 $WZ$ $\approx$ R$ 10,00 de valor nominal interno.

### 2.2 Tabela Canônica de Franquia Técnica por Plano

| Plano | Mensalidade (R$) | $WZ Equivalente | Franquia Técnica de IA (Tokens/mês) | Capacidade Nominal Interna |
| :--- | :--- | :--- | :--- | :--- |
| **Civil** | R$ 0,00 | 0 $WZ$ | 0 tokens (Uso Copilot bloqueado; criação básica de posts/site sob recarga de $WZ$) | R$ 0,00 |
| **Personal / Business Start** | R$ 49,90 | 4.990 $WZ$ | 5.000.000 tokens | R$ 50,00 |
| **Business Pro** | R$ 99,90 | 9.990 $WZ$ | 10.000.000 tokens | R$ 100,00 |
| **Business Max** | R$ 199,00 | 19.900 $WZ$ | 20.000.000 tokens | R$ 200,00 |
| **Business Black** | R$ 299,00 | 29.900 $WZ$ | 30.000.000 tokens | R$ 300,00 |
| **Business Enterprise** | R$ 499,00 | 49.900 $WZ$ | 50.000.000 tokens | R$ 500,00 |
| **Corporate** | Negociado | Customizado | Customizado via SLA | Sob medida |

> [!IMPORTANT]
> A franquia técnica de tokens constitui teto de proteção contra abusos computacionais e não representa saldo resgatável. Toda operação debita uma quantia nominal fixa de $WZ$ configurada no catálogo de operações.

---

## 3. Catálogo de Operações e Precificação em $WZ

### 3.1 Omni Builder (Criação & Edição de Sites)

| Operação | Volume de Tokens Técnicos | Custo Base Provedor | Preço em $WZ$ | Preço em R$ | Margem Bruta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Geração de Site Completo (Zero ao Ar)** | ~50k–70k tokens + 2 renders | R$ 0,18–0,26 | **50 $WZ$** | R$ 0,50 | 50% a 64% |
| **Edição / Refinamento de Seção** | ~3k–6k tokens | R$ 0,012 | **3 $WZ$** | R$ 0,03 | ~60% |
| **Tradução / Localização Bilíngue** | ~25k tokens | R$ 0,060 | **15 $WZ$** | R$ 0,15 | ~60% |
| **Geração de Banner / Imagem Hero IA** | 1 render SDXL/Flux/Imagen | R$ 0,075 | **15 $WZ$** | R$ 0,15 | ~50% |

### 3.2 Módulo de Notícias & Editorial com IA

| Operação | Volume de Tokens Técnicos | Custo Base Provedor | Preço em $WZ$ | Preço em R$ | Margem Bruta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Redação / Expansão de Artigo** | ~6k–10k tokens | R$ 0,025 | **5 $WZ$** | R$ 0,05 | ~50% |
| **Mineração de Notícia por URL** | ~8k tokens + crawler | R$ 0,030 | **8 $WZ$** | R$ 0,08 | ~62% |
| **Otimização SEO Factual & Geo-Tags** | ~2,5k tokens | R$ 0,008 | **2 $WZ$** | R$ 0,02 | ~60% |

### 3.3 Squads Editoriais Mensais

| Squad | Agentes Integrados | Volume Contratado | Preço em $WZ$ | Preço em R$ | Custo Estimado | Lucro Líquido |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Squad Compacto** | Pautero + Redator | Até 150 artigos/mês | **2.500 $WZ$/mês** | R$ 25,00/mês | ~R$ 8,50 | R$ 16,50 (66%) |
| **Squad Pro** | Pautero + Redator + SEO + Copy | Até 600 artigos/mês | **8.500 $WZ$/mês** | R$ 85,00/mês | ~R$ 31,00 | R$ 54,00 (63%) |
| **Squad Enterprise** | Pautero 24/7 + Redatores + Fact-Check + Push | Até 2.500 artigos/mês | **30.000 $WZ$/mês** | R$ 300,00/mês | ~R$ 115,00 | R$ 185,00 (61%) |

### 3.4 Modalidade BYO-Key (Bring Your Own Key) & Trava de Saldo
- **BYO-Key:** Quando a empresa conecta suas credenciais próprias (`GEMINI_API_KEY` ou `OPENAI_API_KEY`), o custo do provedor LLM corre integralmente na conta da empresa. A Waesy debita a **Taxa de Infraestrutura e Plataforma de 1 $WZ (R$ 0,01)** por operação para remunerar banco de dados, proxies e armazenamento de mídia.
- **Trava de Segurança:** Se o saldo em $WZ$ atingir valor inferior a **10 $WZ (R$ 0,10)**, execuções de automação e squads entram em modo suspenso com notificação de recarga imediata.

---

## 4. Governança de Gateways de Pagamento & Taxas Transacionais

### 4.1 Invariante de Exclusividade do Marketplace (Anti-Bypass)
- **Gateways Autorizados no Marketplace:** Todas as compras no Marketplace (`_store.*`) DEVEM tramitar exclusivamente pelos gateways configurados pelo **Admin Master** (Asaas e Mercado Pago).
- **Proibição Absoluta:** É terminantemente proibido que credenciais de gateway cadastradas individualmente por uma loja interceptem ou recebam transações originadas nas vitrines públicas do Marketplace.
- **Divisão de Taxa Padrão do Marketplace:**
  $$\mathbf{Taxa\ Total = 5\%\ (Taxa\ da\ Plataforma\ Waesy) + Taxa\ do\ Gateway\ (Asaas/Mercado\ Pago)}$$
- **Mobilidade (Waesy Go) — Modelo Bilateral com Opacidade Mútua:**
  - O Waesy cobra **R$ 0,99 de taxa de serviço do passageiro** e **R$ 0,99 de taxa administrativa fixa do condutor**.
  - **Invariante de Opacidade Mútua:** Nenhuma parte tem visibilidade da taxa ou do repasse da outra parte:
    - O passageiro vê exclusivamente: `Tarifa da corrida (ex: R$ 6,00) + R$ 0,99 Taxa de Serviço Civil = R$ 6,99 Total`.
    - O condutor vê exclusivamente: `Tarifa bruta (R$ 6,00) - R$ 0,99 Taxa Administrativa Fixa - Taxa Adquirente/Gateway = Ganhos Líquidos (ex: R$ 4,95)`.
    - A plataforma retém R$ 0,99 de cada ponta ($R\$\ 1,98$ total por corrida finalizada), mantendo zero comissão percentual abusiva sobre a corrida do condutor.

### 4.2 PDV (Ponto de Venda Físico / Caixa) — Taxa ZERO de Plataforma (0%)
- **Isenção Plena de Taxa por Transação:** No PDV físico e vendas de balcão, a Waesy cobra **0% de taxa de plataforma**.
- **Com Gateway Próprio da Loja (BYO Gateway):** O lojista opera o PDV pagando suas taxas diretas ao seu adquirente, sem qualquer cobrança por transação da Waesy.
- **Com Gateway Master Waesy (Fallback):** Caso a loja não configure gateway próprio, utiliza a infraestrutura Master no PDV pagando estritamente a taxa de repasse do adquirente bancário (0% de taxa ou comissão adicional da Waesy).

### 4.3 Gateways Conectados da Loja (BYO Gateway)
- A chave de gateway cadastrada pela loja no Workspace é válida **exclusivamente** para:
  1. Geração de links de pagamento no **PDV / Caixa físico**.
  2. Geração de faturas e cobranças manuais emitidas diretamente para seus clientes cadastrados.
- **Opção de Comutação:** O lojista pode optar por não conectar gateway próprio no PDV e utilizar a infraestrutura Master da Waesy.

### 4.4 PDV com Tap to Pay Sincronizado
- **Fluxo Operacional:**
  1. Operador do PDV seleciona forma de pagamento "Cartão por Aproximação / Tap to Pay".
  2. O backend gera um identificador efêmero `pdv_tap_session` com valor e pedido vinculados.
  3. O aplicativo mobile do operador/loja recebe a notificação em tempo real via canal seguro e abre a interface de captura Tap to Pay.
  4. O pagamento é processado pelo gateway (via NFC/SDK oficial).
  5. O webhook/evento confirma a liquidação e finaliza atomicamente o pedido no caixa sem intervenção manual.

### 4.5 Parametrização & Editabilidade de Taxas por Cliente, Loja e Usuário
- Todas as taxas, franquias e parâmetros do sistema operam sob **hierarquia de resolução flexível e auditável**:
  - `Default Global (SSOT)` $\rightarrow$ `Override por Loja (stores.settings.pricing_overrides)` $\rightarrow$ `Override por Cliente (custom_pricing_rules)`.
  - O Admin Master e operadores autorizados possuem interface para editar, revisar, conceder descontos contratuais, bônus de tokens ou isenções integrais (`isFeeExempt: true`) por cliente e por loja.

---

## 5. Inadimplência & Autodébito Transacional Inteligente

### 5.1 Mecanismo de Retenção e Abatimento de Faturas
- Toda loja possui um ledger de faturas (`billing_invoices`).
- Quando uma loja possui faturas com status `OVERDUE` ou vencidas há mais de 3 dias:
  1. A venda efetuada no Marketplace via Gateway Master calcula o valor líquido a repassar à loja.
  2. Antes de liberar o split para a carteira da loja, o motor de conciliação executa `execute_delinquency_autodebit_atomic`:
     - Retém o valor pendente da fatura (total ou parcial).
     - Emite lançamento contábil em `billing_line_items` com `fee_type = 'DELINQUENCY_AUTO_DEBIT'`.
     - Atualiza o status da fatura para `PAID` (se liquidada integralmente) ou reduz o saldo devedor.
     - Repassa apenas o excedente líquido para a conta de liquidação da loja.
  3. Registra hash criptográfico no `financial_ledger_entries` comprovando a compensação de dívida.

---

## 6. Árvore de Custos Reais de Infraestrutura & Margens Alvo

| Componente | Provedor de Mercado | Custo Unitário Real | Modelo de Cobrança Waesy | Margem Bruta Alvo |
| :--- | :--- | :--- | :--- | :--- |
| **Hospedagem & CDN** | Cloudwebly / Oracle Cloud VPS | R$ 0,0005 por request | Incluído no plano | > 70% |
| **Banco de Dados & Storage** | Supabase Enterprise na Oracle + R2 | R$ 0,08 por GB/mês | Franquia de mídia + $WZ excedente | > 65% |
| **LLMs de Inferência** | Gemini 2.0 Flash / OpenAI | R$ 1,50 a R$ 6,00 / 1M tokens | 1.000 tokens = 1 $WZ (R$ 0,01) | 50% a 65% |
| **Mensageria WhatsApp** | Meta Cloud API Oficial | R$ 0,12 (utilidade) / R$ 0,35 (marketing) | 12 $WZ (R$ 0,12) / 35 $WZ (R$ 0,35) | Cobertura + Markup |
| **Emissão Fiscal** | API SEFAZ / Hub Fiscal Integrado | R$ 0,20 a R$ 0,40 por nota emitida | 20 $WZ a 40 $WZ por nota | ~50% |
| **Boletos Bancários** | Asaas | R$ 1,99 por boleto compensado | R$ 2,99 por boleto gerado/pago | ~33% |
| **Transações Cartão/Pix** | Asaas / Mercado Pago | 0,99% Pix / 2,99% Cartão | Repasse da taxa + 5% Waesy | 5% líquido |

---

## 7. Critérios de Aceite e Verificação Técnica
- [ ] Schema Zod e DTOs canônicos cobrindo todos os planos e cálculos em centavos inteiros.
- [ ] Regra estrita de isolamento de gateway implementada em `payment-gateway.server.ts`.
- [ ] Autodébito de inadimplência modelado com testes unitários cobrindo saldo retido e faturas quitadas.
- [ ] Conversões de $WZ e tokens calibradas com 100% de consistência aritmética.
- [ ] Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).
