import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicBrandedAppBySlugFn } from "@/services/branded-app.functions";
import { BrandedAppShell } from "@/components/branded-app/branded-app-shell";
import { AppSplashScreen } from "@/components/branded-app/app-splash-screen";
import { useStoreAppRealtime } from "@/components/branded-app/use-store-app-realtime";
import { EmptyState, ErrorState } from "@/components/state/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/$slug")({
  loader: async ({ params }) => {
    return await getPublicBrandedAppBySlugFn({ data: { slug: params.slug } });
  },
  head: ({ loaderData, params }) => {
    const bundle = loaderData;
    const slug = params.slug;
    const cacheVersion = bundle?.appConfig?.cache_version || 1;
    const manifestHref = `/api/pwa/manifest.json?slug=${encodeURIComponent(slug)}&v=${cacheVersion}`;
    const appTitle = bundle?.appConfig?.app_name || bundle?.store?.name || "App Oficial";
    const shortName = bundle?.appConfig?.short_name || bundle?.store?.name || "App";
    const iconUrl =
      bundle?.appConfig?.icon_192_url ||
      bundle?.appConfig?.logo_square_url ||
      bundle?.store?.logo_url ||
      null;
    const themeColor = bundle?.appConfig?.theme_color;

    return {
      meta: [
        { title: appTitle },
        {
          name: "description",
          content:
            bundle?.appConfig?.description ||
            bundle?.store?.description ||
            `Acesse o aplicativo oficial e catálogo digital de ${appTitle}.`,
        },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: shortName },
        ...(themeColor ? [{ name: "theme-color", content: themeColor }] : []),
      ],
      links: [
        { rel: "manifest", href: manifestHref },
        ...(iconUrl
          ? [
              { rel: "apple-touch-icon", href: iconUrl },
              { rel: "apple-touch-icon", sizes: "180x180", href: iconUrl },
            ]
          : []),
      ],
    };
  },
  component: BrandedAppRoutePage,
});

function BrandedAppRoutePage() {
  const { slug } = Route.useParams();
  const initialBundle = Route.useLoaderData();

  const { data: bundle, isLoading, isError, refetch } = useQuery({
    queryKey: ["branded-app", slug],
    queryFn: () => getPublicBrandedAppBySlugFn({ data: { slug } }),
    initialData: initialBundle,
    staleTime: 1000 * 30,
  });

  useStoreAppRealtime({
    storeId: bundle?.store?.id || "",
    slug,
    cacheVersion: bundle?.appConfig?.cache_version,
    enabled: Boolean(bundle?.store?.id && bundle?.appConfig?.is_app_enabled),
  });

  if (isLoading && !bundle) {
    return (
      <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError && !bundle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <ErrorState
          title="Não foi possível carregar o aplicativo"
          description="Verifique sua conexão e tente novamente."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <EmptyState
            title="Aplicativo não encontrado"
            description="Verifique o link informado ou retorne à página inicial."
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="h-11 min-h-11 rounded-xl"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!bundle.appConfig.is_app_enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <EmptyState
            title={`${bundle.store.name} · App em manutenção`}
            description="O aplicativo oficial desta empresa está temporariamente pausado pelo administrador."
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="h-11 min-h-11 rounded-xl font-bold"
          >
            Recarregar Aplicativo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSplashScreen
        storeId={bundle.store.id}
        appName={bundle.appConfig.app_name}
        shortName={bundle.appConfig.short_name}
        logoUrl={bundle.appConfig.logo_square_url || bundle.store.logo_url}
        themeColor={bundle.appConfig.theme_color}
        backgroundColor={bundle.appConfig.background_color}
        entryAnimation={bundle.appConfig.entry_animation}
      />
      <BrandedAppShell bundle={bundle} />
    </>
  );
}
