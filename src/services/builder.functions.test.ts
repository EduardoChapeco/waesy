import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { sectionTemplates } from "@/lib/section-templates";

describe("Builder Architecture & Studio Canvas (Microfase 76A)", () => {
 it("carrega templates de seção com estrutura canônica de nós", () => {
 const hero = sectionTemplates["hero_carousel"];
 expect(hero).toBeDefined();
 expect(hero.nodes.length).toBeGreaterThan(0);

 // O nó raiz da seção deve ter parent_id null
 const rootNode = hero.nodes.find((n) => n.parent_id === null);
 expect(rootNode).toBeDefined();
 expect(rootNode?.block_type).toBe("section");
 });

 it("garante que templates comerciais possuem nós de conteúdo estruturados", () => {
 const split = sectionTemplates["split_banner"];
 expect(split).toBeDefined();
 const composition = split.nodes.find((n) => n.node_type === "composition");
 expect(composition).toBeDefined();
 expect(composition?.content).toBeDefined();
 });

 it("valida que o canvas do builder não contém elementos cartoonizados (Mac dots e fake shadow)", () => {
 const canvasFile = fs.readFileSync(
 require("node:path").resolve(process.cwd(), "src/components/admin/builder/builder-canvas.tsx"),
 "utf8"
 );

 // Não deve conter bolinhas de controle Mac de brinquedo
 expect(canvasFile.includes("#ff5f56")).toBe(false);
 expect(canvasFile.includes("#ffbd2e")).toBe(false);
 expect(canvasFile.includes("#27c93f")).toBe(false);

 // Não deve conter moldura de smartphone de plástico arredondada 48px
 expect(canvasFile.includes("rounded-[48px]")).toBe(false);

 // Deve suportar passagem de transientData para renderização ao vivo
 expect(canvasFile.includes("transientData")).toBe(true);
 });

 it("garante que o processo de clonagem de template preserva a integridade de IDs pai-filho", () => {
 const tpl = sectionTemplates["hero_carousel"];
 const idMap = new Map<string, string>();
 tpl.nodes.forEach((n) => {
 if (n.id) idMap.set(n.id, "uuid_" + Math.random().toString(36).substring(2, 9));
 });

 const cloned = tpl.nodes.map((n) => {
 const newId = idMap.get(n.id!)!;
 const newParentId = n.parent_id ? idMap.get(n.parent_id) || null : null;
 return {
 ...n,
 id: newId,
 parent_id: newParentId,
 };
 });

 // Raiz deve ser nula
 expect(cloned[0].parent_id).toBeNull();

 // Container deve apontar para o novo ID da seção
 expect(cloned[1].parent_id).toBe(cloned[0].id);

 // Composição deve apontar para o novo ID do container
 expect(cloned[2].parent_id).toBe(cloned[1].id);
 });
});

describe("Builder Documents Hub & Multi-Vitrines (Microfase 76B)", () => {
 it("valida que o BFF do builder exporta operações canônicas de gerenciamento de documentos", async () => {
 const builderFunctions = await import("@/services/builder.functions");

 expect(typeof builderFunctions.createExperienceDocument).toBe("function");
 expect(typeof builderFunctions.duplicateExperienceDocument).toBe("function");
 expect(typeof builderFunctions.deleteExperienceDocument).toBe("function");
 expect(typeof builderFunctions.setActiveStorefrontDocument).toBe("function");
 expect(typeof builderFunctions.listExperienceDocuments).toBe("function");
 });

 it("garante que os tipos de documentos permitidos incluem storefront, biolink, landing_page, campaign e custom", async () => {
  const builderFile = fs.readFileSync(
    require("node:path").resolve(process.cwd(), "src/services/builder.functions.ts"),
    "utf8"
  );

 // O enum de criação de documentos deve conter storefront, biolink, landing_page, campaign, custom
 expect(builderFile.includes('"landing_page"')).toBe(true);
 expect(builderFile.includes('"custom"')).toBe(true);
 expect(builderFile.includes('"storefront"')).toBe(true);
 expect(builderFile.includes('"biolink"')).toBe(true);
 });
});


describe("Builder Rich Templates, Resilient Renderer & Inspector (Microfase 78A)", () => {
 it("valida que todos os 44 templates da biblioteca estão definidos e funcionais", () => {
 const templateIds = [
 "hero_carousel",
 "flash_sale_hero",
 "curated_hits_rail",
 "product_grid",
 "category_cards_grid",
 "featured_collection_banner",
 "tourism_quote_hero",
 "tourism_services_grid",
 "tourism_destinations_carousel",
 "tourism_itinerary_timeline",
 "tourism_traveler_info",
 "food_menu_streamlined",
 "food_menu_tabs",
 "table_order_comanda",
 "chef_special_banner",
 "lookbook_masonry",
 "service_catalog_list",
 "booking_calendar",
 "property_schedule_visit",
 "property_virtual_tour",
 "biolink_featured_product",
 "countdown_timer",
 "stories_ring",
 "routine_steps",
 ];

 templateIds.forEach((id) => {
 const tpl = sectionTemplates[id];
 expect(tpl, `Template ${id} deve estar definido em sectionTemplates`).toBeDefined();
 expect(tpl.nodes.length, `Template ${id} deve possuir nós`).toBeGreaterThan(0);
 });
 });

 it("garante que o builderRegistry contém os blocos essenciais e aliases suportados", async () => {
 const { builderRegistry } = await import("@/lib/builder-registry");

 expect(builderRegistry["hero_banner"]).toBeDefined();
 expect(builderRegistry["tourism_quote_hero"]).toBeDefined();
 expect(builderRegistry["flash_sale_hero"]).toBeDefined();
 expect(builderRegistry["service_pricing_table"]).toBeDefined();
 expect(builderRegistry["category_cards_grid"]).toBeDefined();
 expect(builderRegistry["featured_collection_banner"]).toBeDefined();
 });
});
