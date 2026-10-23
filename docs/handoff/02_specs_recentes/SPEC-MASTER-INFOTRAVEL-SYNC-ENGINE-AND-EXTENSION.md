# SPEC-MASTER: Engine de Sincronização de Operadoras (Infotravel Sync Engine, Extensão Oficial & Gestão de Viagens)

**Código da Especificação:** `SPEC-MASTER-INFOTRAVEL-SYNC-ENGINE-AND-EXTENSION`  
**Data:** 2026-10-22  
**Status:** Proposta Técnica para Execução  
**Módulos Envolvidos:** Turismo, Hub de Integrações, Extensão de Sincronização, BFF Server Functions, CRM de Viagens, Radar de Embarques e Financeiro de Comissões  

---

## 1. Contexto e Missão

As agências de viagens parceiras do ecossistema Waesy utilizam operadoras atacadistas que operam sobre a plataforma branca **Infotravel** (Infotera Tecnologia), tais como **Orinter, Incomum Viagens, FRT Operadora, Schultz, New Age e Personal**.

Como a maioria das agências não dispõe de licenças de API SOAP/REST corporativas diretas com a Infotera, o Waesy implementa uma **Engine Bilateral de Sincronização**:
1. **Coleta Segura via Extensão / Assistente de Sessão:** A agência autentica-se em sua operadora e a extensão executa a requisição nativa PrimeFaces em segundo plano com jitter randômico humano (1s a 6s).
2. **Ingestão Server-Side Idempotente (BFF):** O backend recebe o lote normalizado, deduplica clientes por CPF, registra os passageiros acompanhantes, calcula a comissão da agência e separa as viagens em **Passadas, Em Andamento e Próximas (Radar de Embarques)**.
3. **Sincronização Diária Incremental (Watermark):** Após a carga mestre inicial, o sistema armazena a data/hora do último lote e sincroniza apenas novas reservas ou alterações diárias, com custo de rede e processamento mínimo.

---

## 2. Arquitetura do Sistema e Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. EXTENSÃO / SESSÃO DA AGÊNCIA (CHROME RUNNER)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Agência loga em online.orinter.com.br (ou FRT, Incomum, etc.)             │
│ • Extensão detecta a sessão ativa e lê o Watermark da última sincronização   │
│ • Dispara chamadas de rede nativas PrimeFaces.ab() em background            │
│ • Jitter humano randômico: [1.8s, 2.4s, 3.2s, 4.6s, 6.1s, 3.7s]             │
│ • Envia payload estruturado para o BFF da Waesy via POST seguro             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Payload JSON Autenticado por Token)
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. CAMADA BFF SERVER-SIDE (src/services/travel-operator-sync.functions.ts)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Validação rigorosa de payload via Zod Schema                              │
│ • Verificação do Tenant/Agência ativa (Multi-Tenant RLS)                    │
│ • Reconciliação Idempotente de Clientes (Upsert por CPF)                    │
│ • Registro e vínculo de Passageiros/Acompanhantes por Quarto/Voo            │
│ • Classificação Temporal: Passadas vs Em Andamento vs Próximas             │
│ • Registro de Contas a Receber (Comissões e RAV por Vencimento)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. BANCO DE DADOS & INTERFACE WAESY (PostgreSQL + TanStack Router)          │
├─────────────────────────────────────────────────────────────────────────────┤
│ • /workspace/integracoes/operadoras : Status, Operadoras Conectadas, Sync    │
│ • /workspace/turismo/embarques       : Radar de Embarques (D-7, D-2, D-0)    │
│ • /workspace/turismo/clientes        : CRM de Passageiros com CPF e Histórico│
│ • /workspace/turismo/comissoes       : Painel Financeiro de Comissões a Repassar│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Schemas Zod de Validação (Server-Side)

