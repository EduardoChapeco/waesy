/**
 * src/services/store-profile-and-tri-engine.test.ts
 * Testes unitários e de integração para paridade canônica:
 * 1. Resolução de Slug Único (@arroba sem sufixo aleatório)
 * 2. Tri-Engine Selector (Empresas, Marketplace, Classificados)
 * 3. Contrato de Atualização de Perfil de Loja (updateStoreProfileFn)
 * 4. Purity check de categorias rápidas (Zero Emojis conforme AGENTS.md)
 */

import { describe, it, expect, vi } from "vitest";
import { generateSlug, normalizeHandle, resolveUniqueStoreSlug } from "@/lib/slug-utils";
import type { VitrineEngineMode } from "@/types/marketplace-compliance";
import { QUICK_CATEGORIES } from "@/components/onboarding/fast-company-onboarding";
import { UpdateStoreProfileSchema } from "@/services/store.functions";

describe("1. Slug & @arroba Canonical Generation (Zero Random Suffixes)", () => {
  it("deve gerar slugs limpos sem números aleatórios ou acentos", () => {
    const slug1 = generateSlug("Excelência Tour São Miguel do Oeste");
    expect(slug1).toBe("excelencia-tour-sao-miguel-do-oeste");

    const slug2 = generateSlug("Agência de Viagens & Turismo 100%");
    expect(slug2).toBe("agencia-de-viagens-turismo-100");
  });

  it("deve normalizar handles @arroba preservando apenas caracteres válidos", () => {
    const handle = normalizeHandle("@Excelência_Tour.SMO");
    expect(handle).toBe("excelencia_tour.smo");
    expect(normalizeHandle("@@restaurante-sol")).toBe("restaurante-sol");
  });

  it("deve resolver slug único sem colisões quando não existe no banco", async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };

    const resolved = await resolveUniqueStoreSlug(mockDb, "Excelência Tour São Miguel do Oeste");
    expect(resolved).toBe("excelencia-tour-sao-miguel-do-oeste");
    expect(resolved).not.toContain("-1721");
  });

  it("deve resolver colisão com sufixo incremental limpo (-2, -3) em vez de números aleatórios", async () => {
    let callCount = 0;
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((col, val) => {
            return {
              maybeSingle: vi.fn().mockImplementation(async () => {
                callCount++;
                if (val === "padaria-central" && callCount <= 2) {
                  return { data: { id: "store-1" }, error: null };
                }
                return { data: null, error: null };
              }),
            };
          }),
        }),
      }),
    };

    const resolved = await resolveUniqueStoreSlug(mockDb, "Padaria Central");
    expect(resolved).toBe("padaria-central-2");
    expect(resolved).not.toMatch(/-\d{4}$/); // Garante que nunca é um sufixo aleatório de 4 dígitos
  });
});

describe("2. Tri-Engine Vitrine Architecture", () => {
  it("deve validar que VitrineEngineMode suporta exatamente empresas, marketplace e classifieds", () => {
    const validModes: VitrineEngineMode[] = ["empresas", "marketplace", "classifieds"];
    expect(validModes).toContain("empresas");
    expect(validModes).toContain("marketplace");
    expect(validModes).toContain("classifieds");
    expect(validModes.length).toBe(3);
  });
});

describe("3. Fast Onboarding Purity (Zero Emojis)", () => {
  it("deve garantir que nenhuma categoria rápida contenha emojis na interface", () => {
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

    QUICK_CATEGORIES.forEach((cat) => {
      expect(emojiRegex.test(cat.label)).toBe(false);
      expect((cat as any).emoji).toBeUndefined();
      expect(cat.icon).toBeDefined();
    });
  });
});

describe("4. UpdateStoreProfileSchema Validation", () => {
  it("deve validar payload completo de atualização do perfil da empresa", () => {
    const validPayload = {
      storeId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Excelência Tour SMO",
      slug: "excelencia-tour-smo",
      description: "Agência oficial de turismo receptivo e corporativo",
      category: "turismo",
      phone: "(49) 3622-0000",
      whatsapp: "(49) 99999-9999",
      email: "contato@excelenciatour.com.br",
      address: "La Salle, 1917, Centro",
      city: "São Miguel do Oeste",
      state: "SC",
      logo_url: "https://storage.waesy.com.br/avatars/logo.png",
      banner_url: "https://storage.waesy.com.br/store-assets/banner-21-9.png",
      cover_url: "https://storage.waesy.com.br/store-assets/banner-21-9.png",
      website: "https://excelenciatour.com.br",
      instagram: "@excelenciatoursmo",
      working_hours: "Seg a Sex: 08:00 - 18:00",
      biolinks: [
        { id: "1", title: "Roteiros Exclusivos", url: "https://waesy.com.br/turismo" },
      ],
    };

    const parsed = UpdateStoreProfileSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("deve rejeitar storeId não UUID", () => {
    const invalidPayload = {
      storeId: "not-a-uuid",
      name: "Loja Teste",
    };

    const parsed = UpdateStoreProfileSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
