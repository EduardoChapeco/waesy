/**
 * studio.functions.ts — BFF Server Functions para Waesy Studio 3.0
 * Gestão de Projetos de Design Gráfico, Vídeo e Templates Oficiais.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import type { EscamasCarouselProject, EscamasSlide, StudioBrandProfile } from "@/types/studio-machine";
import { DEFAULT_BRAND_PROFILE } from "@/lib/studio-machine-constants";

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

// ============================================================
// STUDIO MACHINE ➔ ESCAMAS CAROUSEL GENERATOR (1-CLICK MINING)
// ============================================================

export interface GeneratedCarouselResultDTO {
  projectId: string;
  title: string;
  project: EscamasCarouselProject;
}

/**
 * generateCarouselFromMinedContent
 * Sintetiza automaticamente um carrossel 1080x1350 com sistema ESCAMAS (8 camadas)
 * a partir de matérias de notícias mineradas, editais do PNCP, vagas de emprego ou eventos.
 */
export const generateCarouselFromMinedContent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contentType: z.enum(["noticias", "licitacoes", "eventos", "empregos"]),
      itemId: z.string().optional(),
      title: z.string().min(1),
      summary: z.string().default(""),
      coverUrl: z.string().optional().nullable(),
      details: z.record(z.any()).optional(),
      storeId: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<GeneratedCarouselResultDTO> => {
    const identity = await getServerIdentity().catch(() => ({ id: "00000000-0000-0000-0000-000000000000", store_id: null }));
    const supabase = getServerClient();

    const targetStoreId = data.storeId || identity.store_id;

    // 1. Carrega DNA da Marca (Brand Kit & Briefing)
    let brandProfile: StudioBrandProfile = { ...DEFAULT_BRAND_PROFILE };

    if (targetStoreId) {
      const { data: brandKit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("store_id", targetStoreId)
        .maybeSingle();

      const { data: storeInfo } = await supabase
        .from("stores")
        .select("name, slug, logo_url")
        .eq("id", targetStoreId)
        .maybeSingle();

      if (storeInfo) {
        brandProfile.name = storeInfo.name;
        brandProfile.handle = `@${storeInfo.slug || "waesystore"}`;
        if (storeInfo.logo_url) brandProfile.logoUrl = storeInfo.logo_url;
      }

      if (brandKit?.colors) {
        const c = brandKit.colors as Record<string, any>;
        if (c.primary) brandProfile.primaryColor = c.primary;
        if (c.secondary) brandProfile.secondaryColor = c.secondary;
        if (c.accent) brandProfile.accentColor = c.accent;
      }

      if (brandKit?.fonts) {
        const f = brandKit.fonts as Record<string, any>;
        if (f.heading) brandProfile.fontHeading = f.heading;
        if (f.body) brandProfile.fontBody = f.body;
      }
    }

    // 2. Extrai Pauta & Roteirização Narrativa por Tipo de Conteúdo
    const slides: EscamasSlide[] = [];
    const coverImage = data.coverUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80";

    if (data.contentType === "licitacoes") {
      const orgao = data.details?.orgao || data.details?.orgao_nome || "Órgão Público";
      const valor = data.details?.valor_total_formatado || data.details?.valor_estimado || "Sob Consulta";
      const municipio = data.details?.municipio || "Municipal";
      const objeto = data.summary || data.title;

      // Slide 1: Capa
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 1,
        layout_type: "escamas_layered",
        role_in_narrative: "hook",
        text_content: {
          badge: "PNCP Transparência",
          kicker: `${municipio} • AVISO PÚBLICO`,
          headline: data.title.slice(0, 70),
          body: `Nova contratação e oportunidade aberta por ${orgao}.`,
        },
        background_url: coverImage,
        background_opacity: 0.28,
        layers: [
          {
            id: crypto.randomUUID(),
            type: "atmospheric",
            url: "",
            x: 50,
            y: 30,
            scale: 1,
            rotation: 0,
            opacity: 0.8,
            zIndex: 1,
            title: "Glow Cívico",
          },
        ],
      });

      // Slide 2: Objeto & Valor
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 2,
        layout_type: "escamas_layered",
        role_in_narrative: "numbers",
        text_content: {
          badge: "Valores & Prazos",
          kicker: "MONTANTE ESTIMADO",
          headline: valor,
          body: `Objeto: ${objeto.slice(0, 180)}...`,
        },
        background_url: coverImage,
        background_opacity: 0.15,
        layers: [],
      });

      // Slide 3: Participação Local
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 3,
        layout_type: "escamas_layered",
        role_in_narrative: "impact",
        text_content: {
          badge: "Oportunidade Local",
          kicker: "EMPRESAS & PRESTADORES",
          headline: "QUEM PODE PARTICIPAR?",
          body: "Fornecedores habilitados, empresas regionais e microempreendedores podem apresentar propostas oficiais no portal do governo.",
        },
        background_url: coverImage,
        background_opacity: 0.12,
        layers: [],
      });

      // Slide 4: CTA
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 4,
        layout_type: "escamas_layered",
        role_in_narrative: "cta",
        text_content: {
          badge: "Acesso Livre",
          kicker: "EDITAL COMPLETO",
          headline: "CONSULTE OS DOCUMENTOS",
          body: "Acesse os anexos e prazos completos no Radar PNCP da plataforma Waesy.",
          cta_text: "Ver Edital no Waesy",
        },
        background_url: coverImage,
        background_opacity: 0.2,
        layers: [],
      });
    } else if (data.contentType === "empregos") {
      const empresa = data.details?.company || data.details?.company_name || "Empresa Contratante";
      const salario = data.details?.salary_range || "A combinar";
      const local = data.details?.location || "Presencial / Híbrido";

      // Slide 1: Capa
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 1,
        layout_type: "escamas_layered",
        role_in_narrative: "hook",
        text_content: {
          badge: "Oportunidade de Trabalho",
          kicker: `${local} • VAGA ABERTA`,
          headline: data.title.slice(0, 65),
          body: `Processo seletivo aberto para contratação imediata na região.`,
        },
        background_url: coverImage,
        background_opacity: 0.3,
        layers: [],
      });

      // Slide 2: Empresa & Remuneração
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 2,
        layout_type: "escamas_layered",
        role_in_narrative: "details",
        text_content: {
          badge: "Condições & Benefícios",
          kicker: empresa.toUpperCase(),
          headline: salario,
          body: (data.summary || "Envie seu currículo ou preencha a ficha oficial de candidatura diretamente pelo link da vaga.").slice(0, 180),
        },
        background_url: coverImage,
        background_opacity: 0.15,
        layers: [],
      });

      // Slide 3: CTA
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 3,
        layout_type: "escamas_layered",
        role_in_narrative: "cta",
        text_content: {
          badge: "Candidatura",
          kicker: "ENVIE SEU CURRÍCULO",
          headline: "CANDIDATE-SE AGORA",
          body: "Acesse a vaga no Waesy Empregos e encaminhe seu contato para a equipe de recrutamento.",
          cta_text: "Acessar Vaga",
        },
        background_url: coverImage,
        background_opacity: 0.22,
        layers: [],
      });
    } else {
      // Notícias e Eventos Gerais
      const sections = (data.details?.ai_structured_sections as Array<{ subtitle: string; content: string }>) || [];
      
      // Slide 1: Capa
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 1,
        layout_type: "escamas_layered",
        role_in_narrative: "hook",
        text_content: {
          badge: "Giro de Notícias",
          kicker: "DESTAQUE EDITORIAL",
          headline: data.title.slice(0, 75),
          body: data.summary.slice(0, 140) + "...",
        },
        background_url: coverImage,
        background_opacity: 0.32,
        layers: [
          {
            id: crypto.randomUUID(),
            type: "atmospheric",
            url: "",
            x: 50,
            y: 40,
            scale: 1,
            rotation: 0,
            opacity: 0.7,
            zIndex: 1,
            title: "Luz de Foco",
          },
        ],
      });

      // Slide 2: Contexto Central
      const sec1 = sections[0] || { subtitle: "O Que Aconteceu", content: data.summary };
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 2,
        layout_type: "escamas_layered",
        role_in_narrative: "context",
        text_content: {
          badge: "Entenda o Caso",
          kicker: "CONTEXTO & FATOS",
          headline: sec1.subtitle.slice(0, 50).toUpperCase(),
          body: sec1.content.slice(0, 220) + (sec1.content.length > 220 ? "..." : ""),
        },
        background_url: coverImage,
        background_opacity: 0.16,
        layers: [],
      });

      // Slide 3: Desdobramento ou Segunda Seção
      const sec2 = sections[1] || { subtitle: "Impacto Local", content: "Confira as repercussões e desdobramentos desta reportagem na comunidade." };
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 3,
        layout_type: "escamas_layered",
        role_in_narrative: "depth",
        text_content: {
          badge: "Repercussão",
          kicker: "ANÁLISE",
          headline: sec2.subtitle.slice(0, 50).toUpperCase(),
          body: sec2.content.slice(0, 220) + (sec2.content.length > 220 ? "..." : ""),
        },
        background_url: coverImage,
        background_opacity: 0.14,
        layers: [],
      });

      // Slide 4: CTA
      slides.push({
        id: crypto.randomUUID(),
        slide_number: 4,
        layout_type: "escamas_layered",
        role_in_narrative: "cta",
        text_content: {
          badge: "Matéria Completa",
          kicker: "LEITURA RECOMENDADA",
          headline: "LEIA A REPORTAGEM NA ÍNTEGRA",
          body: "Acesse o portal Waesy Notícias para ler todos os detalhes, fotos e fontes oficiais.",
          cta_text: "Ler no Waesy",
        },
        background_url: coverImage,
        background_opacity: 0.25,
        layers: [],
      });
    }

    // 3. Monta o Objeto Completo do Projeto de Carrossel
    const carouselProject: EscamasCarouselProject = {
      id: crypto.randomUUID(),
      topic: data.title,
      goal: data.contentType === "licitacoes" ? "civic_impact" : "education",
      brand: brandProfile,
      slides,
      title: `Carrossel: ${data.title.slice(0, 40)}`,
      createdAt: Date.now(),
      visualStyle: "escamas_ultra",
      generationMode: "escamas",
      source_type: data.contentType === "licitacoes" ? "pncp_bid" : data.contentType === "empregos" ? "job_post" : "mined_news",
      source_id: data.itemId,
    };

    // 4. Persiste no banco Supabase na tabela studio_projects
    const { data: savedProject, error } = await supabase
      .from("studio_projects")
      .insert({
        title: carouselProject.title,
        project_type: "graphic",
        aspect_ratio: "4:5",
        canvas_data: carouselProject as any,
        thumbnail_url: coverImage,
        store_id: targetStoreId || null,
        user_id: identity.id !== "00000000-0000-0000-0000-000000000000" ? identity.id : null,
      })
      .select("id, title")
      .single();

    if (error) {
      console.warn("[studio.functions] Aviso ao salvar studio_project no banco:", error.message);
    }

    const finalId = savedProject?.id || carouselProject.id;
    carouselProject.id = finalId;

    return {
      projectId: finalId,
      title: carouselProject.title,
      project: carouselProject,
    };
  });

