import { createFileRoute } from "@tanstack/react-router";
import {
  IngestPayloadSchema,
  authenticateIngest,
} from "@/services/whatsapp-group-ingest.server";
import { getServerClient } from "@/lib/supabase";

const MAX_BODY_BYTES = 256 * 1024;

function cors(request: Request): Record<string, string> {
  // Extensões usam origem chrome-extension://; a autorização real é o Bearer token.
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": origin.startsWith("chrome-extension://") ? origin : "null",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "Origin",
  };
}

export const Route = createFileRoute("/api/v1/ingest/whatsapp-contacts")({
  server: {
    handlers: {
      OPTIONS: async ({ request }: { request: Request }) =>
        new Response(null, { status: 204, headers: cors(request) }),

      POST: async ({ request }: { request: Request }) => {
        const headers = cors(request);
        const auth = await authenticateIngest(request);
        if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status, headers });

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return Response.json({ error: "Payload too large" }, { status: 413, headers });
        }

        let parsed;
        try {
          parsed = IngestPayloadSchema.safeParse(JSON.parse(raw));
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
        }
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid payload", issues: parsed.error.issues.map((i) => i.path.join(".")) },
            { status: 400, headers },
          );
        }

        const { data, error } = await getServerClient().rpc("ingest_group_contacts", {
          p_store_id: auth.storeId,
          p_token_id: auth.tokenId,
          p_idempotency_key: parsed.data.idempotency_key,
          p_dry_run: parsed.data.dry_run,
          p_items: parsed.data.items,
        });

        if (error) {
          console.error("[ingest whatsapp-contacts] rpc failure", error.message);
          const status = error.code === "42501" ? 403 : 500;
          return Response.json({ error: "Ingest failed" }, { status, headers });
        }
        return Response.json({ success: true, ...data }, { headers });
      },
    },
  },
} as never);

