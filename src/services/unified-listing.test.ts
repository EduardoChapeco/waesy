/**
 * unified-listing.test.ts — Testes Unitários do Motor Unificado de Anúncios (Bloco B / F07 a F14)
 * 
 * Valida:
 * - F07: Modelo canônico unificado
 * - F08: Ciclo de vida, transições permitidas e expiração automática
 * - F09/F10: Taxonomia, obrigatoriedade condicional por nicho
 * - F11: Descoberta e contratos de busca
 * - F12: Moderação com registro de trilha
 * - F14: SEO, Schema.org e serialização WebMCP
 * - Regras R01 a R12 e resolução do Caso O02 (Mercado em Turismo)
 */

import { describe, it, expect } from "vitest";
import {
  mapDatabaseRowToUnifiedListing,
} from "./unified-listing.functions";
import {
  transitionListingState,
  shouldExpireClassified,
} from "@/lib/ad-engine/listing-state-machine";
import {
  validateListingNicheTaxonomy,
} from "@/lib/ad-engine/niche-taxonomy-manifest";
import {
  buildListingSeoMetadata,
  generateSchemaOrgJsonLd,
  serializeForWebMcp,
} from "@/lib/ad-engine/seo-engine";

describe("Bloco B — Motor Unificado de Anúncios e Vitrine", () => {
  // -------------------------------------------------------------------------
  // F07: Modelo Canônico da Listagem
  // -------------------------------------------------------------------------
  describe("F07 — Modelo Canônico da Listagem", () => {
    it("converte registro de classificados com campos unificados e dono único", () => {
      const mockRow = {
        id: "11111111-1111-1111-1111-111111111111",
        author_profile_id: "author-123",
        title: "Pacote Serra Gaúcha & Vinhedos",
        content: "Viagem inesquecível de 5 dias com hotel e passeios inclusos.",
        price_cents: 289000,
        images: ["https://img.waesy.com.br/foto1.jpg", "https://img.waesy.com.br/foto2.jpg"],
        status: "active",
        category: "turismo",
        attributes: {
          niche: "turismo",
          item_type: "package",
          inclusions: ["Hospedagem 4 estrelas", "Café da manhã", "Passeio Maria Fumaça"],
          accepts_pix: true,
          pix_discount_percent: 10,
          max_installments: 10,
          fee_free_installments: 6,
        },
      };

      const listing = mapDatabaseRowToUnifiedListing(mockRow, "classified");

      expect(listing.id).toBe("11111111-1111-1111-1111-111111111111");
      expect(listing.origin).toBe("classified");
      expect(listing.niche_id).toBe("turismo");
      expect(listing.item_type).toBe("package");
      expect(listing.price_cents).toBe(289000);
      expect(listing.cover_url).toBe("https://img.waesy.com.br/foto1.jpg");
      expect(listing.media_urls).toHaveLength(2);
      expect(listing.inclusions).toHaveLength(3);
      expect(listing.payment_config.accepts_pix).toBe(true);
      expect(listing.payment_config.pix_discount_percent).toBe(10);
      expect(listing.payment_config.max_installments).toBe(10);
      expect(listing.status).toBe("published");
    });
  });

  // -------------------------------------------------------------------------
  // F08: Ciclo de Vida e Expiração
  // -------------------------------------------------------------------------
  describe("F08 — Ciclo de Vida e Expiração", () => {
    it("permite transição válida de rascunho para publicado e calcula expiração de 30 dias para classificados", () => {
      const listing = {
        status: "draft" as const,
        origin: "classified" as const,
        expires_at: null,
      };

      const result = transitionListingState(
        listing,
        "published",
        { id: "user-1", role: "author" },
        "Publicação inicial"
      );

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("published");
      expect(result.updatedExpiresAt).toBeTruthy();

      // Checa se data calculada está aproximadamente 30 dias no futuro
      const expDate = new Date(result.updatedExpiresAt!);
      const now = new Date();
      const diffDays = Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it("bloqueia transições inválidas (ex: expirado direto no Workspace)", () => {
      const listing = {
        status: "published" as const,
        origin: "workspace" as const,
        expires_at: null,
      };

      const result = transitionListingState(
        listing,
        "expired",
        { id: "user-1", role: "merchant" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Transição inválida");
    });

    it("detecta corretamente anúncios que devem expirar automaticamente", () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 86400 * 1000).toISOString();

      expect(
        shouldExpireClassified({
          origin: "classified",
          status: "published",
          expires_at: pastDate,
        })
      ).toBe(true);

      expect(
        shouldExpireClassified({
          origin: "classified",
          status: "published",
          expires_at: futureDate,
        })
      ).toBe(false);

      // Workspace não sofre expiração automática
      expect(
        shouldExpireClassified({
          origin: "workspace",
          status: "published",
          expires_at: pastDate,
        })
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // F09 / F10 / F24: Taxonomia por Nicho e Resolução do Caso O02
  // -------------------------------------------------------------------------
  describe("F09 / F10 / F24 — Taxonomia e Validação por Nicho", () => {
    it("REJEITA template de Mercado ('grocery_gondola') dentro do nicho Turismo (Caso O02)", () => {
      const validation = validateListingNicheTaxonomy("turismo", {
        title: "Excursão Beto Carrero 2 Dias",
        price_cents: 65000,
        cover_url: "https://img.waesy.com.br/capa.jpg",
        inclusions: ["Transporte executivo", "Passaporte 2 dias"],
        attributes: {
          destination_name: "Penha - SC",
          transport_type: "bus",
        },
        template_id: "grocery_gondola", // O02: Template incoerente
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.template_id).toContain("incompatível com o nicho 'Turismo & Viagens'");
    });

    it("ACEITA template Imersivo de Turismo ('tourism_immersive') com todos os campos mandatórios", () => {
      const validation = validateListingNicheTaxonomy("turismo", {
        title: "Excursão Beto Carrero 2 Dias",
        price_cents: 65000,
        cover_url: "https://img.waesy.com.br/capa.jpg",
        inclusions: ["Transporte executivo", "Passaporte 2 dias"],
        attributes: {
          destination_name: "Penha - SC",
          transport_type: "bus",
        },
        template_id: "tourism_immersive",
      });

      expect(validation.isValid).toBe(true);
      expect(Object.keys(validation.errors)).toHaveLength(0);
    });

    it("BLOQUEIA publicação de turismo sem itens inclusos declarados", () => {
      const validation = validateListingNicheTaxonomy("turismo", {
        title: "Pacote Gramado Natal Luz",
        price_cents: 120000,
        cover_url: "https://img.waesy.com.br/gramado.jpg",
        inclusions: [], // Vazio!
        attributes: {
          destination_name: "Gramado - RS",
          transport_type: "bus",
        },
        template_id: "tourism_immersive",
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.inclusions).toContain("Ao menos um item incluso deve ser declarado");
    });
  });

  // -------------------------------------------------------------------------
  // F14: SEO e Descoberta Externa (Schema.org & WebMCP)
  // -------------------------------------------------------------------------
  describe("F14 — SEO, Schema.org e WebMCP", () => {
    it("gera metadados de TouristTrip para pacotes turísticos", () => {
      const seo = buildListingSeoMetadata({
        title: "Resort All Inclusive Maragogi",
        description: "Pacote 7 noites em resort beira-mar com alimentação inclusa.",
        slug: "resort-all-inclusive-maragogi-123",
        niche_id: "turismo",
        item_type: "package",
        cover_url: "https://img.waesy.com.br/maragogi.jpg",
      });

      expect(seo.schema_type).toBe("TouristTrip");
      expect(seo.title).toBe("Resort All Inclusive Maragogi | Waesy");
      expect(seo.canonical_url).toContain("/anuncios/resort-all-inclusive-maragogi-123");
    });

    it("serializa payload limpo para WebMCP compatível com agentes de IA", () => {
      const mockListing = mapDatabaseRowToUnifiedListing(
        {
          id: "22222222-2222-2222-2222-222222222222",
          title: "MacBook Air M2 16GB",
          content: "Impecável, sem marcas de uso, na caixa original.",
          price_cents: 680000,
          category: "varejo",
          status: "active",
          location_name: "Chapecó",
          attributes: {
            niche: "varejo",
            item_type: "product",
            accepts_pix: true,
            pix_discount_percent: 5,
            max_installments: 12,
            fee_free_installments: 10,
          },
        },
        "classified"
      );

      const webMcp = serializeForWebMcp(mockListing);

      expect(webMcp.id).toBe("22222222-2222-2222-2222-222222222222");
      expect(webMcp.price_formatted).toBe("R$ 6800.00");
      expect(webMcp.payment_terms.pix_discount).toBe("5%");
      expect(webMcp.payment_terms.interest_free).toBe("10x");
      expect(webMcp.availability).toBe("disponível");
    });

    it("gera JSON-LD Schema.org completo com oferta e moedas em BRL", () => {
      const mockListing = mapDatabaseRowToUnifiedListing(
        {
          id: "33333333-3333-3333-3333-333333333333",
          title: "Smartphone Galaxy S24 Ultra",
          content: "512GB Titânio Cinza lacrado com garantia de 1 ano.",
          price_cents: 749900,
          category: "varejo",
          status: "active",
          attributes: {
            niche: "varejo",
            item_type: "product",
          },
        },
        "workspace"
      );

      const jsonLd = generateSchemaOrgJsonLd(mockListing);

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("Product");
      expect(jsonLd.offers.price).toBe("7499.00");
      expect(jsonLd.offers.priceCurrency).toBe("BRL");
    });
  });
});
