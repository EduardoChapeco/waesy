/** Validate user-supplied sources before a server-side fetch. */
export function validateBrandSourceUrl(value: string): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:") throw new Error("A extração aceita somente URLs HTTPS públicas.");
  if (url.username || url.password) throw new Error("URLs com credenciais embutidas não são aceitas.");
  if (url.port && url.port !== "443") throw new Error("A extração aceita somente a porta HTTPS padrão.");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".onion") ||
    hostname.includes("%") ||
    hostname.startsWith("[")
  ) {
    throw new Error("O host informado não é uma origem pública permitida.");
  }

  const octets = hostname.split(".");
  if (octets.length === 4 && octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) {
    const [a, b] = octets.map(Number);
    const privateOrReserved =
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || b === 2 || b === 88)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0);
    if (privateOrReserved) throw new Error("A extração não pode acessar endereços IP privados ou reservados.");
  }

  return url;
}
