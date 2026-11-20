/**
 * whatsapp-ai-orchestrator.server.ts — Orquestrador Unificado de IA para Waesy Talk
 *
 * Conecta:
 * 1. Core Multinicho + Presets Turis (`src/lib/ai/niche-agent-engine.ts`)
 * 2. Contexto CRM 360 + Kanban (proposta enviada vs pendente + alerta interno)
 * 3. Contexto de Atribuição de Anúncio (Meta Ads / CTWA headline, campanha, anúncio)
 * 4. Sondagem Consultiva (4 As no Turismo) persistida em `leads_crm.sondagem_checklist`
 * 5. Execução real de Tools (Catálogo/Pacotes Turis, Políticas ANAC, Pedidos, PIX, Transbordo Humano)
 * 6. Síntese de Voz (TTS) opcional via Storage (`chat-media-private` signed URL)
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateSondagemChecklist,
  resolveSkillForInboundContext,
  type CoreAgentSkill,
  type SondagemChecklistResult,
} from "@/lib/ai/niche-agent-engine";
import { buildMultiNicheCopilotContextAndReply, type MultiNicheCopilotInsight } from "@/services/omnichannel-ai-copilot.server";
import {
  toolGetOrderStatus,
  toolGetTourismAviationPolicies,
  toolHandoffToHuman,
  toolLookupTourismPackages,
  toolSearchLiveGdsTravelQuote,
  toolCreateProposalDraftWeb,
  applyPromptInjectionFirewall,
  applyOutputDlpFirewall,
  type PackageItemResult,
} from "@/services/whatsapp-ai-agent-tools.server";
import { resolveUnifiedNicheId } from "@/lib/niches/niche-ssot";

export interface OrchestratedWhatsAppAiResult {
  replyText: string;
  skillUsed: CoreAgentSkill;
  sondagem: SondagemChecklistResult;
  copilotInsight: MultiNicheCopilotInsight;
  toolsExecuted: string[];
  handoffTriggered: boolean;
  crmProposalStatus: "sent" | "draft" | "none";
  missingProposalAlertTriggered: boolean;
  adAttributionContext: string | null;
}

export async function orchestrateWhatsAppAiReply(params: {
  db: SupabaseClient;
  storeId: string;
  threadId: string;
  phone: string;
  customerName?: string | null;
  latestMessageText: string;
  effectiveAgentSlug?: string | null;
  intent: string;
  threadMeta: Record<string, any>;
  threadAttribution?: Record<string, any> | null;
}): Promise<OrchestratedWhatsAppAiResult> {
  const { db, storeId, threadId, phone, latestMessageText, effectiveAgentSlug, intent, threadMeta, threadAttribution } = params;
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  const suffix8 = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : "";

  // 0. Firewall Anti-Prompt-Injection & Defesa Ativa (Camada 1 & 4)
  const firewall = applyPromptInjectionFirewall(latestMessageText);
  if (!firewall.isSafe) {
    await db.from("integration_connector_events").insert({
      store_id: storeId,
      provider: "security_firewall",
      action: "prompt_injection_blocked",
      outcome: "error",
      error_code: "JAILBREAK_ATTEMPT_FLAGGED",
      duration_ms: 1,
    }).then(() => null, () => null);

    return {
      replyText: "Compreendi seu contato. Para sua segurança e privacidade, nossa equipe de consultores especializados assumirá a conversa para te auxiliar diretamente.",
      skillUsed: {
        slug: "security_guardian",
        name: "Guardião de Segurança",
        niche: "general",
        category: "triage",
        objective: "Proteger o canal contra tentativas de prompt injection e encaminhar ao consultor humano.",
        systemPrompt: "",
        openingQuestions: [],
        guardrails: [],
        recommendedTools: [],
      },
      sondagem: {
        nicheId: "general",
        pillars: [],
        completedCount: 0,
        totalCount: 0,
        completionPct: 100,
        nextMissingPillar: null,
      },
      copilotInsight: {
        buyerIntent: "cold",
        sdrScore: 0,
        nicheId: "general",
        detectedObjections: ["Tentativa de injeção ou extração de instrução bloqueada."],
        recommendedNextStep: "Intervenção humana de segurança",
        suggestedReply: "Compreendi seu contato. Para sua segurança e privacidade, nossa equipe de consultores especializados assumirá a conversa para te auxiliar diretamente.",
        catalogMatchTitle: null,
        aiProviderUsed: "security_firewall",
        generatedAt: new Date().toISOString(),
      },
      toolsExecuted: ["prompt_injection_firewall"],
      handoffTriggered: true,
      crmProposalStatus: "none",
      missingProposalAlertTriggered: false,
      adAttributionContext: null,
    };
  }

  // 1. Resolve nicho da loja, leads vinculados, propostas no Kanban e status pós-venda
  const [storeRes, leadsRes, recentMsgsRes] = await Promise.all([
    db.from("stores").select("name, primary_niche_id, slug, ai_knowledge_base, settings").eq("id", storeId).maybeSingle(),
    suffix8
      ? db
          .from("leads_crm")
          .select("id, full_name, status, pipeline_stage, kanban_stage_key, sondagem_checklist, custom_fields, customer_id, created_at")
          .eq("store_id", storeId)
          .ilike("phone", `%${suffix8}%`)
          .order("updated_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as any[] }),
    db
      .from("chat_messages")
      .select("message, is_staff_reply, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const store = storeRes.data as any;
  const nicheId = resolveUnifiedNicheId(store?.primary_niche_id || "general");
  const primaryLead = (leadsRes.data || [])[0] || null;

  // Verifica se já existe proposta enviada no CRM/Kanban para este lead
  let crmProposalStatus: "sent" | "draft" | "none" = "none";
  if (primaryLead?.id) {
    const { data: proposals } = await db
      .from("travel_proposals")
      .select("id, status, title, destination_city, public_token")
      .eq("store_id", storeId)
      .eq("lead_id", primaryLead.id)
      .order("updated_at", { ascending: false })
      .limit(3);
    if (proposals && proposals.length > 0) {
      crmProposalStatus = proposals.some((p: any) => p.status === "sent" || p.status === "approved")
        ? "sent"
        : "draft";
    }
  }

  // Verifica se o cliente já é pós-venda (viagem confirmada / pedido ganho)
  const isPostSaleCustomer =
    primaryLead?.status === "won" ||
    primaryLead?.pipeline_stage === "won" ||
    Boolean(threadMeta?.is_post_sale_customer);

  // 2. Avalia Sondagem 4 As (ou equivalente do nicho) sobre histórico real
  const customerTranscript = [
    ...(recentMsgsRes.data || [])
      .filter((m: any) => !m.is_staff_reply && typeof m.message === "string")
      .reverse()
      .map((m: any) => m.message),
    latestMessageText,
  ].join("\n");

  const sondagem = evaluateSondagemChecklist({
    nicheId,
    transcriptText: customerTranscript,
    existingChecklist: (primaryLead?.sondagem_checklist as any) || (threadMeta?.sondagem_checklist as any) || null,
  });

  // Persiste progresso da Sondagem em leads_crm para o operador visualizar no Customer 360 / Kanban
  if (primaryLead?.id) {
    const checklistMap: Record<string, { completed: boolean; snippet: string | null }> = {};
    for (const p of sondagem.pillars) {
      checklistMap[p.key] = { completed: p.completed, snippet: p.extractedSnippet };
    }
    await db
      .from("leads_crm")
      .update({ sondagem_checklist: checklistMap, updated_at: new Date().toISOString() })
      .eq("id", primaryLead.id)
      .eq("store_id", storeId)
      .then(() => null, () => null);
  }

  // 3. Resolve Skill Canônica (Core + Preset Turis)
  const skillUsed = resolveSkillForInboundContext({
    nicheId,
    agentSlug: effectiveAgentSlug,
    intent,
    hasSentProposal: crmProposalStatus === "sent",
    isPostSaleCustomer,
  });

  // 4. Monta contexto de Anúncio / Campanha (CTWA / Meta Ads / UTM)
  const attr = (threadAttribution && typeof threadAttribution === "object" ? threadAttribution : {}) as Record<string, any>;
  const adParts = [
    attr.ad_headline ? `Título do anúncio: "${attr.ad_headline}"` : null,
    attr.ad_name ? `Anúncio: ${attr.ad_name}` : null,
    attr.campaign_name || attr.utm_campaign ? `Campanha: ${attr.campaign_name || attr.utm_campaign}` : null,
    attr.source_platform || attr.utm_source ? `Origem: ${attr.source_platform || attr.utm_source}` : null,
  ].filter(Boolean);
  const adAttributionContext = adParts.length > 0 ? adParts.join(" | ") : null;

  // 5. Execução real de Tools baseada em intenção e nicho
  const toolsExecuted: string[] = [];
  const toolSnippets: string[] = [];
  let handoffTriggered = false;

  const normalizedMsg = latestMessageText.toLowerCase();
  if (nicheId === "tourism" && (intent === "quote_request" || /(cotar|cota[cç][aã]o|pacote|excurs|grupo|roteiro|viagem|voo|hotel|passagem|pre[cç]o|valor|destino)/i.test(normalizedMsg))) {
    try {
      const pkgRes = await toolLookupTourismPackages({
        storeId,
        query: latestMessageText.slice(0, 120),
        limit: 3,
      });
      toolsExecuted.push("lookup_tourism_packages");
      const packagesList: PackageItemResult[] = Array.isArray(pkgRes)
        ? pkgRes
        : Array.isArray((pkgRes as any)?.packages)
          ? (pkgRes as any).packages
          : [];
      if (packagesList.length > 0) {
        const lines = packagesList.map(
          (p: PackageItemResult) => `- ${p.title} (${p.destination || "Roteiro"}): ${p.priceDisplay}${p.installmentTerms ? ` | ${p.installmentTerms}` : ""}`,
        );
        toolSnippets.push(`Pacotes/Grupos ativos encontrados no catálogo:\n${lines.join("\n")}`);
      }
    } catch {
      // fallback silencioso
    }

    // Cotação GDS em Tempo Real (InfoTravel & Wooba) com proteção de cota por telefone
    try {
      const destPillar = sondagem.pillars?.find((p: any) => p.key === "ambiente" || p.key === "destination");
      const candidateDestination = destPillar?.extractedSnippet || latestMessageText.slice(0, 60);
      const liveGds = await toolSearchLiveGdsTravelQuote({
        storeId,
        phone: phoneDigits || "anon",
        destination: candidateDestination,
        category: normalizedMsg.includes("hotel")
          ? "hotels"
          : normalizedMsg.includes("voo") || normalizedMsg.includes("passagem")
            ? "flights"
            : "packages",
        adults: 2,
      });
      toolsExecuted.push("search_live_gds_travel_quote");
      if (liveGds.options.length > 0) {
        const gdsLines = liveGds.options.map(
          (o) => `- [${o.badge}] ${o.title} (${o.destination}): ${o.priceDisplay} (Inclui: ${o.includes.slice(0, 3).join(", ")})`,
        );
        toolSnippets.push(`Cotações GDS InfoTravel/Wooba em tempo real:\n${gdsLines.join("\n")}\nAviso: ${liveGds.providerNotice}`);

        // Se o cliente solicitar proposta formal ou sondagem estiver madura (>= 75%) sem proposta enviada, gera link interativo /proposta/:token
        if (
          /(gerar proposta|enviar proposta|link da proposta|mandar proposta|formalizar proposta)/i.test(normalizedMsg) ||
          (sondagem.completionPct >= 75 && crmProposalStatus === "none")
        ) {
          const topOption = liveGds.options[0];
          const draftWeb = await toolCreateProposalDraftWeb({
            storeId,
            customerName: params.customerName || primaryLead?.full_name || "Viajante",
            customerPhone: phoneDigits,
            destination: topOption.destination,
            totalPriceCents: topOption.priceCents,
            packageTitle: topOption.title,
            notes: `Cotação automática em tempo real (${topOption.badge}) — Inclui: ${topOption.includes.join(", ")}.`,
          });
          if (draftWeb.success) {
            toolsExecuted.push("create_proposal_draft_web");
            crmProposalStatus = "sent";
            toolSnippets.push(
              `Proposta interativa gerada automaticamente no Proposal Studio! Envie este link para o cliente visualizar fotos, roteiro, PDF e aprovar online: ${draftWeb.proposalUrl}`,
            );
          }
        }
      }
    } catch {
      // fallback silencioso
    }
  }

  if (nicheId === "tourism" && /(bagagem|anac|cancelamento|reembolso|remarca|check-?in|passaporte|menor|autoriza[cç][aã]o|atraso)/i.test(normalizedMsg)) {
    try {
      const policy = toolGetTourismAviationPolicies();
      toolsExecuted.push("get_tourism_aviation_policies");
      const matched = policy.policies.find((p) =>
        normalizedMsg.includes("bagagem")
          ? p.topic.toLowerCase().includes("bagagem")
          : normalizedMsg.includes("cancel") || normalizedMsg.includes("reembols")
            ? p.topic.toLowerCase().includes("cancelamento")
            : normalizedMsg.includes("atraso")
              ? p.topic.toLowerCase().includes("atraso")
              : p.topic.toLowerCase().includes("parcelamento"),
      ) || policy.policies[0];
      if (matched) {
        toolSnippets.push(`Política oficial ANAC (${matched.topic}): ${matched.rules[0]} ${matched.importantNotice}`);
      }
    } catch {
      // fallback silencioso
    }
  }

  if (/(pedido|rastreio|entrega|compra|status)/i.test(normalizedMsg) && phoneDigits.length >= 8) {
    try {
      const ord = await toolGetOrderStatus({ storeId, customerPhone: phoneDigits });
      toolsExecuted.push("check_order_status");
      if (ord.orders && ord.orders.length > 0) {
        toolSnippets.push(
          `Pedidos encontrados: ${ord.orders.map((o: any) => `${o.displayId} (${o.statusLabel}, ${o.totalDisplay})`).join("; ")}`,
        );
      }
    } catch {
      // fallback silencioso
    }
  }

  // Alerta de Lead "Sem Proposta" quando cliente já conversou (sondagem >= 50%) e cobra orçamento sem proposta criada
  let missingProposalAlertTriggered = false;
  if (
    crmProposalStatus === "none" &&
    sondagem.completionPct >= 50 &&
    /(proposta|or[cç]amento|cotou|cota[cç][aã]o|aguardando|demor|cad[eê]|valor)/i.test(normalizedMsg)
  ) {
    missingProposalAlertTriggered = true;
    await db.from("chat_messages").insert({
      thread_id: threadId,
      message: `[ALERTA IA — SEM PROPOSTA NO KANBAN]: Cliente já informou ${sondagem.completedCount}/${sondagem.totalCount} pilares da sondagem e aguarda envio de proposta.`,
      message_type: "system_event",
      is_staff_reply: true,
      payload: {
        is_whisper: true,
        ai_alert: "missing_proposal",
        lead_id: primaryLead?.id || null,
        sondagem_pct: sondagem.completionPct,
      },
    }).then(() => null, () => null);
  }

  // Emergência em viagem / escalada crítica
  if (/(emerg[eê]ncia|voo cancelado|perdi o voo|overbooking|preso no aeroporto|urgente)/i.test(normalizedMsg)) {
    await toolHandoffToHuman({
      storeId,
      threadId,
      targetDepartment: "suporte_emergencia",
      priority: "urgent",
      summaryReason: `Emergência detectada pela IA na mensagem: "${latestMessageText.slice(0, 140)}"`,
    });
    toolsExecuted.push("handoff_to_human");
    handoffTriggered = true;
  }

  // 6. Invoca motor Copilot multinicho enriquecido com diretiva da Skill, Anúncio, Sondagem e Tools
  const enrichedPrompt = [
    latestMessageText,
    `\n[CONTEXTO INTERNO PARA A IA — NÃO EXPOR LITERALMENTE]`,
    `Skill Ativa: ${skillUsed.name} (${skillUsed.slug})`,
    `Diretriz da Skill: ${skillUsed.systemPrompt}`,
    adAttributionContext ? `Origem do Anúncio: ${adAttributionContext}` : null,
    `Status Proposta CRM: ${crmProposalStatus === "sent" ? "PROPOSTA JÁ ENVIADA" : crmProposalStatus === "draft" ? "RASCUNHO EM PREPARO" : "NENHUMA PROPOSTA ENVIADA AINDA"}`,
    `Sondagem (${sondagem.completedCount}/${sondagem.totalCount}): ${sondagem.pillars.map((p) => `${p.label}=${p.completed ? "OK" : "FALTA"}`).join(", ")}`,
    sondagem.nextMissingPillar ? `Próximo pilar faltante (faça no máximo 1 pergunta leve sobre isto): ${sondagem.nextMissingPillar.label} (${sondagem.nextMissingPillar.hint})` : "Sondagem completa: valide o resumo e encaminhe para emissão/proposta.",
    store?.slug ? `Link do App Próprio da empresa: https://waesy.com.br/app/${store.slug}` : null,
    toolSnippets.length > 0 ? `Dados consultados em tempo real:\n${toolSnippets.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const copilotInsight = await buildMultiNicheCopilotContextAndReply({
    db,
    storeId,
    threadId,
    latestMessageText: enrichedPrompt,
    persistToThread: false,
  });

  const rawReplyText = handoffTriggered
    ? "Entendi a urgência! Já acionei nossa equipe humana de suporte prioritário com todo o contexto aqui para te ajudar imediatamente."
    : copilotInsight.suggestedReply;
  const replyText = applyOutputDlpFirewall(rawReplyText);

  return {
    replyText,
    skillUsed,
    sondagem,
    copilotInsight,
    toolsExecuted,
    handoffTriggered,
    crmProposalStatus,
    missingProposalAlertTriggered,
    adAttributionContext,
  };
}

/**
 * Faz upload seguro de áudio base64/Buffer no bucket privado `chat-media-private`
 * e retorna URL assinada compatível com Meta Cloud API e Evolution API v2.
 */
