# SUBLOGIC_CATALOG.md — Catálogo Canônico de Sublógicas Internas
## Decisões Algébricas, Derivações, Heurísticas e Critérios de Desempate
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado em Nível de Linha de Código  

---

### 1. Inventário de Sublógicas Operacionais

| Sublógica | Implementação no Código | Entrada | Saída / Efeito | Garantia Invariante |
| :--- | :--- | :--- | :--- | :--- |
| **Cálculo de Noites vs Dias** | `excelencia-offer-engine.ts` | `departureDate`, `returnDate` | `durationNights: number`, `durationDays: number` | `durationDays = durationNights + 1`. Se data de retorno for omitida, adota 5 noites como padrão seguro. |
| **Derivação de Preço Unitário** | `excelencia-offer-engine.ts` | `totalCents`, `adultsCount`, `priceBasis` | `perPersonCents`, `installmentCents` | Divisão inteira arredondada (`Math.round`), sem centavos fracionados. Se `priceBasis === 'total_package'`, exibe preço global do grupo. |
| **Inclusão de Crianças no Cálculo** | `excelencia-offer-engine.ts` | `childrenAges: number[]`, `hotel.minChdAge`, `maxChdAge` | `isChdFree: boolean`, `chdRateCents` | Valida se a idade é estritamente menor ou igual ao teto do hotel (ex: até 11 anos e 11 meses). Diária gratuita mantida, taxa de embarque aéreo cobrada. |
| **Resolução de Hotel & Aliases** | `resolveHotelCatalogMatch` | `inputName: string`, `destCity: string` | `GlobalHotel | null`, `confidence: number` | Normalização NFD, remoção de caracteres especiais, matching exato em `hotel_aliases` e trigram similarity com limiar `>= 0.4`. |
| **Seleção de Destaques para Story** | `selectStoryInclusions` | `offer: TravelOffer`, `maxItems = 4` | `selectedItems: string[]` | Ranqueia benefícios por peso semântico: All-Inclusive (peso 100), Aéreo Incluso (peso 90), Bagagem Despachada (peso 80), Transfer (peso 70). |
| **Ajuste Tipográfico de Título (Fit)** | `fitStoryTitle` | `rawTitle: string`, `maxChars = 18` | `lines: string[]`, `recommendedFontSize: string` | Quebra de linha natural entre palavras sem cortar palavras no meio. Reduz proporcionalmente de `text-3xl` para `text-xl` se ultrapassar 3 linhas. |
| **Anti-Truncamento de Cards** | `NicheSpecificationsDisplay` | Dados críticos do anúncio | Classes CSS `break-words text-wrap` | **Proibição absoluta de `truncate` e `line-clamp`** em preços, nomes de hotéis, datas de viagem e composições familiares. |
| **Expiração Temporal e Fechamento** | `isOfferClosingTodayInTimezone` | `endsAt: string`, `timezone: string` | `isClosingToday: boolean`, `isExpired: boolean` | Compara carimbo de data/hora no fuso `America/Sao_Paulo`. Expira às 23:59:59 da data final declarada. |
| **Deduplicação de Contatos Pré-CRM** | `upsertCommercialContactFn` | `phone: string`, `store_id: UUID` | Contato único | Limpa caracteres não numéricos (`phone.replace(/\D/g, '')`). Números com mesmo DDD e dígitos compartilham o mesmo contato (1:N interesses). |
| **Geração de Slugs Canônicos** | `slugify` | `title`, `destinationCity`, `id` | `slug: string` | Lowercase, NFD, hifens únicos, sufixo curto de identificador para garantir unicidade sem conflito. |

---

### 2. Exemplo de Código Canônico: Resolução de Noites e Preço Base

```typescript
// Local: src/lib/travel/excelencia-offer-engine.ts
export function computePaymentTermsSnapshot(
  totalCents: number,
  installmentCount: number = 10,
  hasInterest: boolean = false
): PaymentTermsSnapshot {
  const safeCount = Math.max(1, Math.min(24, installmentCount));
  const installmentAmountCents = Math.round(totalCents / safeCount);

  return {
    installmentCount: safeCount,
    installmentAmountCents,
    totalAmountCents: totalCents,
    shortStoryLabel: hasInterest ? "Com acréscimo" : "Sem juros",
    interestRule: hasInterest ? "fixed_interest" : "zero_interest",
  };
}
```
Essa sublógica é utilizada de forma idêntica tanto no **Story Builder**, quanto na **Página Pública**, quanto na **Proposta Comercial**, garantindo conformidade matemática absoluta em todo o sistema.
