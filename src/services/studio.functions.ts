/**
 * studio.functions.ts — BFF Server Functions para Waesy Studio 3.0
 * Gestão de Projetos de Design Gráfico, Vídeo e Templates Oficiais.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Schemas & Types
// ============================================================

export const studioProjectTypeEnum = z.enum(["graphic", "video"]);
export type StudioProjectType = z.infer<typeof studioProjectTypeEnum>;

export interface StudioProjectDTO {
 id: string;
 store_id: string | null;
 user_id: string;
 title: string;
 project_type: StudioProjectType;
 aspect_ratio: string;
 canvas_data: Record<string, any>;
 thumbnail_url: string | null;
 created_at: string;
 updated_at: string;
}

export interface StudioTemplateDTO {
 id: string;
 category: string;
 title: string;
 template_type: StudioProjectType;
 aspect_ratio: string;
 canvas_data: Record<string, any>;
 preview_url: string | null;
 is_featured: boolean;
 is_system: boolean;
 created_at: string;
}

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Lista todos os projetos salvos do usuário / loja
 */
export const listStudioProjects = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 store_id: z.string().uuid().optional(),
 project_type: studioProjectTypeEnum.optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const supabase = getServerClient();

 let query = supabase
 .from("studio_projects")
 .select("*")
 .order("updated_at", { ascending: false });

 if (data?.store_id) {
 query = query.eq("store_id", data.store_id);
 } else if (identity.store_id) {
 query = query.or(`store_id.eq.${identity.store_id},user_id.eq.${identity.id}`);
 } else {
 query = query.eq("user_id", identity.id);
 }

 if (data?.project_type) {
 query = query.eq("project_type", data.project_type);
 }

 const { data: projects, error } = await query;

 if (error) {
 console.error("[studio.functions] Erro ao listar projetos:", error.message);
 return [] as StudioProjectDTO[];
 }

 return (projects || []) as StudioProjectDTO[];
 });

/**
 * 2. Carrega um projeto específico por ID
 */
export const getStudioProjectById = createServerFn({ method: "GET" })
 .validator(
 z.object({
 id: z.string().uuid(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 const { data: project, error } = await supabase
 .from("studio_projects")
 .select("*")
 .eq("id", data.id)
 .maybeSingle();

 if (error || !project) {
 return null;
 }

 return project as StudioProjectDTO;
 });

/**
 * 3. Salva ou atualiza um projeto no banco
 */
export const saveStudioProject = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 title: z.string().min(1).default("Sem Título"),
 project_type: studioProjectTypeEnum.default("graphic"),
 aspect_ratio: z.string().default("1:1"),
 canvas_data: z.record(z.any()),
 thumbnail_url: z.string().nullable().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const supabase = getServerClient();

 const payload = {
 title: data.title,
 project_type: data.project_type,
 aspect_ratio: data.aspect_ratio,
 canvas_data: data.canvas_data,
 thumbnail_url: data.thumbnail_url || null,
 store_id: identity.store_id || null,
 user_id: identity.id,
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("studio_projects")
 .update(payload)
 .eq("id", data.id)
 .select("*")
 .single();

 if (error) {
 throw new Error("Erro ao atualizar projeto: " + error.message);
 }
 return updated as StudioProjectDTO;
 } else {
 const { data: created, error } = await supabase
 .from("studio_projects")
 .insert(payload)
 .select("*")
 .single();

 if (error) {
 throw new Error("Erro ao criar projeto: " + error.message);
 }
 return created as StudioProjectDTO;
 }
 });

/**
 * 4. Deleta um projeto
 */
export const deleteStudioProject = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const supabase = getServerClient();

 const { error } = await supabase.from("studio_projects").delete().eq("id", data.id);

 if (error) {
 throw new Error("Erro ao excluir projeto: " + error.message);
 }

 return { success: true };
 });

/**
 * 5. Lista templates oficiais do sistema
 */