// ============================================================
// PUBLICAÇÃO SOCIAL & STORIES DIRETO DO STUDIO ESCAMAS
// ============================================================

export const publishStudioCarouselToSocial = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectId: z.string().optional().nullable(),
      title: z.string().min(1).max(300),
      destination: z.enum(["feed", "story", "both"]).default("feed"),
      aspectRatio: z.string().default("portrait_4_5"),
      coverImageUrl: z.string().url().optional().nullable(),
      slideImages: z.array(z.string().url()).optional().default([]),
      caption: z.string().optional().nullable(),
      hashtags: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = identity.store_id;

    let createdPostId: string | null = null;
    let createdStoryId: string | null = null;

    const mediaList =
      data.slideImages && data.slideImages.length > 0
        ? data.slideImages
        : data.coverImageUrl
        ? [data.coverImageUrl]
        : [];

    // 1. Publicação no Feed Social da Comunidade
    if (data.destination === "feed" || data.destination === "both") {
      const { data: postData, error: postErr } = await supabase
        .from("posts")
        .insert({
          store_id: storeId || null,
          author_id: identity.id,
          content_text: data.caption || data.title,
          media_urls: mediaList,
          layout_style: "carousel",
          post_type: "instagram_carousel",
          status: "published",
        })
        .select("id")
        .single();

      if (postErr) {
        console.warn("[studio.functions] Aviso ao criar post no feed:", postErr.message);
      } else {
        createdPostId = postData?.id || null;
      }
    }

    // 2. Publicação como Story de Vitrine
    if ((data.destination === "story" || data.destination === "both") && mediaList.length > 0) {
      const { data: storyData, error: storyErr } = await supabase
        .from("stories")
        .insert({
          store_id: storeId || null,
          author_profile_id: identity.id,
          media_url: mediaList[0],
          link_cta: "Ver no Studio",
          duration_seconds: 15,
          niche: "geral",
          hashtags: data.hashtags,
          status: "active",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (storyErr) {
        console.warn("[studio.functions] Aviso ao criar story:", storyErr.message);
      } else {
        createdStoryId = storyData?.id || null;
      }
    }

    return {
      success: true,
      postId: createdPostId,
      storyId: createdStoryId,
      destination: data.destination,
      message:
        data.destination === "both"
          ? "Carrossel publicado com sucesso no Feed Social e nos Stories!"
          : data.destination === "story"
          ? "Story publicado na vitrine da loja com validade de 24 horas!"
          : "Carrossel publicado no feed da comunidade com layout imersivo!",
    };
  });


