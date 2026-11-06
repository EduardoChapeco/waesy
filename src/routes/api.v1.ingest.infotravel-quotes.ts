import { createFileRoute } from "@tanstack/react-router";
import { getServerIdentity } from "@/lib/identity.server";
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
    "access-control-allow-origin": isAllowed ? origin : "*",
    "access-control-allow-headers": "authorization, content-type, x-waesy-store-id",
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

        let targetStoreId: string | null = request.headers.get("x-waesy-store-id");
        let authenticatedUserId: string | null = null;

        try {
          const identity = await getServerIdentity();
          if (identity?.store_id) {
            targetStoreId = identity.store_id;
            authenticatedUserId = identity.id;
          }
        } catch {
          // Ingestão externa da extensão sem cookie de sessão SSR ativo
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

        // Se storeId não veio no body mas foi resolvido via header/sessão, injeta
        if (!body.storeId && targetStoreId) {
          body.storeId = targetStoreId;
        }

        if (!body.userId && authenticatedUserId) {
          body.userId = authenticatedUserId;
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
