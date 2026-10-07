const SAFE_ANCHOR = /^#[A-Za-z0-9_-]{1,128}$/u;
const SAFE_TEL = /^tel:\+?[0-9(). -]{3,32}(?:;ext=\d{1,8})?$/iu;

function hasUnsafeCharacters(value: string): boolean {
  if (value.includes("\\")) return true;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) return true;
  }
  return false;
}

/**
 * Returns a normalized navigation target only when it is safe to place in an
 * HTML href. External links are HTTPS-only; protocol-relative, executable,
 * inline and transient URLs are deliberately rejected.
 */
export function getSafeBuilderHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const href = value.trim();
  if (!href || href.length > 2048 || hasUnsafeCharacters(href)) return undefined;

  if (href === "#" || SAFE_ANCHOR.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (SAFE_TEL.test(href)) return href;

  if (/^mailto:/iu.test(href)) {
    try {
      const parsed = new URL(href);
      if (parsed.protocol !== "mailto:" || !parsed.pathname.includes("@") || parsed.pathname.startsWith("//")) return undefined;
      return href;
    } catch {
      return undefined;
    }
  }

  if (!/^https:\/\//iu.test(href)) return undefined;
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return undefined;
    return href;
  } catch {
    return undefined;
  }
}

export function isSafeBuilderHref(value: string): boolean {
  return getSafeBuilderHref(value) !== undefined;
}
