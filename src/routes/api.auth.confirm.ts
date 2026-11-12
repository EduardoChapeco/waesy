import type {} from "@tanstack/react-start";
/**
 * Email Confirmation Handler Commerce
 *
 * Supabase sends users a confirmation email with a link like:
 * https://waesy.pages.dev/api/auth/confirm?token_hash=XXX&type=signup&next=/conta
 *
 * This route exchanges the token_hash for a session, sets the cookie,
 * and redirects the user to their destination.
 *
 * Without this route, email confirmation links would land on the app
 * without being processed — leaving users permanently stuck.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getResponseHeaders } from "@tanstack/start-server-core";
import { readCookieFromRequest } from "@/lib/http-cookies";
import { normalizeInternalReturnPath } from "@/lib/return-path";
import { getSSRClient } from "@/lib/server-access";
import { mergeGuestCartLogic } from "@/services/cart-helpers";

export const Route = createFileRoute("/api/auth/confirm")({
 server: {
 handlers: {
 GET: async ({ request }: { request: Request }) => {
 const url = new URL(request.url);
 const token_hash = url.searchParams.get("token_hash");
 const type = url.searchParams.get("type") as "signup" | "recovery" | "email" | null;
 const next = normalizeInternalReturnPath(url.searchParams.get("next"), "/");

 // Extract guest session token and response headers BEFORE async bounds
 const guestSessionToken = readCookieFromRequest(request, "waesy_guest_session");
 let capturedResHeaders: Headers | null = null;
 try {
   capturedResHeaders = (getResponseHeaders() as unknown as Headers) || null;
 } catch {
   capturedResHeaders = null;
 }

 if (!token_hash || !type) {
 return new Response(null, {
 status: 302,
 headers: { Location: "/entrar?error=link-invalido" },
 }) as any;
 }

 const supabase = await getSSRClient(capturedResHeaders);
 const { error } = await supabase.auth.verifyOtp({
 token_hash,
 type,
 });

 if (error) {
 console.error("[auth/confirm] verifyOtp error:", error.message);
 return new Response(null, {
 status: 302,
 headers: { Location: `/entrar?error=${encodeURIComponent(error.message)}` },
 }) as any;
 }

 try {
   const { clearIdentityCache } = await import("@/lib/server-access");
   clearIdentityCache();
 } catch {}

 // Success — get the newly created session and merge guest cart
 const { data: sessionData } = await supabase.auth.getSession();
 if (sessionData.session) {
 try {
 await mergeGuestCartLogic(
 sessionData.session.user.id,
 sessionData.session.access_token,
 guestSessionToken,
 );
 } catch (err) {
 console.error("[auth/confirm] mergeGuestCart failed (non-fatal):", err);
 }
 }

 // Redirect the user to their intended destination preserving Set-Cookie headers.
 const headers = new Headers();
 headers.set("Location", next);
 try {
   const resHeaders = capturedResHeaders || getResponseHeaders();
   if (resHeaders) {
     const setCookies =
       typeof (resHeaders as any).getSetCookie === "function"
         ? ((resHeaders as any).getSetCookie() as string[])
         : [];
     if (setCookies.length > 0) {
       for (const sc of setCookies) {
         if (sc) headers.append("Set-Cookie", sc);
       }
     } else {
       const sc = resHeaders.get("set-cookie");
       if (sc) headers.set("Set-Cookie", sc);
     }
   }
 } catch {}

 return new Response(null, {
 status: 302,
 headers,
 }) as any;
 },
 },
 },
} as never)
