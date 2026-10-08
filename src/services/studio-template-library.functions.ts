import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { StudioTemplateManifestSchema } from "@/lib/builder/studio-manifest";

const SaveInputSchema = z.object({ manifest: StudioTemplateManifestSchema }).strict();
const ListInputSchema = z.object({}).strict();

function assertSaveableAiDraft(manifest: z.infer<typeof StudioTemplateManifestSchema>) {
  if (manifest.status !== "review_required" || manifest.provenance.origin !== "ai-assisted" || manifest.provenance.humanReviewed) {
    throw new Error("A biblioteca só aceita manifestos de IA não revisados, como drafts. A revisão humana não pode ser declarada pelo cliente.");
  }
  if (manifest.provenance.promptVersion !== "1.0.0") {
    throw new Error("Versão de prompt desconhecida; gere novamente antes de salvar na biblioteca.");
  }
  const bytes = new TextEncoder().encode(JSON.stringify(manifest)).byteLength;
  if (bytes > 450_000) throw new Error("O manifesto excede o limite de armazenamento de 450 KB.");
}

export const saveStudioTemplateDraft = createServerFn({ method: "POST" })
  .validator(SaveInputSchema)
  .handler(async ({ data }) => {
    try {
      const identity = await requireAdmin();
      if (!identity.store_id) throw new Error("Loja ativa não identificada.");
      assertSaveableAiDraft(data.manifest);
      const db = getServerClient();
      const now = new Date().toISOString();
      const { data: row, error } = await db
        .from("studio_template_library")
        .upsert({
          store_id: identity.store_id,
          template_id: data.manifest.id,
          template_version: data.manifest.version,
          manifest: data.manifest,
          created_by: identity.id,
          updated_at: now,
        }, { onConflict: "store_id,template_id,template_version" })
        .select("id, template_id, template_version, created_at, updated_at")
        .single();
      if (error) throw new Error(`Não foi possível salvar o rascunho: ${error.message}`);
      return { status: "saved" as const, templateId: row.template_id, version: row.template_version, updatedAt: row.updated_at };
    } catch (error) {
      if (error instanceof SupabaseUnconfiguredError) throw error;
      console.error("[studio-template-library] save failed:", error instanceof Error ? error.message : "unknown error");
      throw new Error(error instanceof Error ? error.message : "Falha ao salvar o template.");
    }
  });

export const listStudioTemplateDrafts = createServerFn({ method: "GET" })
  .validator(ListInputSchema)
  .handler(async () => {
    try {
      const identity = await requireAdmin();
      if (!identity.store_id) throw new Error("Loja ativa não identificada.");
      const db = getServerClient();
      const { data, error } = await db
        .from("studio_template_library")
        .select("template_id, template_version, manifest, created_at, updated_at")
        .eq("store_id", identity.store_id)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(`Não foi possível carregar a biblioteca: ${error.message}`);
      const drafts: z.infer<typeof StudioTemplateManifestSchema>[] = [];
      let skippedInvalid = 0;
      for (const row of data ?? []) {
        const parsed = StudioTemplateManifestSchema.safeParse(row.manifest);
        if (!parsed.success) {
          skippedInvalid += 1;
          continue;
        }
        drafts.push(parsed.data);
      }
      if (skippedInvalid > 0) console.warn(`[studio-template-library] Ignorados ${skippedInvalid} manifestos armazenados fora do schema atual.`);
      return { drafts, count: drafts.length };
    } catch (error) {
      if (error instanceof SupabaseUnconfiguredError) throw error;
      console.error("[studio-template-library] list failed:", error instanceof Error ? error.message : "unknown error");
      throw new Error(error instanceof Error ? error.message : "Falha ao carregar a biblioteca.");
    }
  });
