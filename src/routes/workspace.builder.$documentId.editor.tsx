import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { getExperienceDocument } from "@/services/builder.functions";
import { listCategories, listCollections, listAdminProducts } from "@/services/admin-catalog.functions";
import { getNavigationMenus } from "@/services/cms.functions";
import { listStoreCmsDashboardData } from "@/services/cms-collections.functions";
const OmniEditor = React.lazy(() =>
  import("@/components/builder/OmniEditor").then((m) => ({ default: m.OmniEditor })),
);
import { OmniPageDocument, OmniPageDocumentSchema, createEmptyOmniPage } from "@/components/builder/types";
import { applyTemplateToPage } from "@/components/builder/templates";
import { saveOmniPageDocument, publishOmniPageDocument } from "@/services/omni-builder.functions";

export const Route = createFileRoute("/workspace/builder/$documentId/editor")({
  head: () => ({ meta: [{ title: "Waesy Builder | Editor Unificado" }] }),
  loader: async ({ params }) => {
    try {
      const [docData, categories, collections, productsRes, navigationMenus] = await Promise.all([
        getExperienceDocument({ data: { id: params.documentId } }),
        listCategories().catch(() => []),
        listCollections().catch(() => []),
        listAdminProducts().catch(() => []),
        getNavigationMenus().catch(() => []),
      ]);

      const realProducts = Array.isArray(productsRes)
        ? productsRes
        : ((productsRes as any)?.products || (productsRes as any)?.data || []);
      const docPayload = (docData as any)?.data || {};
      const storeId = (docPayload as any)?.document?.store_id ?? null;
      const cmsDashboard = await listStoreCmsDashboardData({
        data: { storeId },
      }).catch(() => ({ storeId, collections: [], nativeCounts: undefined }));

      return {
        ...docPayload,
        categories:
          Array.isArray(categories) && categories.length > 0
            ? categories
            : docPayload.categories || [],
        collections:
          Array.isArray(collections) && collections.length > 0
            ? collections
            : docPayload.collections || [],
        products:
          realProducts.length > 0 ? realProducts : docPayload.products || [],
        navigationMenus: Array.isArray(navigationMenus) ? navigationMenus : [],
        cmsCollections: Array.isArray(cmsDashboard?.collections)
          ? cmsDashboard.collections
          : [],
        cmsNativeCounts: cmsDashboard?.nativeCounts,
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
        navigationMenus: [],
        cmsCollections: [],
        cmsNativeCounts: undefined,
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
    const docRecord = initialData?.document;
    const draftSnapshot =
      initialData?.version?.document_snapshot ??
      docRecord?.settings?.omni_page_draft ??
      docRecord?.settings?.omni_page;
    if (draftSnapshot) {
      const parsed = OmniPageDocumentSchema.safeParse(draftSnapshot);
      if (parsed.success) {
        return {
          ...parsed.data,
          id: docRecord?.id || parsed.data.id || params.documentId,
          store_id: docRecord?.store_id || parsed.data.store_id,
          settings: {
            ...(docRecord?.settings || {}),
            ...(parsed.data.settings || {}),
          },
        };
      }
    }
    const empty = createEmptyOmniPage(
      docRecord?.slug || "pagina",
      docRecord?.title || "Nova Página",
      (docRecord?.document_type as any) || "general",
    );
    empty.id = docRecord?.id || params.documentId;
    empty.store_id = docRecord?.store_id || undefined;
    empty.settings = docRecord?.settings || {};
    const selectedTemplateId = docRecord?.settings?.template_id;
    if (selectedTemplateId === "blank") {
      return empty;
    }
    if (selectedTemplateId && typeof selectedTemplateId === "string") {
      return applyTemplateToPage(empty, selectedTemplateId);
    }
    return empty;
  }, [initialData?.document, initialData?.version, params.documentId]);

  const handleSaveOmni = async (omniDoc: OmniPageDocument) => {
    await saveOmniPageDocument({
      data: {
        documentId: params.documentId,
        document: omniDoc,
      },
    });
  };

  const handlePublishOmni = async (omniDoc: OmniPageDocument) => {
    await publishOmniPageDocument({
      data: {
        documentId: params.documentId,
        document: omniDoc,
      },
    });
  };

  if (!initialData?.document) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-lg font-bold text-foreground">Documento indisponível ou sem permissão</h1>
        <p className="text-xs text-muted-foreground max-w-md">
          Não foi possível abrir este documento no Builder Omni. Verifique se a página existe e se você possui permissão de edição neste workspace.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/workspace/cms/paginas" })}
          className="h-11 min-h-11 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Voltar para Páginas
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <React.Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-background text-sm text-muted-foreground animate-pulse motion-reduce:animate-none">
            Carregando editor...
          </div>
        }
      >
        <OmniEditor
          key={params.documentId}
          initialDocument={initialOmniDocument}
          onSave={handleSaveOmni}
          onPublish={handlePublishOmni}
          onBack={() => {
            if (
              initialData?.document?.settings?.is_platform_surface ||
              initialOmniDocument?.settings?.is_platform_surface ||
              (typeof window !== "undefined" && (window.location.search.includes("from=admin-master") || document.referrer.includes("admin-master")))
            ) {
              navigate({ to: "/admin-master/home-editor" });
            } else {
              navigate({ to: "/workspace/cms/paginas" });
            }
          }}
          products={initialData.products}
          categories={initialData.categories}
          collections={initialData.collections}
          classifieds={initialData.classifieds}
          posts={initialData.posts}
          flyers={initialData.flyers}
          events={initialData.events}
          jobs={initialData.jobs}
          stores={initialData.stores}
          banners={initialData.banners}
          hotpages={initialData.hotpages}
          storeData={initialData.storeData}
          navigationMenus={initialData.navigationMenus}
          cmsCollections={initialData.cmsCollections}
          cmsNativeCounts={initialData.cmsNativeCounts}
        />
      </React.Suspense>
    </div>
  );
}
