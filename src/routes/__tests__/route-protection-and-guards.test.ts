import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("Auditoria e Proteção Estrita de Rotas e Vinculações BFF", () => {
  it("garante proteção de antes de carregamento (beforeLoad) na rota de recibo escapada", () => {
    const receiptRoute = fs.readFileSync(
      path.join(root, "src/routes/workspace_.pedidos.$id.recibo.tsx"),
      "utf8",
    );
    expect(receiptRoute).toContain("beforeLoad:");
    expect(receiptRoute).toContain("getUserSession()");
    expect(receiptRoute).toContain('throw redirect({');
    expect(receiptRoute).toContain('to: "/entrar"');
  });

  it("garante proteção de antes de carregamento (beforeLoad) no cadastro biométrico de entregador", () => {
    const courierRoute = fs.readFileSync(
      path.join(root, "src/routes/_store.entregador.cadastro.tsx"),
      "utf8",
    );
    expect(courierRoute).toContain("beforeLoad:");
    expect(courierRoute).toContain("getUserSession()");
    expect(courierRoute).toContain('throw redirect({');
    expect(courierRoute).toContain('to: "/entrar"');
  });

  it("garante proteção de antes de carregamento (beforeLoad) no app do garçom", () => {
    const garcomRoute = fs.readFileSync(
      path.join(root, "src/routes/_store.garcom.tsx"),
      "utf8",
    );
    expect(garcomRoute).toContain("beforeLoad:");
    expect(garcomRoute).toContain("getUserSession()");
    expect(garcomRoute).toContain('throw redirect({');
    expect(garcomRoute).toContain('to: "/entrar"');
    expect(garcomRoute).toContain('to: "/criar-negocio"');
  });

  it("garante autorização de staff e isolamento multi-tenant no estoque canônico", () => {
    const stockFn = fs.readFileSync(
      path.join(root, "src/services/canonical-stock-ledger.functions.ts"),
      "utf8",
    );
    expect(stockFn).toContain("assertStoreAccess(identity, ['owner', 'admin', 'manager', 'stock']");
    expect(stockFn).toContain("assertStoreAccess(identity, ['owner', 'admin', 'manager', 'seller', 'stock']");
  });

  it("garante autorização estrita no orquestrador de chaves de IA (SimLab)", () => {
    const apiFn = fs.readFileSync(
      path.join(root, "src/services/api-orchestrator.functions.ts"),
      "utf8",
    );
    expect(apiFn).toContain('assertStoreAccess(identity, ["owner", "admin", "manager"])');
    expect(apiFn).toContain("const identity = await getServerIdentity().catch(() => null);");
  });

  it("garante autorização estrita nas funções operacionais do PDV e KDS", () => {
    const pdvFn = fs.readFileSync(
      path.join(root, "src/services/pdv.functions.ts"),
      "utf8",
    );
    expect(pdvFn).toContain('assertStoreAccess(identity, ["owner", "admin", "manager", "kitchen", "cook", "waiter", "seller"])');
    expect(pdvFn).toContain('assertStoreAccess(identity, ["owner", "admin", "manager", "kitchen", "cook"])');
    expect(pdvFn).toContain('assertStoreAccess(identity, ["owner", "admin", "manager", "waiter", "seller"])');
    expect(pdvFn).toContain('assertStoreAccess(identity, ["owner", "admin", "manager", "cashier", "seller", "finance"])');
  });

  it("garante barreira contra forja de microtaxa de pedidos em faturas", () => {
    const billingFn = fs.readFileSync(
      path.join(root, "src/services/billing-ledger.functions.ts"),
      "utf8",
    );
    expect(billingFn).toContain("isStoreStaff");
    expect(billingFn).toContain("isGlobalAdmin");
    expect(billingFn).toContain("isOrderCustomer");
    expect(billingFn).toContain('throw new Error("Não autorizado a registrar microtaxa para este pedido.");');
  });
});
