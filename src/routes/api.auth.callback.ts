import { createFileRoute } from "@tanstack/react-router";
import { readCookieFromRequest } from "@/lib/http-cookies";
import { normalizeInternalReturnPath } from "@/lib/return-path";
import { getSSRClient } from "@/lib/server-access";
import { mergeGuestCartLogic } from "@/services/cart-helpers";
import { getResponseHeaders } from "@tanstack/start-server-core";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const next = normalizeInternalReturnPath(url.searchParams.get("next"), "/");

        // Extract guest session token from headers BEFORE async bounds
        const guestSessionToken = readCookieFromRequest(request, "waesy_guest_session");

        if (code) {
          const supabase = await getSSRClient();
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            try {
              await mergeGuestCartLogic(
                data.session.user.id,
                data.session.access_token,
                guestSessionToken,
              );
            } catch (err) {
              console.error("Falha ao mesclar carrinho após OAuth (ignorado):", err);
            }

            const headers = new Headers();
            headers.set("Location", next);
            try {
              const resHeaders = getResponseHeaders();
              if (resHeaders) {
                const sc = resHeaders.get("set-cookie");
                if (sc) headers.set("Set-Cookie", sc);
              }
            } catch {}

            return new Response(null, {
              status: 302,
              headers,
            }) as any;
          }
        }

        // Return the user to an error page with instructions
        return new Response(null, {
          status: 302,
          headers: { Location: "/entrar?error=auth-callback-failed" },
        }) as any;
      },
    },
  },
} as never)