export const listStudioTemplates = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 category: z.string().optional(),
 template_type: studioProjectTypeEnum.optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();

 let query = supabase
 .from("studio_templates")
 .select("*")
 .order("is_featured", { ascending: false });

 if (data?.category && data.category !== "all") {
 query = query.eq("category", data.category);
 }

 if (data?.template_type) {
 query = query.eq("template_type", data.template_type);
 }

 const { data: templates, error } = await query;

 if (!error && templates && templates.length > 0) {
 return templates as StudioTemplateDTO[];
 }

 // Templates Canônicos Oficiais (Presets Universais de Nicho para Studio 3.0)
 const canonicals: StudioTemplateDTO[] = [
 {
 id: "tpl-veiculo-oferta",
 category: "veiculos",
 title: "Ficha Seminovos — Oferta & Parcelamento",
 template_type: "graphic",
 aspect_ratio: "1:1",
 preview_url: null,
 is_featured: true,
 is_system: true,
 created_at: new Date().toISOString(),
 canvas_data: {
 aspectRatio: "1:1",
 background: { type: "color", value: "#0B1120" },
 elements: [
 {
 id: "el-header-badge",
 type: "shape",
 layer: 2,
 zIndex: 1,
 position: { x: 50, y: 12 },
 size: { width: 88, height: 6 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: { shapeType: "badge", fill: "#1E293B", borderRadius: 8 },
 },
 {
 id: "el-category-text",
 type: "text",
 layer: 7,
 zIndex: 2,
 position: { x: 50, y: 12 },
 size: { width: 80, height: 5 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "VEÍCULO SELECIONADO • PRONTA ENTREGA",
 fontFamily: "Inter",
 fontSize: 14,
 fontWeight: 800,
 color: "#38BDF8",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: 2,
 },
 },
 {
 id: "el-title-vehicle",
 type: "text",
 layer: 7,
 zIndex: 3,
 position: { x: 50, y: 28 },
 size: { width: 90, height: 14 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "JEEP COMPASS 2.0 LIMITED 4X4",
 fontFamily: "Inter",
 fontSize: 32,
 fontWeight: 900,
 color: "#FFFFFF",
 textAlign: "center",
 lineHeight: 1.1,
 letterSpacing: -1,
 },
 },
 {
 id: "el-specs-vehicle",
 type: "text",
 layer: 7,
 zIndex: 4,
 position: { x: 50, y: 46 },
 size: { width: 85, height: 8 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "ANO 2022 • 38.000 KM • CÂMBIO AUTOMÁTICO • TETO SOLAR",
 fontFamily: "Inter",
 fontSize: 16,
 fontWeight: 600,
 color: "#94A3B8",
 textAlign: "center",
 lineHeight: 1.2,
 letterSpacing: 0.5,
 },
 },
 {
 id: "el-price-box",
 type: "shape",
 layer: 2,
 zIndex: 5,
 position: { x: 50, y: 72 },
 size: { width: 88, height: 22 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: { shapeType: "rectangle", fill: "#1E293B", borderRadius: 16 },
 },
 {
 id: "el-price-val",
 type: "text",
 layer: 7,
 zIndex: 6,
 position: { x: 50, y: 68 },
 size: { width: 80, height: 10 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "R$ 142.900",
 fontFamily: "Inter",
 fontSize: 40,
 fontWeight: 900,
 color: "#10B981",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: -1,
 },
 },
 {
 id: "el-installment-val",
 type: "text",
 layer: 7,
 zIndex: 7,
 position: { x: 50, y: 78 },
 size: { width: 80, height: 6 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "Entrada sugerida + Parcelas a partir de R$ 1.890",
 fontFamily: "Inter",
 fontSize: 14,
 fontWeight: 700,
 color: "#F8FAFC",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: 0,
 },
 },
 ],
 },
 },
 {
 id: "tpl-imovel-story",
 category: "imoveis",
 title: "Ficha Imobiliária — Story 9:16",
 template_type: "graphic",
 aspect_ratio: "9:16",
 preview_url: null,
 is_featured: true,
 is_system: true,
 created_at: new Date().toISOString(),
 canvas_data: {
 aspectRatio: "9:16",
 background: { type: "color", value: "#0F172A" },
 elements: [
 {
 id: "el-imovel-badge",
 type: "text",
 layer: 7,
 zIndex: 1,
 position: { x: 50, y: 8 },
 size: { width: 85, height: 4 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "OPORTUNIDADE EXCLUSIVA DE VENDA",
 fontFamily: "Inter",
 fontSize: 13,
 fontWeight: 800,
 color: "#F59E0B",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: 2,
 },
 },
 {
 id: "el-imovel-title",
 type: "text",
 layer: 7,
 zIndex: 2,
 position: { x: 50, y: 22 },
 size: { width: 88, height: 12 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "APARTAMENTO ALTO PADRÃO COM VISTA",
 fontFamily: "Inter",
 fontSize: 32,
 fontWeight: 900,
 color: "#FFFFFF",
 textAlign: "center",
 lineHeight: 1.1,
 letterSpacing: -0.5,
 },
 },
 {
 id: "el-imovel-specs",
 type: "text",
 layer: 7,
 zIndex: 3,
 position: { x: 50, y: 40 },
 size: { width: 85, height: 14 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "📐 145m² de Área Privativa\n🛏️ 3 Suítes com Varanda\n🚗 2 Vagas de Garagem Cobertas\n🏊‍♂️ Lazer Completo no Condomínio",
 fontFamily: "Inter",
 fontSize: 16,
 fontWeight: 600,
 color: "#E2E8F0",
 textAlign: "left",
 lineHeight: 1.6,
 letterSpacing: 0,
 },
 },
 {
 id: "el-imovel-price",
 type: "text",
 layer: 7,
 zIndex: 4,
 position: { x: 50, y: 80 },
 size: { width: 85, height: 8 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "R$ 980.000",
 fontFamily: "Inter",
 fontSize: 36,
 fontWeight: 900,
 color: "#10B981",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: -1,
 },
 },
 ],
 },
 },
 {
 id: "tpl-gastro-prato",
 category: "gastronomia",
 title: "Cardápio do Dia & Prato do Chef",
 template_type: "graphic",
 aspect_ratio: "1:1",
 preview_url: null,
 is_featured: true,
 is_system: true,
 created_at: new Date().toISOString(),
 canvas_data: {
 aspectRatio: "1:1",
 background: { type: "color", value: "#1C1917" },
 elements: [
 {
 id: "el-gastro-badge",
 type: "text",
 layer: 7,
 zIndex: 1,
 position: { x: 50, y: 15 },
 size: { width: 85, height: 5 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "ESPECIAL DO ALMOÇO • 11H30 ÀS 14H",
 fontFamily: "Inter",
 fontSize: 14,
 fontWeight: 800,
 color: "#EA580C",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: 2,
 },
 },
 {
 id: "el-gastro-title",
 type: "text",
 layer: 7,
 zIndex: 2,
 position: { x: 50, y: 35 },
 size: { width: 88, height: 16 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "PARMEGIANA DE FILÉ MIGNON",
 fontFamily: "Inter",
 fontSize: 34,
 fontWeight: 900,
 color: "#FAFAF9",
 textAlign: "center",
 lineHeight: 1.1,
 letterSpacing: -1,
 },
 },
 {
 id: "el-gastro-desc",
 type: "text",
 layer: 7,
 zIndex: 3,
 position: { x: 50, y: 56 },
 size: { width: 85, height: 8 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "Acompanha arroz branco soltinho e fritas crocantes artesanais.",
 fontFamily: "Inter",
 fontSize: 16,
 fontWeight: 500,
 color: "#A8A29E",
 textAlign: "center",
 lineHeight: 1.3,
 letterSpacing: 0,
 },
 },
 {
 id: "el-gastro-price",
 type: "text",
 layer: 7,
 zIndex: 4,
 position: { x: 50, y: 78 },
 size: { width: 85, height: 10 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "R$ 44,90",
 fontFamily: "Inter",
 fontSize: 42,
 fontWeight: 900,
 color: "#F97316",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: -1,
 },
 },
 ],
 },
 },
 {
 id: "tpl-turismo-story",
 category: "turismo",
 title: "Lâmina de Viagem — Story 9:16",
 template_type: "graphic",
 aspect_ratio: "9:16",
 preview_url: null,
 is_featured: true,
 is_system: true,
 created_at: new Date().toISOString(),
 canvas_data: {
 aspectRatio: "9:16",
 background: { type: "color", value: "#0C4A6E" },
 elements: [
 {
 id: "el-turismo-badge",
 type: "text",
 layer: 7,
 zIndex: 1,
 position: { x: 50, y: 10 },
 size: { width: 85, height: 5 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "PACOTE COMPLETO COM AÉREO",
 fontFamily: "Inter",
 fontSize: 13,
 fontWeight: 800,
 color: "#38BDF8",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: 2,
 },
 },
 {
 id: "el-turismo-dest",
 type: "text",
 layer: 7,
 zIndex: 2,
 position: { x: 50, y: 26 },
 size: { width: 88, height: 14 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "PATAGÔNIA & BARILOCHE",
 fontFamily: "Inter",
 fontSize: 34,
 fontWeight: 900,
 color: "#FFFFFF",
 textAlign: "center",
 lineHeight: 1.1,
 letterSpacing: -1,
 },
 },
 {
 id: "el-turismo-details",
 type: "text",
 layer: 7,
 zIndex: 3,
 position: { x: 50, y: 48 },
 size: { width: 85, height: 14 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "✈️ Voo Ida e Volta Incluso\n🏨 6 Noites em Hotel 4 Estrelas\n🚐 Traslados e Seguro Viagem\n❄️ Tour Circuito Chico e Cerro Catedral",
 fontFamily: "Inter",
 fontSize: 16,
 fontWeight: 600,
 color: "#E0F2FE",
 textAlign: "left",
 lineHeight: 1.6,
 letterSpacing: 0,
 },
 },
 {
 id: "el-turismo-parcelas",
 type: "text",
 layer: 7,
 zIndex: 4,
 position: { x: 50, y: 80 },
 size: { width: 85, height: 10 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 content: "10x de R$ 489 sem juros",
 fontFamily: "Inter",
 fontSize: 26,
 fontWeight: 900,
 color: "#34D399",
 textAlign: "center",
 lineHeight: 1,
 letterSpacing: -0.5,
 },
 },
 ],
 },
 },
 ];

 if (data?.category && data.category !== "all") {
 return canonicals.filter((t) => t.category === data.category);
 }

 return canonicals;
 });