### 3.1 Schema de Passageiro
```typescript
export const PassengerSyncSchema = z.object({
  fullName: z.string().min(2),
  cpf: z.string().regex(/^\d{11}$/).nullable().optional(),
  birthDate: z.string().nullable().optional(), // 'YYYY-MM-DD' ou 'DD/MM/AAAA'
  age: z.number().int().nonnegative().nullable().optional(),
  passengerType: z.enum(['ADT', 'CHD', 'INF']).default('ADT'),
  isPrimary: z.boolean().default(false)
});
```

### 3.2 Schema de Reserva / Viagem
```typescript
export const BookingSyncPayloadSchema = z.object({
  operatorCode: z.enum(['ORINTER', 'FRT', 'INCOMUM', 'SCHULTZ', 'OUTRA']),
  operatorBookingId: z.string().min(1),
  status: z.string(),
  bookingDate: z.string(),
  client: z.object({
    name: z.string(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional()
  }),
  packageDetails: z.object({
    destination: z.string(),
    hotelName: z.string().nullable().optional(),
    checkinDate: z.string().nullable().optional(),
    checkoutDate: z.string().nullable().optional(),
    flightSummary: z.string().nullable().optional(),
    servicesSummary: z.string().nullable().optional()
  }),
  financials: z.object({
    totalAmountCents: z.number().int().nonnegative(),
    taxAmountCents: z.number().int().nonnegative().default(0),
    feeAmountCents: z.number().int().nonnegative().default(0),
    commissionAmountCents: z.number().int().nonnegative().default(0),
    paymentMethod: z.string().nullable().optional(),
    installments: z.string().nullable().optional()
  }),
  passengers: z.array(PassengerSyncSchema)
});
```

---

## 4. Requisitos EARS (Easy Approach to Requirements Syntax)

- **UBIQUITOUS (Universal):** O sistema DEVE processar cada reserva de forma idempotente, atualizando o registro existente se o `operator_booking_id` já estiver cadastrado para a agência, sem duplicar registros.
- **EVENT-DRIVEN (Ao Sincronizar):** QUANDO a extensão ou o assistente enviar um lote de reservas, o BFF DEVE validar cada item contra o `BookingSyncPayloadSchema`, gravar o log de auditoria da sincronização e retornar o contador de inseridos e atualizados.
- **STATE-DRIVEN (Classificação Temporal):** ENQUANTO a data de check-in for maior que a data atual (`checkin_date > CURRENT_DATE`), o status temporal da viagem DEVE ser computado como `PROXIMA`, alimentando automaticamente o Radar de Embarques.
- **STATE-DRIVEN (Viagem em Curso):** ENQUANTO a data atual estiver entre o check-in e check-out, o status temporal DEVE ser `EM_ANDAMENTO`. Caso o check-out já tenha expirado, DEVE ser `PASSADA`.
- **UNWANTED BEHAVIOUR (Tratamento de Falhas):** SE o CPF do passageiro for inválido ou nulo, o sistema DEVE gravar o passageiro com `cpf = null`, mantendo o nome de batismo e a data de nascimento, sem rejeitar a reserva como um todo.

---

## 5. Módulos e Superfícies de Interface no Waesy

### 5.1 Rota `/workspace/integracoes/operadoras`
- **Cards de Conexão:** Orinter, Incomum Viagens, FRT, Visual, Schultz.
- **Status do Conector:** Conectado, Última Sincronização (Timestamp), Total de Viagens Ativas.
- **Botão de Ação:** "Baixar Extensão Waesy Sync" / "Sincronizar Manualmente".
- **Histórico de Lotes:** Tabela com ID do lote, data, total de reservas importadas, novos passageiros e erros de validação.

### 5.2 Rota `/workspace/turismo/embarques` (Radar de Embarques)
- **Filtros Temporais:** Embarques nas próximas 24h, 48h, 7 dias e este mês.
- **Ações Rápidas do Agente:** "Ver Vouchers", "Enviar Lembrete WhatsApp", "Confirmar Check-in Aéreo".
- **Cartão do Embarque:** Nome do passageiro líder, companhia aérea, voo, localizador, destino, hotel e status de pagamento.

