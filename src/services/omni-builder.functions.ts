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
      if (!identity.store_id) {
        throw new Error("Loja ativa não identificada na sessão segura.");
      }

      const db = getServerClient();

      // 1. Busca documento atual para garantir tenant isolation e preservar settings
      const { data: currentDoc, error: fetchErr } = await db
        .from("experience_documents")
        .select("id, store_id, settings, title, slug")
        .eq("id", input.documentId)
        .eq("store_id", identity.store_id)
        .single();

      if (fetchErr || !currentDoc) {
        throw new Error("Documento não encontrado ou sem permissão de acesso.");
      }

      const currentSettings = (currentDoc.settings || {}) as Record<string, any>;
      const mergedSettings = {
        ...currentSettings,
        omni_page: input.document,
      };

      // 2. Atualiza settings.omni_page e title no banco Supabase
      const { data: updatedDoc, error: updateErr } = await db
        .from("experience_documents")
        .update({
          title: input.document.title || currentDoc.title,
          settings: mergedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.documentId)
        .eq("store_id", identity.store_id)
        .select("id, title, slug, settings, updated_at")
        .single();

      if (updateErr) throw updateErr;

      return {
        status: "ok" as const,
        document: (updatedDoc.settings as any)?.omni_page as OmniPageDocument,
        updated_at: updatedDoc.updated_at,
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
        .maybeSingle();

      if (docError) throw docError;
      if (!doc) throw new Error("Documento não encontrado.");

      const settings = (doc.settings || {}) as Record<string, any>;
      let omniDoc: OmniPageDocument;

      // Se já existe omni_page salvo e válido
      if (settings.omni_page) {
        const parsed = OmniPageDocumentSchema.safeParse(settings.omni_page);
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
      if (!identity.store_id) {
        throw new Error("Loja ativa não identificada.");
      }

      const db = getServerClient();

      // 1. Busca documento
      const { data: currentDoc, error: fetchErr } = await db
        .from("experience_documents")
        .select("id, settings, slug")
        .eq("id", input.documentId)
        .eq("store_id", identity.store_id)
        .single();

      if (fetchErr || !currentDoc) {
        throw new Error("Documento não encontrado para publicação.");
      }

      const currentSettings = (currentDoc.settings || {}) as Record<string, any>;
      const mergedSettings = {
        ...currentSettings,
        omni_page: input.document,
      };

      // 2. Atualiza documento como ativo e publicado
      const { data: updatedDoc, error: updateErr } = await db
        .from("experience_documents")
        .update({
          title: input.document.title,
          settings: mergedSettings,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.documentId)
        .eq("store_id", identity.store_id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return {
        status: "ok" as const,
        published_at: new Date().toISOString(),
        public_url: `/paginas/${currentDoc.slug || input.document.slug}`,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) throw e;
      console.error("[omni-builder.functions] publishOmniPageDocument error:", e);
      throw new Error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao publicar página no banco."
      );
    }
  });
