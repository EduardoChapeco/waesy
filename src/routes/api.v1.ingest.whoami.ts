import { createFileRoute } from "@tanstack/react-router";
import { resolveIngestTokenIdentity } from "@/services/whatsapp-group-ingest.server";


function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": (origin.startsWith("chrome-extension://") || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("waesy.com.br") || origin.includes("usewaesy.pages.dev")) ? origin : "null",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, OPTIONS",
    vary: "Origin",
  };
}

export const Route = createFileRoute("/api/v1/ingest/whoami")({
  server: {
    handlers: {
      OPTIONS: async ({ request }: { request: Request }) =>
        new Response(null, { status: 204, headers: cors(request) }),

      GET: async ({ request }: { request: Request }) => {
        const headers = cors(request);
        const auth = await resolveIngestTokenIdentity(request);
        if (!auth.ok) return Response.json({ entitlement: false, error: auth.error }, { status: auth.status, headers });
        return Response.json(
          {
            entitlement: true,
            store: auth.store.name,
            storeInfo: auth.store,
            scopes: auth.scopes,
          },
          { headers },
        );
      },
    },
  },
} as never);

