import { createFileRoute } from "@tanstack/react-router";
import { authenticateIngest } from "@/services/whatsapp-group-ingest.server";
import { getServerClient } from "@/lib/supabase";

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  return {
    "access-control-allow-origin": origin.startsWith("chrome-extension://") ? origin : "null",
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
        const auth = await authenticateIngest(request);
        if (!auth.ok) return Response.json({ entitlement: false }, { status: auth.status, headers });
        const { data: store } = await getServerClient()
          .from("stores")
          .select("name")
          .eq("id", auth.storeId)
          .maybeSingle();
        return Response.json({ entitlement: true, store: store?.name ?? null }, { headers });
      },
    },
  },
} as never);