### 5.3 Rota `/workspace/turismo/clientes` (CRM de Passageiros)
- **Busca Global:** Por CPF, Nome, Destino ou Período.
- **Ficha do Cliente:** Dados pessoais, acompanhantes habituais (família), total investido em viagens (LTV) e histórico cronológico de destinos.

---

## 6. Arquitetura Financeira Especial de Viagens & Conciliação com Operadoras

### 6.1 Cenários Comerciais e Fluxos de Caixa da Agência
No ecossistema de agências de turismo emissivas, o faturamento não segue um fluxo linear único. O Waesy implementa suporte nativo aos 3 cenários operacionais canônicos:

| Cenário | Descrição Operacional | Emissão de Nota Fiscal (NFSe) | Relação de Saldo com Operadora |
| :--- | :--- | :--- | :--- |
| **Cenário A: Faturado Tradicional (Net ou Bruto)** | A operadora fatura a reserva inteira ou o cliente parcela via cartão da operadora. A operadora repassa a comissão contratual da agência via depósito ou abatimento de fatura. | Agência emite NFSe de intermediação para a Operadora. | Saldo Positivo (Contas a Receber da Operadora). |
| **Cenário B: Comissão Direta no Balcão (À Vista + Over)** | O cliente paga a comissão da agência + over diretamente para a agência (via Pix ou cartão próprio da loja). Para a operadora, a agência passa apenas o valor líquido ("via operadora reduzida"). | **NÃO se emite NFSe para a Operadora** (pois a operadora não pagou a comissão). A agência emite nota de serviço/intermediação diretamente para o passageiro/tomador final. | Saldo Zero com a Operadora na comissão (a operadora recebe apenas o seu valor líquido). |
| **Cenário C: Saldo Negativo & Compensação em Faturas Futuras** | Quando a agência retém na fonte um montante superior à sua comissão legítima (ou após cancelamento/estorno parcial), a agência fica devendo para a operadora. | Conciliação contábil com nota de débito/crédito. | **Saldo Negativo (Passivo com Operadora)**: O valor devido é automaticamente provisionado e descontado das próximas faturas a receber da mesma operadora. |

### 6.2 Fórmulas Determinísticas de Conciliação Financeira
```typescript
// 1. Receita Bruta da Agência
ReceitaAgencia = ComissaoFinal + OverLiquidoFinal

// 2. Valor Retido Diretamente pela Agência (Balcão / Caixa Próprio)
ValorRetidoBalcao = TotalPagoPeloClienteDiretoNaAgencia

// 3. Saldo Líquido com a Operadora nesta Reserva
SaldoOperadora = (ReceitaAgencia) - (ValorRetidoBalcao)

// Interpretação do Saldo:
// • Se SaldoOperadora > 0: A operadora DEVE repassar este valor à agência (Contas a Receber).
// • Se SaldoOperadora == 0: Quitado integralmente na retenção de balcão (Sem pendência financeira).
// • Se SaldoOperadora < 0: A agência DEVE repassar ou ABATER das próximas faturas a receber da operadora (Saldo Devedor / Compensação Futura).
```

---

## 7. Arquitetura da Extensão Chrome Oficial (Manifest V3)

A extensão oficial Waesy Sync opera diretamente no navegador do agente de viagens enquanto ele mantém as abas das operadoras abertas:

1. **Manifest V3 com Background Service Worker:**
   - Permissões mínimas de escopo: `declarativeContent`, `storage`, `alarms`, `downloads`.
   - Host permissions delimitadas para domínios Infotravel (`*://online.orinter.com.br/*`, `*://*.incomumviagens.com.br/*`, `*://*.frt.com.br/*`, `*://localhost:3333/*`).
2. **Pacing Humano Randômico (Anti-Bot & Anti-Rate Limit):**
   - Jitter configurável entre 1.5s e 6.2s por ação (`waitRandomHumanDelay(1500, 6200)`).
   - Simulação de eventos de teclado e clique com micro-dispersão de coordenadas.
