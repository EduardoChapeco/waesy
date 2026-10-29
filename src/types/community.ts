import { z } from "zod";

// ==========================================
// EVENTS & TICKETS
// ==========================================

export const eventSchema = z.object({
 id: z.string().uuid(),
 store_id: z.string().uuid(),
 title: z.string().min(1, "O título é obrigatório"),
 category: z.string().default("shows"),
 description: z.string().nullable().optional(),
 event_date: z.string().datetime(),
 end_date: z.string().datetime().nullable().optional(),
 timezone: z.string().default("America/Sao_Paulo"),
 location: z.string().nullable().optional(),
 address: z.string().nullable().optional(),
 latitude: z.number().nullable().optional(),
 longitude: z.number().nullable().optional(),
 is_free: z.boolean().default(false),
 capacity: z.number().int().min(0).nullable().optional(),
 min_age: z.number().int().min(0).nullable().optional(),
 organizer_name: z.string().nullable().optional(),
 online_link: z.string().url().nullable().optional(),
 tags: z.array(z.string()).default([]),
 attributes: z.record(z.any()).default({}),
 status: z.enum(["draft", "published", "cancelled"]),
 cover_image: z.string().url().nullable().optional(),
 created_at: z.string().datetime(),
 updated_at: z.string().datetime(),
});

export type Event = z.infer<typeof eventSchema>;

// Schema para criação/edição (sem campos gerados pelo DB)
export const upsertEventSchema = eventSchema
 .omit({ id: true, store_id: true, created_at: true, updated_at: true })
 .partial()
 .extend({
 id: z.string().uuid().optional(),
 title: z.string().min(1, "O título é obrigatório"),
 category: z.string().default("shows"),
 event_date: z.string().min(1, "Data do evento é obrigatória"),
 status: z.enum(["draft", "published", "cancelled"]).default("draft"),
 });

export type UpsertEventInput = z.infer<typeof upsertEventSchema>;

export const ticketLotSchema = z.object({
 id: z.string().uuid(),
 event_id: z.string().uuid(),
 name: z.string().min(1, "O nome do lote é obrigatório"),
 price_cents: z.number().int().min(0),
 capacity: z.number().int().min(0),
 reserved_count: z.number().int().min(0),
 sold_count: z.number().int().min(0),
 start_time: z.string().datetime().nullable().optional(),
 end_time: z.string().datetime().nullable().optional(),
 status: z.enum(["active", "inactive", "sold_out"]),
 created_at: z.string().datetime(),
 updated_at: z.string().datetime(),
});

export type TicketLot = z.infer<typeof ticketLotSchema>;

export const ticketSchema = z.object({
 id: z.string().uuid(),
 event_id: z.string().uuid(),
 lot_id: z.string().uuid(),
 owner_profile_id: z.string().uuid(),
 order_id: z.string().uuid().nullable().optional(),
 status: z.enum(["valid", "used", "revoked"]),
 qr_hash: z.string().nullable().optional(),
 created_at: z.string().datetime(),
 updated_at: z.string().datetime(),
});

export type Ticket = z.infer<typeof ticketSchema>;

// ==========================================
// CLASSIFIEDS
// ==========================================

export const classifiedCategorySchema = z.enum([
 "job",
 "job_offer",
 "sale",
 "trade",
 "service",
 "real_estate",
 "vehicle",
 "event",
 "donation",
 "travel",
 "equipment",
]);

export type ClassifiedCategory = z.infer<typeof classifiedCategorySchema>;

export const classifiedConditionSchema = z.enum(["new", "used", "refurbished"]).nullable();

/** Mapa de labels de categoria para exibição */
export const CLASSIFIED_CATEGORY_LABELS: Record<ClassifiedCategory, string> = {
 job: "Vaga",
 job_offer: "Oferta de Trabalho",
 sale: "À Venda",
 trade: "Troca/Permuta",
 service: "Serviço",
 real_estate: "Imóvel",
 vehicle: "Veículo",
 event: "Evento",
 donation: "Doação",
 travel: "Viagem & Roteiro",
 equipment: "Aluguel de Equipamentos",
};

export const classifiedSchema = z.object({
 id: z.string().uuid(),
 author_profile_id: z.string().uuid(),
 store_id: z.string().uuid().nullable().optional(),
 category: classifiedCategorySchema,
 title: z.string().min(1, "Título é obrigatório"),
 content: z.string().min(1, "Conteúdo é obrigatório"),
 price_cents: z.number().int().min(0).nullable().optional(),
 images: z.array(z.string().url()).default([]),
 contact_whatsapp: z.string().nullable().optional(),
 location_text: z.string().nullable().optional(),
 expires_at: z.string().datetime().nullable().optional(),
 condition: classifiedConditionSchema.optional(),
 negotiable: z.boolean().default(true),
 attributes: z.record(z.any()).default({}),
 status: z.enum(["active", "resolved", "expired", "banned"]),
 created_at: z.string().datetime(),
 updated_at: z.string().datetime(),
});

