import { createFileRoute } from "@tanstack/react-router";
import { getServerIdentity } from "@/lib/server-access";
import {
  getBatchActiveKeysForProviders,
  markKeyError,
  recordKeyUsage,
} from "@/services/api-orchestrator.functions";
import { getActiveSecretForProvider } from "@/services/secret-vault.functions";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

interface WhisperCredentialCandidate {
  provider: "groq" | "openai";
  endpoint: string;
  model: string;
  apiKey: string;
  poolKeyId?: string;
}

function sanitizeMime(mime?: string | null): string {
  const clean = (mime || "").split(";")[0]?.trim().toLowerCase();
  if (clean && clean.startsWith("audio/")) return clean;
  return "audio/webm";
}

function extensionForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

async function resolveWhisperCredentials(
  userId: string,
  storeId?: string,
): Promise<WhisperCredentialCandidate[]> {
  const ownerId = userId || storeId;
  const [groqVault, openaiVault, poolMap] = await Promise.all([
    getActiveSecretForProvider("groq", userId, storeId).catch(() => null),
    getActiveSecretForProvider("openai", userId, storeId).catch(() => null),
    getBatchActiveKeysForProviders(["groq", "openai"], ownerId, storeId).catch(
      () => ({} as Record<string, Array<{ id: string; rawKey: string }>>),
    ),
  ]);

  const candidates: WhisperCredentialCandidate[] = [];
  const seenKeys = new Set<string>();
  const pushCandidate = (entry: WhisperCredentialCandidate | null) => {
    if (!entry || !entry.apiKey || seenKeys.has(entry.apiKey)) return;
    seenKeys.add(entry.apiKey);
    candidates.push(entry);
  };

  if (typeof groqVault === "string" && groqVault.trim()) {
    pushCandidate({
      provider: "groq",
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
      model: "whisper-large-v3-turbo",
      apiKey: groqVault.trim(),
    });
  }
  for (const k of poolMap?.groq || []) {
    if (k?.rawKey) {
      pushCandidate({
        provider: "groq",
        endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
        model: "whisper-large-v3-turbo",
        apiKey: k.rawKey,
        poolKeyId: k.id,
      });
    }
  }
  if (process.env.GROQ_API_KEY?.trim()) {
    pushCandidate({
      provider: "groq",
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
      model: "whisper-large-v3-turbo",
      apiKey: process.env.GROQ_API_KEY.trim(),
    });
  }

  if (typeof openaiVault === "string" && openaiVault.trim()) {
    pushCandidate({
      provider: "openai",
      endpoint: "https://api.openai.com/v1/audio/transcriptions",
      model: "whisper-1",
      apiKey: openaiVault.trim(),
    });
  }
  for (const k of poolMap?.openai || []) {
    if (k?.rawKey) {
      pushCandidate({
        provider: "openai",
        endpoint: "https://api.openai.com/v1/audio/transcriptions",
        model: "whisper-1",
        apiKey: k.rawKey,
        poolKeyId: k.id,
      });
    }
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    pushCandidate({
      provider: "openai",
      endpoint: "https://api.openai.com/v1/audio/transcriptions",
      model: "whisper-1",
      apiKey: process.env.OPENAI_API_KEY.trim(),
    });
  }

  return candidates;
}

export async function handleAiTranscribe(
  request: Request,
): Promise<Response> {
        const identity = await getServerIdentity();
        if (!identity.id) {
          return Response.json(
            { error: "Autenticação obrigatória para transcrever áudio." },
            { status: 401 },
          );
        }

        const credsList = await resolveWhisperCredentials(
          identity.id,
          identity.store_id || undefined,
        );
        if (credsList.length === 0) {
          return Response.json(
            {
              error:
                "Nenhuma chave de transcrição (Groq ou OpenAI) configurada no Cofre ou Pool de Chaves.",
            },
            { status: 422 },
          );
        }

        try {
          const contentType = request.headers.get("content-type") || "";
          let audioBlob: Blob | null = null;
          let filename = "audio.webm";
          let language = "pt";

          if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const entry = form.get("file") || form.get("audio");
            const langEntry = form.get("language");
            if (typeof langEntry === "string" && langEntry.trim()) {
              language = langEntry.trim().slice(0, 8);
            }
            if (entry instanceof Blob) {
              const safeMime = sanitizeMime(entry.type);
              audioBlob = new Blob([await entry.arrayBuffer()], { type: safeMime });
              filename =
                entry instanceof File && entry.name
                  ? entry.name
                  : `audio.${extensionForMime(safeMime)}`;
            }
          } else {
            const json = (await request.json().catch(() => null)) as {
              audioBase64?: string;
              mimeType?: string;
              filename?: string;
              language?: string;
            } | null;
            if (json?.language) language = json.language.trim().slice(0, 8);
            if (json?.audioBase64) {
              const match = json.audioBase64.match(/^data:([^;]+);base64,(.+)$/);
              const mime = sanitizeMime(match?.[1] || json.mimeType);
              const rawB64 = match?.[2] || json.audioBase64;
              const buffer = Buffer.from(rawB64, "base64");
              audioBlob = new Blob([buffer], { type: mime });
              filename = json.filename || `audio.${extensionForMime(mime)}`;
            }
          }

          if (!audioBlob || audioBlob.size === 0) {
            return Response.json(
              { error: "Arquivo de áudio vazio ou não enviado." },
              { status: 400 },
            );
          }

          if (audioBlob.size > MAX_AUDIO_BYTES) {
            return Response.json(
              { error: "Áudio excede o limite de 15 MB." },
              { status: 413 },
            );
          }

          let lastProviderError = "Nenhum provedor respondeu com sucesso.";
          for (const creds of credsList) {
            const upstreamForm = new FormData();
            upstreamForm.append("file", audioBlob, filename);
            upstreamForm.append("model", creds.model);
            upstreamForm.append("language", language);

            try {
              const res = await fetch(creds.endpoint, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${creds.apiKey}`,
                },
                body: upstreamForm,
              });

              if (!res.ok) {
                const errBody = await res.text().catch(() => "");
                lastProviderError = `${creds.provider} ${res.status}: ${errBody.slice(0, 180)}`;
                if (creds.poolKeyId) {
                  await markKeyError(creds.poolKeyId, lastProviderError, res.status).catch(() => {});
                }
                continue;
              }

              const payload = (await res.json()) as { text?: string };
              const text = typeof payload.text === "string" ? payload.text.trim() : "";
              if (creds.poolKeyId) {
                recordKeyUsage(creds.poolKeyId).catch(() => {});
              }
              return Response.json({
                success: true,
                text,
                provider: creds.provider,
                language,
              });
            } catch (fetchErr: any) {
              lastProviderError = fetchErr?.message || String(fetchErr);
            }
          }

          return Response.json(
            {
              error: `Falha nos provedores de transcrição (${lastProviderError})`,
            },
            { status: 502 },
          );
        } catch (err: any) {
          return Response.json(
            {
              error:
                err instanceof Error
                  ? err.message
                  : "Erro inesperado ao transcrever áudio.",
            },
            { status: 500 },
          );
        }
}

export const Route = createFileRoute("/api/ai/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) =>
        handleAiTranscribe(request),
    },
  },
} as never);
