/**
 * contact-enrichment.functions.ts — BFF admin do enriquecimento de contatos (e-mail, WhatsApp, redes sociais)
 * via pool gratuito (Firecrawl -> fetch nativo -> Steel). Núcleo em ./mining/contact-enrichment.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/server-access";
import { enrichListingContacts, type ContactEnrichmentResult } from "./mining/contact-enrichment";

export type { ContactEnrichmentResult };

export const enrichListingContactsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      limit: z.number().int().min(1).max(25).default(10),
      city: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ data }): Promise<ContactEnrichmentResult> => {
    await requirePlatformAdmin();
    return enrichListingContacts(data);
  });