3. **Popup de Gestão em Tempo Real:**
   - Visualização de status da sessão ativa do PrimeFaces.
   - Contadores acumulados: Reservas Coletadas, Passageiros Únicos, Volume R$ de Vendas, Comissões.
   - Botões de exportação local direta: "Baixar CSV para o PC" (com formatação brasileira UTF-8 BOM) e "Baixar JSON".
   - Conector Waesy Cloud com chave de API da agência para envio direto via BFF.

---

## 8. Arquitetura do Extrator Local Robusto (Playwright Runner)

Para agências que preferem rodar o extrator autônomo diretamente em seu computador com controle total:

1. **Execução Segura:** Navegador Chrome real iniciado com perfil isolado (`.chrome-session`) preservando cookies e login com 2FA.
2. **Navegação Resiliente no PrimeFaces:** Tratamento específico de botões "Voltar", fechamento de abas `.ui-tabs-nav` e paginação contínua via `.ui-paginator-next`.
3. **Saída Imediata no Disco:**
   - Criação de arquivos CSV com cabeçalho canônico formatado para Excel (separador `;` e BOM `\uFEFF`).
   - Gravação de arquivo JSON espelho.
   - Captura de telas comprobatórias em `.png` para auditoria de cada reserva.
4. **Abertura Automática da Pasta:** Execução de comando do Windows Explorer (`explorer.exe output`) para visualização imediata dos arquivos gerados pelo usuário.

---

---

## 10. Modelagem Relacional: Viagem como Unidade (`Trip`) vs Passageiro Individual (`Pax`) ao Longo da Vida

### 10.1 Desacoplamento Arquitetural entre Viagens e Viajantes
O sistema rejeita a modelagem ingênua de "passageiro como mero texto embutido na reserva". A arquitetura adota um grafo relacional bi-direcional:

```
┌─────────────────────────────────────────┐         ┌─────────────────────────────────────────┐
│          TRAVEL_TRIPS (VIAGEM)          │         │          TRAVEL_PAX (VIAJANTE)          │
├─────────────────────────────────────────┤         ├─────────────────────────────────────────┤
│ • id: UUID (PK)                         │         │ • id: UUID (PK)                         │
│ • store_id: UUID (Tenant Agência)       │         │ • store_id: UUID (Tenant Agência)       │
│ • operator_code: 'ORINTER' | 'FRT'...   │         │ • cpf: String(11) [Chave Natural Única] │
│ • locator: String (Localizador)         │         │ • full_name: String                     │
│ • travel_start_date: Date               │         │ • birth_date: Date                      │
│ • travel_end_date: Date                 │         │ • primary_email: String                 │
│ • destination: String                   │         │ • primary_phone: String                 │
│ • gross_amount_cents: BigInt            │         │ • lifetime_trips_count: Int             │
│ • lead_payer_pax_id: UUID (FK)          │         │ • lifetime_gross_spent_cents: BigInt    │
└────────────────────┬────────────────────┘         └────────────────────┬────────────────────┘
                     │                                                   │
                     │         ┌───────────────────────────────┐         │
                     └────────►│     TRAVEL_TRIP_PASSENGERS    │◄────────┘
                               ├───────────────────────────────┤
                               │ • trip_id: UUID (FK)          │
                               │ • pax_id: UUID (FK)           │
                               │ • role: 'TITULAR' | 'ACOMP'   │
                               │ • passenger_type: 'ADT'|'CHD' │
                               │ • room_number: Int            │
                               │ • seat_allocated: String      │
                               │ • segment_cost_cents: BigInt  │
                               └───────────────────────────────┘
```

### 10.2 Companion Graph (Grafo de Afinidade Social)
Ao longo do tempo, cada viajante acumula um grafo de companhias:
- **Viagem Solo:** Identifica a persona executiva ou individual.
- **Viagem Família:** Identifica cônjuge e dependentes vinculados por repetição de quartos e sobrenome.
- **Viagem em Grupo de Amigos:** Identifica agregadores comunitários (clientes promotores que trazem novos viajantes).

