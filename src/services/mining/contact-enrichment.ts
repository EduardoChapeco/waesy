/**
 * contact-enrichment.ts — Núcleo de enriquecimento de contatos (sem checagem de role).
 * Chamadores (BFF admin e cron) são responsáveis pela autorização.
 */

import { getServerClient } from "@/lib/supabase";
import { scrapeUrl } from "@/lib/mining/firecrawl-client";
import { extractContacts, isPublicHttpUrl } from "@/lib/mining/contact-extractor";

export interface ContactEnrichmentResult {
  processed: number;
  enriched: number;
  skipped: number;
  failed: number;
}

export async function enrichListingContacts(data: { limit: number; city?: string }): Promise<ContactEnrichmentResult> {
  const supabase = getServerClient();

  let query = supabase
    .from("directory_listings")
    .select("id, website_url, contact_email, contact_whatsapp, metadata")
    .not("website_url", "is", null)
    .is("contact_email", null)
    .filter("metadata->>contacts_enriched_at", "is", null)
    .eq("status", "active")
    .order("updated_at", { ascending: true })
    .limit(data.limit);
  if (data.city) query = query.eq("city", data.city);

  const { data: rows, error } = await query;
  if (error) throw new Error("Erro ao listar estabelecimentos: " + error.message);

  const result: ContactEnrichmentResult = { processed: 0, enriched: 0, skipped: 0, failed: 0 };

  for (const row of rows || []) {
    result.processed++;
    const website = row.website_url as string | null;
    const metadata = ((row.metadata as Record<string, unknown> | null) || {}) as Record<string, unknown>;

    if (!website || !isPublicHttpUrl(website)) {
      result.skipped++;
      continue;
    }

    const scraped = await scrapeUrl(website, { formats: ["markdown", "html"] }).catch(() => null);
    if (!scraped?.success) {
      result.failed++;
      await supabase
        .from("directory_listings")
        .update({ metadata: { ...metadata, contacts_enriched_at: new Date().toISOString(), contacts_enrich_status: "failed" } })
        .eq("id", row.id);
      continue;
    }

    const contacts = extractContacts({ html: scraped.html, markdown: scraped.markdown, links: scraped.links });
    const hasAny = contacts.emails.length > 0 || Boolean(contacts.whatsapp) || Object.keys(contacts.socials).length > 0;

    const update: Record<string, unknown> = {
      metadata: {
        ...metadata,
        contacts_enriched_at: new Date().toISOString(),
        contacts_enrich_status: hasAny ? "ok" : "empty",
        contacts_enrich_provider: scraped.provider,
        ...(Object.keys(contacts.socials).length > 0 ? { socials: contacts.socials } : {}),
        ...(contacts.emails.length > 1 ? { extra_emails: contacts.emails.slice(1) } : {}),
      },
    };
    if (contacts.emails[0]) update.contact_email = contacts.emails[0];
    if (contacts.whatsapp && !row.contact_whatsapp) update.contact_whatsapp = contacts.whatsapp;

    const { error: updateError } = await supabase.from("directory_listings").update(update).eq("id", row.id);
    if (updateError) {
      result.failed++;
      continue;
    }
    if (hasAny) result.enriched++;
    else result.skipped++;
  }

  return result;
}