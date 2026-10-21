/**
 * security-rbac-multitenant-isolation.test.ts
 *
 * Suíte Canônica de Testes de RBAC e Isolamento Multi-Tenant.
 * Valida os invariantes de segurança do identity-core e server-access:
 *
 * 1. Zero-Trust de Autenticação: Rejeição imediata de chamadas anônimas.
 * 2. Isolamento Cross-Tenant Estrito: Usuário da Loja A não pode acessar Loja B.
 * 3. Barreira de Proprietário (assertOwnerAccess): Bloqueia gerentes e operadores em ações societárias/bancárias.
 * 4. Barreira Gerencial (assertManagerAccess): Bloqueia operadores operacionais (vendedor, caixa, estoque).
 * 5. Privilégio do Platform Admin (Master): Acesso global auditado a qualquer loja alvo.
 */

import { describe, it, expect } from "vitest";
import {
  assertStoreAccess,
  assertOwnerAccess,
  assertManagerAccess,
  STAFF_ROLES,
  OWNER_ROLES,
  MANAGER_ROLES,
  ServerIdentity,
} from "@/lib/identity-core";

describe("Segurança RBAC & Isolamento Multi-Tenant (Invariantes Canônicos)", () => {
  const storeA = "11111111-1111-1111-1111-111111111111";
  const storeB = "22222222-2222-2222-2222-222222222222";

  describe("1. Zero-Trust de Autenticação", () => {
    it("deve rejeitar com erro explícito qualquer identidade com id nulo", () => {
      const anonIdentity: ServerIdentity = {
        id: null,
        role: "customer",
        store_id: null,
        memberships: [],
      };

      expect(() => assertStoreAccess(anonIdentity)).toThrow(
        "Unauthorized: User not authenticated."
      );
      expect(() => assertOwnerAccess(anonIdentity)).toThrow(
        "Unauthorized: User not authenticated."
      );
      expect(() => assertManagerAccess(anonIdentity)).toThrow(
        "Unauthorized: User not authenticated."
      );
    });

    it("deve rejeitar usuário autenticado sem contexto de loja e sem memberships", () => {
      const userWithoutStore: ServerIdentity = {
        id: "user-civil-123",
        role: "customer",
        store_id: null,
        memberships: [],
      };

      expect(() => assertStoreAccess(userWithoutStore)).toThrow(
        "Unauthorized: No active store context found."
      );
    });
  });

  describe("2. Isolamento Cross-Tenant (Barreira Multi-Tenant)", () => {
    it("deve bloquear acesso quando o usuário tenta operar na Loja B mas só tem membership na Loja A", () => {
      const userStoreA: ServerIdentity = {
        id: "user-store-a",
        role: "owner",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "owner", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      // Tenta acessar Loja B passando targetStoreId
      expect(() => assertStoreAccess(userStoreA, STAFF_ROLES, storeB)).toThrow(
        `Unauthorized: Insufficient permissions for store ${storeB}`
      );
    });

    it("deve permitir acesso à Loja A para membro ativo com papel autorizado", () => {
      const userStoreA: ServerIdentity = {
        id: "user-store-a",
        role: "seller",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "seller", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertStoreAccess(userStoreA, STAFF_ROLES, storeA)).not.toThrow();
      expect(userStoreA.store_id).toBe(storeA);
      expect(userStoreA.role).toBe("seller");
    });
  });

  describe("3. Barreira de Proprietário (assertOwnerAccess)", () => {
    it("deve permitir acesso para dono da loja (role owner / store_owner / proprietario)", () => {
      const ownerIdentity: ServerIdentity = {
        id: "owner-1",
        role: "owner",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "owner", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertOwnerAccess(ownerIdentity, storeA)).not.toThrow();
    });

    it("deve bloquear gerente em ações exclusivas de proprietário (bancárias, societárias)", () => {
      const managerIdentity: ServerIdentity = {
        id: "manager-1",
        role: "manager",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "manager", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertOwnerAccess(managerIdentity, storeA)).toThrow(
        "Insufficient permissions for store"
      );
    });

    it("deve bloquear vendedor em ações exclusivas de proprietário", () => {
      const sellerIdentity: ServerIdentity = {
        id: "seller-1",
        role: "seller",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "seller", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertOwnerAccess(sellerIdentity, storeA)).toThrow(
        "Insufficient permissions for store"
      );
    });
  });

  describe("4. Barreira Gerencial (assertManagerAccess)", () => {
    it("deve permitir acesso para gerente (manager ou gerente)", () => {
      const managerIdentity: ServerIdentity = {
        id: "manager-2",
        role: "manager",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "manager", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertManagerAccess(managerIdentity, storeA)).not.toThrow();
    });

    it("deve permitir acesso gerencial para o proprietário (herança hierárquica)", () => {
      const ownerIdentity: ServerIdentity = {
        id: "owner-2",
        role: "owner",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "owner", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertManagerAccess(ownerIdentity, storeA)).not.toThrow();
    });

    it("deve bloquear operador de estoque ou vendedor em ação gerencial", () => {
      const stockIdentity: ServerIdentity = {
        id: "stock-1",
        role: "stock",
        store_id: storeA,
        memberships: [
          { store_id: storeA, role: "stock", name: "Loja Alpha", slug: "alpha" },
        ],
      };

      expect(() => assertManagerAccess(stockIdentity, storeA)).toThrow(
        "Insufficient permissions for store"
      );
    });
  });

  describe("5. Privilégio Auditado do Platform Admin (Master)", () => {
    it("deve conceder acesso a qualquer loja para platform_admin sem exigir membership", () => {
      const adminIdentity: ServerIdentity = {
        id: "master-god-mode",
        role: "platform_admin",
        store_id: null,
        memberships: [],
      };

      expect(() => assertStoreAccess(adminIdentity, STAFF_ROLES, storeB)).not.toThrow();
      expect(adminIdentity.store_id).toBe(storeB);
    });

    it("deve permitir que platform_admin execute assertOwnerAccess em qualquer loja", () => {
      const adminIdentity: ServerIdentity = {
        id: "master-god-mode",
        role: "master",
        store_id: null,
        memberships: [],
      };

      expect(() => assertOwnerAccess(adminIdentity, storeA)).not.toThrow();
      expect(adminIdentity.store_id).toBe(storeA);
    });
  });
});