// ============================================================
// BRAND KIT — DNA Visual da Loja
// ============================================================

export interface BrandKitDTO {
  id?: string;
  store_id?: string | null;
  colors: Record<string, any>;
  fonts: Record<string, any>;
  logos: Record<string, any>;
  voice: Record<string, any>;
  updated_at?: string;
}

/**
 * getBrandKit — Carrega o Brand Kit da loja autenticada
 */
export const getBrandKit = createServerFn({ method: "GET" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    if (!identity.store_id) return null;

    const { data, error } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("store_id", identity.store_id)
      .maybeSingle();

    if (error) {
      console.error("[studio.functions] getBrandKit error:", error.message);
      return null;
    }

    return data as BrandKitDTO | null;
  });

/**
 * saveBrandKit — Persiste ou atualiza o Brand Kit via upsert
 */
export const saveBrandKit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      colors: z.record(z.any()).optional(),
      fonts: z.record(z.any()).optional(),
      logos: z.record(z.any()).optional(),
      voice: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    if (!identity.store_id) {
      throw new Error("Loja não identificada. Faça login novamente.");
    }

    const payload = {
      store_id: identity.store_id,
      colors: data.colors ?? {},
      fonts: data.fonts ?? {},
      logos: data.logos ?? {},
      voice: data.voice ?? {},
      updated_at: new Date().toISOString(),
    };

    // Verifica se já existe para decidir insert vs update
    const { data: existing } = await supabase
      .from("brand_kits")
      .select("id")
      .eq("store_id", identity.store_id)
      .maybeSingle();

    let brandKitResult: BrandKitDTO;

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from("brand_kits")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw new Error("Erro ao atualizar Brand Kit: " + error.message);
      brandKitResult = updated as BrandKitDTO;
    } else {
      const { data: created, error } = await supabase
        .from("brand_kits")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw new Error("Erro ao criar Brand Kit: " + error.message);
      brandKitResult = created as BrandKitDTO;
    }

    // Sincroniza imediatamente com a tabela stores para refletir na vitrine canônica
    if (data.logos && typeof data.logos === "object") {
      const storeUpdates: Record<string, any> = {};
      if (data.logos.cover_url) {
        storeUpdates.banner_url = data.logos.cover_url;
      }
      if (data.logos.main_url) {
        storeUpdates.logo_url = data.logos.main_url;
      }

      const { data: currentStore } = await supabase
        .from("stores")
        .select("settings")
        .eq("id", identity.store_id)
        .maybeSingle();

      const mergedSettings = {
        ...(currentStore?.settings || {}),
        ...(data.logos.cover_url ? { cover_url: data.logos.cover_url, banner_url: data.logos.cover_url } : {}),
        ...(data.logos.main_url ? { logo_url: data.logos.main_url } : {}),
      };
      storeUpdates.settings = mergedSettings;

      await supabase
        .from("stores")
        .update(storeUpdates)
        .eq("id", identity.store_id);
    }

    return brandKitResult;
  });

