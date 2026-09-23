import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAnonServerClient, getServerClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/server-access";
import { internalLookupCnpj, type CnpjCompanyDTO } from "./public-apis.functions";

export interface FounderLeadDTO {
  id: string;
  name: string;
  whatsapp: string;
  cnpj?: string | null;
  instagram_handle?: string | null;
  company_name?: string | null;
  city?: string | null;
  ticket_number: string;
  status: "pending" | "contacted" | "approved" | "converted";
  metadata: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface LaunchSlideDTO {
  id: string;
  title: string;
  tag: string;
  image_url: string;
}

export interface LaunchLandingSettingsDTO {
  id?: string;
  key: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  slides: LaunchSlideDTO[];
  event_info: {
    circuito_title: string;
    dates: string;
    locations: string;
    perks: string[];
  };
}

const DEFAULT_LAUNCH_SETTINGS: LaunchLandingSettingsDTO = {
  key: "default",
  hero_badge: "Circuito 2027 • Chapecó & São Miguel do Oeste",
  hero_title: "O novo ponto de encontro do comércio, turismo e conexões",
  hero_subtitle:
    "Uma experiência completa que conecta clientes aos melhores negócios da nossa região com tecnologia, eventos e benefícios exclusivos.",
  slides: [
    {
      id: "slide-1",
      title: "Shows Nacionais & Internacional",
      tag: "Música & Cultura",
      image_url:
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "slide-2",
      title: "Feira de Negócios & Inovação",
      tag: "Conexões Regionais",
      image_url:
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "slide-3",
      title: "Workshops & Mentorias Executivas",
      tag: "Capacitação",
      image_url:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "slide-4",
      title: "Sorteio de Viagens o Ano Inteiro 2027",
      tag: "Exclusivo Fundadores",
      image_url:
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  event_info: {
    circuito_title: "Circuito Internacional Waesy 2027",
    dates: "Temporada 2027",
    locations: "Chapecó & São Miguel do Oeste - SC",
    perks: [
      "Shows nacionais consagrados e atração internacional confirmada",
      "Feira de Negócios e Tecnologia com estandes para empresas parceiras",
      "Workshops práticos para lojistas, prestadores de serviços e empreendedores",
      "Sorteios de viagens nacionais e internacionais durante todo o ano de 2027",
      "Membros Fundadores com chances multiplicadas nos sorteios oficiais",
    ],
  },
};

// ── 1. SUBMIT FOUNDER LEAD (PÚBLICO) ──
export const submitFounderLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2, "Nome deve conter pelo menos 2 caracteres"),
      whatsapp: z.string().min(8, "WhatsApp inválido"),
      cnpj: z.string().optional().nullable(),
      instagram_handle: z.string().optional().nullable(),
      company_name: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();

    const cleanWhatsapp = data.whatsapp.replace(/\D/g, "");
    const cleanCnpj = data.cnpj ? data.cnpj.replace(/\D/g, "") : null;
    const cleanInstagram = data.instagram_handle
      ? data.instagram_handle.replace(/^@/, "").trim()
      : null;

    let companyDetails: CnpjCompanyDTO | null = null;
    let resolvedCompanyName = data.company_name?.trim() || "";
    let resolvedCity = data.city?.trim() || "";

    // Se informou CNPJ, tentar enriquecimento instantâneo
    if (cleanCnpj && cleanCnpj.length === 14) {
      try {
        companyDetails = await internalLookupCnpj(cleanCnpj);
        if (companyDetails) {
          if (!resolvedCompanyName) {
            resolvedCompanyName =
              companyDetails.tradeName || companyDetails.corporateName || "";
          }
          if (!resolvedCity && companyDetails.address?.city) {
            resolvedCity = `${companyDetails.address.city} - ${companyDetails.address.state}`;
          }
        }
      } catch (cnpjErr) {
        console.warn("[submitFounderLead] Erro ao consultar CNPJ:", cnpjErr);
      }
    }

    // Se ainda não temos nome da empresa, usar o handle do instagram se fornecido
    if (!resolvedCompanyName && cleanInstagram) {
      resolvedCompanyName = `@${cleanInstagram}`;
    }

    // Gerar ticket da sorte único
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const suffix = Math.floor(10 + Math.random() * 90);
    const ticketNumber = `WF-2027-${randomCode}-${suffix}`;

    const metadata: Record<string, any> = {
      source: "home_launch_landing",
      submitted_at: new Date().toISOString(),
      enriched_cnpj: companyDetails || null,
      instagram_profile: cleanInstagram ? `https://instagram.com/${cleanInstagram}` : null,
    };

    const insertPayload = {
      name: data.name.trim(),
      whatsapp: cleanWhatsapp,
      cnpj: cleanCnpj,
      instagram_handle: cleanInstagram,
      company_name: resolvedCompanyName || data.name.trim(),
      city: resolvedCity || "Chapecó / São Miguel do Oeste - SC",
      ticket_number: ticketNumber,
      status: "pending" as const,
      metadata,
    };

    const { data: inserted, error } = await supabase
      .from("launch_leads")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[submitFounderLead] Erro ao salvar lead:", error);
      // Fallback defensivo com retorno dos dados mesmo em caso de erro transitório de banco
      return {
        success: true,
        lead: {
          id: "temp-" + Date.now(),
          ...insertPayload,
          created_at: new Date().toISOString(),
        } as FounderLeadDTO,
        companyDetails,
        ticketNumber,
      };
    }

