import { parseCookieHeader, serializeCookieHeader, type CookieOptions } from "@supabase/ssr";
export { serializeCookieHeader };

export function readCookieFromRequest(request: Request, name: string): string | null {
 const cookieHeader = request.headers.get("cookie");
 if (!cookieHeader) return null;

 return parseCookieHeader(cookieHeader).find((cookie) => cookie.name === name)?.value ?? null;
}

export function readAllCookiesFromRequest(
 request: Request,
): Array<{ name: string; value: string }> {
 const cookieHeader = request.headers.get("cookie");
 if (!cookieHeader) return [];

 return parseCookieHeader(cookieHeader).flatMap((cookie) =>
 cookie.value === undefined ? [] : [{ name: cookie.name, value: cookie.value }],
 );
}

export function appendResponseCookie(
 responseHeaders: { append(name: "Set-Cookie", value: string): void },
 name: string,
 value: string,
 options: CookieOptions = {},
): void {
 responseHeaders.append("Set-Cookie", serializeCookieHeader(name, value, options));
}
