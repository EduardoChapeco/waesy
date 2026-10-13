import { describe, it, expect } from "vitest";
import { sanitizeNodeProps } from "@/components/commerce/experience-renderer";
import { resolveStoreContext } from "@/services/builder.functions";
import type { ExperienceNode } from "@/lib/builder-types";

describe("Fase 1: Estabilização do Builder & Resiliência Defensiva", () => {
 it("sanitizeNodeProps deve proteger contra nós vazios ou undefined", () => {
 const sanitized = sanitizeNodeProps(null as any);
 expect(sanitized).toBeDefined();
 expect(sanitized.id).toBe("safe-empty-node");
 expect(sanitized.content).toBeDefined();
 expect(sanitized.content.items).toEqual([]);
 });

 it("sanitizeNodeProps deve converter arrays ausentes ou corrompidos em arrays vazios para evitar .map() crash", () => {
 const brokenNode: ExperienceNode = {
 id: "node-1",
 node_type: "block",
 block_type: "hero_carousel",
 content: {
 title: "Título de Teste",
 // slides e buttons não definidos intencionalmente
 } as any,
 design_tokens: {},
 layout_rules: {},
 responsive_overrides: {},
 data_bindings: {},
 action_bindings: {},
 sort_order: 0,
 is_hidden: false,
 };

 const sanitized = sanitizeNodeProps(brokenNode);
 expect(Array.isArray(sanitized.content.slides)).toBe(true);
 expect(sanitized.content.slides).toHaveLength(0);
 expect(Array.isArray(sanitized.content.buttons)).toBe(true);
 expect(sanitized.content.buttons).toHaveLength(0);
 expect(sanitized.content.title).toBe("Título de Teste");
 expect(sanitized.content.subtitle).toBe("");
 });

 it("resolveStoreContext deve aceitar targetStoreId para platform_admin", async () => {
 const adminIdentity = {
 id: "user-admin",
 role: "platform_admin",
 store_id: null,
 memberships: [],
 };

 const resolved = await resolveStoreContext(adminIdentity, "target-store-123");
 expect(resolved).toBe("target-store-123");
 });

 it("resolveStoreContext deve rejeitar platform_admin sem tenant-alvo", async () => {
 const adminIdentity = {
 id: "user-admin",
 role: "platform_admin",
 store_id: null,
 memberships: [],
 };

 await expect(resolveStoreContext(adminIdentity)).rejects.toThrow("Nenhum contexto de loja válido");
 });

 it("resolveStoreContext deve usar identity.store_id como fallback primário", async () => {
 const staffIdentity = {
 id: "user-staff",
 role: "admin",
 store_id: "store-active-999",
 memberships: [{ store_id: "store-active-999" }],
 };

 const resolved = await resolveStoreContext(staffIdentity);
 expect(resolved).toBe("store-active-999");
 });

 it("resolveStoreContext deve rejeitar usuário sem loja e sem privilégio global", async () => {
 const guestIdentity = {
 id: "user-guest",
 role: "customer",
 store_id: null,
 memberships: [],
 };

 await expect(resolveStoreContext(guestIdentity)).rejects.toThrow();
 });
});
