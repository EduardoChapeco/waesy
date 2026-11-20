import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  computeHumanTypingDelayMs,
  detectWhatsAppOptOut,
  evaluateSondagemChecklist,
  getDefaultFollowUpCadenceForNiche,
  listSkillsForNiche,
  resolveSkillForInboundContext,
  splitReplyIntoHumanChunks,
} from "@/lib/ai/niche-agent-engine";
import { isOutsideSupportSchedule } from "@/services/whatsapp-automation-runtime.server";

describe("Phase 2 — Wave 2: Unified WhatsApp AI Engine (Core Multiniche + Turis Presets)", () => {
  const rootDir = process.cwd();

  it("loads specialized Turis skills preset for tourism niche and generic Core skills for other verticals", () => {
    const turisSkills = listSkillsForNiche("tourism");
    expect(turisSkills.map((s) => s.slug)).toContain("turis_triagem_objecao");
    expect(turisSkills.map((s) => s.slug)).toContain("turis_sondagem_4as");
    expect(turisSkills.map((s) => s.slug)).toContain("turis_recuperacao_curiosidade");
    expect(turisSkills.map((s) => s.slug)).toContain("turis_matchmaker_consultivo");
    expect(turisSkills.map((s) => s.slug)).toContain("turis_pos_venda_anti_ansiedade");

    const triage = resolveSkillForInboundContext({
      nicheId: "tourism",
      intent: "general_inquiry",
      hasSentProposal: false,
      isPostSaleCustomer: false,
    });
    expect(triage.slug).toBe("turis_triagem_objecao");

    const sondagem = resolveSkillForInboundContext({
      nicheId: "tourism",
      intent: "quote_request",
      hasSentProposal: false,
      isPostSaleCustomer: false,
    });
    expect(sondagem.slug).toBe("turis_sondagem_4as");

    const followUp = resolveSkillForInboundContext({
      nicheId: "tourism",
      intent: "general_inquiry",
      hasSentProposal: true,
      isPostSaleCustomer: false,
    });
    expect(followUp.slug).toBe("turis_recuperacao_curiosidade");

    const postSale = resolveSkillForInboundContext({
      nicheId: "tourism",
      intent: "support_issue",
      hasSentProposal: true,
      isPostSaleCustomer: true,
    });
    expect(postSale.slug).toBe("turis_pos_venda_anti_ansiedade");
  });

  it("accurately detects explicit Opt-Out phrases without false positives on normal travel qualification", () => {
    expect(detectWhatsAppOptOut("SAIR").isOptOut).toBe(true);
    expect(detectWhatsAppOptOut("Agradeço a atenção mas não quero mais receber propostas").isOptOut).toBe(true);
    expect(detectWhatsAppOptOut("Não quero mais viajar, obrigado").isOptOut).toBe(true);
    expect(detectWhatsAppOptOut("Por favor pare de me mandar mensagens").isOptOut).toBe(true);

    // Must NOT trigger opt-out on normal customer sentences
    expect(detectWhatsAppOptOut("Ainda não sei a data exata da viagem para Gramado").isOptOut).toBe(false);
    expect(detectWhatsAppOptOut("Não quero hotel muito longe da praia, prefiro resort").isOptOut).toBe(false);
    expect(detectWhatsAppOptOut("Quero viajar em julho com minha esposa e 2 filhos").isOptOut).toBe(false);
  });

  it("evaluates Sondagem 4 As checklist progressively without forgetting previously answered pillars", () => {
    const step1 = evaluateSondagemChecklist({
      nicheId: "tourism",
      transcriptText: "Oi! Quero ir para Gramado saindo de Chapecó em julho.",
    });
    expect(step1.pillars.find((p) => p.key === "aonde")?.completed).toBe(true);
    expect(step1.pillars.find((p) => p.key === "agenda")?.completed).toBe(true);
    expect(step1.pillars.find((p) => p.key === "acompanhantes")?.completed).toBe(false);
    expect(step1.nextMissingPillar?.key).toBe("acompanhantes");

    const persisted = Object.fromEntries(
      step1.pillars.map((p) => [p.key, { completed: p.completed, snippet: p.extractedSnippet }]),
    );

    const step2 = evaluateSondagemChecklist({
      nicheId: "tourism",
      transcriptText: "Seremos casal e 2 crianças, queremos um hotel confortável até 8 mil reais.",
      existingChecklist: persisted,
    });
    expect(step2.completedCount).toBe(4);
    expect(step2.completionPct).toBe(100);
    expect(step2.nextMissingPillar).toBeNull();
  });

  it("splits long replies into natural human chunks and calculates realistic typing delays", () => {
    const longReply = [
      "Que ótimo que vocês estão planejando conhecer Gramado em julho! É uma época linda na Serra Gaúcha.",
      "Como vocês vão em casal com 2 crianças saindo de Chapecó, temos tanto a opção do nosso grupo rodoviário premium quanto pacote com aéreo e traslado privativo.",
      "Você prefere que eu te mande primeiro a proposta do grupo terrestre ou a opção com voo?",
    ].join("\n\n");

    const chunks = splitReplyIntoHumanChunks(longReply, 180, 3);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toContain("Gramado em julho");
    expect(computeHumanTypingDelayMs(chunks[0])).toBeGreaterThanOrEqual(1200);
    expect(computeHumanTypingDelayMs(chunks[0])).toBeLessThanOrEqual(4500);

    const cadence = getDefaultFollowUpCadenceForNiche("tourism");
    expect(cadence.length).toBe(3);
    expect(cadence[2].stage).toBe("no_reply_breakup");
  });

  it("evaluates business hours in America/Sao_Paulo timezone instead of UTC", () => {
    const schedules = [{ day: "Segunda a Sexta", hours: "08:00 às 18:00", active: true }];
    // 2026-11-19T19:30:00Z is 16:30 BRT (Thursday inside 08:00-18:00 BRT, even though 19:30 UTC is > 18:00!)
    const insideBrtButOutsideUtc = new Date("2026-11-19T19:30:00.000Z");
    expect(isOutsideSupportSchedule(schedules, insideBrtButOutsideUtc, "America/Sao_Paulo")).toBe(false);

    // 2026-11-19T23:00:00Z is 20:00 BRT (outside 08:00-18:00 BRT)
    const outsideBrt = new Date("2026-11-19T23:00:00.000Z");
    expect(isOutsideSupportSchedule(schedules, outsideBrt, "America/Sao_Paulo")).toBe(true);
  });

  it("verifies audio transcript piping, opt-out outbox guard, and atomic takeover re-check in source", () => {
    const metaWebhook = fs.readFileSync(path.join(rootDir, "src/routes/api.webhooks.whatsapp.ts"), "utf8");
    const evoWebhook = fs.readFileSync(path.join(rootDir, "src/services/whatsapp-provider-webhook.server.ts"), "utf8");
    const workerSrc = fs.readFileSync(path.join(rootDir, "src/services/whatsapp-outbox.worker.ts"), "utf8");
    const runtimeSrc = fs.readFileSync(path.join(rootDir, "src/services/whatsapp-automation-runtime.server.ts"), "utf8");

    expect(metaWebhook).toContain("__waesyTranscript");
    expect(evoWebhook).toContain("transcribed_from_audio: true");
    expect(workerSrc).toContain("OPT_OUT_SUPPRESSED");
    expect(workerSrc).toContain("sendWhatsAppPresence");
    expect(runtimeSrc).toContain("orchestrateWhatsAppAiReply");
    expect(runtimeSrc).toContain("freshMeta.handoff_mode === \"human_active\"");
  });
});
