import { describe, expect, it } from "vitest";
import { checkStoreVerticalAccess, resolveStorePlanScope } from "./vertical-entitlement";

describe("vertical-entitlement (Strict Vertical & Plan Isolation)", () => {
  it("grants unrestricted access to Waesy Pro All-in-One and Enterprise plans", () => {
    const proStore = { subscription_tier: "pro", vertical_sku: "waesy_bundle_pro", brand_origin: "waesy_studio" };
    expect(resolveStorePlanScope(proStore).hasAllAccess).toBe(true);
    expect(checkStoreVerticalAccess(proStore, { host: "turis.waesy.com.br" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(proStore, { host: "talk.waesy.com.br" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(proStore, { pathname: "/copilot" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(proStore, { pathname: "/workspace/turismo/pacotes" }).allowed).toBe(true);
  });

  it("restricts Tourism-only store to tourism portal and blocks Talk, Copilot, and Retail PDV", () => {
    const turisStore = { subscription_tier: "pro", vertical_sku: "waesy_tourism_pro", brand_origin: "turis" };
    expect(resolveStorePlanScope(turisStore).scope).toBe("tourism");
    expect(checkStoreVerticalAccess(turisStore, { host: "turis.waesy.com.br" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(turisStore, { pathname: "/workspace/turismo/pacotes" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(turisStore, { pathname: "/workspace" }).allowed).toBe(true);

    const talkDeny = checkStoreVerticalAccess(turisStore, { host: "talk.waesy.com.br" });
    expect(talkDeny.allowed).toBe(false);
    expect(talkDeny.requiresProUpgrade).toBe(true);

    const copilotDeny = checkStoreVerticalAccess(turisStore, { pathname: "/copilot" });
    expect(copilotDeny.allowed).toBe(false);
    expect(copilotDeny.requiresProUpgrade).toBe(true);

    const pdvDeny = checkStoreVerticalAccess(turisStore, { pathname: "/workspace/pdv" });
    expect(pdvDeny.allowed).toBe(false);
  });

  it("restricts Copilot-only store to Copilot and blocks other vertical systems", () => {
    const copilotStore = { subscription_tier: "starter", brand_origin: "waesy_copilot", niche: "copilot" };
    expect(checkStoreVerticalAccess(copilotStore, { host: "copilot.waesy.com.br" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(copilotStore, { pathname: "/copilot" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(copilotStore, { pathname: "/workspace/turismo" }).allowed).toBe(false);
    expect(checkStoreVerticalAccess(copilotStore, { pathname: "/workspace/atendimento/chat" }).allowed).toBe(false);
    expect(checkStoreVerticalAccess(copilotStore, { pathname: "/workspace/pdv" }).allowed).toBe(false);
  });

  it("restricts Talk-only store to Talk CRM/Atendimento and blocks Tourism, Copilot, and PDV", () => {
    const talkStore = { subscription_tier: "starter", brand_origin: "talk", niche: "services" };
    expect(checkStoreVerticalAccess(talkStore, { host: "talk.waesy.com.br" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(talkStore, { pathname: "/workspace/atendimento/chat" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(talkStore, { pathname: "/workspace/crm" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(talkStore, { pathname: "/workspace/turismo" }).allowed).toBe(false);
    expect(checkStoreVerticalAccess(talkStore, { pathname: "/copilot" }).allowed).toBe(false);
  });

  it("allows Admin Master unconditional access across all verticals", () => {
    const talkStore = { subscription_tier: "starter", brand_origin: "talk" };
    expect(
      checkStoreVerticalAccess(talkStore, { host: "turis.waesy.com.br", isPlatformAdmin: true }).allowed,
    ).toBe(true);
  });

  it("allows gastronomy stores to operate retail POS/catalog/orders while blocking unrelated verticals", () => {
    const gastroStore = { subscription_tier: "starter", brand_origin: "gastronomy", niche: "gastronomy" };
    expect(checkStoreVerticalAccess(gastroStore, { pathname: "/workspace/pdv" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(gastroStore, { pathname: "/workspace/catalogo" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(gastroStore, { pathname: "/workspace/pedidos" }).allowed).toBe(true);
    expect(checkStoreVerticalAccess(gastroStore, { pathname: "/workspace/turismo" }).allowed).toBe(false);
    expect(checkStoreVerticalAccess(gastroStore, { pathname: "/workspace/eventos" }).allowed).toBe(false);
    expect(checkStoreVerticalAccess(gastroStore, { pathname: "/copilot" }).allowed).toBe(false);
  });
});
