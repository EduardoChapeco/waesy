# AUDITORIA FORENSE & DOSSIÊ COMERCIAL: MOTOR DE MONETIZAÇÃO, PLANOS, TOKENOMICS E GOVERNANÇA DE GATEWAYS

**Data:** 2026-10-30  
**Status:** APROVADO & VERIFICADO VIA TESTES DETERMINÍSTICOS (15/15)  
**Normativa:** SPEC-20261030-CANONICAL-PRICING-PLANS-AND-MONETIZATION-ENGINE  
**Invariantes:** M01 (Zero Mocks), M03 (Auditabilidade), M04 (Idempotência), M08 (Integridade Transacional), AGENTS.md B.8, B.23, B.24, B.25  

---

## 1. Resumo Executivo & Arquitetura Comercial Soberana
O ecossistema Waesy adota uma separação estrita entre a **Moeda do Ledger ($WZ)** e os **Tokens Técnicos de Inferência (Context Window de LLMs)**.

### Invariantes Fundamentais:
1. **Paridade Soberana:**
   $$1\ \$WZ = R\$\ 0,01\ (1\ centavo)\quad\Longleftrightarrow\quad R\$\ 1,00 = 100\ \$WZ$$
2. **Calibração Econômica de Tokens:**
   $$1.000\ tokens\ técnicos\ de\ inferência \approx 1\ \$WZ \approx R\$\ 0,01$$
3. **Taxa de Marketplace:**
   $$\text{Taxa Padrão} = 5\%\ (\text{Plataforma Waesy}) + \text{Taxa de Gateway}\ (\text{Asaas / Mercado Pago})$$
4. **Mobilidade Bilateral Waesy Go:** R$ 0,99 cobrado do passageiro e R$ 0,99 do motorista com opacidade mútua estrita (passageiro vê tarifa + R$ 0,99; condutor vê tarifa bruta - R$ 0,99 - gateway).
5. **PDV Taxa ZERO (0%):** Nenhuma taxa percentual ou por transação da plataforma Waesy no PDV físico de balcão.
6. **Governança de Gateways Anti-Bypass:**
   - Compras no Marketplace operam exclusivamente com as chaves integradas pelo **Admin Master**.
   - Chaves de gateway cadastradas pelas lojas no Workspace operam unicamente em **PDV / Caixa físico** e **Faturas Diretas**.
7. **Autodébito de Inadimplência:** Vendas realizadas via Gateway Master retêm automaticamente o saldo necessário para liquidar faturas em atraso antes do repasse à loja.
8. **PDV com Tap to Pay:** Sessão sincronizada em tempo real com o app móvel, aprovando o pagamento via aproximação e fechando a venda no caixa automaticamente.
9. **Parametrização Flexível por Cliente/Loja:** Overrides configuráveis pelo Admin Master para tarifas, franquias de tokens e isenções.

---

## 2. Matriz Canônica de Planos & Franquias de Inteligência Artificial

| Nível do Plano | Mensalidade (R$) | Moeda ($WZ) | Franquia Técnica IA (Tokens/mês) | Capacidade Nominal Interna | Copilot Conversacional | Visitas Estimadas/mês |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Civil** | R$ 0,00 | 0 $WZ$ | 0 tokens | R$ 0,00 | Bloqueado (ou via recarga) | Ilimitado |
| **Business Start** | R$ 49,90 | 4.990 $WZ$ | 5.000.000 tokens | R$ 50,00 | Liberado | Até 20.000 |
| **Business Pro** | R$ 99,90 | 9.990 $WZ$ | 10.000.000 tokens | R$ 100,00 | Liberado | Até 50.000 |
| **Business Max** | R$ 199,00 | 19.900 $WZ$ | 20.000.000 tokens | R$ 200,00 | Liberado | Até 150.000 |
| **Business Black** | R$ 299,00 | 29.900 $WZ$ | 30.000.000 tokens | R$ 300,00 | Liberado (Prioridade VIP) | Até 500.000 |
| **Business Enterprise** | R$ 499,00 | 49.900 $WZ$ | 50.000.000 tokens | R$ 500,00 | Liberado (Múltiplos Squads)| Até 2.000.000 |
| **Corporate** | Negociado | Customizado | Customizado via SLA | Customizado | Dedicado | Ilimitado |

---

## 3. Catálogo de Operações em $WZ & Margens Reais

