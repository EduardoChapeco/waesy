import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  setClientContextCookies,
  getClientActiveContext,
  getClientActiveTenant,
  getClientActiveCreator,
} from "./context-auth";

describe("context-auth — Sincronização Atômica de Contexto e Cookies", () => {
  let simulatedCookieStore: string[] = [];

  beforeEach(() => {
    simulatedCookieStore = [];
    (globalThis as any).window = globalThis;
    (globalThis as any).document = {
      get cookie() {
        return simulatedCookieStore.join("; ");
      },
      set cookie(val: string) {
        simulatedCookieStore.push(val);
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("deve definir cookies atômicos para contexto de loja (store)", () => {
    setClientContextCookies({
      context: "store",
      storeId: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
    });

    const cookieStr = (globalThis as any).document.cookie;
    expect(cookieStr).toContain("waesy_active_context=store");
    expect(cookieStr).toContain("waesy_active_tenant=c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7");
    expect(cookieStr).toContain("waesy_store_id=c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7");
    expect(cookieStr).toContain("waesy_active_creator=;");

    expect(getClientActiveContext()).toBe("store");
    expect(getClientActiveTenant()).toBe("c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7");
  });

  it("deve purgar cookies corporativos ao alternar para contexto civil (Zero-Trust Civil Root)", () => {
    // Estado prévio com loja
    setClientContextCookies({
      context: "store",
      storeId: "32233049-07c6-49bf-a053-989824fef385",
    });

    // Alterna para civil
    setClientContextCookies({ context: "civil" });

    const cookieStr = (globalThis as any).document.cookie;
    expect(cookieStr).toContain("waesy_active_context=civil");
    expect(cookieStr).toContain("waesy_active_tenant=;");
    expect(cookieStr).toContain("waesy_store_id=;");
    expect(cookieStr).toContain("waesy_active_creator=;");

    expect(getClientActiveContext()).toBe("civil");
    expect(getClientActiveTenant()).toBeNull();
  });

  it("deve isolar contexto de criador sem vazar tenant corporativo", () => {
    setClientContextCookies({
      context: "creator",
      creatorHandle: "eduardo_criador",
    });

    const cookieStr = (globalThis as any).document.cookie;
    expect(cookieStr).toContain("waesy_active_context=creator");
    expect(cookieStr).toContain("waesy_active_creator=eduardo_criador");
    expect(cookieStr).toContain("waesy_active_tenant=;");
    expect(cookieStr).toContain("waesy_store_id=;");

    expect(getClientActiveContext()).toBe("creator");
    expect(getClientActiveCreator()).toBe("eduardo_criador");
    expect(getClientActiveTenant()).toBeNull();
  });

  it("deve isolar modo condutor / entregador Waesy Go", () => {
    setClientContextCookies({ context: "courier" });

    const cookieStr = (globalThis as any).document.cookie;
    expect(cookieStr).toContain("waesy_active_context=courier");
    expect(cookieStr).toContain("waesy_active_tenant=;");
    expect(cookieStr).toContain("waesy_active_creator=;");

    expect(getClientActiveContext()).toBe("courier");
    expect(getClientActiveTenant()).toBeNull();
  });
});