/**
 * generateBrandKitWithAI — Chama Edge Function para gerar paleta e fontes via IA
 */
export const generateBrandKitWithAI = createServerFn({ method: "POST" })
  .validator(z.object({ context_hint: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    if (!identity.store_id) throw new Error("Loja não identificada.");

    // Lê briefing existente para dar contexto à IA
    const { data: briefing } = await supabase
      .from("briefings")
      .select("company, content")
      .eq("store_id", identity.store_id)
      .maybeSingle();

    const briefingContext = briefing
      ? {
          company_name: (briefing as any).company?.name || "",
          segment: (briefing as any).company?.segment || "",
          brand_dna: (briefing as any).company?.brand_dna || "",
          tone_of_voice: (briefing as any).content?.tone_of_voice || "",
        }
      : {};

    const { data: result, error } = await supabase.functions.invoke("sw-brand-generate", {
      body: {
        store_id: identity.store_id,
        briefing_data: { ...briefingContext, context_hint: data?.context_hint },
      },
    });

    if (error) throw new Error("Erro na geração IA: " + error.message);
    return result?.data ?? result ?? null;
  });

// ============================================================
// BRAND BRIEFING — DNA Estratégico da Marca
// ============================================================

export interface BrandBriefingDTO {
  id?: string;
  store_id?: string | null;
  company: Record<string, any>;
  audience: Record<string, any>;
  market: Record<string, any>;
  content: Record<string, any>;
  channels: any[];
  completeness_score: number;
  updated_at?: string;
}

/**
 * getBrandBriefing — Carrega o briefing estratégico da loja
 */
export const getBrandBriefing = createServerFn({ method: "GET" })
  .validator(z.object({}).optional())
  .handler(async () => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    if (!identity.store_id) return null;

    const { data, error } = await supabase
      .from("briefings")
      .select("*")
      .eq("store_id", identity.store_id)
      .maybeSingle();

    if (error) {
      console.error("[studio.functions] getBrandBriefing error:", error.message);
      return null;
    }

    return data as BrandBriefingDTO | null;
  });