export async function uploadVoiceAudioToPrivateStorage(params: {
  db: SupabaseClient;
  storeId: string;
  audioDataUriOrBuffer: string | Uint8Array;
  mimeType?: string;
}): Promise<{ signedUrl: string; storagePath: string } | null> {
  try {
    let bytes: Uint8Array;
    let resolvedMime = params.mimeType || "audio/mpeg";
    if (typeof params.audioDataUriOrBuffer === "string") {
      const match = params.audioDataUriOrBuffer.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        resolvedMime = match[1] || resolvedMime;
        bytes = Buffer.from(match[2], "base64");
      } else {
        bytes = Buffer.from(params.audioDataUriOrBuffer, "base64");
      }
    } else {
      bytes = params.audioDataUriOrBuffer;
    }

    const ext = resolvedMime.includes("ogg") || resolvedMime.includes("opus") ? "ogg" : "mp3";
    const storagePath = `${params.storeId}/tts/${randomUUID()}.${ext}`;
    const { error: uploadErr } = await params.db.storage
      .from("chat-media-private")
      .upload(storagePath, bytes, {
        contentType: resolvedMime,
        upsert: false,
      });

    if (uploadErr) {
      console.warn("[whatsapp-ai-orchestrator] Falha ao subir áudio TTS no storage:", uploadErr.message);
      return null;
    }

    const { data: signedData, error: signErr } = await params.db.storage
      .from("chat-media-private")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 dias

    if (signErr || !signedData?.signedUrl) {
      return null;
    }

    return { signedUrl: signedData.signedUrl, storagePath };
  } catch (err) {
    console.warn("[whatsapp-ai-orchestrator] Exceção no upload de áudio TTS:", err);
    return null;
  }
}
