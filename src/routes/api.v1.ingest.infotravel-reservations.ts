import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateIngest,
  INFOTRAVEL_INGEST_FEATURE_KEY,
} from "@/services/whatsapp-group-ingest.server";
import {
  IngestOperatorSyncBatchInputSchema,
  reconcileOperatorSyncBatch,
} from "@/services/travel-operator-sync.server";
import { normalizeOperatorCode } from "@/lib/travel-operator-sync";

const MAX_BODY_BYTES = 1024 * 1024; // 1MB

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

export const Route = createFileRoute("/api/v1/ingest/infotravel-reservations")({
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
            const { getServerIdentity } = await import("@/lib/identity.server");
            const identity = await getServerIdentity();
            if (identity?.id && identity?.store_id) {
              targetStoreId = identity.store_id;
              authenticatedUserId = identity.id;
            }
          } catch {
            // Sem sessão SSR
          }
        }

        if (!targetStoreId) {
          return Response.json(
            { error: "Unauthorized: Bearer token ou sessão Waesy válida obrigatória." },
            { status: 401, headers },
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

        if (body && typeof body === "object" && body.operatorCode) {
          body.operatorCode = normalizeOperatorCode(body.operatorCode);
        }

        const parsed = IngestOperatorSyncBatchInputSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Invalid reservation batch payload",
              issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
            },
            { status: 400, headers },
          );
        }

        try {
          const result = await reconcileOperatorSyncBatch({
            storeId: targetStoreId,
            createdByProfileId: authenticatedUserId,
            operatorCode: parsed.data.operatorCode,
            sourceKind: parsed.data.sourceKind,
            items: parsed.data.items,
          });
          return Response.json(result, { status: 200, headers });
        } catch (err: any) {
          console.error("[ingest/infotravel-reservations] failure:", err);
          return Response.json(
            { error: err?.message || "Erro interno ao sincronizar reservas" },
            { status: 500, headers },
          );
        }
      },
    },
  },
} as never);
