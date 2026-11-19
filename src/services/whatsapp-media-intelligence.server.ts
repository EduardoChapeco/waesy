import {
  isBrokenOrMissingMediaUri,
  parseMediaDataUri,
  resolveDefaultMimeByMessageType,
  resolveWhisperExtensionAndMime,
} from "@/lib/whatsapp-media-utils";
import { resolveUnifiedNicheId } from "@/lib/niches/niche-ssot";
import { getAllActiveKeysForProvider, executeUnifiedAiCall } from "@/services/api-orchestrator.functions";
import {
  CHAT_MEDIA_PRIVATE_BUCKET,
  downloadChatMediaBytesFromStorage,
  hydrateMediaFromEvolution,
  refreshSignedChatMediaUrl,
} from "@/services/whatsapp-media.server";

export async function resolveVoiceProviderKey(
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

async function resolveMediaBinaryFromMessageOrStorage(params: {
  db: any;
  storeId: string;
  threadId: string;
  channelInstanceId?: string | null;
  remoteJid?: string | null;
  msg: Record<string, any>;
  overrideUrl?: string | null;
  fallbackMime: string;
  messageType: string;
}): Promise<{
  buffer: Buffer | null;
  mimeType: string;
  effectiveUri: string | null;
  hydratedSignedUrl: string | null;
  storagePath: string | null;
  hydratedMime: string | null;
}> {
  const {
    db,
    storeId,
    threadId,
    channelInstanceId,
    remoteJid,
    msg,
    overrideUrl,
    fallbackMime,
    messageType,
  } = params;

  const curPayload = (msg.payload && typeof msg.payload === "object" ? msg.payload : {}) as Record<string, any>;
  const curMedia = (curPayload.media && typeof curPayload.media === "object" ? curPayload.media : {}) as Record<string, any>;

  const storageBucket = typeof curMedia.storage_bucket === "string" ? curMedia.storage_bucket : null;
  let storagePath = typeof curMedia.storage_path === "string" ? curMedia.storage_path : null;

  const rawAttachmentUri =
    overrideUrl ||
    (Array.isArray(msg.attachments) && msg.attachments.length > 0 && typeof msg.attachments[0] === "string"
      ? msg.attachments[0]
      : curMedia.url || null);

  let effectiveUri: string | null = rawAttachmentUri;
  let hydratedSignedUrl: string | null = null;
  let hydratedMime: string | null = null;

  if (storageBucket && storagePath) {
    const downloaded = await downloadChatMediaBytesFromStorage(db, storageBucket, storagePath);
    if (downloaded?.buffer && downloaded.buffer.byteLength > 16) {
      const signed = await refreshSignedChatMediaUrl(db, storageBucket, storagePath, 3600);
      return {
        buffer: downloaded.buffer,
        mimeType: downloaded.mimeType || (typeof curMedia.mimetype === "string" ? curMedia.mimetype : fallbackMime),
        effectiveUri: signed || effectiveUri,
        hydratedSignedUrl: signed,
        storagePath,
        hydratedMime: downloaded.mimeType || null,
      };
    }

    if (isBrokenOrMissingMediaUri(effectiveUri, messageType)) {
      const freshSigned = await refreshSignedChatMediaUrl(db, storageBucket, storagePath, 3600);
      if (freshSigned) {
        effectiveUri = freshSigned;
        hydratedSignedUrl = freshSigned;
      }
    }
  }

  if (isBrokenOrMissingMediaUri(effectiveUri, messageType) && msg.external_message_id) {
    const hydrated = await hydrateMediaFromEvolution({
      db,
      storeId,
      channelInstanceId: channelInstanceId || null,
      threadId,
      messageId: msg.id || null,
      externalMessageId: String(msg.external_message_id),
      remoteJid: remoteJid || null,
      fromMe: Boolean(msg.is_staff_reply),
      messageType,
      preferredMime: typeof curMedia.mimetype === "string" ? curMedia.mimetype : fallbackMime,
      persistToMessage: true,
    }).catch(() => null);

    if (hydrated?.dataUri) {
      effectiveUri = hydrated.signedUrl || hydrated.dataUri;
      hydratedSignedUrl = hydrated.signedUrl || null;
      storagePath = hydrated.storagePath || storagePath;
      hydratedMime = hydrated.mimetype;
      const parsedHydrated = parseMediaDataUri(hydrated.dataUri, hydrated.mimetype || fallbackMime);
      if (parsedHydrated) {
        return {
          buffer: Buffer.from(parsedHydrated.base64Data, "base64"),
          mimeType: hydrated.mimetype || parsedHydrated.mimeType || fallbackMime,
          effectiveUri,
          hydratedSignedUrl,
          storagePath,
          hydratedMime: hydrated.mimetype,
        };
      }
    }
  }

  let buffer: Buffer | null = null;
  let mimeType = hydratedMime || (typeof curMedia.mimetype === "string" ? curMedia.mimetype : fallbackMime);

  if (effectiveUri && effectiveUri.startsWith("data:")) {
    const parsedUri = parseMediaDataUri(effectiveUri, mimeType);
    if (parsedUri) {
      mimeType = parsedUri.mimeType || mimeType;
      buffer = Buffer.from(parsedUri.base64Data, "base64");
    }
  } else if (effectiveUri && /^https?:\/\//i.test(effectiveUri)) {
    const mediaRes = await fetch(effectiveUri, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (mediaRes && mediaRes.ok) {
      const contentType = mediaRes.headers.get("content-type");
      if (contentType) mimeType = contentType.split(";")[0].trim();
      buffer = Buffer.from(await mediaRes.arrayBuffer());
    }
  }

  return {
    buffer,
    mimeType,
    effectiveUri,
    hydratedSignedUrl,
    storagePath,
    hydratedMime,
  };
}

export interface TranscribeAudioServerResult {
  ok: boolean;
  status: "cached" | "completed" | "no_provider_key" | "media_unavailable" | "provider_error";
  transcript: string | null;
  provider?: "groq" | "openai" | "legacy_text";
  audioUri?: string | null;
  mimetype?: string | null;
  storagePath?: string | null;
  reason?: string | null;
}

async function indexTranscriptIntoThreadAndLead(params: {
  db: any;
  storeId: string;
  thread: Record<string, any>;
  transcriptText: string;
  messageId: string;
}) {
  const { db, storeId, thread, transcriptText, messageId } = params;
  const cleanTranscript = String(transcriptText || "").trim();
  if (!cleanTranscript) return;

  try {
    const curMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
    const nextTranscripts = Array.isArray(curMeta.audio_transcripts) ? [...curMeta.audio_transcripts] : [];
    const dedup = nextTranscripts.filter((item: any) => item?.message_id !== messageId);
    dedup.unshift({
      message_id: messageId,
      excerpt: cleanTranscript.slice(0, 600),
      transcribed_at: new Date().toISOString(),
    });
    await db
      .from("chat_threads")
      .update({
        metadata: {
          ...curMeta,
          last_audio_transcript: cleanTranscript.slice(0, 600),
          audio_transcripts: dedup.slice(0, 12),
        },
      })
      .eq("id", thread.id)
      .eq("store_id", storeId);

    const leadId = typeof thread.lead_id === "string" && thread.lead_id ? thread.lead_id : null;
    if (leadId) {
      const { data: leadRow } = await db
        .from("leads_crm")
        .select("id, custom_fields")
        .eq("id", leadId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (leadRow) {
        const curCustom =
          leadRow.custom_fields && typeof leadRow.custom_fields === "object" ? leadRow.custom_fields : {};
        const prevList = Array.isArray(curCustom.audio_transcripts) ? curCustom.audio_transcripts : [];
        const filtered = prevList.filter((entry: any) => entry?.message_id !== messageId);
        filtered.unshift({
          message_id: messageId,
          text: cleanTranscript.slice(0, 1200),
          recorded_at: new Date().toISOString(),
        });
        await db
          .from("leads_crm")
          .update({
            custom_fields: {
              ...curCustom,
              audio_transcripts: filtered.slice(0, 15),
            },
          })
          .eq("id", leadId)
          .eq("store_id", storeId);
      }
    }
  } catch (err: any) {
    console.warn("[whatsapp-media-intelligence] Falha não-bloqueante ao indexar transcrição no contexto:", err?.message);
  }
}

/**
 * Núcleo único de transcrição real (Groq Whisper `whisper-large-v3` ou OpenAI `whisper-1`).
 * Nunca fabrica texto simulado caso chaves ou mídia estejam ausentes.
 */
export async function transcribeAudioMediaServer(params: {
  db: any;
  storeId: string;
  threadId: string;
  messageId: string;
  ownerId?: string;
  audioUrlOverride?: string | null;
}): Promise<TranscribeAudioServerResult> {
  const { db, storeId, threadId, messageId, ownerId, audioUrlOverride } = params;

  const { data: thread } = await db
    .from("chat_threads")
    .select("id, store_id, channel_instance_id, entity_id, metadata, lead_id")
    .eq("id", threadId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!thread) {
    return {
      ok: false,
      status: "media_unavailable",
      transcript: null,
      reason: "Conversa não encontrada.",
    };
  }

  const { data: msg } = await db
    .from("chat_messages")
    .select("id, message, message_type, attachments, payload, external_message_id, is_staff_reply")
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .maybeSingle();

  if (!msg) {
    return {
      ok: false,
      status: "media_unavailable",
      transcript: null,
      reason: "Mensagem não encontrada.",
    };
  }

  const curPayload = (msg.payload && typeof msg.payload === "object" ? msg.payload : {}) as Record<string, any>;
  if (curPayload.transcript && typeof curPayload.transcript === "string" && curPayload.transcript.trim().length > 0) {
    return {
      ok: true,
      status: "cached",
      transcript: curPayload.transcript.trim(),
    };
  }

  const [groqKey, openaiKey] = await Promise.all([
    resolveVoiceProviderKey("groq", ownerId, storeId),
    resolveVoiceProviderKey("openai", ownerId, storeId),
  ]);

  if (!groqKey && !openaiKey) {
    const legacyText = String(msg.message || "").trim();
    if (legacyText && !["[Áudio]", "[Audio]", "audio", "[Mensagem]"].includes(legacyText)) {
      return {
        ok: true,
        status: "cached",
        transcript: legacyText,
        provider: "legacy_text",
      };
    }
    return {
      ok: false,
      status: "no_provider_key",
      transcript: null,
      reason: "Transcrição de áudio indisponível: configure uma chave Groq ou OpenAI em Integrações > Cofre IA.",
    };
  }

  const threadMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
  const remoteJid =
    typeof threadMeta.whatsapp_jid === "string" && threadMeta.whatsapp_jid.trim()
      ? threadMeta.whatsapp_jid.trim()
      : typeof thread.entity_id === "string" && thread.entity_id.trim()
        ? thread.entity_id.trim()
        : null;

  const mediaData = await resolveMediaBinaryFromMessageOrStorage({
    db,
    storeId,
    threadId,
    channelInstanceId: thread.channel_instance_id,
    remoteJid,
    msg,
    overrideUrl: audioUrlOverride,
    fallbackMime: "audio/ogg",
    messageType: "audio",
  });

  if (!mediaData.buffer || mediaData.buffer.byteLength <= 32) {
    return {
      ok: false,
      status: "media_unavailable",
      transcript: null,
      reason: "Não foi possível obter os bytes do áudio para transcrição.",
    };
  }

  const providerUsed: "groq" | "openai" = groqKey ? "groq" : "openai";
  const { ext, normalizedMime } = resolveWhisperExtensionAndMime(mediaData.mimeType || "audio/ogg");
  const blob = new Blob([new Uint8Array(mediaData.buffer)], { type: normalizedMime });

  const formData = new FormData();
  formData.append("file", blob, `audio.${ext}`);
  formData.append("model", providerUsed === "groq" ? "whisper-large-v3" : "whisper-1");
  formData.append("language", "pt");
  formData.append("response_format", "json");

  const targetUrl =
    providerUsed === "groq"
      ? "https://api.groq.com/openai/v1/audio/transcriptions"
      : "https://api.openai.com/v1/audio/transcriptions";

  let transcriptText = "";
  let failureReason: string | null = null;
  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerUsed === "groq" ? groqKey : openaiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      transcriptText = String(json.text || "").trim();
    } else {
      failureReason = `Whisper HTTP ${res.status}`;
    }
  } catch (err: any) {
    failureReason = err?.message || "Erro na requisição Whisper";
  }

  if (!transcriptText) {
    return {
      ok: false,
      status: "provider_error",
      transcript: null,
      provider: providerUsed,
      reason: failureReason || "Não foi possível transcrever o áudio: serviço Whisper indisponível ou áudio vazio.",
    };
  }

  const effectiveMediaUrl = mediaData.hydratedSignedUrl || mediaData.effectiveUri;
  const updatedPayload = {
    ...curPayload,
    ...(effectiveMediaUrl
      ? {
          media: {
            ...(curPayload.media || {}),
            type: "audio",
            url: effectiveMediaUrl,
            mimetype: mediaData.mimeType || "audio/ogg",
            ...(mediaData.storagePath
              ? { storage_bucket: CHAT_MEDIA_PRIVATE_BUCKET, storage_path: mediaData.storagePath }
              : {}),
          },
        }
      : {}),
    transcript: transcriptText,
    transcription_provider: providerUsed,
    transcribed_at: new Date().toISOString(),
  };

  await db
    .from("chat_messages")
    .update({
      ...(effectiveMediaUrl ? { attachments: [effectiveMediaUrl] } : {}),
      payload: updatedPayload,
    })
    .eq("id", messageId);

  await indexTranscriptIntoThreadAndLead({
    db,
    storeId,
    thread,
    transcriptText,
    messageId,
  });

  return {
    ok: true,
    status: "completed",
    transcript: transcriptText,
    provider: providerUsed,
    audioUri: effectiveMediaUrl || undefined,
    mimetype: mediaData.mimeType,
    storagePath: mediaData.storagePath,
  };
}

export type SerializableScalar = string | number | boolean | null;

export interface ExtractMediaKnowledgeResult {
  ok: boolean;
  status: "completed" | "ai_unavailable" | "media_unavailable";
  summary: string | null;
  detectedNiche: string | null;
  matchedCatalogTitle: string | null;
  extractedFields: Record<string, SerializableScalar>;
  knowledgeFacts: string[];
  reason?: string | null;
}

/**
 * Extrai informações estruturadas de prints/imagens/documentos via Visão Multimodal real
 * e registra fatos úteis na thread e no card do lead (`custom_fields.media_extractions`).
 */
export async function extractMediaAndChatToLeadAndKnowledge(params: {
  db: any;
  storeId: string;
  threadId: string;
  messageId?: string | null;
  leadId?: string | null;
  ownerId?: string;
  mediaUrl?: string | null;
  fileBase64?: string | null;
  fileMime?: string | null;
  caption?: string | null;
  storeNiche?: string | null;
  availableCatalogTitles?: string[];
}): Promise<ExtractMediaKnowledgeResult> {
  const {
    db,
    storeId,
    threadId,
    messageId,
    leadId,
    ownerId,
    mediaUrl,
    fileBase64,
    fileMime,
    caption,
    storeNiche,
    availableCatalogTitles = [],
  } = params;

  const { data: thread } = await db
    .from("chat_threads")
    .select("id, store_id, channel_instance_id, entity_id, metadata, lead_id")
    .eq("id", threadId)
    .eq("store_id", storeId)
    .maybeSingle();

  let targetMsg: Record<string, any> | null = null;
  if (messageId) {
    const { data } = await db
      .from("chat_messages")
      .select("id, message, message_type, attachments, payload, external_message_id, is_staff_reply")
      .eq("id", messageId)
      .eq("thread_id", threadId)
      .maybeSingle();
    targetMsg = data;
  }

  let resolvedBase64 = fileBase64 ? fileBase64.replace(/^data:[^;]+;base64,/, "") : "";
  let resolvedMime = fileMime || "image/jpeg";

  if (!resolvedBase64 && targetMsg) {
    const msgType = String(targetMsg.message_type || "image");
    const mediaData = await resolveMediaBinaryFromMessageOrStorage({
      db,
      storeId,
      threadId,
      channelInstanceId: thread?.channel_instance_id || null,
      remoteJid: thread?.metadata?.whatsapp_jid || thread?.entity_id || null,
      msg: targetMsg,
      overrideUrl: mediaUrl,
      fallbackMime: resolveDefaultMimeByMessageType(msgType),
      messageType: msgType,
    });
    if (mediaData.buffer && mediaData.buffer.byteLength > 16) {
      resolvedMime = mediaData.mimeType || resolvedMime;
      resolvedBase64 = mediaData.buffer.toString("base64");
    }
  } else if (!resolvedBase64 && mediaUrl) {
    if (mediaUrl.startsWith("data:")) {
      const parsed = parseMediaDataUri(mediaUrl, resolvedMime);
      if (parsed) {
        resolvedMime = parsed.mimeType;
        resolvedBase64 = parsed.base64Data;
      }
    } else if (/^https?:\/\//i.test(mediaUrl)) {
      const res = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) }).catch(() => null);
      if (res && res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType) resolvedMime = contentType.split(";")[0].trim();
        resolvedBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      }
    }
  }

  const isImagePayload = Boolean(resolvedBase64 && resolvedMime.startsWith("image/"));
  const textHint = [caption, targetMsg?.message].filter((v) => v && typeof v === "string").join("\n").trim();

  if (!isImagePayload && !textHint) {
    return {
      ok: false,
      status: "media_unavailable",
      summary: null,
      detectedNiche: null,
      matchedCatalogTitle: null,
      extractedFields: {},
      knowledgeFacts: [],
      reason: "Mídia ou texto inacessível para leitura inteligente.",
    };
  }

  const canonicalNiche = resolveUnifiedNicheId(storeNiche || "turismo");
  const catalogContext =
    availableCatalogTitles.length > 0
      ? `Itens/Pacotes reais do catálogo da loja:\n${availableCatalogTitles.slice(0, 25).map((t) => `- ${t}`).join("\n")}`
      : "Sem lista de catálogo pré-carregada.";

  const aiResult = await executeUnifiedAiCall({
    storeId,
    ownerId,
    feature: "whatsapp_media_vision_ocr",
    taskType: isImagePayload ? "vision" : "fast_json",
    responseFormat: "json_object",
    maxTokens: 900,
    temperature: 0.1,
    ...(isImagePayload ? { images: [{ mimeType: resolvedMime, base64: resolvedBase64 }] } : {}),
    systemPrompt: `Você é um extrator comercial multimodal multi-nicho (nicho atual: ${canonicalNiche}).
Analise o print/imagem ou documento recebido no atendimento e retorne JSON estrito com:
{
  "summary": "Resumo claro e objetivo em português do que aparece no print/documento",
  "detected_niche": "${canonicalNiche} ou outro nicho identificado",
  "matched_catalog_title": "Nome exato do item do catálogo mencionado/identificado ou null",
  "extracted_fields": {
    "customer_name": null,
    "destination_or_item": null,
    "dates_or_schedule": null,
    "quantity_or_party_size": null,
    "price_or_budget_brl": null,
    "competitor_or_reference": null
  },
  "knowledge_facts": ["lista curta de fatos/preferências reais extraídos"]
}
Nunca invente dados que não estejam visíveis ou escritos.`,
    userPrompt: `Contexto da mensagem: ${textHint || "(anexo de mídia)"}\n${catalogContext}`,
  }).catch((err: unknown) => ({
    content: null as string | null,
    error: err instanceof Error ? err.message : String(err || "ai_unavailable"),
  }));

  if (!aiResult || !aiResult.content) {
    return {
      ok: false,
      status: "ai_unavailable",
      summary: null,
      detectedNiche: canonicalNiche,
      matchedCatalogTitle: null,
      extractedFields: {},
      knowledgeFacts: [],
      reason:
        ("error" in aiResult && aiResult.error) ||
        "Provedor de IA multimodal indisponível no momento.",
    };
  }

  let parsed: Record<string, any> = {};
  try {
    const cleanJson = aiResult.content
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    parsed = JSON.parse(cleanJson) as Record<string, any>;
  } catch {
    parsed = {
      summary: aiResult.content.trim().slice(0, 600),
      detected_niche: canonicalNiche,
      matched_catalog_title: null,
      extracted_fields: {},
      knowledge_facts: [],
    };
  }

  const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null;
  const matchedCatalogTitle =
    typeof parsed.matched_catalog_title === "string" && parsed.matched_catalog_title.trim()
      ? parsed.matched_catalog_title.trim()
      : null;
  const detectedNiche =
    typeof parsed.detected_niche === "string" && parsed.detected_niche.trim()
      ? parsed.detected_niche.trim()
      : canonicalNiche;
  const extractedFields: Record<string, SerializableScalar> = {};
  if (parsed.extracted_fields && typeof parsed.extracted_fields === "object") {
    for (const [key, val] of Object.entries(parsed.extracted_fields as Record<string, unknown>)) {
      if (val === null || typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
        extractedFields[key] = val;
      } else if (val !== undefined) {
        extractedFields[key] = String(val);
      }
    }
  }
  const knowledgeFacts = Array.isArray(parsed.knowledge_facts)
    ? parsed.knowledge_facts.map((f: unknown) => String(f || "").trim()).filter(Boolean).slice(0, 8)
    : [];

  if (targetMsg?.id && summary) {
    const curMsgPayload =
      targetMsg.payload && typeof targetMsg.payload === "object" ? targetMsg.payload : {};
    await db
      .from("chat_messages")
      .update({
        payload: {
          ...curMsgPayload,
          vision_summary: summary,
          extracted_structured: {
            detected_niche: detectedNiche,
            matched_catalog_title: matchedCatalogTitle,
            extracted_fields: extractedFields,
            knowledge_facts: knowledgeFacts,
            analyzed_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", targetMsg.id);
  }

  if (thread?.id && summary) {
    const curThreadMeta =
      thread.metadata && typeof thread.metadata === "object" ? (thread.metadata as Record<string, any>) : {};
    const prevInsights = Array.isArray(curThreadMeta.media_insights) ? curThreadMeta.media_insights : [];
    const nextInsights = [
      {
        message_id: targetMsg?.id || null,
        summary: summary.slice(0, 500),
        matched_catalog_title: matchedCatalogTitle,
        knowledge_facts: knowledgeFacts,
        extracted_at: new Date().toISOString(),
      },
      ...prevInsights.filter((it: any) => !targetMsg?.id || it?.message_id !== targetMsg.id),
    ].slice(0, 10);

    await db
      .from("chat_threads")
      .update({
        metadata: {
          ...curThreadMeta,
          media_insights: nextInsights,
        },
      })
      .eq("id", thread.id)
      .eq("store_id", storeId);
  }

  const targetLeadId = leadId || thread?.lead_id || null;
  if (targetLeadId && summary) {
    const { data: leadRow } = await db
      .from("leads_crm")
      .select("id, custom_fields")
      .eq("id", targetLeadId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (leadRow) {
      const curCustom =
        leadRow.custom_fields && typeof leadRow.custom_fields === "object" ? leadRow.custom_fields : {};
      const prevExt = Array.isArray(curCustom.media_extractions) ? curCustom.media_extractions : [];
      const nextExt = [
        {
          message_id: targetMsg?.id || null,
          summary: summary.slice(0, 600),
          matched_catalog_title: matchedCatalogTitle,
          extracted_fields: extractedFields,
          knowledge_facts: knowledgeFacts,
          extracted_at: new Date().toISOString(),
        },
        ...prevExt.filter((it: any) => !targetMsg?.id || it?.message_id !== targetMsg.id),
      ].slice(0, 12);

      await db
        .from("leads_crm")
        .update({
          custom_fields: {
            ...curCustom,
            media_extractions: nextExt,
          },
        })
        .eq("id", targetLeadId)
        .eq("store_id", storeId);
    }
  }

  if (knowledgeFacts.length > 0 && matchedCatalogTitle) {
    await appendVerifiedFactToContinuousKnowledgeBase({
      db,
      storeId,
      facts: knowledgeFacts,
      matchedCatalogTitle,
      niche: detectedNiche,
      sourceLabel: "whatsapp_vision_ocr",
    });
  }

  return {
    ok: true,
    status: "completed",
    summary,
    detectedNiche,
    matchedCatalogTitle,
    extractedFields,
    knowledgeFacts,
  };
}

function redactPotentialPiiFromFact(raw: string): string {
  return String(raw || "")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email-omitido]")
    .replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-\s]?\d{4}/g, "[telefone-omitido]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf-omitido]")
    .trim();
}

/**
 * Grava fatos não-PII validados de mídias/conversas na Base de Conhecimento Contínua da loja
 * (`stores.settings.continuous_knowledge_entries`), alimentando futuras respostas SDR e RAG.
 */
export async function appendVerifiedFactToContinuousKnowledgeBase(params: {
  db: any;
  storeId: string;
  facts: string[];
  matchedCatalogTitle?: string | null;
  niche?: string | null;
  sourceLabel?: string;
}): Promise<{ savedCount: number }> {
  const { db, storeId, facts, matchedCatalogTitle, niche, sourceLabel = "whatsapp_media" } = params;
  const cleanFacts = facts
    .map((f) => redactPotentialPiiFromFact(f))
    .filter((f) => f.length >= 6);
  if (!storeId || cleanFacts.length === 0) return { savedCount: 0 };

  try {
    const { data: storeRow } = await db
      .from("stores")
      .select("id, settings")
      .eq("id", storeId)
      .maybeSingle();
    if (!storeRow) return { savedCount: 0 };

    const curSettings = (storeRow.settings && typeof storeRow.settings === "object" ? storeRow.settings : {}) as Record<string, any>;
    const existingEntries = Array.isArray(curSettings.continuous_knowledge_entries)
      ? [...(curSettings.continuous_knowledge_entries as Array<Record<string, any>>)]
      : [];

    const existingTexts = new Set(existingEntries.map((e) => String(e?.fact || "").toLowerCase()));
    const nowIso = new Date().toISOString();
    let added = 0;

    for (const fact of cleanFacts.slice(0, 5)) {
      if (existingTexts.has(fact.toLowerCase())) continue;
      existingTexts.add(fact.toLowerCase());
      existingEntries.unshift({
        fact: fact.slice(0, 320),
        catalog_title: matchedCatalogTitle || null,
        niche: niche || null,
        source: sourceLabel,
        recorded_at: nowIso,
      });
      added += 1;
    }

    if (added > 0) {
      await db
        .from("stores")
        .update({
          settings: {
            ...curSettings,
            continuous_knowledge_entries: existingEntries.slice(0, 40),
          },
        })
        .eq("id", storeId);
    }

    return { savedCount: added };
  } catch {
    return { savedCount: 0 };
  }
}
