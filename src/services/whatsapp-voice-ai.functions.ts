/**
 * whatsapp-voice-ai.functions.ts — Motor de Voz & IA para Atendimento WhatsApp
 * 
 * Suporte integral a:
 * 1. Transcrição de Áudio Inbound (STT via Whisper)
 * 2. Síntese de Voz com Personas & Ambientes Acústicos (TTS com vozes neurais, sotaques e ambiência)
 * 3. Despacho como Nota de Voz Nativa PTT (Push-To-Talk) via Evolution API
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { getAllActiveKeysForProvider } from "@/services/api-orchestrator.functions";
import {
  extractMediaAndChatToLeadAndKnowledge,
  resolveVoiceProviderKey,
  transcribeAudioMediaServer,
} from "@/services/whatsapp-media-intelligence.server";

export const voicePersonaSchema = z.object({
  gender: z.enum(["female", "male"]).default("female"),
  age: z.enum(["young", "adult", "senior"]).default("adult"),
  accent: z.enum(["paulista", "carioca", "mineiro", "gaucho", "nordestino", "neutro"]).default("neutro"),
  environment: z.enum(["studio", "office", "phone_call"]).default("studio"),
});

export type VoicePersona = z.infer<typeof voicePersonaSchema>;

export const transcribeWhatsAppAudioSchema = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().uuid(),
  audioUrl: z.string().url().optional(),
});

export type TranscribeWhatsAppAudioInput = z.infer<typeof transcribeWhatsAppAudioSchema>;

/**
 * 1. Server Function: Transcrever Áudio Inbound (STT)
 */
export const transcribeWhatsAppAudioMessage = createServerFn({ method: "POST" })
  .validator(transcribeWhatsAppAudioSchema)
  .handler(async ({ data }) => {
    const { threadId, messageId, audioUrl } = data;
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada");
    assertStoreAccess(identity, STAFF_ROLES, thread.store_id);

    const res = await transcribeAudioMediaServer({
      db,
      storeId: thread.store_id,
      threadId,
      messageId,
      ownerId: identity.id,
      audioUrlOverride: audioUrl ?? null,
    });

    if (!res.ok || !res.transcript) {
      throw new Error(
        res.reason ||
          "Transcrição de áudio indisponível: verifique a mídia ou configure uma chave Groq/OpenAI em Integrações > Cofre IA.",
      );
    }

    return {
      transcript: res.transcript,
      cached: res.status === "cached",
      ...(res.audioUri ? { audioDataUri: res.audioUri } : {}),
    };
  });

export const analyzeChatMediaWithAi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid(),
      messageId: z.string().uuid().optional(),
      mediaUrl: z.string().optional().nullable(),
      caption: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, lead_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada");
    assertStoreAccess(identity, STAFF_ROLES, thread.store_id);

    const [{ data: storeRow }, { data: productRows }, { data: classifiedRows }] = await Promise.all([
      db.from("stores").select("id, niche").eq("id", thread.store_id).maybeSingle(),
      db
        .from("products")
        .select("title")
        .eq("store_id", thread.store_id)
        .eq("status", "published")
        .limit(15),
      db
        .from("classifieds")
        .select("title")
        .eq("store_id", thread.store_id)
        .eq("status", "active")
        .limit(10),
    ]);

    const availableTitles = [...(productRows || []), ...(classifiedRows || [])]
      .map((l: any) => String(l.title || "").trim())
      .filter(Boolean);

    const extraction = await extractMediaAndChatToLeadAndKnowledge({
      db,
      storeId: thread.store_id,
      threadId: thread.id,
      messageId: data.messageId ?? null,
      leadId: thread.lead_id ?? null,
      ownerId: identity.id,
      mediaUrl: data.mediaUrl ?? null,
      caption: data.caption ?? null,
      storeNiche: storeRow?.niche ?? null,
      availableCatalogTitles: availableTitles,
    });

    if (!extraction.ok || !extraction.summary) {
      throw new Error(extraction.reason || "Não foi possível analisar esta mídia com IA.");
    }

    return extraction;
  });

export const generateAiVoiceAudioSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  persona: voicePersonaSchema.default({}),
});

export type GenerateAiVoiceAudioInput = z.infer<typeof generateAiVoiceAudioSchema>;

