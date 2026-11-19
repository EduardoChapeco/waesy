const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const XML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * Escapamento HTML canônico anti-XSS para impressão térmica, PDF e HTML5 (W03).
 */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => HTML_ESCAPE_MAP[ch] || ch
  );
}

/**
 * Escapamento XML canônico para feeds e sitemaps.
 */
export function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => XML_ESCAPE_MAP[ch] || ch
  );
}
