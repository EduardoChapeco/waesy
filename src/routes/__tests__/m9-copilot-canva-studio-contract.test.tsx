import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

const { createSmartModuleMock } = vi.hoisted(() => ({
  createSmartModuleMock: (overrides: Record<string, any> = {}) =>
    new Proxy(overrides, {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "default") return overrides.default ?? target;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as any];
        return ({ children, ...props }: any) =>
          React.createElement("span", { "data-icon": String(prop), ...props }, children);
      },
      has(target, prop) {
        if (prop === "__esModule" || prop === "default" || prop in target) return true;
        return typeof prop === "string";
      },
    }),
}));

vi.mock("lucide-react", () => createSmartModuleMock());
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: typeof to === "string" ? to : "#", ...props }, children),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/hooks/use-mobile", () => ({
  useWindowSizeClass: () => ({ isCompact: false, sizeClass: "expanded" }),
  useIsMobile: () => false,
}));
vi.mock("@/lib/pdf-export", () => ({
  exportElementAsImage: vi.fn(),
  exportElementAsPdf: vi.fn(),
}));
vi.mock("@/components/navigation/native-mobile-header", () => ({
  NativeMobileHeader: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "native-mobile-header" }, title),
}));

import {
  detectIntent,
  isExplicitCreationOrBuilderPrompt,
} from "@/services/ai-conversations.functions";
import {
  CANVA_TEMPLATE_CATEGORIES,
  CANVA_STUDIO_TEMPLATES,
  CANVA_BUILDER_ELEMENTS,
  extractCreativePostSpecFromPrompt,
} from "@/lib/builder/canva-post-templates";
import { buildSocialPostPayload } from "@/services/builder-copilot-bridge";
import { formatMoney } from "@/lib/money";
import { StructuredMessageView } from "@/components/chat/structured-message-view";
import { ArtifactCreativePost } from "@/components/chat/artifacts/ArtifactCreativePost";
import { CopilotArtifactPanel } from "@/components/chat/copilot-artifact-panel";
import { AIChatShell } from "@/components/chat/ai-chat-shell";