export type Classified = z.infer<typeof classifiedSchema>;

// Schema para criação/edição
export const upsertClassifiedSchema = classifiedSchema
 .omit({ id: true, author_profile_id: true, created_at: true, updated_at: true })
 .partial()
 .extend({
 id: z.string().uuid().optional(),
 category: classifiedCategorySchema,
 title: z.string().min(1, "Título é obrigatório"),
 content: z.string().min(1, "Conteúdo é obrigatório"),
 status: z.enum(["active", "resolved", "expired", "banned"]).default("active"),
 });

export type UpsertClassifiedInput = z.infer<typeof upsertClassifiedSchema>;

/**
 * Blueprints de atributos dinâmicos por categoria.
 * Define quais campos extras o formulário deve solicitar
 * além dos campos canônicos do classified.
 */
export const CLASSIFIED_ATTRIBUTE_BLUEPRINTS: Record<
 ClassifiedCategory,
 Array<{
 key: string;
 label: string;
 type: "text" | "number" | "select" | "boolean";
 options?: string[];
 }>
> = {
 job: [
 { key: "company", label: "Empresa", type: "text" },
 {
 key: "work_model",
 label: "Modelo",
 type: "select",
 options: ["Presencial", "Remoto", "Híbrido"],
 },
 { key: "salary_range", label: "Faixa Salarial", type: "text" },
 ],
 job_offer: [
 { key: "company", label: "Empresa Ofertante", type: "text" },
 {
 key: "work_model",
 label: "Modelo",
 type: "select",
 options: ["Presencial", "Remoto", "Híbrido"],
 },
 { key: "deadline", label: "Prazo para Candidatura", type: "text" },
 ],
 sale: [
 { key: "brand", label: "Marca", type: "text" },
 { key: "model", label: "Modelo", type: "text" },
 ],
 trade: [{ key: "interested_in", label: "Aceito em Troca", type: "text" }],
 service: [
 { key: "specialty", label: "Especialidade", type: "text" },
 { key: "availability", label: "Disponibilidade", type: "text" },
 ],
 real_estate: [
 {
 key: "property_type",
 label: "Tipo",
 type: "select",
 options: ["Apartamento", "Casa", "Comercial", "Terreno", "Sítio"],
 },
 { key: "bedrooms", label: "Quartos", type: "number" },
 { key: "area_m2", label: "Área (m²)", type: "number" },
 { key: "is_furnished", label: "Mobiliado", type: "boolean" },
 ],
 vehicle: [
 { key: "brand", label: "Marca", type: "text" },
 { key: "model", label: "Modelo", type: "text" },
 { key: "year", label: "Ano", type: "number" },
 { key: "mileage_km", label: "Quilometragem", type: "number" },
 ],
 event: [
 { key: "event_date", label: "Data do Evento", type: "text" },
 { key: "venue", label: "Local", type: "text" },
 ],
 donation: [{ key: "pickup_location", label: "Local de Retirada", type: "text" }],
 travel: [
 { key: "destination", label: "Destino / Cidade", type: "text" },
 { key: "departure_date", label: "Data de Partida", type: "text" },
 { key: "duration_days", label: "Duração (dias)", type: "number" },
 ],
 equipment: [
 { key: "equipment_type", label: "Tipo de Equipamento", type: "text" },
 { key: "daily_rate", label: "Diária Estimada", type: "text" },
 ],
};

// ==========================================
// DIRECTORY (Yellow Pages)
// ==========================================

export const directoryListingSchema = z.object({
 id: z.string().uuid(),
 store_id: z.string().uuid(),
 category: z.string().min(1),
 address: z.string().nullable().optional(),
 latitude: z.number().nullable().optional(),
 longitude: z.number().nullable().optional(),
 contact_phone: z.string().nullable().optional(),
 working_hours: z.any().nullable().optional(), // JSONB — canonizado por WorkingHours type em store types
 is_verified: z.boolean(),
 status: z.enum(["active", "inactive"]),
 created_at: z.string().datetime(),
 updated_at: z.string().datetime(),
});

export type DirectoryListing = z.infer<typeof directoryListingSchema>;

// ==========================================
// THREADS-STYLE COMMUNITIES & GROUPS
// ==========================================

export const communityTypeSchema = z.enum([
  "general",
  "sales",
  "news",
  "videos",
  "events",
  "jobs",
]);
export type CommunityType = z.infer<typeof communityTypeSchema>;

