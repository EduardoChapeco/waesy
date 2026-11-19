/**
 * src/lib/slug-utils.ts
 * Utilitários canônicos de geração e resolução de slugs limpos e determinísticos.
 * Erradica sufixos numéricos aleatórios (ex: -1721) e garante unicidade com elegância.
 */

export function slugify(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateSlug(name: string): string {
  return slugify(name) || "empresa";
}

/**
 * Normaliza um handle / username comercial (@arroba)
 * Remove espaços, caracteres especiais e acentos, preservando apenas [a-z0-9._-]
 */
export function normalizeHandle(handle: string): string {
  return handle
    .toLowerCase()
    .replace(/^@+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .trim();
}

/**
 * Resolve slug único para organizações e lojas sem números aleatórios desnecessários.
 * Apenas adiciona sufixo numérico (-2, -3...) se houver colisão real no banco.
 */
export async function resolveUniqueStoreSlug(
  db: any,
  name: string,
  preferredSlug?: string,
  excludeStoreId?: string
): Promise<string> {
  const base = generateSlug(preferredSlug || name);
  let candidate = base;
  let counter = 1;

  while (true) {
    let storeQuery = db.from("stores").select("id").eq("slug", candidate);
    if (excludeStoreId) {
      storeQuery = storeQuery.neq("id", excludeStoreId);
    }
    const { data: existingStore } = await storeQuery.maybeSingle();

    const { data: existingOrg } = await db
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!existingStore && !existingOrg) {
      return candidate;
    }

    counter++;
    candidate = `${base}-${counter}`;
  }
}