/**
 * saveBrandBriefing — Persiste o briefing estratégico
 */
export const saveBrandBriefing = createServerFn({ method: "POST" })
  .validator(
    z.object({
      company: z.record(z.any()).optional(),
      audience: z.record(z.any()).optional(),
      market: z.record(z.any()).optional(),
      content: z.record(z.any()).optional(),
      channels: z.array(z.any()).optional(),
      completeness_score: z.number().min(0).max(100).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    if (!identity.store_id) throw new Error("Loja não identificada.");

    const payload = {
      store_id: identity.store_id,
      company: data.company ?? {},
      audience: data.audience ?? {},
      market: data.market ?? {},
      content: data.content ?? {},
      channels: data.channels ?? [],
      completeness_score: data.completeness_score ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("briefings")
      .select("id")
      .eq("store_id", identity.store_id)
      .maybeSingle();

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from("briefings")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw new Error("Erro ao atualizar Briefing: " + error.message);
      return updated as BrandBriefingDTO;
    } else {
      const { data: created, error } = await supabase
        .from("briefings")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw new Error("Erro ao criar Briefing: " + error.message);
      return created as BrandBriefingDTO;
    }
  });

/**
 * generateBrandBriefingWithAI — Usa IA para completar lacunas estratégicas do briefing
 */
export const generateBrandBriefingWithAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      company_name: z.string().optional(),
      segment: z.string().optional(),
      target_audience: z.string().optional(),
      main_differentials: z.string().optional(),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();

    if (!identity.store_id) throw new Error("Loja não identificada.");

    const { data: result, error } = await supabase.functions.invoke("sw-briefing-generate", {
      body: {
        store_id: identity.store_id,
        form_data: {
          company_name: data?.company_name || "",
          segment: data?.segment || "",
          target_audience: data?.target_audience || "",
          main_differentials: data?.main_differentials || "",
        },
      },
    });

    if (error) throw new Error("Erro na geração de briefing com IA: " + error.message);
    return result?.data ?? result ?? null;
  });

export interface SocialCardResultDTO {
  format: "story_9_16" | "feed_1_1" | "banner_16_9";
  dimensions: { width: number; height: number };
  svgMarkup: string;
  shareUrl: string;
  whatsappShareText: string;
}

/**
 * generateSocialStoryCard — Gera dinamicamente artes no formato Stories (9:16) e Feed (1:1)
 * com fotografia, preço, branding da loja e QR Code para postagem direta em redes sociais.
 */
