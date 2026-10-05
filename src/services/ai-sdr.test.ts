import { describe, expect, it } from "vitest";
import { parsePromptFallback } from "./ai-sdr.functions";

describe("AI classified extractor fallback", () => {
  it("retorna contrato rico para anúncio com preço, cidade e entrega", () => {
    const listing = parsePromptFallback("Vendo PS5 semi novo por R$ 3.000, moro no Centro e entrego em mãos");
    expect(listing.category).toBe("sale");
    expect(listing.price_cents).toBe(300000);
    expect(listing.delivery_type).toBe("hand_delivery");
    expect(listing.shipping_mode).toBe("local_delivery");
    expect(listing.payment_config.accepts_pix).toBe(true);
    expect(listing.inclusions).toEqual([]);
    expect(listing.location_data).toBeDefined();
  });

  it("identifica serviço online e não sugere entrega física", () => {
    const listing = parsePromptFallback("Ofereço consultoria online por R$ 250");
    expect(listing.category).toBe("service");
    expect(listing.delivery_type).toBe("online");
    expect(listing.shipping_mode).toBe("not_applicable");
    expect(listing.stock_quantity).toBe(1);
  });
});
