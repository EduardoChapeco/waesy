/**
 * magic-onboarding.functions.ts — Motor de Onboarding Mágico com Crawler IA (Firecrawl/Steel)
 * 
 * Substitui formulários manuais extensos por ingestão autônoma da URL da empresa.
 * Raspa site/Instagram, extrai Missão, Tom de Voz e Catálogo base, populando a loja automaticamente.
 * Tarifado de forma segura e transparente via Token Tollbooth (300 Tokens).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";
import { extractContentMechanically } from "./mining/mechanical-extractor";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

export interface MagicOnboardingResult {
  company_name: string;
  category: string;
  bio: string;
  brand_voice: string;
  contact: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    address?: string;
  };
  suggested_products: Array<{
    name: string;
    description: string;
    price_cents: number;
    category?: string;
  }>;
  theme_colors?: {
    primary?: string;
    accent?: string;
  };
  products_created_count: number;
}

export const executeMagicOnboarding = createServerFn({ method: "POST" })
  .validator(
    z.object({
      url: z.string().url("URL do site ou Instagram inválida"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; result: MagicOnboardingResult; message: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = input.store_id || identity.store_id;

    if (!storeId) {
      throw new Error("Nenhuma loja selecionada para aplicar o Onboarding Mágico.");
    }

    const domain = new URL(input.url).hostname.replace("www.", "");

    // 1. Função Core de Extração e Síntese de Marca
    const processMagicCrawler = async (): Promise<MagicOnboardingResult> => {
      // A. Extração mecânica stealth resiliente
      const rawExtraction = await extractContentMechanically(input.url);

      const combinedText = [
        rawExtraction.title,
        rawExtraction.lead,
        rawExtraction.bodyText?.slice(0, 5000),
      ].filter(Boolean).join("\n\n");

      // B. Síntese com IA via Unified AI Call
      const systemPrompt = `Você é o Diretor de Branding e Onboarding da Waesy.
Sua missão é analisar o conteúdo extraído do site ou rede social de uma empresa e estruturar a identidade completa dela para o sistema de gestão.
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem comentários.`;

      const userPrompt = `Analise os dados extraídos da URL: ${input.url} (Domínio: ${domain})
Conteúdo coletado:
${combinedText.slice(0, 4500)}

Extraia e estruture no JSON rigoroso:
{
  "company_name": "Nome fantasia oficial da empresa",
  "category": "gastronomia|turismo|comercio|servicos|hospedagem|saude|automotivo|outros",
  "bio": "Bio comercial concisa e vendedora para o perfil público (máx 200 caracteres)",
  "brand_voice": "Tom de voz da marca (ex: acolhedor, sofisticado, alegre, executivo, tradicional)",
  "contact": {
    "whatsapp": "Número com DDD somente dígitos se encontrado (ex: 49999998888)",
    "phone": "Telefone fixo ou comercial",
    "email": "E-mail de atendimento",
    "city": "Cidade detectada ou ${getDefaultCity()}",
    "state": "${getDefaultState()}",
    "address": "Endereço físico se citado"
  },
  "suggested_products": [
    {
      "name": "Nome do produto ou serviço principal 1",
      "description": "Breve descrição atraente",
      "price_cents": 4900,
      "category": "Categoria do item"
    },
    {
      "name": "Nome do produto ou serviço 2",
      "description": "Breve descrição",
      "price_cents": 8900,
      "category": "Categoria do item"
    },
    {
      "name": "Nome do produto ou serviço 3",
      "description": "Breve descrição",
      "price_cents": 12000,
      "category": "Categoria do item"
    }
  ],
  "theme_colors": {
    "primary": "#0f172a",
    "accent": "#0284c7"
  }
}`;

      const aiRes = await executeUnifiedAiCall({
        systemPrompt,
        userPrompt,
        responseFormat: "json_object",
        temperature: 0.2,
      });

      const parsed = aiRes.parsedJson || (aiRes.content ? JSON.parse(aiRes.content) : {});

      // Fallback seguro de nome se a IA não extrair
      const companyName = parsed.company_name || domain.split(".")[0].toUpperCase();
      const category = parsed.category || "comercio";
      const bio = parsed.bio || `Empresa referência em ${companyName}. Qualidade e atendimento diferenciado.`;
      const brandVoice = parsed.brand_voice || "profissional e acolhedor";
      const contact = parsed.contact || {};
      const suggestedProducts = Array.isArray(parsed.suggested_products) ? parsed.suggested_products : [];

      // C. Popula a tabela stores atomicamente
      const { data: currentStore } = await supabase
        .from("stores")
        .select("settings")
        .eq("id", storeId)
        .single();

      const existingSettings = currentStore?.settings || {};
      const updatedSettings = {
        ...existingSettings,
        brand_voice: brandVoice,
        magic_onboarded_at: new Date().toISOString(),
        magic_onboarding_url: input.url,
        theme_colors: parsed.theme_colors || { primary: "#0f172a", accent: "#0284c7" },
      };

      await supabase
        .from("stores")
        .update({
          name: companyName,
          bio,
          city: contact.city || getDefaultCity(),
          state: contact.state || getDefaultState(),
          address: contact.address || null,
          phone: contact.phone || null,
          contact_whatsapp: contact.whatsapp || null,
          website: input.url,
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);

      // D. Popula catálogo base na tabela products
      let createdProducts = 0;
      if (suggestedProducts.length > 0) {
        for (const item of suggestedProducts.slice(0, 5)) {
          const { error: prodErr } = await supabase.from("products").insert({
            store_id: storeId,
            name: item.name,
            description: item.description || item.name,
            price_cents: Number(item.price_cents || 2900),
            is_active: true,
            status: "published",
            metadata: {
              source: "magic_onboarding_ai",
              category_name: item.category || category,
            },
          });
          if (!prodErr) createdProducts++;
        }
      }

      // E. Sincroniza directory_listings
      await supabase
        .from("directory_listings")
        .upsert(
          {
            store_id: storeId,
            title: companyName,
            description: bio,
            category,
            city: contact.city || getDefaultCity(),
            state: contact.state || getDefaultState(),
            address: contact.address || null,
            phone: contact.phone || contact.whatsapp || null,
            whatsapp: contact.whatsapp || null,
            website: input.url,
            is_active: true,
            is_verified: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      return {
        company_name: companyName,
        category,
        bio,
        brand_voice: brandVoice,
        contact,
        suggested_products: suggestedProducts,
        theme_colors: parsed.theme_colors,
        products_created_count: createdProducts,
      };
    };

    // 2. Interceptador Token Tollbooth (Tarifação Segura Pré-Voo com Auto-Refund)
    const { result, tollboothReceipt } = await requireTokensOrTollbooth({
      storeId,
      tokens: 300,
      actionType: "burn_magic_onboarding",
      serviceCategory: "magic_onboarding",
      description: `Onboarding Mágico via Crawler IA: ${domain}`,
      timeSavedMinutes: 240, // Economiza ~4 horas de cadastro manual de produtos e bio
      metadata: {
        target_url: input.url,
        domain,
      },
      executeAction: processMagicCrawler,
    });

    return {
      success: true,
      result,
      message: `Onboarding Mágico concluído com sucesso (-300 Tokens)! ${result.products_created_count} produtos cadastrados.`,
    };
  });
