# ARCHITECTURE_GRAPH — Excelência Tour Offer & Story Pipeline

```mermaid
flowchart TD
  subgraph Intake["1. Multimodal Offer Intake"]
    IMG["Screenshot / Ctrl+V Image"]
    PDF["Supplier PDF / Voucher"]
    TXT["Pasted Quote Text / URL"]
    MAN["Manual Agent Instruction"]
  end

  subgraph Extraction["2. Evidence-First Extraction & Reconciliation"]
    EXT["ExtractedField<T> + Source Evidence"]
    VAL["Deterministic Commercial Validator"]
    CAT["Central Hotel & Destination Alias Resolver"]
    CAM["Payment Campaign Snapshot Engine"]
  end

  subgraph Canonical["3. Canonical Domain Model"]
    OFFER["TravelOffer (draft | review | published | expired | archived)"]
    MEM["PriceObservation (Append-Only Global Memory)"]
  end

  subgraph Outputs["4. Synchronized Output Projections"]
    PUB["Public Offer Page (EditorialShowcaseView + 24h Expiry Banner)"]
    WA["WhatsApp Publisher (Strict 'HOJE' Rule + Omitted Flight Times + Public Link)"]
    STORY["StoryDocument 1080x1920 Scene Graph + LiquidGlassSurface"]
  end

  IMG --> EXT
  PDF --> EXT
  TXT --> EXT
  MAN --> EXT
  EXT --> VAL
  VAL --> CAT
  CAT --> CAM
  CAM --> OFFER
  OFFER --> MEM
  OFFER --> PUB
  OFFER --> WA
  OFFER --> STORY
```

## Surface Synchronization Invariant
1. **Single Source of Truth**: `TravelOffer` holds the canonical commercial facts (`party`, `rooms`, `pricing`, `hotels`, `flights`, `inclusions`, `validity`, `paymentTermsSnapshot`).
2. **Derived Projections**:
   - **Public Offer Page** renders full itinerary, hotel catalog photos, room occupancy, and live/expired status (`expiresAt`).
   - **StoryDocument (9:16)** selects 2–4 high-impact inclusions with explicit reason codes (`INCLUDED_AND_PRIORITY_1..4`), fits the destination title (`fitStoryTitle`), and renders the price inside a configurable `GlassMaterial` card (`LiquidGlassSurface`).
   - **WhatsApp Copy** formats the commercial summary without flight times by default, enforces the calendar-day `"HOJE"` rule in `America/Sao_Paulo`, and appends the public offer link.