export const communityCoverModeSchema = z.enum(["gradient", "image"]);
export type CommunityCoverMode = z.infer<typeof communityCoverModeSchema>;

export const communityGradientPresetSchema = z.enum([
  "blue-lime",
  "pink-cyan",
  "sunset",
  "cyberpunk",
  "obsidian",
]);
export type CommunityGradientPreset = z.infer<typeof communityGradientPresetSchema>;

export const communityPrivacySchema = z.enum(["public", "private", "secret"]);
export type CommunityPrivacy = z.infer<typeof communityPrivacySchema>;

export const communityRuleSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
});
export type CommunityRule = z.infer<typeof communityRuleSchema>;

export const communitySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2).max(60),
  title: z.string().min(2, "O título da comunidade deve ter pelo menos 2 caracteres"),
  description: z.string().default(""),
  community_type: communityTypeSchema.default("general"),
  cover_mode: communityCoverModeSchema.default("gradient"),
  cover_gradient_preset: communityGradientPresetSchema.default("blue-lime"),
  cover_image_url: z.string().url().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  privacy: communityPrivacySchema.default("public"),
  rules: z.array(communityRuleSchema).default([]),
  owner_id: z.string().uuid(),
  member_count: z.number().int().min(0).default(1),
  online_count: z.number().int().min(0).default(1),
  status: z.enum(["active", "suspended", "archived"]).default("active"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Community = z.infer<typeof communitySchema>;

export const upsertCommunitySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2, "O identificador deve ter pelo menos 2 caracteres")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "O identificador deve conter apenas letras minúsculas, números e hífens"),
  title: z.string().min(2, "O título da comunidade deve ter pelo menos 2 caracteres"),
  description: z.string().optional().default(""),
  community_type: communityTypeSchema.default("general"),
  cover_mode: communityCoverModeSchema.default("gradient"),
  cover_gradient_preset: communityGradientPresetSchema.default("blue-lime"),
  cover_image_url: z.string().url().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  privacy: communityPrivacySchema.default("public"),
  rules: z.array(communityRuleSchema).optional().default([]),
});
export type UpsertCommunityInput = z.infer<typeof upsertCommunitySchema>;

export const communityMemberRoleSchema = z.enum(["owner", "moderator", "member"]);
export type CommunityMemberRole = z.infer<typeof communityMemberRoleSchema>;

export const communityMemberSchema = z.object({
  community_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: communityMemberRoleSchema.default("member"),
  status: z.enum(["active", "pending", "banned"]).default("active"),
  joined_at: z.string().datetime(),
  profile: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      username: z.string().nullable().optional(),
      avatar_url: z.string().nullable().optional(),
    })
    .optional(),
});
export type CommunityMember = z.infer<typeof communityMemberSchema>;

export const COMMUNITY_TYPE_LABELS: Record<CommunityType, string> = {
  general: "Discussões Gerais",
  sales: "Vendas & Desapego",
  news: "Notícias & Mídia",
  videos: "Vídeos & Reels",
  events: "Eventos & Encontros",
  jobs: "Vagas & Oportunidades",
};

export interface CommunityGradientPresetConfig {
  id: CommunityGradientPreset;
  label: string;
  gradientClass: string;
  badgeBg: string;
}

export const COMMUNITY_GRADIENT_PRESETS: Record<
  CommunityGradientPreset,
  CommunityGradientPresetConfig
> = {
  "blue-lime": {
    id: "blue-lime",
    label: "Blue Lime (Threads Classic)",
    gradientClass: "from-sky-600 via-cyan-500 to-lime-500",
    badgeBg: "bg-emerald-950/40 text-emerald-300",
  },
  "pink-cyan": {
    id: "pink-cyan",
    label: "Pink Cyan (Vibrant)",
    gradientClass: "from-pink-500 via-fuchsia-500 to-cyan-500",
    badgeBg: "bg-fuchsia-950/40 text-fuchsia-300",
  },
  sunset: {
    id: "sunset",
    label: "Sunset Glow",
    gradientClass: "from-orange-500 via-red-500 to-amber-500",
    badgeBg: "bg-amber-950/40 text-amber-300",
  },
  cyberpunk: {
    id: "cyberpunk",
    label: "Neon Cyberpunk",
    gradientClass: "from-purple-500 via-pink-500 to-blue-500",
    badgeBg: "bg-purple-950/40 text-purple-300",
  },
  obsidian: {
    id: "obsidian",
    label: "Dark Obsidian",
    gradientClass: "from-zinc-900 via-zinc-800 to-zinc-700",
    badgeBg: "bg-zinc-900/60 text-zinc-300",
  },
};

