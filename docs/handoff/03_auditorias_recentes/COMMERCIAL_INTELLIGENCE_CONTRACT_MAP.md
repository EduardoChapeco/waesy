# COMMERCIAL INTELLIGENCE — MAPEAMENTO DE CONTRATOS BFF & SCHEMAS ZOD
## Especificação dos Contratos Server-Side (TanStack Start Server Functions)
**Data:** 2026-10-21  
**Arquivo de Implementação:** `src/services/travel-commercial-intelligence.functions.ts`  

---

### 1. Lista de Contratos Server Functions

| Função | Método | Escopo | Descrição |
| :--- | :--- | :--- | :--- |
| `listCommercialContactsFn` | GET | Staff | Lista contatos comerciais com filtro de busca e paginação. |
| `upsertCommercialContactFn` | POST | Staff | Cadastra ou atualiza contato pré-CRM com deduplicação por telefone. |
| `listTravelInterestsFn` | GET | Staff | Lista intenções ativas com filtros por status, destino, mês e urgência. |
| `upsertTravelInterestFn` | POST | Staff | Registra ou atualiza intenção comercial vinculada a um contato. |
| `evaluateOfferMatchesFn` | POST | Staff | Executa motor de matching determinístico ao publicar nova oferta ou lote. |
| `listOpportunityMatchesFn` | GET | Staff | Lista oportunidades identificadas com ordenação por score e status. |
| `recordCommercialInteractionFn` | POST | Staff | Registra abordagem no WhatsApp, resposta do cliente e objeções. |
| `promoteOpportunityToCrmLeadFn` | POST | Staff | Promove voluntariamente a oportunidade para o CRM formal (`leads_crm`). |

---

### 2. Schemas Zod Canônicos

#### `UpsertCommercialContactSchema`
```typescript
export const UpsertCommercialContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(8, "Telefone inválido"),
  email: z.string().email().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  preferredChannel: z.enum(["whatsapp", "phone", "instagram", "email"]).default("whatsapp"),
  status: z.enum(["active", "nurturing", "unresponsive", "promoted_to_crm", "opted_out"]).default("active"),
  notes: z.string().optional().nullable(),
});
```

#### `UpsertTravelInterestSchema`
```typescript
export const UpsertTravelInterestSchema = z.object({
  id: z.string().uuid().optional(),
  contactId: z.string().uuid("ID do contato obrigatório"),
  title: z.string().min(3, "Título descritivo obrigatório"),
  destinations: z.array(z.string()).min(1, "Ao menos um destino deve ser informado"),
  destinationCategories: z.array(z.string()).optional().default([]),
  preferredOrigins: z.array(z.string()).optional().default([]),
  dates: z.object({
    flexibility: z.enum(["exact_dates", "specific_month", "specific_season", "flexible_anytime"]),
    targetMonths: z.array(z.string()).optional().default([]),
    exactDepartureDate: z.string().optional().nullable(),
    exactReturnDate: z.string().optional().nullable(),
    preferredSeason: z.enum(["summer", "winter", "spring", "autumn", "low_season", "school_holidays"]).optional(),
    durationNightsRange: z.tuple([z.number(), z.number()]).optional(),
  }),
  party: z.object({
    adults: z.number().int().min(1).default(2),
    children: z.number().int().min(0).default(0),
    childrenAges: z.array(z.number().int()).optional().default([]),
    roomConfiguration: z.enum(["single", "double", "triple", "family", "custom"]).default("double"),
  }),
  budget: z.object({
    maxTotalBudgetCents: z.number().int().optional().nullable(),
    maxInstallmentCents: z.number().int().optional().nullable(),
    preferredInstallments: z.number().int().optional().nullable(),
    priceBasisPreference: z.enum(["per_person", "per_couple", "per_family", "total_package"]).default("per_person"),
  }),
  inclusionsWanted: z.array(z.string()).optional().default([]),
  hotelPreferences: z.object({
    minStars: z.number().int().optional(),
    preferredChains: z.array(z.string()).optional(),
    preferredHotelNames: z.array(z.string()).optional(),
  }).optional(),
  urgency: z.enum(["immediate", "moderate", "exploring", "future_trip"]).default("moderate"),
  sourceInquiryText: z.string().optional().nullable(),
  sourceQuoteId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().optional(),
});
```

#### `RecordCommercialInteractionSchema`
```typescript
export const RecordCommercialInteractionSchema = z.object({
  matchId: z.string().uuid("ID do match obrigatório"),
  channel: z.enum(["whatsapp", "phone", "email", "meeting"]).default("whatsapp"),
  status: z.enum(["reviewed", "approached", "engaged", "promoted_to_crm", "dismissed"]),
  approachNotes: z.string().optional(),
  customerFeedback: z.string().optional(),
  objectionType: z.enum(["price_too_high", "dates_changed", "already_traveled", "no_interest", "other"]).optional().nullable(),
});
```

#### `PromoteOpportunityToCrmLeadSchema`
```typescript
export const PromoteOpportunityToCrmLeadSchema = z.object({
  matchId: z.string().uuid("ID do match obrigatório"),
  customEstimatedBudgetCents: z.number().int().optional(),
  assignedAgentProfileId: z.string().uuid().optional(),
  initialLeadStage: z.enum(["qualified", "proposal", "negotiation"]).default("qualified"),
  notes: z.string().optional(),
});
```
