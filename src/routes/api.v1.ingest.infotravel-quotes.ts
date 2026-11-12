import { createFileRoute } from "@tanstack/react-router";
import { getServerIdentity } from "@/lib/identity.server";
import {
  authenticateIngest,
  INFOTRAVEL_INGEST_FEATURE_KEY,
} from "@/services/whatsapp-group-ingest.server";
import { normalizeOperatorCode } from "@/lib/travel-operator-sync";
import {
  TravelQuoteCapturePayloadSchema,
  ingestTravelQuoteCapture,
} from "@/services/travel-quote-capture.functions";

const MAX_BODY_BYTES = 512 * 1024; // 512KB

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const isAllowed =
    origin.startsWith("chrome-extension://") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.includes("waesy.com.br") ||
    origin.includes("usewaesy.pages.dev");

  return {
    "access-control-allow-origin": isAllowed ? origin : "null",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "Origin",
  };
}

export const Route = createFileRoute("/api/v1/ingest/infotravel-quotes")({
  server: {
    handlers: {
      OPTIONS: async ({ request }: { request: Request }) =>
        new Response(null, { status: 204, headers: cors(request) }),

      POST: async ({ request }: { request: Request }) => {
        const headers = cors(request);

        let targetStoreId: string | null = null;
        let authenticatedUserId: string | null = null;

        const hasBearer = (request.headers.get("authorization") || "").startsWith("Bearer ");
        if (hasBearer) {
          const auth = await authenticateIngest(request, INFOTRAVEL_INGEST_FEATURE_KEY);
          if (!auth.ok) {
            return Response.json({ error: auth.error }, { status: auth.status, headers });
          }
          targetStoreId = auth.storeId;
        } else {
          try {
            const identity = await getServerIdentity();
            if (identity?.id && identity?.store_id) {
              targetStoreId = identity.store_id;
              authenticatedUserId = identity.id;
            }
          } catch {
            // Sem cookie de sessão SSR ativo
          }
        }

        if (!targetStoreId) {
          return Response.json(
            { error: "Unauthorized: Bearer token ou sessão Waesy válida obrigatória." },
            { status: 401, headers }
          );
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return Response.json({ error: "Payload too large" }, { status: 413, headers });
        }

        let body: any;
        try {
          body = JSON.parse(raw);
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
        }

        if (!body || typeof body !== "object") {
          return Response.json({ error: "Invalid JSON body" }, { status: 400, headers });
        }

        // Zero-Trust: força storeId e userId exclusivamente a partir da autenticação verificada
        body.storeId = targetStoreId;
        body.userId = authenticatedUserId ?? undefined;
        if (body.operatorSlug) {
          body.operatorSlug = normalizeOperatorCode(body.operatorSlug);
        }

        const parsed = TravelQuoteCapturePayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Invalid quote capture payload",
              issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
            },
            { status: 400, headers }
          );
        }

        try {
          const result = await ingestTravelQuoteCapture(parsed.data);
          return Response.json(
            {
              success: true,
              captureId: result.captureId,
              opportunitiesGenerated: result.opportunitiesGenerated,
              opportunities: result.opportunities,
            },
            { status: 200, headers }
          );
        } catch (err: any) {
          console.error("[ingest/infotravel-quotes] failure:", err);
          return Response.json(
            { error: err?.message || "Erro interno ao processar captura de cotação" },
            { status: 500, headers }
          );
        }
      },
    },
  },
} as never);
