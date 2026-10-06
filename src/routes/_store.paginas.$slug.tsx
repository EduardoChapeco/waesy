import { createFileRoute, notFound, Link, isRedirect, isNotFound } from "@tanstack/react-router";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { ExperienceRenderer } from "@/components/commerce/experience-renderer";
import { OmniPageRenderer } from "@/components/builder/OmniPageRenderer";
import { Surface } from "@/components/ui/surface";
import { AlertCircle, Loader2, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_store/paginas/$slug")({
  loader: async ({ params }) => {
    try {
      const res = await getPublicExperienceDocumentBySlug({
        data: { slug: params.slug, document_type: "storefront" },
      });

      if (res.status === "not_found" || res.status === "unconfigured") {
        throw notFound();
      }

      if (res.status !== "ok") {
        throw new Error("Erro ao carregar a página.");
      }

      return {
        document: res.data.document,
        tree: res.data.tree,
      };
    } catch (err) {
      if (isNotFound(err) || isRedirect(err)) {
        throw err;
      }
      console.error("[loader:_store.paginas.$slug] Unhandled error:", err);
      return { document: null, tree: null };
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.document) return { meta: [{ title: "Página não encontrada" }] };
    const storeId = loaderData.document.store_id;
    return {
      title: `${loaderData.document.title} — Waesy`,
      meta: [
        { name: "description", content: loaderData.document.title },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
      ],
      links: [
        {
          rel: "manifest",
          href: storeId ? `/api/pwa/manifest.json?storeId=${storeId}` : "/manifest.json",
        },
      ],
    };
  },
  component: PublicPage,
  pendingComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background">
      <Loader2 className="size-10 animate-spin text-foreground/30" />
      <p className="mt-4 font-mono text-sm text-foreground/60 uppercase">Carregando página...</p>
    </div>
  ),
  errorComponent: ({ error }) => {
    if (isRedirect(error)) {
      throw error;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-background">
        <Surface
          variant="default"
          padding="lg"
          className="max-w-md w-full text-center "
        >
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <h2 className="font-semibold text-2xl mb-2 text-foreground">Erro no Carregamento</h2>
          <p className="font-sans text-muted-foreground mb-6">{error instanceof Error ? error.message : String(error)}</p>
          <Button asChild className="w-full">
            <Link to="/">Voltar para o Início</Link>
          </Button>
        </Surface>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-background">
      <Surface
        variant="default"
        padding="lg"
        className="max-w-md w-full text-center "
      >
        <FileQuestion className="size-12 text-foreground mx-auto mb-4 opacity-50" />
        <h2 className="font-semibold text-2xl mb-2">Página Vazia</h2>
        <p className="font-sans text-muted-foreground mb-6">
          A página que você tentou acessar não existe ou ainda não foi configurada.
        </p>
        <Button asChild className="w-full">
          <Link to="/">Explorar Comunidade</Link>
        </Button>
      </Surface>
    </div>
  ),
});

function PublicPage() {
  const { document, tree } = ((Route.useLoaderData?.() as any) || {});

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 bg-background">
        <Surface
          variant="default"
          padding="lg"
          className="max-w-md w-full text-center"
        >
          <FileQuestion className="size-12 text-foreground mx-auto mb-4 opacity-50" />
          <h2 className="font-semibold text-2xl mb-2">Página Indisponível</h2>
          <p className="font-sans text-muted-foreground mb-6">
            Não foi possível carregar o conteúdo desta página no momento.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </Surface>
      </div>
    );
  }

  if (document?.settings?.omni_page?.blocks && Array.isArray(document.settings.omni_page.blocks) && document.settings.omni_page.blocks.length > 0) {
    return (
      <main className="w-full flex flex-col gap-0 min-h-[100dvh] bg-background">
        <OmniPageRenderer document={document.settings.omni_page} />
      </main>
    );
  }

  return (
    <main className="w-full flex flex-col gap-0 min-h-[100dvh] bg-background">
      <ExperienceRenderer nodes={tree} />
    </main>
  );
}
