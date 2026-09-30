import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getExperienceDocument } from "@/services/builder.functions";
import { listCategories, listCollections, listAdminProducts } from "@/services/admin-catalog.functions";
import { OmniEditor } from "@/components/builder/OmniEditor";
import { OmniPageDocument, OmniPageDocumentSchema, createEmptyOmniPage } from "@/components/builder/types";
import { applyTemplateToPage } from "@/components/builder/templates";
import { saveOmniPageDocument, publishOmniPageDocument } from "@/services/omni-builder.functions";

export const Route = createFileRoute("/workspace/builder/$documentId/editor")({
  head: () => ({ meta: [{ title: "Waesy Builder | Editor Unificado" }] }),
  loader: async ({ params }) => {
    try {
      const [docData, categories, collections, productsRes] = await Promise.all([
        getExperienceDocument({ data: { id: params.documentId } }),
        listCategories().catch(() => []),
        listCollections().catch(() => []),
        listAdminProducts().catch(() => []),
      ]);

      const realProducts = Array.isArray(productsRes)
        ? productsRes
        : ((productsRes as any)?.products || (productsRes as any)?.data || []);

      return {
        ...docData.data,
        categories: categories || [],
        collections: collections || [],
        products: realProducts,
      };
    } catch (err) {
      console.error("[loader:workspace.builder.$documentId.editor] Unhandled loader error:", err);
      return {
        document: null,
        version: null,
        nodes: [],
        categories: [],
        collections: [],
        products: [],
      };
    }
  },
  component: BuilderEditorPage,
});

function BuilderEditorPage() {
  const initialData = (Route.useLoaderData() as any) || {};
  const navigate = useNavigate();
  const params = Route.useParams();

  // Estado Unificado do Waesy Builder (Zero Mocks, Zero Divisão Clássico/Omni)
  const initialOmniDocument: OmniPageDocument = React.useMemo(() => {
    if (initialData?.document?.settings?.omni_page) {
      const parsed = OmniPageDocumentSchema.safeParse(initialData.document.settings.omni_page);
      if (parsed.success) return parsed.data;
    }
    const empty = createEmptyOmniPage(
      initialData?.document?.slug || "pagina",
      initialData?.document?.title || "Nova Página",
      (initialData?.document?.document_type as any) || "general"
    );
    empty.id = initialData?.document?.id || params.documentId;
    return applyTemplateToPage(empty, "template_gastronomy");
  }, [initialData?.document, params.documentId]);

  const handleSaveOmni = async (omniDoc: OmniPageDocument) => {
    try {
      await saveOmniPageDocument({
        data: {
          documentId: params.documentId,
          document: omniDoc,
        },
      });
      toast.success("Página salva no banco com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar página.");
    }
  };

  const handlePublishOmni = async (omniDoc: OmniPageDocument) => {
    try {
      await publishOmniPageDocument({
        data: {
          documentId: params.documentId,
          document: omniDoc,
        },
      });
      toast.success("Página publicada com sucesso! Vitrine ativa para os visitantes.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar página.");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <OmniEditor
        initialDocument={initialOmniDocument}
        onSave={handleSaveOmni}
        onPublish={handlePublishOmni}
        onBack={() => navigate({ to: "/workspace/cms/paginas" })}
      />
    </div>
  );
}