export const generateSocialStoryCard = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      priceCents: z.number().int().optional(),
      imageUrl: z.string().url().optional().nullable(),
      storeName: z.string().min(1),
      targetUrl: z.string().url(),
      format: z.enum(["story_9_16", "feed_1_1", "banner_16_9"]).default("story_9_16"),
      theme: z.enum(["dark", "light", "brand"]).default("dark"),
    })
  )
  .handler(async ({ data }): Promise<SocialCardResultDTO> => {
    const isStory = data.format === "story_9_16";
    const isBanner = data.format === "banner_16_9";
    const width = isStory ? 1080 : isBanner ? 1200 : 1080;
    const height = isStory ? 1920 : isBanner ? 630 : 1080;

    const formattedPrice = data.priceCents
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.priceCents / 100)
      : null;

    const bgColor = data.theme === "light" ? "#f8fafc" : "#09090b";
    const textColor = data.theme === "light" ? "#0f172a" : "#fafafa";
    const mutedColor = data.theme === "light" ? "#64748b" : "#a1a1aa";
    const cardBg = data.theme === "light" ? "rgba(255,255,255,0.9)" : "rgba(24,24,27,0.85)";
    const accentColor = "#f59e0b";

    // Gera SVG responsivo vetorial
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgColor}"/>
          <stop offset="100%" stop-color="${data.theme === "light" ? "#e2e8f0" : "#18181b"}"/>
        </linearGradient>
        <clipPath id="imgClip">
          <rect x="80" y="${isStory ? 280 : 160}" width="${width - 160}" height="${isStory ? 900 : height - 440}" rx="32" ry="32" />
        </clipPath>
      </defs>

      <!-- Fundo -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

      <!-- Cabeçalho / Loja -->
      <g transform="translate(80, ${isStory ? 140 : 80})">
        <rect width="48" height="48" rx="14" fill="${accentColor}" />
        <text x="24" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="22" font-weight="900" fill="#000" text-anchor="middle">W</text>
        <text x="64" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="28" font-weight="800" fill="${textColor}">${data.storeName}</text>
      </g>

      <!-- Imagem do Produto/Passeio (se houver) -->
      ${
        data.imageUrl
          ? `<image href="${data.imageUrl}" x="80" y="${isStory ? 280 : 160}" width="${width - 160}" height="${isStory ? 900 : height - 440}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgClip)" />`
          : `<rect x="80" y="${isStory ? 280 : 160}" width="${width - 160}" height="${isStory ? 900 : height - 440}" rx="32" fill="${cardBg}" />`
      }

      <!-- Card Inferior de Preço e Título -->
      <g transform="translate(80, ${isStory ? 1240 : height - 240})">
        <rect width="${width - 160}" height="${isStory ? 560 : 180}" rx="32" fill="${cardBg}" stroke="${data.theme === "light" ? "#e2e8f0" : "#27272a"}" stroke-width="2" />
        
        <!-- Preço Destaque -->
        ${
          formattedPrice
            ? `<g transform="translate(48, 70)">
                <rect width="260" height="60" rx="16" fill="${accentColor}" />
                <text x="130" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="30" font-weight="900" fill="#000" text-anchor="middle">${formattedPrice}</text>
              </g>`
            : ""
        }

        <!-- Título -->
        <text x="48" y="${formattedPrice ? (isStory ? 200 : 120) : 100}" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="${isStory ? 44 : 34}" font-weight="900" fill="${textColor}">
          ${data.title.slice(0, 45)}
        </text>

        <!-- Subtítulo / Chamada -->
        <text x="48" y="${formattedPrice ? (isStory ? 260 : 155) : 140}" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="24" font-weight="500" fill="${mutedColor}">
          ${(data.subtitle || "Escaneie o QR Code ou acesse o link para comprar").slice(0, 60)}
        </text>

        <!-- Rodapé do Card: Call To Action -->
        ${
          isStory
            ? `<g transform="translate(48, 420)">
                <rect width="${width - 256}" height="80" rx="24" fill="${textColor}" />
                <text x="${(width - 256) / 2}" y="50" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="28" font-weight="800" fill="${bgColor}" text-anchor="middle">
                  Comprar Online no Waesy
                </text>
              </g>`
            : ""
        }
      </g>
    </svg>`;

    const whatsappShareText = formattedPrice
      ? `Confira "${data.title}" por ${formattedPrice} na loja ${data.storeName}: ${data.targetUrl}`
      : `Confira "${data.title}" na loja ${data.storeName}: ${data.targetUrl}`;

    return {
      format: data.format,
      dimensions: { width, height },
      svgMarkup: svg,
      shareUrl: data.targetUrl,
      whatsappShareText,
    };
  });

