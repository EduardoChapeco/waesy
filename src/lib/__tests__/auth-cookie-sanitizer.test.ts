import { describe, expect, it } from "vitest";
import {
  getLegacyCookieDomainsToPurge,
  inspectEncodedSessionString,
  parseRawCookieStringPreservingDuplicates,
  resolveCanonicalAuthCookies,
} from "../auth-cookie-sanitizer";

function makeJwt(exp: number, sub = "user-123"): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub, exp, role: "authenticated" })).toString("base64url");
  return `${header}.${payload}.signature`;
}

function makeEncodedSession(exp: number, extraPaddingBytes = 0): string {
  const sessionObj = {
    access_token: makeJwt(exp),
    refresh_token: `rt_${exp}`,
    expires_at: exp,
    token_type: "bearer",
    user: {
      id: "073f29a8-b592-4ca4-8635-1dc471f42c96",
      email: "meuwider@gmail.com",
      pad: "x".repeat(extraPaddingBytes),
    },
  };
  const b64 = Buffer.from(JSON.stringify(sessionObj)).toString("base64url");
  return `base64-${b64}`;
}

function splitIntoChunks(encoded: string, chunkSize = 3180): Array<{ name: string; value: string }> {
  const chunks: Array<{ name: string; value: string }> = [];
  for (let i = 0; i * chunkSize < encoded.length; i++) {
    chunks.push({
      name: `waesy-auth-token.${i}`,
      value: encoded.slice(i * chunkSize, (i + 1) * chunkSize),
    });
  }
  return chunks;
}

describe("auth-cookie-sanitizer", () => {
  it("decodes base64url Supabase SSR session strings and extracts exp", () => {
    const exp = 1900000500;
    const encoded = makeEncodedSession(exp);
    const meta = inspectEncodedSessionString(encoded);
    expect(meta).not.toBeNull();
    expect(meta?.expiresAt).toBe(exp);
    expect(meta?.accessToken).toContain(".");
  });

  it("picks newer unchunked waesy-auth-token when stale host-only .0/.1 chunks coexist", () => {
    const staleChunked = splitIntoChunks(makeEncodedSession(1700000100, 3500));
    const freshUnchunked = makeEncodedSession(1900000999, 200);

    const rawCookieHeader = [
      ...staleChunked.map((c) => `${c.name}=${c.value}`),
      `waesy-auth-token=${freshUnchunked}`,
      "waesy_active_context=civil",
    ].join("; ");

    const resolved = resolveCanonicalAuthCookies(parseRawCookieStringPreservingDuplicates(rawCookieHeader));
    const authCookies = resolved.filter((c) => c.name.startsWith("waesy-auth-token"));

    expect(authCookies).toHaveLength(1);
    expect(authCookies[0]?.name).toBe("waesy-auth-token");
    expect(authCookies[0]?.value).toBe(freshUnchunked);
  });

  it("picks newer chunked waesy-auth-token.0/.1 when stale unchunked cookie coexists", () => {
    const staleUnchunked = makeEncodedSession(1700000100, 200);
    const freshChunked = splitIntoChunks(makeEncodedSession(1900000999, 3500));

    const rawCookieHeader = [
      `waesy-auth-token=${staleUnchunked}`,
      ...freshChunked.map((c) => `${c.name}=${c.value}`),
    ].join("; ");

    const resolved = resolveCanonicalAuthCookies(parseRawCookieStringPreservingDuplicates(rawCookieHeader));
    const authCookies = resolved.filter((c) => c.name.startsWith("waesy-auth-token"));

    expect(authCookies).toHaveLength(freshChunked.length);
    expect(authCookies.map((c) => c.name)).toEqual(["waesy-auth-token.0", "waesy-auth-token.1"]);
    const reassembled = authCookies.map((c) => c.value).join("");
    expect(inspectEncodedSessionString(reassembled)?.expiresAt).toBe(1900000999);
  });

  it("resolves duplicate .0 and .1 chunks across host-only and domain scopes without mixing chunks", () => {
    const hostOnlyChunks = splitIntoChunks(makeEncodedSession(1700000200, 3500));
    const domainChunks = splitIntoChunks(makeEncodedSession(1900000888, 3500));

    // Browser sends host-only chunks first, then domain chunks
    const rawCookieHeader = [
      ...hostOnlyChunks.map((c) => `${c.name}=${c.value}`),
      ...domainChunks.map((c) => `${c.name}=${c.value}`),
    ].join("; ");

    const parsedDuplicates = parseRawCookieStringPreservingDuplicates(rawCookieHeader);
    expect(parsedDuplicates).toHaveLength(4);

    const resolved = resolveCanonicalAuthCookies(parsedDuplicates);
    expect(resolved).toHaveLength(2);
    const reassembled = resolved.map((c) => c.value).join("");
    const meta = inspectEncodedSessionString(reassembled);
    expect(meta).not.toBeNull();
    expect(meta?.expiresAt).toBe(1900000888);
  });

  it("ignores orphan trailing .2 chunk from an older 3-chunk session when newer session has 2 chunks", () => {
    const olderThreeChunkSession = splitIntoChunks(makeEncodedSession(1700000100, 6800));
    expect(olderThreeChunkSession).toHaveLength(3);

    const newerTwoChunkSession = splitIntoChunks(makeEncodedSession(1900000777, 3500));
    expect(newerTwoChunkSession).toHaveLength(2);

    // Suppose .0 and .1 were overwritten on one scope, leaving an orphan .2
    const rawCookieHeader = [
      `${newerTwoChunkSession[0]!.name}=${newerTwoChunkSession[0]!.value}`,
      `${newerTwoChunkSession[1]!.name}=${newerTwoChunkSession[1]!.value}`,
      `${olderThreeChunkSession[2]!.name}=${olderThreeChunkSession[2]!.value}`,
    ].join("; ");

    const resolved = resolveCanonicalAuthCookies(parseRawCookieStringPreservingDuplicates(rawCookieHeader));
    expect(resolved.map((c) => c.name)).toEqual(["waesy-auth-token.0", "waesy-auth-token.1"]);
    const reassembled = resolved.map((c) => c.value).join("");
    expect(inspectEncodedSessionString(reassembled)).not.toBeNull();
    expect(inspectEncodedSessionString(reassembled)?.expiresAt).toBe(1900000777);
  });

  it("computes legacy cookie domains to purge on production hosts", () => {
    expect(getLegacyCookieDomainsToPurge("waesy.com.br")).toEqual([".waesy.com.br", "waesy.com.br"]);
    expect(getLegacyCookieDomainsToPurge("www.usewaesy.com:443")).toEqual([
      ".usewaesy.com",
      "usewaesy.com",
      ".www.usewaesy.com",
    ]);
    expect(getLegacyCookieDomainsToPurge("localhost:3000")).toEqual([]);
  });
});