describe("M9 — Waesy Copilot Estúdio Canva, Dual-Sidebar & E2E Intent/Money Contract", () => {
  it("roteia prompt real de Story de viagem para creative_post e extrai especificações 9:16 sem genéricos", () => {
    const promptUser =
      'Super ofertas para você aproveitar e garantir sua viagem com descontos exclusivos por tempo limitado...) confira as oferta.. foramto story (algo como all inclusive por menos de 5mil por pessoa]';

    expect(isExplicitCreationOrBuilderPrompt(promptUser)).toBe(true);
    expect(isExplicitCreationOrBuilderPrompt("algo all inclusive por menos de 5mil por pessoa", {
      last_intent: "creative_post",
    })).toBe(true);

    expect(detectIntent(promptUser)).toBe("creative_post");
    expect(
      detectIntent("algo all inclusive por menos de 5mil por pessoa", {
        last_intent: "creative_post",
      }),
    ).toBe("creative_post");

    const spec = extractCreativePostSpecFromPrompt(promptUser, {}, {}, { city: "São Miguel do Oeste" });
    expect(spec.format).toBe("story");
    expect(spec.aspectRatio).toBe("9:16");
    expect(spec.archetype).toBe("travel");
    expect(spec.themeId).toBe("gold");
    expect(spec.headline).not.toBe("Super Oferta da Semana no Waesy!");
    expect(spec.offerPrice).toContain("5.000");

    const bridgePayload = buildSocialPostPayload(spec.headline, promptUser);
    expect(bridgePayload.format).toBe("story");
    expect(bridgePayload.aspectRatio).toBe("9:16");
    expect(bridgePayload.archetype).toBe("travel");
    expect(bridgePayload.themeId).toBe("gold");
    expect(bridgePayload.offerPrice).toContain("5.000");
    expect(bridgePayload.caption).not.toContain("Super Oferta da Semana no Waesy!");
  });

  it("preserva roteamento legítimo quando NÃO é fluxo explícito de criação", () => {
    expect(isExplicitCreationOrBuilderPrompt("Quero um roteiro de viagem de 3 dias para Blumenau")).toBe(false);
    expect(detectIntent("Quero um roteiro de viagem de 3 dias para Blumenau")).toBe("travel_itinerary");

    expect(isExplicitCreationOrBuilderPrompt("Onde fica o hotel mais próximo do centro?")).toBe(false);
    expect(detectIntent("Onde fica o hotel mais próximo do centro?")).toBe("search_places");

    expect(isExplicitCreationOrBuilderPrompt("Crie uma apresentação de slides de turismo")).toBe(true);
    expect(detectIntent("Crie uma apresentação de slides de turismo")).toBe("presentation_deck");
  });

  it("formata valores monetários em centavos sem dupla divisão (/ 100) em blocos do chat", () => {
    expect(formatMoney(245800)).toContain("2.458,00");

    const html = renderToStaticMarkup(
      <StructuredMessageView
        isStaff
        payload={{
          blocks: [
            {
              type: "travel_itinerary",
              data: {
                destination: "São Miguel do Oeste",
                duration_days: 3,
                passengers_count: 2,
                estimated_budget_cents: 245800,
                days: [{ day: 1, title: "Chegada", activities: ["Check-in"] }],
              },
            },
            {
              type: "proposal_card",
              data: {
                proposal_id: "prop-1",
                title: "Campanha Turística",
                total_cents: 450000,
              },
            },
            {
              type: "financial_entry",
              data: {
                entry_id: "fin-1",
                description: "Pacote All Inclusive",
                amount_cents: 9950,
              },
            },
            {
              type: "mobility_quote",
              data: {
                origin_address: "Centro",
                destination_address: "Aeroporto",
                distance_km: 5,
                quotes: [
                  {
                    service_type: "ride_car",
                    label: "Carro Privado",
                    estimated_price_cents: 1850,
                  },
                ],
              },
            },
          ],
        }}
      />,
    );

    expect(html).toContain("2.458,00");
    expect(html).not.toContain("24,58");
    expect(html).toContain("4.500,00");
    expect(html).not.toContain("45,00");
    expect(html).toContain("99,50");
    expect(html).toContain("18,50");
  });

  it("renderiza preview visual HTML/CSS real em CreativeAdPreviewBlock e ArtifactCreativePost no formato Story 9:16", () => {
    const inlineHtml = renderToStaticMarkup(
      <StructuredMessageView
        isStaff
        payload={{
          blocks: [
            {
              type: "creative_ad_preview",
              data: {
                artifact_id: "art-story-916",
                title: "All Inclusive até R$ 5.000 por Pessoa",
                headline: "All Inclusive até R$ 5.000 por Pessoa",
                subheadline: "Descontos exclusivos por tempo limitado para embarcar ainda este ano",
                format: "story",
                aspect_ratio: "9:16",
                theme_id: "gold",
                archetype: "travel",
                offer_badge: "Por Tempo Limitado",
                offer_price: "R$ 4.990",
                installments: "por pessoa • All Inclusive",
                cta_label: "Conferir Ofertas",
                store_name: "Excelência Tour",
              },
            },
          ],
        }}
      />,
    );

    expect(inlineHtml).toContain("Story (9:16)");
    expect(inlineHtml).toContain("All Inclusive até R$ 5.000 por Pessoa");
    expect(inlineHtml).toContain("R$ 4.990");
    expect(inlineHtml).toContain("Abrir no Estúdio");
    expect(inlineHtml).toContain("PNG");
    expect(inlineHtml).toContain("aspect-9/16");

    const panelHtml = renderToStaticMarkup(
      <CopilotArtifactPanel
        onClose={() => {}}
        artifact={{
          id: "art-story-916",
          type: "creative_post",
          title: "All Inclusive Resort",
          version: 1,
          data: {
            format: "story",
            aspectRatio: "9:16",
            archetype: "travel",
            themeId: "gold",
            destination: "Caribe",
            headline: "All Inclusive até R$ 5.000 por Pessoa",
            subheadline: "Descontos exclusivos por tempo limitado",
            offerPrice: "Até R$ 5.000",
            installments: "por pessoa",
            ctaText: "Conferir Ofertas",
            storeName: "Excelência Tour",
          },
        }}
      />,
    );

    expect(panelHtml).toContain("Estúdio Criativo Multiformato");
    expect(panelHtml).toContain("Até R$ 5.000");
    expect(panelHtml).toContain("Baixar PNG");
    expect(panelHtml).toContain("Exportar PDF");
    expect(panelHtml).toContain("aspect-9/16");
    expect(panelHtml).not.toContain("Dossiê de Viagem");

    const studioDirectHtml = renderToStaticMarkup(
      <ArtifactCreativePost
        title="Story Turístico"
        format="story"
        aspectRatio="9:16"
        archetype="travel"
        themeId="gold"
        offerPrice="Até R$ 5.000"
        installments="por pessoa"
      />,
    );
    expect(studioDirectHtml).toContain("aspect-9/16");
    expect(studioDirectHtml).toContain("Até R$ 5.000");
  });

  it("renderiza Dual-Sidebar (Coluna 1A + Coluna 1B) no AIChatShell e catalogo completo Canva Studio", () => {
    expect(CANVA_TEMPLATE_CATEGORIES.length).toBeGreaterThanOrEqual(5);
    expect(CANVA_STUDIO_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(CANVA_BUILDER_ELEMENTS.length).toBeGreaterThanOrEqual(5);

    const shellHtml = renderToStaticMarkup(
      <AIChatShell
        mode="workspace"
        threads={[
          {
            id: "00000000-0000-0000-0000-000000000001",
            type: "ai_assistant",
            title: "Campanha Turismo Story",
          },
        ]}
        activeThreadId="00000000-0000-0000-0000-000000000001"
        messages={[]}
        onSelectThread={() => {}}
        onSendMessage={async () => {}}
      />,
    );

    expect(shellHtml).toContain('aria-label="Módulos principais do Copilot"');
    expect(shellHtml).toContain("Canva");
    expect(shellHtml).toContain("Builders");
    expect(shellHtml).toContain("Skills");
    expect(shellHtml).toContain("Tarefas");
    expect(shellHtml).toContain("Chats");
  });

  it("elimina formatMoney(... / 100) em structured-message-view e protege creation intents na BFF", () => {
    const viewSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/chat/structured-message-view.tsx"),
      "utf-8",
    );
    const bffSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/ai-conversations.functions.ts"),
      "utf-8",
    );

    expect(viewSource).not.toMatch(/formatMoney\([^)]*\/\s*100/);
    expect(bffSource).not.toMatch(/formatMoney\([^)]*\/\s*100/);
    expect(bffSource).toContain("isCreationOrBuilderIntent");
    expect(bffSource).toContain('updatedMemory.last_intent = "creative_post"');
    expect(bffSource).toContain("!isCreationOrBuilderIntent && platformSearch");
  });
});