---

## 11. Inteligência de Crédito, Análise de Boletos e "Credit Confidence Scoring"

### 11.1 O Valor da Aprovação de Crédito da Operadora
Operadoras atacadistas como Orinter, CVC Corp e FRT submetem cada faturamento a rigorosos bureaus de crédito corporativo (Serasa Experian, Quod, Boa Vista e seguro de crédito Coface/Euler Hermes).
Quando uma reserva é aprovada com **Forma de Pagamento: Boleto Faturado (ex: 10x sem juros no boleto)** no valor de R$ 30.000,00, a operadora emitiu um atestado empírico de idoneidade financeira daquele CPF:

1. **Credit Confidence Indicator (CCI):**
   - **Boleto Aprovado pela Operadora:** Score de Confiança Alto (80 a 100). Indica que a agência pode confiar limites de crédito interno e parcelamentos especiais.
   - **Cartão de Crédito Pessoal:** Score Neutro (confiança do banco emissor, risco transferido).
   - **Pagamento Negado / Restrição de Crédito:** Alerta Imediato no CRM da agência (Score Baixo 0 a 30). Previne que o corretor emita vouchers com risco de inadimplência no balcão.

2. **Extração de Metadados Bancários no Minerador:**
   - Banco Emissor (ex: Itaú, Santander, Bradesco).
   - Linha Digitável e Código de Barras do Boleto.
   - Cronograma de Vencimento de Parcelas (D-30, D-15, D+15).
   - Status da Quitação (Pendente, Liquidado, Em Cobrança).

---

## 12. Data Lake Global Anônimo (Admin Master & Inteligência Coletiva)

Com centenas de agências sincronizando suas bases, o Waesy Master consolida uma camada de **Data Lake de Tendências e Sazonalidade de Turismo** com estrito isolamento Zero-Trust e anonimização de PII:

1. **Sazonalidade e Antecedência de Compra (Lead Time):**
   - Mapeamento determinístico de quantos dias antes do embarque os clientes compram:
     - Viagens de Alta Temporada de Verão (Janeiro): Compradas em média 112 dias antes (Agosto/Setembro).
     - Férias de Julho: Compradas em média 78 dias antes (Abril/Maio).
     - Viagens Regionais / Rodoviárias: Compradas 14 a 28 dias antes.
2. **Top Destinos Nacionais e Internacionais por Mês:**
   - Monitoramento contínuo de oscilações de demanda (ex: explosão de procura por Maceió vs João Pessoa vs Santiago).
3. **Distribuição de Ticket Médio por Perfil:**
   - Benchmarking consultivo compartilhado com as agências: "O ticket médio das famílias com 2 crianças para o Nordeste na sua região é de R$ 14.800,00".

---

## 13. Inteligência Artificial (IA) Aplicada ao Ecossistema das Agências

### 13.1 IA Preditiva de Recompra (Ciclo de Férias do Passageiro)
Passageiros com viagens mineradas em janeiro ou julho possuem periodicidade cíclica de férias de 85%.
A IA analisa o histórico temporal de cada Pax e gera alertas autônomos no CRM do corretor:
- **Gatilho de Antecedência (D-120):** "O passageiro Roberto viajou em janeiro de 2024 e janeiro de 2025 para a Bahia. É hora de abordá-lo para as férias de janeiro de 2027 antes que ele pesquise na concorrência".

### 13.2 Inteligência de Preços OCR & Paridade de Tarifas
O módulo de OCR do Waesy (`travel-operator-ocr.functions.ts`) compara a tarifa extraída em novas cotações com o histórico faturado das 2.000+ reservas anteriores do banco:
- Alerta em tempo real: "A tarifa deste hotel (Enotel Porto de Galinhas) está 14% mais baixa do que a média das últimas 12 reservas faturadas pela agência para o mesmo período".

