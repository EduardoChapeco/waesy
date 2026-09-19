import { getRequest, getResponseHeaders } from "@tanstack/start-server-core";
import crypto from "node:crypto";

import { appendResponseCookie, readCookieFromRequest } from "./http-cookies";

export const GUEST_SESSION_COOKIE = "waesy_guest_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Retrieves the current guest session token from cookies.
 * If none exists, generates a new UUID, sets the cookie, and returns it.
 * MUST be called within a server context (e.g. createServerFn).
 */
export function getOrCreateGuestSession(): string {
 const request = getRequest();
 let session = readCookieFromRequest(request, GUEST_SESSION_COOKIE);
 if (!session) {
 session = crypto.randomUUID();
 appendResponseCookie(getResponseHeaders(), GUEST_SESSION_COOKIE, session, {
 maxAge: COOKIE_MAX_AGE,
 path: "/",
 httpOnly: true,
 secure: import.meta.env.PROD,
 sameSite: "lax",
 });
 }
 return session;
}

/**
 * Retrieves the current guest session token if it exists.
 */
export function getGuestSession(): string | null {
 return readCookieFromRequest(getRequest(), GUEST_SESSION_COOKIE);
}

/**
 * Clears the guest session cookie, effectively creating a blank slate
 * for the next visit or preventing cart cross-contamination after logout.
 */
export function clearGuestSession(): void {
 appendResponseCookie(getResponseHeaders(), GUEST_SESSION_COOKIE, "", {
 maxAge: 0,
 path: "/",
 httpOnly: true,
 secure: import.meta.env.PROD,
 sameSite: "lax",
 });
}

const SELLER_REF_COOKIE = "waesy_seller_ref";

export function setSellerRefCookie(sellerId: string): void {
 appendResponseCookie(getResponseHeaders(), SELLER_REF_COOKIE, sellerId, {
 maxAge: COOKIE_MAX_AGE,
 path: "/",
 httpOnly: true,
 secure: import.meta.env.PROD,
 sameSite: "lax",
 });
}

export function getSellerRefCookie(): string | null {
 return readCookieFromRequest(getRequest(), SELLER_REF_COOKIE);
}
