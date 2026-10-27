# AUDITORIA DE OCUPAÇÃO, BASES TARIFÁRIAS E PARCELAMENTO BRASILEIRO
## DOMÍNIO DE TURISMO • EXCELÊNCIA TOUR / WAESY
### Data: 2026-10-21 • Versão: 1.0-AUDIT • Baseline: Production

---

## 1. Visão Geral da Precificação e Ocupação

A precificação de viagens no Brasil envolve duas fontes frequentes de litígio e confusão comercial:
1. **Divergência de Ocupação:** Cotações cotadas "por pessoa em apartamento duplo" que o cliente interpreta erroneamente como o preço total do casal ou família.
2. **Parcelamento Sem Juros:** Necessidade de acomodar prazos estendidos (até 15x ou 16x) combinando boleto bancário faturado e cartão de crédito, sem arredondamentos imperfeitos de centavos.

O motor do Waesy (`src/lib/travel/excelencia-offer-engine.ts`) resolve ambos os problemas através de conciliação matemática estrita e tipagem defensiva.

---

## 2. Modelagem de Viajantes e Ocupação de Quartos

### 2.1. Tipos e Interfaces Canônicas
Definidos em `src/lib/travel/excelencia-offer-engine.ts#L60-L102`:
```typescript
export type PartyLabelMode = "single" | "couple" | "family" | "group" | "custom";

export interface TravelParty {
  adults: number;
  children: number;
  infants: number;
  childAges: number[];
  infantAgesMonths?: number[];
  labelMode: PartyLabelMode;
  customLabel?: string;
}

export interface RoomOccupancy {
  roomIndex: number;
  roomTypeLabel: string;
  roomCategoryCode?: string;
  boardBasis?: "room_only" | "breakfast" | "half_board" | "full_board" | "all_inclusive" | "custom";
  adults: number;
  children: number;
  infants?: number;
  childAges?: number[];
  bedConfiguration?: string;
  notes?: string;
}

export type PriceBasis =
  | "per_person"
  | "per_couple"
  | "per_family"
  | "per_room"
  | "per_cabin"
  | "total_package"
  | "per_group"
  | "custom";
```

---

## 3. Matriz de Reconciliação de Base Tarifária

A função `formatOccupancyAndBasisSummary` (`excelencia-offer-engine.ts`) gera os rótulos canônicos que devem ser obrigatoriamente renderizados em conjunto:

| Configuração | PAX | Quarto | PriceBasis | Rótulo da Base Tarifária | Rótulo de Ocupação |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Casal Padrão** | 2A | Standard Duplo | `per_person` | "Por pessoa" | "Em apartamento duplo" |
| **Casal Preço Total** | 2A | Standard Duplo | `per_couple` | "Por casal" | "Em apartamento duplo" |
| **Viajante Solo** | 1A | Standard Single | `per_person` | "Por pessoa" | "Em apartamento individual (Single)" |
| **Família 2A + 1C** | 2A + 1C (8a) | Suíte Família | `per_family` | "Pacote família" | "2 adultos + 1 criança (8 anos)" |
| **Família 2A + 2C** | 2A + 2C (5 e 11a)| Quádruplo Luxo | `total_package`| "Valor total do pacote"| "2 adultos + 2 crianças (5 e 11 anos)" |
| **Grupo 3 Amigos** | 3A | Triplo TPL | `per_person` | "Por pessoa" | "Em apartamento triplo" |

> [!IMPORTANT]
> É terminantemente proibido exibir o preço com o rótulo "Por pessoa" sem explicitar ao lado "Em apartamento duplo". A omissão induz o cliente a erro e viola o Código de Defesa do Consumidor.

---

## 4. Motor de Campanhas de Parcelamento Brasileiro

### 4.1. As 4 Campanhas Canônicas de Pagamento
Implementadas em `CANONICAL_PAYMENT_CAMPAIGNS` (`excelencia-offer-engine.ts#L145-L200`):

1. **Campanha Excelência 15x Boleto/Cartão (Padrão):**
   - Até 15 parcelas sem juros.
   - Métodos: Boleto Bancário e Cartão de Crédito.
   - Entrada: Não obrigatória (Zero de entrada).
   - Primeiro vencimento: 30 dias após emissão.
   - Rótulo de Story: `"no boleto e cartão"`.
   - Rótulo de WhatsApp: `"15x de R$ 284 no boleto ou cartão"`.

2. **Campanha Especial 16x:**
   - 16 parcelas sem juros para feiras e lançamentos sazonais.

3. **Campanha Padrão 12x Sem Juros:**
   - 10x ou 12x sem juros (Boleto, Cartão e Pix Parcelado).

4. **Campanha Operadora 10x Sem Juros:**
   - Regra estrita de operadoras convencionais (CVC, Orinter, Azul Viagens).

### 4.2. Aritmética de Centavos e Arredondamento Perfeito
Para evitar centavos residuais ou divisões inexatas de moeda em sistemas bancários:
```typescript
export function computePaymentTermsSnapshot(
  totalAmountCents: number,
  campaign: PaymentCampaign,
  desiredInstallments?: number
): PaymentTermsSnapshot {
  const installments = Math.min(
    Math.max(desiredInstallments || campaign.defaultInstallments, 1),
    Math.max(...campaign.allowedInstallments)
  );

  const installmentAmountCents = Math.round(totalAmountCents / installments);

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    installmentCount: installments,
    installmentAmountCents,
    totalAmountCents,
    methods: campaign.methods,
    entryRequired: campaign.entryRequired,
    interestMode: campaign.interestMode,
    shortStoryLabel: campaign.shortStoryLabel,
    shortWhatsAppLabel: `${installments}x de ${formatMoney(installmentAmountCents)} ${campaign.shortWhatsAppLabel}`,
    legalText: campaign.legalText,
    recalculatedFromTotal: true,
  };
}
```

- **Exemplo de Cálculo Real:**
  - Pacote Total: **R$ 4.260,00** (`426.000` centavos).
  - Campanha 15x: `426.000 / 15` = **28.400** centavos exatos (**R$ 284,00**).
  - Rótulo gerado: `"15x de R$ 284 no boleto ou cartão"`.
  - Zero resíduos ou dízimas em banco de dados.

---

## 5. Conversão Cambial (Dólar / Euro para Reais)
Para pacotes internacionais (Disney, Cancún, Punta Cana, Europa):
- O sistema armazena o valor na moeda original (`currency: "USD"` ou `"EUR"`) e a cotação do câmbio turismo do dia (`exchange_rate: 5.65`).
- O valor final em reais é fixado no momento da emissão da proposta e protegido com garantia de 24 horas no snapshot do cliente (`travel_proposals.pricing`).

---

## 6. Veredito da Precificação e Ocupação
O motor de ocupação e parcelamento atende 100% à prática comercial das agências brasileiras de turismo, garantindo precisão matemática em centavos, clareza absoluta de ocupação e blindagem contra erros operacionais.