### 13.3 Motor Autônomo de Abordagem WhatsApp Hiperpersonalizada
A IA formula mensagens contextualizadas para o consultor enviar com 1 clique:
```text
Olá [Nome do Pax]! Aqui é a [Nome do Consultor] da [Nome da Agência].
Estava revisando nossas viagens e lembrei das suas férias com o [Nome do Filho/Acompanhante] em [Último Destino].
Abriram voos diretos e condições exclusivas com parcelamento em 10x no boleto para [Novo Destino Recomendado].
Quer que eu te envie o roteiro pré-reservado para vocês darem uma olhada sem compromisso?
```

---

## 14. Mecânica de Ingestão Robusta: Deduplicação, Resolução Fonética e Retentativas

1. **Algoritmo de Deduplicação de Passageiros (Pax Matching):**
   - **Nível 1 (Exato):** Correspondência estrita por CPF normalizado (11 dígitos).
   - **Nível 2 (Fonetização & Data de Nascimento):** Quando o CPF não constar no sistema da operadora (comum em crianças ou cadastro rápido), o algoritmo combina `Soundex(Nome) + Metaphone(Sobrenome) + DataNascimento`.
   - **Nível 3 (Resolução de Divergência):** Se houver duplicatas parciais, o sistema mantém o histórico unificado vinculado ao mesmo Pax Master, sem duplicar o registro no CRM.
2. **Prevenção de Falso-Positivo e Tratamento de Erros:**
   - Se uma reserva falhar ao abrir no PrimeFaces (timeout ou queda momentânea da operadora), o script registra o erro em `output/erros_mineracao.json`, pula para a próxima e realiza nova tentativa na reserva pendente na rodada final de reconciliação.
3. **Log de Auditoria e Retentativas:**
   - Cada tentativa de extração recebe timestamp, código HTTP, número de passageiros identificados e assinatura de integridade SHA-256.

---

---

## 15. Arquitetura do Futuro Módulo de Crédito e Poder de Compra (Payer vs Pax)

### 15.1 Desacoplamento Estrito entre Pagador (Sponsor) e Viajante (Beneficiário)
O sistema implementa uma diretiva de segurança contábil: **o poder de compra e o histórico de faturamento pertencem exclusivamente ao CPF do Pagador (`PayerEntity`), nunca aos passageiros que viajam como beneficiários**.
- **Caso Real:** Um pai adquire dois pacotes de alta temporada (ex: 2 passageiros para ele e sua esposa, e mais 2 passageiros para seu filho e sua nora), totalizando R$ 60.000,00 faturados em seu nome.
- **Resolução do Motor:**
  1. O **Pai (`123.456.789-01`)** acumula o volume total financiado de R$ 60.000,00, elevando seu poder de compra para `ALTO_VALOR / ELITE_VIP`, pois comprovou capacidade de liquidação financeira de múltiplos pacotes.
  2. O **Filho (`987.654.321-00`)** registra a experiência de viagem em seu histórico, mas seu score de crédito individual permanece neutro/iniciante, impedindo que a agência estenda crédito rotativo presumido para quem não teve renda atestada.

### 15.2 Acesso Restrito Zero-Trust (Exclusivo Admin Master)
Nenhuma agência de viagens, corretor ou terceiro tem acesso ao relatório e pontuação de crédito consolidado do cliente. O serviço `getPayerCreditAssessmentMaster` opera sob `requirePlatformAdmin()` no backend, servindo exclusivamente como inteligência interna da plataforma Waesy para a futura esteira de crédito e financiamento de turismo.

---

## 16. Análise Multidimensional de Renda: Cargos, CNPJs e Prevenção de Falsos VIPs