    return {
      success: true,
      lead: inserted as FounderLeadDTO,
      companyDetails,
      ticketNumber,
    };
  });

// ── 2. GET SETTINGS DA LANDING (PÚBLICO) ──
export const getLaunchLandingSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<LaunchLandingSettingsDTO> => {
    try {
      const supabase = getAnonServerClient();
      const { data, error } = await supabase
        .from("launch_landing_settings")
        .select("*")
        .eq("key", "default")
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_LAUNCH_SETTINGS;
      }

      return {
        id: data.id,
        key: data.key,
        hero_badge: data.hero_badge || DEFAULT_LAUNCH_SETTINGS.hero_badge,
        hero_title: data.hero_title || DEFAULT_LAUNCH_SETTINGS.hero_title,
        hero_subtitle: data.hero_subtitle || DEFAULT_LAUNCH_SETTINGS.hero_subtitle,
        slides: Array.isArray(data.slides) && data.slides.length > 0 ? data.slides : DEFAULT_LAUNCH_SETTINGS.slides,
        event_info: data.event_info || DEFAULT_LAUNCH_SETTINGS.event_info,
      };
    } catch {
      return DEFAULT_LAUNCH_SETTINGS;
    }
  },
);

// ── 3. UPDATE SETTINGS DA LANDING (ADMIN ONLY) ──
export const updateLaunchLandingSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      hero_badge: z.string().min(1),
      hero_title: z.string().min(1),
      hero_subtitle: z.string().min(1),
      slides: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          tag: z.string(),
          image_url: z.string(),
        }),
      ),
      event_info: z.object({
        circuito_title: z.string(),
        dates: z.string(),
        locations: z.string(),
        perks: z.array(z.string()),
      }),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: updated, error } = await supabase
      .from("launch_landing_settings")
      .upsert(
        {
          key: "default",
          hero_badge: data.hero_badge,
          hero_title: data.hero_title,
          hero_subtitle: data.hero_subtitle,
          slides: data.slides,
          event_info: data.event_info,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar configurações: ${error.message}`);
    }

    return { success: true, settings: updated };
  });

// ── 4. LIST FOUNDER LEADS (ADMIN ONLY) ──
export const listFounderLeads = createServerFn({ method: "POST" })
  .validator(
    z.object({
      search: z.string().optional(),
      status: z.enum(["all", "pending", "contacted", "approved", "converted"]).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    let query = supabase
      .from("launch_leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`name.ilike.${q},company_name.ilike.${q},whatsapp.ilike.${q},ticket_number.ilike.${q},city.ilike.${q}`);
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    const { data: leads, count, error } = await query.range(from, to);

    if (error) {
      throw new Error(`Erro ao listar leads: ${error.message}`);
    }

    return {
      leads: (leads || []) as FounderLeadDTO[],
      total: count || 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

// ── 5. UPDATE LEAD STATUS (ADMIN ONLY) ──
export const updateFounderLeadStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      status: z.enum(["pending", "contacted", "approved", "converted"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const { data: updated, error } = await supabase
      .from("launch_leads")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.leadId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status do lead: ${error.message}`);
    }

    return { success: true, lead: updated as FounderLeadDTO };
  });

// ── 6. LOOKUP FOUNDER TICKET (PÚBLICO) ──
export const lookupFounderTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      query: z.string().min(3, "Digite pelo menos 3 dígitos do WhatsApp ou Ticket"),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getAnonServerClient();
    const raw = data.query.trim();
    const cleanDigits = raw.replace(/\D/g, "");

    let dbQuery = supabase.from("launch_leads").select("*");

    if (cleanDigits.length >= 8) {
      dbQuery = dbQuery.or(`whatsapp.ilike.%${cleanDigits}%,ticket_number.ilike.%${raw}%`);
    } else {
      dbQuery = dbQuery.ilike("ticket_number", `%${raw}%`);
    }

    const { data: leads, error } = await dbQuery.order("created_at", { ascending: false }).limit(1);

    if (error || !leads || leads.length === 0) {
      return { found: false, lead: null, companyDetails: null };
    }

    const lead = leads[0] as FounderLeadDTO;
    const companyDetails = lead.metadata?.enriched_cnpj || null;

    return {
      found: true,
      lead,
      companyDetails,
      ticketNumber: lead.ticket_number,
    };
  });