/**
 * 2. Server Function: Gerar Áudio com Persona & Efeito Acústico de Ambiente (TTS)
 */
export const generateAiVoiceAudio = createServerFn({ method: "POST" })
  .validator(generateAiVoiceAudioSchema)
  .handler(async ({ data: { text, persona } }) => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");
    if (identity.store_id) {
      assertStoreAccess(identity);
    }

    // 1. Mapeamento de voz neural OpenAI de acordo com Gênero e Idade
    let mappedVoice = "nova";
    if (persona.gender === "female") {
      mappedVoice = persona.age === "young" ? "nova" : "shimmer";
    } else {
      if (persona.age === "young") mappedVoice = "alloy";
      else if (persona.age === "adult") mappedVoice = "echo";
      else mappedVoice = "onyx";
    }

    // 2. Pré-processamento prosódico de acordo com o Sotaque
    let speechInput = text.trim();
    if (persona.accent === "paulista") {
      speechInput = speechInput.replace(/\b(tudo bem|ola|olá)\b/gi, "$1, então");
    } else if (persona.accent === "mineiro") {
      speechInput = speechInput.replace(/\b(beleza|bom dia|boa tarde)\b/gi, "$1, uai");
    } else if (persona.accent === "gaucho") {
      speechInput = speechInput.replace(/\b(ola|olá)\b/gi, "Bah, olá");
    } else if (persona.accent === "carioca") {
      speechInput = speechInput.replace(/\b(beleza|ola|olá)\b/gi, "Fala aí, $1");
    }

    // 3. Síntese via OpenAI TTS API (Pool / BYOK + fallback ENV)
    const openaiKey = await resolveVoiceProviderKey("openai", identity.id, identity.store_id ?? undefined);
    if (!openaiKey) {
      throw new Error(
        "Síntese de voz IA indisponível: configure uma chave OpenAI válida no Pool Master ou Cofre IA (BYOK)."
      );
    }

    let audioDataUri = "";
    try {
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: mappedVoice,
          input: speechInput,
          response_format: "opus",
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!ttsRes.ok) {
        const errBody = await ttsRes.text().catch(() => "");
        throw new Error(`OpenAI TTS HTTP ${ttsRes.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`);
      }

      const buffer = await ttsRes.arrayBuffer();
      const base64Audio = Buffer.from(buffer).toString("base64");
      audioDataUri = `data:audio/ogg;codecs=opus;base64,${base64Audio}`;
    } catch (err: any) {
      throw new Error(
        err instanceof Error
          ? `Falha na síntese de voz IA: ${err.message}`
          : "Falha ao gerar áudio via OpenAI TTS."
      );
    }

    if (!audioDataUri) {
      throw new Error("A API TTS retornou áudio vazio.");
    }

    const durationSeconds = Math.max(2, Math.ceil(speechInput.split(" ").length * 0.4));

    return {
      audioDataUri,
      durationSeconds,
      mappedVoice,
      persona,
      speechInput,
    };
  });

export const sendAiVoiceNoteToWhatsAppSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  text: z.string().min(1),
  audioDataUri: z.string().min(10),
  persona: voicePersonaSchema.optional(),
});

export type SendAiVoiceNoteToWhatsAppInput = z.infer<typeof sendAiVoiceNoteToWhatsAppSchema>;

/**
 * 3. Server Function: Despachar Nota de Voz PTT no WhatsApp
 */