O motor rejeita a presunção simplista de liquidez:
1. **Pix Pontual Não Equivale a Crédito:** O pagamento integral de um pacote via Pix comprova disponibilidade de saldo imediato, mas não atesta idoneidade para faturamentos de R$ 30k a R$ 100k a prazo. O score só é majorado quando há aprovação faturada por bureaus de operadoras de turismo.
2. **Cargo Declarado vs Situação de CNPJ:** O título profissional de "CEO", "Sócio" ou "Diretor" em currículo ou perfil não confere pontuação máxima sem a validação do CNPJ da empresa:
   - Se o CNPJ estiver ativo com Capital Social $\ge$ R$ 100.000,00: Score majorado.
   - Se o CNPJ for MEI ou de abertura recente: Score em faixa padrão de microempresa.
   - Se o CNPJ estiver Inapto ou Suspenso na Receita Federal: Penalização imediata de score com alerta de risco.

---

## 17. Banco Histórico Perpétuo e Imutável de Preços OCR (`travel_price_observations`)

Toda cotação, proposta ou documento extraído via Visão Computacional / OCR (`processOperatorQuoteOcr`) é gravado de forma imutável na tabela `public.travel_price_observations`:

```sql
-- Tabela append-only perpétua (NUNCA deletada)
INSERT INTO public.travel_price_observations (
  product_type,
  route_fingerprint,
  travel_start_date,
  travel_end_date,
  advance_days,
  provider_code,
  fare_family,
  price_cents,
  currency,
  search_context_hash,
  availability_state
) VALUES (...);
```

### 17.1 Objetivos Estratégicos do Ledger de Preços
1. **Temperatura Tarifária:** Comparação da cotação ativa com a média móvel histórica do mesmo destino/mês para classificar em "Tarifa Fria (Oportunidade Baixa)", "Tarifa Média" ou "Tarifa Quente (Pico de Preço)".
2. **Padrões de Cancelamento e Sazonalidade:** Detecção de flutuações sazonais para munir as agências com gráficos preditivos de melhor momento de compra.

---

## 18. Invariante de Avaliação Sob Demanda (Zero Sobrecarga de Servidor)

Para assegurar performance com centenas de agências e milhares de transações simultâneas:
- **Proibido Recálculo Contínuo em Triggers:** Nenhuma transação de reserva ou pagamento dispara recálculos pesados de score de crédito em lote no PostgreSQL.
- **Lazy Evaluation Server-Side:** Os cálculos de `evaluatePayerCreditAssessment` são executados sob demanda via CPU pura em memória (Node/V8), com tempo de execução inferior a 2ms, sem emitir queries bloqueantes no banco de dados.

---

## 19. Critérios de Aceite e Evidências

- [x] Especificação formalizada em sintaxe EARS com detalhamento dos 3 cenários comerciais de comissão e saldo negativo.
- [x] Calculadora financeira atualizada com `comissao_balcao_a_vista`, retenção direta e cálculo de saldo operadora (positivo/negativo).
- [x] Suíte de 6 testes unitários vitest passando em `sale-financial-calculator.test.ts`.
- [x] Extensão Chrome Manifest V3 implementada em `tools/infotravel-extension/` com popup de controle e exportação local.
- [x] Extrator local aprimorado em `tools/infotravel-miner/` com jitter randômico de 1 a 6 segundos e abertura automática da pasta.
- [x] Modelagem de Pax individual, Credit Confidence Scoring de boletos, Data Lake de tendências e IA preditiva documentada.
- [x] Schema canônico `CanonicalOperatorDocumentSchema` estendido com metadados de pagamento, scoring e acomodação de passageiro.
- [x] Extrator `miner.mjs` atualizado para extrair formas detalhadas de pagamento e status de boletos.
- [x] Motor de inteligência de crédito `credit-intelligence.ts` implementado com desacoplamento pagador vs passageiro e validação de CNPJ/cargos.
- [x] Suíte de 4 testes unitários vitest aprovada com 100% em `credit-intelligence.test.ts`.
- [x] Persistência perpétua no ledger imutável `travel_price_observations` conectada ao motor OCR em `travel-operator-ocr.functions.ts`.
- [x] Zero erros de compilação TypeScript (`npm run typecheck` Exit Code 0).



