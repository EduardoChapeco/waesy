/**
 * omni-builder.functions.ts — BFF Server Functions para o Omni-Block Engine
 *
 * Persistência real, atômica e validada via Zod na tabela `experience_documents`
 * e `experience_versions` do Supabase. Erradicação total de mocks ou console.log.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, getServerIdentity } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { OmniPageDocumentSchema, OmniPageDocument, createEmptyOmniPage } from "@/types/omni-builder";
import { applyTemplateToPage } from "@/lib/builder/omni-templates";
import { auditOmniDocument, getPublicationBlockingFindings } from "@/lib/builder/studio-template-audit";

// ── 1. SALVAMENTO ATÔMICO DO DOCUMENTO NO SUPABASE ──
export const saveOmniPageDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      document: OmniPageDocumentSchema,
    })
  )
  .handler(async ({ data: input }) => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      if (!identity.id || !identity.store_id) {
        throw new Error("Loja ativa não identificada na sessão segura.");
      }

      const db = getServerClient();
      const { data: result, error: persistErr } = await db.rpc("persist_omni_document_snapshot", {
        p_document_id: input.documentId,
        p_store_id: identity.store_id,
        p_actor_id: identity.id,
        p_snapshot: input.document,
        p_publish: false,
      });

      if (persistErr || !result?.version_id) {
        throw persistErr || new Error("Persistência do draft não confirmada.");
      }

      return {
        status: "ok" as const,
        document: input.document,
        version_id: result.version_id as string,
        version_number: result.version_number as number,
        idempotent: Boolean(result.idempotent),
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] saveOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao persistir documento do builder."
      );
    }
  });

// ── 2. CARREGAMENTO E HIDRATAÇÃO DO DOCUMENTO ──
export const getOmniPageDocument = createServerFn({ method: "GET" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
    })
  )
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      if (!identity.id) {
        throw new Error("Não autenticado.");
      }

      const db = getServerClient();

      const { data: doc, error: docError } = await db
        .from("experience_documents")
        .select("*")
        .eq("id", input.documentId)
        .eq("store_id", identity.store_id)
        .maybeSingle();

      if (docError) throw docError;
      if (!doc) throw new Error("Documento não encontrado.");

      const settings = (doc.settings || {}) as Record<string, any>;
      let omniDoc: OmniPageDocument;

      const { data: draftVersion, error: draftError } = await db
        .from("experience_versions")
        .select("id, version_number, document_snapshot")
        .eq("document_id", doc.id)
        .eq("status", "draft")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (draftError) throw draftError;

      // O editor reabre o rascunho; o snapshot legado só é fallback de migração.
      const draftSnapshot = draftVersion?.document_snapshot ?? settings.omni_page_draft ?? settings.omni_page;
      if (draftSnapshot) {
        const parsed = OmniPageDocumentSchema.safeParse(draftSnapshot);
        if (parsed.success) {
          omniDoc = parsed.data;
        } else {
          console.warn("[omni-builder.functions] omni_page corrompido, regenerando canônico:", parsed.error);
          omniDoc = createEmptyOmniPage(doc.slug || "pagina", doc.title || "Nova Página", (doc.document_type as any) || "general");
          omniDoc.id = doc.id;
        }
      } else {
        // Inicializa com documento canônico populado
        omniDoc = createEmptyOmniPage(doc.slug || "pagina", doc.title || "Nova Página", (doc.document_type as any) || "general");
        omniDoc.id = doc.id;

        // Se a página for vazia, injeta template base correspondente
        if (doc.document_type === "storefront") {
          omniDoc = applyTemplateToPage(omniDoc, "template_gastronomy");
        } else {
          omniDoc = applyTemplateToPage(omniDoc, "template_legal_jus");
        }
      }

      return {
        status: "ok" as const,
        document: omniDoc,
        rawDocument: {
          id: doc.id,
          store_id: doc.store_id,
          title: doc.title,
          slug: doc.slug,
          document_type: doc.document_type,
          is_active: doc.is_active,
        },
        version: draftVersion
          ? { id: draftVersion.id, version_number: draftVersion.version_number, status: "draft" as const }
          : null,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] getOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao carregar documento do builder."
      );
    }
  });

// ── 3. PUBLICAÇÃO IMEDIATA NO SUPABASE ──
export const publishOmniPageDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      documentId: z.string().uuid(),
      document: OmniPageDocumentSchema,
    })
  )
  .handler(async ({ data: input }) => {
    try {
      await requireAdmin();
      const identity = await getServerIdentity();
      if (!identity.id || !identity.store_id) {
        throw new Error("Loja ativa não identificada.");
      }

      const audit = auditOmniDocument(input.document);
      const blockingFindings = getPublicationBlockingFindings(audit);
      if (blockingFindings.length > 0) {
        const summary = blockingFindings
          .slice(0, 5)
          .map((finding) => `${finding.ruleId} (${finding.path}): ${finding.message}`)
          .join("; ");
        throw new Error(`Publicação bloqueada pela auditoria do Waesy Studio: ${summary}`);
      }

      const db = getServerClient();
      const { data: result, error: persistErr } = await db.rpc("persist_omni_document_snapshot", {
        p_document_id: input.documentId,
        p_store_id: identity.store_id,
        p_actor_id: identity.id,
        p_snapshot: input.document,
        p_publish: true,
      });

      if (persistErr || !result?.version_id || result.version_status !== "published") {
        throw persistErr || new Error("Publicação não confirmada.");
      }

      return {
        status: "ok" as const,
        version_id: result.version_id as string,
        version_number: result.version_number as number,
        published_at: new Date().toISOString(),
        public_url: `/paginas/${input.document.slug}`,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] publishOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao publicar página no banco."
      );
    }
  });