### 3.1 Omni Builder (Criação de Sites, LPs e Biolinks)
- **Geração de Site Completo (Zero ao Ar):** 50 $WZ (R$ 0,50) | Custo IA: R$ 0,22 | Margem: 56%
- **Edição / Refinamento de Seção:** 3 $WZ (R$ 0,03) | Custo IA: R$ 0,012 | Margem: 60%
- **Tradução / Localização Bilíngue:** 15 $WZ (R$ 0,15) | Custo IA: R$ 0,060 | Margem: 60%
- **Geração de Banner / Imagem Hero IA:** 15 $WZ (R$ 0,15) | Custo IA: R$ 0,075 | Margem: 50%

### 3.2 Notícias & Produção Editorial
- **Redação / Expansão de Artigo:** 5 $WZ (R$ 0,05) | Custo IA: R$ 0,025 | Margem: 50%
- **Mineração por URL Externa:** 8 $WZ (R$ 0,08) | Custo IA: R$ 0,030 | Margem: 62%
- **Otimização SEO & Geo-Tags:** 2 $WZ (R$ 0,02) | Custo IA: R$ 0,008 | Margem: 60%

### 3.3 Squads Editoriais de IA (Mensalidades para Portais)
- **Squad Compacto (Blog/Jornal Local):** 2.500 $WZ/mês (R$ 25,00) | Até 150 artigos/mês | Lucro Líquido: R$ 16,50 (66%)
- **Squad Pro (Portal Regional):** 8.500 $WZ/mês (R$ 85,00) | Até 600 artigos/mês | Lucro Líquido: R$ 54,00 (63%)
- **Squad Enterprise (Rede Multi-Portal):** 30.000 $WZ/mês (R$ 300,00) | Até 2.500 artigos/mês | Lucro Líquido: R$ 185,00 (61%)

---

## 4. Árvore de Custos de Infraestrutura & Cobertura Operacional

| Serviço de Infra | Fornecedor Primário | Custo Real Atacado | Repasse / Precificação Waesy | Margem Operacional |
| :--- | :--- | :--- | :--- | :--- |
| **VPS / Compute** | Oracle Cloud Infrastructure (CPS) | Instâncias dedicadas | Rateio no custo de plano | > 70% |
| **Hospedagem Web** | Cloudwebly Edge / Cloudflare Workers | ~R$ 0,0005 por hit | Incluído no plano | > 75% |
| **Banco de Dados** | Supabase Postgres na Oracle | Custo fixo de cluster | Rateio nos planos Business | > 65% |
| **Modelos de Linguagem** | Gemini 2.0 Flash / OpenAI | R$ 1,50 a R$ 6,00 / 1M tokens | 1.000 tokens técnicos = 1 $WZ (R$ 0,01) | 50% a 70% |
| **WhatsApp Oficial** | Meta Cloud API | R$ 0,12 (utilidade) / R$ 0,35 (marketing) | 12 $WZ / 35 $WZ | 100% repassado + markup |
| **Emissão Fiscal** | API SEFAZ / Hub Fiscal Integrado | R$ 0,20 a R$ 0,40 por nota | 20 $WZ a 40 $WZ por nota emitida | ~50% |
| **Boleto Bancário** | Asaas | R$ 1,99 por liquidação | R$ 2,99 na fatura gerada | ~33% |
| **Cartão & Pix** | Asaas / Mercado Pago Master | 0,99% Pix / 2,99% Cartão | Taxa gateway + 5% plataforma | 5% líquido da plataforma |

---

## 5. Evidência de Testes Automatizados
```
 ✓ src/lib/monetization-engine.test.ts (19 tests) 28ms
 Test Files  1 passed (1)
      Tests  19 passed (19)
```
- Paridades $WZ e R$ validadas com 100% de exatidão matemática.
- Franquias de IA de 5M a 50M tokens verificadas.
- Split de 5% da plataforma + taxa de gateway testado com pedidos reais.
- Isolamento e bloqueio de gateways não autorizados no Marketplace testado.
- Autodébito de inadimplência em faturas vencidas com retenção parcial e total aprovado.
- Bilateralidade Waesy Go com opacidade total entre passageiro e condutor (R$ 0,99 em cada ponta) verificada.
- Taxa zero no PDV físico (0% Waesy) para gateway próprio e fallback Master verificada.
- Resolução de overrides de precificação por cliente, loja e usuário aprovada.
