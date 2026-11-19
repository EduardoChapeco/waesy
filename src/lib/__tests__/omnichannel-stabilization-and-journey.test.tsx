import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  isSyntheticPlaceholderEmail,
  isWeakOrSelfDisplayLabel,
  isWhatsAppChannelIdentifier,
  isWhatsAppGroupIdentifier,
  sanitizeCustomerEmail,
} from "@/lib/contact-sanitize";
import {
  classifyAttributionChannel,
  computeCustomerTouchpointJourney,
  mergeTouchpointWithFrequency,
} from "@/lib/attribution-journey";
import {
  createCoalescedController,
  patchThreadListOnMessageInsert,
  patchThreadListOnThreadUpdate,
} from "@/lib/chat-thread-realtime";
import { WhatsAppMarkdownText } from "@/components/atendimento/WhatsAppMarkdownText";
import { C360AttributionJourneyCard } from "@/components/chat/c360/C360AttributionJourneyCard";

describe("Omnichannel Stabilization, Multi-Touch Journey & Safe Markdown", () => {
  it("filtra 100% dos e-mails sinteticos e identifica grupos/canais com seguranca", () => {
    expect(isSyntheticPlaceholderEmail("atendimento+5549991571265@sem-email.waesy.local")).toBe(true);
    expect(isSyntheticPlaceholderEmail("5549991571265@whatsapp.waesy")).toBe(true);
    expect(isSyntheticPlaceholderEmail("120363012345@grupo.whatsapp.waesy")).toBe(true);
    expect(isSyntheticPlaceholderEmail("cliente@empresa.com.br")).toBe(false);

    expect(sanitizeCustomerEmail("atendimento+5549991571265@sem-email.waesy.local")).toBeNull();
    expect(sanitizeCustomerEmail("  Maria.Silva@Empresa.com  ")).toBe("Maria.Silva@Empresa.com");

    expect(isWhatsAppGroupIdentifier("120363012345678901@g.us")).toBe(true);
    expect(isWhatsAppGroupIdentifier("120363012345678901")).toBe(true);
    expect(isWhatsAppGroupIdentifier("+5549991571265")).toBe(false);
    expect(isWhatsAppChannelIdentifier("123456@newsletter")).toBe(true);
    expect(isWeakOrSelfDisplayLabel("Você")).toBe(true);
    expect(isWeakOrSelfDisplayLabel("Grupo VIP Cancún")).toBe(false);
  });

  it("preserva frequencia de cliques repetidos e consolida 1o toque, ultimo toque e cardinalidade multi-touch", () => {
    const t1 = "2026-11-10T10:00:00.000Z";
    const t2 = "2026-11-12T15:30:00.000Z";
    const t3 = "2026-11-14T18:45:00.000Z";

    let list = mergeTouchpointWithFrequency(
      [],
      {
        platform: "meta_ads",
        campaign_id: "camp-1",
        campaign_name: "Verão Floripa",
        ad_id: "ad-1",
        ad_name: "Criativo Vídeo A",
        ctwa_clid: "ctwa-111",
      },
      t1,
    );
    list = mergeTouchpointWithFrequency(
      list,
      {
        platform: "meta_ads",
        campaign_id: "camp-1",
        campaign_name: "Verão Floripa",
        ad_id: "ad-1",
        ad_name: "Criativo Vídeo A",
        ctwa_clid: "ctwa-222",
      },
      t2,
    );
    list = mergeTouchpointWithFrequency(
      list,
      {
        platform: "google_ads",
        campaign_id: "camp-2",
        campaign_name: "Search Cancún",
        ad_id: "ad-99",
        ad_name: "Texto Alta Intenção",
        gclid: "gclid-999",
      },
      t3,
    );

    expect(list.length).toBe(3);
    expect(Number(list[1].click_count)).toBe(2);

    const summary = computeCustomerTouchpointJourney(list);
    expect(summary.totalTouchpointsCount).toBe(3);
    expect(summary.totalClicksCount).toBe(4);
    expect(summary.uniqueCampaignsCount).toBe(2);
    expect(summary.uniqueAdsCount).toBe(2);
    expect(summary.firstTouch?.campaignName).toBe("Verão Floripa");
    expect(summary.lastTouch?.campaignName).toBe("Search Cancún");
    expect(summary.timeline.map((t) => t.channel)).toEqual([
      "Meta Click-to-WhatsApp",
      "Meta Click-to-WhatsApp",
      "Google Ads",
    ]);
    expect(classifyAttributionChannel({ ttclid: "tt-1" })).toBe("TikTok Ads");
  });

  it("coalesce bursts Realtime em janela >= 1500ms e mantem patch incremental seguro de grupo vs DM", async () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const ctrl = createCoalescedController(() => {
      calls.push(Date.now());
    }, 1500);

    ctrl.schedule(1500);
    ctrl.schedule(1500);
    ctrl.schedule(1500);
    expect(calls.length).toBe(0);

    await vi.advanceTimersByTimeAsync(1500);
    expect(calls.length).toBe(1);
    vi.useRealTimers();

    const initialThreads = [
      {
        id: "th-grp",
        is_group: true,
        thread_type: "group",
        status: "open",
        last_message: "Anterior",
        customer: { full_name: "Grupo Excursão" },
      },
      {
        id: "th-dm",
        is_group: false,
        thread_type: "store",
        status: "open",
        last_message: "Oi",
        customer: { full_name: "Evellyn" },
      },
    ];

    const afterWhisper = patchThreadListOnMessageInsert(
      initialThreads,
      { thread_id: "th-dm", message: "Nota privada equipe", is_staff_reply: true, created_at: "2026-11-16T12:00:00Z" },
      true,
    );
    expect(afterWhisper[0].id).toBe("th-dm");
    expect(afterWhisper[0].last_message).toBe("Oi");

    const afterGroupUpdate = patchThreadListOnThreadUpdate(initialThreads, {
      id: "th-grp",
      thread_type: "group",
      guest_name: "Evellyn",
      group_subject: "Grupo Excursão",
      last_message_text: "Nova msg grupo",
      last_message_at: "2026-11-16T12:05:00Z",
    });
    const grp = afterGroupUpdate.find((t) => t.id === "th-grp");
    expect(grp?.customer?.full_name).toBe("Grupo Excursão");
  });

  it("renderiza WhatsAppMarkdownText seguro sem HTML bruto e renderiza C360AttributionJourneyCard", () => {
    const markup = renderToStaticMarkup(
      React.createElement(WhatsAppMarkdownText, {
        text: "Olá *Maria*, confira _o roteiro_ ~antigo~ `PIX123` em https://waesy.com.br/app e ligue (49) 99988-7766 <script>alert(1)</script>",
      }),
    );
    expect(markup).toContain("<strong");
    expect(markup).toContain("Maria");
    expect(markup).toContain("<em");
    expect(markup).toContain("<s");
    expect(markup).toContain("<code");
    expect(markup).toContain('href="https://waesy.com.br/app"');
    expect(markup).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(markup).not.toContain("<script>");

    const cardMarkup = renderToStaticMarkup(
      React.createElement(C360AttributionJourneyCard, {
        attribution: { platform: "meta_ads", campaign: "Cancún 2026", ad_headline: "Resort All Inclusive", ctwa_clid: "clid-1" },
        touchpoints: [
          { ad_platform: "meta_ads", utm_campaign: "Topo Funil", ad_id: "ad-1", created_at: "2026-11-10T10:00:00Z" },
          { ad_platform: "meta_ads", utm_campaign: "Cancún 2026", ad_id: "ad-2", ctwa_clid: "clid-1", created_at: "2026-11-12T10:00:00Z" },
        ],
        pixelConversions: [{ id: "ev1", event_name: "Lead", status: "delivered" }],
        isEditingAttribution: false,
        isSavingAttribution: false,
        attrPlatform: "",
        attrUtmSource: "",
        attrUtmMedium: "",
        attrAdId: "",
        attrCampaign: "",
        attrHeadline: "",
        onToggleEditing: () => {},
        onChangePlatform: () => {},
        onChangeUtmSource: () => {},
        onChangeUtmMedium: () => {},
        onChangeAdId: () => {},
        onChangeCampaign: () => {},
        onChangeHeadline: () => {},
        onSaveAttribution: () => {},
      }),
    );
    expect(cardMarkup).toContain("1º Toque");
    expect(cardMarkup).toContain("Último Toque");
    expect(cardMarkup).toContain("2 campanhas");
    expect(cardMarkup).toContain("CAPI: Lead");
  });
});
