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
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getAllActiveKeysForProvider } from "@/services/api-orchestrator.functions";

async function resolveVoiceProviderKey(
  provider: "groq" | "openai",
  ownerId?: string,
  storeId?: string,
): Promise<string> {
  const poolKeys = await getAllActiveKeysForProvider(provider, ownerId, storeId).catch(() => []);
  if (poolKeys.length > 0 && poolKeys[0]?.rawKey) {
    return poolKeys[0].rawKey;
  }
  return provider === "groq"
    ? process.env.GROQ_API_KEY?.trim() || ""
    : process.env.OPENAI_API_KEY?.trim() || "";
}

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
    const { threadId, messageId } = data;
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autorizado");

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada");
    assertStoreAccess(identity, ["owner", "admin", "manager", "operator", "staff"], thread.store_id);

    const { data: msg } = await db
      .from("chat_messages")
      .select("id, message, message_type, attachments, payload, external_message_id")
      .eq("id", messageId)
      .eq("thread_id", threadId)
      .maybeSingle();

    if (!msg) throw new Error("Mensagem não encontrada");

    const curPayload = (msg.payload && typeof msg.payload === "object" ? msg.payload : {}) as Record<string, any>;
    if (curPayload.transcript && typeof curPayload.transcript === "string" && curPayload.transcript.trim().length > 0) {
      return { transcript: curPayload.transcript, cached: true };
    }

    const rawAudioUri =
      Array.isArray(msg.attachments) && msg.attachments.length > 0 && typeof msg.attachments[0] === "string"
        ? msg.attachments[0]
        : curPayload.media?.url || null;

    let transcriptText = "";
    const effectiveAudioUri = data.audioUrl || rawAudioUri;

    // Resolve chaves via Cofre BYOK / api_key_pools do Admin Master + fallback ENV
    const [groqKey, openaiKey] = await Promise.all([
      resolveVoiceProviderKey("groq", identity.id, thread.store_id),
      resolveVoiceProviderKey("openai", identity.id, thread.store_id),
    ]);

    if ((groqKey || openaiKey) && effectiveAudioUri) {
      try {
        let audioBuffer: Buffer | null = null;
        let mimeType = "audio/ogg";
        if (effectiveAudioUri.startsWith("data:")) {
          const mimeMatch = /^data:([^;]+);base64,/.exec(effectiveAudioUri);
          if (mimeMatch?.[1]) mimeType = mimeMatch[1];
          const base64Data = effectiveAudioUri.replace(/^data:[^;]+;base64,/, "");
          audioBuffer = Buffer.from(base64Data, "base64");
        } else if (/^https?:\/\//i.test(effectiveAudioUri)) {
          const mediaRes = await fetch(effectiveAudioUri, { signal: AbortSignal.timeout(15000) });
          if (mediaRes.ok) {
            const contentType = mediaRes.headers.get("content-type");
            if (contentType) mimeType = contentType.split(";")[0].trim();
            audioBuffer = Buffer.from(await mediaRes.arrayBuffer());
          }
        }

        if (audioBuffer && audioBuffer.byteLength > 32) {
          const ext = mimeType.includes("mp4") || mimeType.includes("m4a")
            ? "m4a"
            : mimeType.includes("mpeg") || mimeType.includes("mp3")
              ? "mp3"
              : mimeType.includes("wav")
                ? "wav"
                : "ogg";
          const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });

          const formData = new FormData();
          formData.append("file", blob, `audio.${ext}`);
          formData.append("model", groqKey ? "whisper-large-v3" : "whisper-1");
          formData.append("language", "pt");
          formData.append("response_format", "json");

          const targetUrl = groqKey
            ? "https://api.groq.com/openai/v1/audio/transcriptions"
            : "https://api.openai.com/v1/audio/transcriptions";

          const res = await fetch(targetUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey || openaiKey}`,
            },
            body: formData,
            signal: AbortSignal.timeout(15000),
          });

          if (res.ok) {
            const json = await res.json().catch(() => ({}));
            transcriptText = String((json as any).text || "").trim();
          }
        }
      } catch (err: any) {
        console.warn("[whatsapp-voice-ai] Falha na chamada Whisper:", err?.message);
      }
    }

    if (!transcriptText) {
      const msgText = String(msg.message || "").trim();
      if (msgText && !["[Áudio]", "[Audio]", "audio"].includes(msgText)) {
        transcriptText = msgText;
      } else {
        throw new Error(
          groqKey || openaiKey
            ? "Não foi possível transcrever o áudio: mídia inacessível ou serviço Whisper indisponível."
            : "Transcrição de áudio indisponível: configure uma chave Groq ou OpenAI em Integrações > Cofre IA."
        );
      }
    }

    // Salva a transcrição no banco de dados para evitar reprocessamento
    const updatedPayload = {
      ...curPayload,
      transcript: transcriptText,
      transcribed_at: new Date().toISOString(),
    };

    await db
      .from("chat_messages")
      .update({ payload: updatedPayload })
      .eq("id", messageId);

    return { transcript: transcriptText, cached: false };
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
      .select("id, store_id, channel_instance_id, entity_id, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa não encontrada.");

    const recipientPhone =
      (thread.metadata as any)?.customer_phone ||
      (thread.metadata as any)?.phone ||
      thread.entity_id ||
      null;

    if (!recipientPhone) throw new Error("Número de telefone do destinatário não disponível.");

    const payloadObj = {
      media: {
        type: "audio",
        url: audioDataUri,
        mimetype: "audio/ogg",
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
        attachments: [audioDataUri],
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
        media_url: audioDataUri,
        voice_note: true,
        encoding: true,
        text,
        message_id: insertedMsg.id,
      },
      status: "pending",
    });
    if (outboxErr) throw new Error(`Falha ao enfileirar nota de voz: ${outboxErr.message}`);

    // 3. Atualiza timestamps na thread
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