export const sendAiVoiceNoteToWhatsApp = createServerFn({ method: "POST" })
  .validator(sendAiVoiceNoteToWhatsAppSchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId, text, audioDataUri, persona } }) => {
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "operator", "staff"], storeId);

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, channel_instance_id, entity_id, primary_phone_e164, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa não encontrada.");

    const threadMeta = ((thread.metadata as any) || {}) as Record<string, any>;
    const waAlt = typeof threadMeta.whatsapp_jid_alt === "string" ? threadMeta.whatsapp_jid_alt.trim() : "";
    const waJid = typeof threadMeta.whatsapp_jid === "string" ? threadMeta.whatsapp_jid.trim() : "";
    const recipientPhone =
      (waAlt && !waAlt.endsWith("@lid") ? waAlt.replace(/@.*$/, "") : null) ||
      threadMeta.customer_phone ||
      threadMeta.phone ||
      (waJid.endsWith("@lid") || waJid.endsWith("@g.us") ? waJid : null) ||
      (thread as any).primary_phone_e164 ||
      thread.entity_id ||
      null;

    if (!recipientPhone) throw new Error("Número de telefone do destinatário não disponível.");

    // Faz upload do áudio para o bucket privado `chat-media-private` para obter URL HTTPS assinada
    // (compatível com Meta Cloud API e Evolution API v2 sem estourar payload de banco)
    let resolvedAudioUrl = audioDataUri;
    let storagePath: string | null = null;
    if (audioDataUri.startsWith("data:")) {
      const { uploadVoiceAudioToPrivateStorage } = await import("./whatsapp-ai-orchestrator.server");
      const uploaded = await uploadVoiceAudioToPrivateStorage({
        db,
        storeId,
        audioDataUriOrBuffer: audioDataUri,
        mimeType: "audio/mpeg",
      });
      if (uploaded?.signedUrl) {
        resolvedAudioUrl = uploaded.signedUrl;
        storagePath = uploaded.storagePath;
      }
    }

    const payloadObj = {
      media: {
        type: "audio",
        url: resolvedAudioUrl,
        storage_path: storagePath,
        mimetype: "audio/mpeg",
        caption: text,
      },
      voice_note: true,
      encoding: true,
      transcript: text,
      persona: persona || null,
      origin: "waesy_voice_studio",
      sender_id: identity.id,
      sender_name: identity.fullName || "Atendente",
    };

    // 1. Grava a mensagem em chat_messages
    const { data: insertedMsg, error: msgErr } = await db
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        message: text,
        message_type: "audio",
        is_staff_reply: true,
        delivery_status: "pending",
        attachments: [resolvedAudioUrl],
        payload: payloadObj,
      })
      .select("id, created_at")
      .single();

    if (msgErr || !insertedMsg) throw new Error(`Falha ao registrar mensagem de áudio: ${msgErr?.message}`);

    let resolvedInstanceId: string | null = thread.channel_instance_id || null;
    let resolvedProvider: string | null = null;
    if (resolvedInstanceId) {
      const { data: inst } = await db
        .from("whatsapp_channel_instances")
        .select("id, provider, is_active")
        .eq("id", resolvedInstanceId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (inst?.is_active) resolvedProvider = inst.provider;
      else resolvedInstanceId = null;
    }
    if (!resolvedInstanceId) {
      const { data: defInst } = await db
        .from("whatsapp_channel_instances")
        .select("id, provider")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (defInst) {
        resolvedInstanceId = defInst.id;
        resolvedProvider = defInst.provider;
      }
    }
    if (!resolvedInstanceId || !resolvedProvider) {
      throw new Error("Nenhuma instância WhatsApp ativa configurada para enviar nota de voz.");
    }

    // 2. Enfileira na outbox para entrega como Nota de Voz Nativa PTT (Evolution API /message/sendWhatsAppAudio)
    const idempotencyKey = `voice_note:${insertedMsg.id}:${Date.now()}`;
    const { error: outboxErr } = await db.from("whatsapp_outbox").insert({
      store_id: storeId,
      thread_id: threadId,
      channel_instance_id: resolvedInstanceId,
      provider: resolvedProvider,
      idempotency_key: idempotencyKey,
      recipient_phone: recipientPhone,
      message_type: "audio",
      payload: {
        media_url: resolvedAudioUrl,
        voice_note: true,
        encoding: true,
        text,
        chat_message_id: insertedMsg.id,
      },
      status: "pending",
    });
    if (outboxErr) throw new Error(`Falha ao enfileirar nota de voz: ${outboxErr.message}`);

    // 3. Disparo imediato da outbox e atualização dos timestamps da thread
    try {
      const { runWhatsAppOutboxWorker } = await import("./whatsapp-outbox.worker");
      await runWhatsAppOutboxWorker({ batchSize: 3 });
    } catch (workerErr) {
      console.warn("[whatsapp-voice-ai] Falha ao executar worker imediato da outbox:", workerErr);
    }

    await db
      .from("chat_threads")
      .update({
        updated_at: new Date().toISOString(),
        last_message_text: `[Nota de voz]: ${text.slice(0, 50)}...`,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    return {
      success: true,
      messageId: insertedMsg.id,
      threadId,
    };
  });
