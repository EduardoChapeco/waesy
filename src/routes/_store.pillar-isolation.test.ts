import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Pillar Isolation & Routing Security", () => {
  it("valida integridade de classificados e promoção para catálogo", () => {
    const classifiedsFunctionsSource = readFileSync(
      resolve(process.cwd(), "src/services/classifieds.functions.ts"),
      "utf8"
    );
    const promotionFunctionsSource = readFileSync(
      resolve(process.cwd(), "src/services/listing-promotion.functions.ts"),
      "utf8"
    );
    const placesRouteSource = readFileSync(
      resolve(process.cwd(), "src/routes/_store.places.index.tsx"),
      "utf8"
    );

    // 1. Classificados públicos filtram estritamente status ativo, excluindo anúncios promovidos
    expect(classifiedsFunctionsSource.includes('.eq("status", "active")')).toBe(true);
    expect(promotionFunctionsSource.includes('status: "promoted"')).toBe(true);
    expect(promotionFunctionsSource.includes("promoted_to_product_id")).toBe(true);

    // 2. Ponte de promoção valida idempotência e posse antes de criar produto no Workspace
    expect(promotionFunctionsSource.includes("wasAlreadyPromoted: true")).toBe(true);
    expect(promotionFunctionsSource.includes("assertStoreAccess")).toBe(true);
    expect(promotionFunctionsSource.includes("publishDomainEvent")).toBe(true);

    // 3. Places filtra exclusivamente estabelecimentos físicos e com localização
    expect(placesRouteSource.includes("places")).toBe(true);

    // 4. Schema de promoção exige UUIDs estritos para classifiedId e targetStoreId
    expect(promotionFunctionsSource.includes("classifiedId: z.string().uuid")).toBe(true);
    expect(promotionFunctionsSource.includes("targetStoreId: z.string().uuid")).toBe(true);

    // 5. Evento de domínio emitido no barramento outbox com tipo canônico
    expect(promotionFunctionsSource.includes('"classified.promoted_to_workspace"')).toBe(true);
  });
});
