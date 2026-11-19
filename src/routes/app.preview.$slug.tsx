import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPublicBrandedAppBySlugFn } from "@/services/branded-app.functions";
import { BrandedAppShell } from "@/components/branded-app/branded-app-shell";
import { EmptyState } from "@/components/state/states";
import type { BrandedAppRuntimeBundleDTO } from "@/types/branded-app";

export const WAESY_APP_PREVIEW_READY = "WAESY_APP_PREVIEW_READY";
export const WAESY_APP_PREVIEW_STATE = "WAESY_APP_PREVIEW_STATE";

export interface PreviewStatePayload {
  bundle?: BrandedAppRuntimeBundleDTO | null;
  activeTabId?: string;
  activeCity?: string | null;
}

export const Route = createFileRoute("/app/preview/$slug")({
  loader: async ({ params }) => {
    try {
      return await getPublicBrandedAppBySlugFn({ data: { slug: params.slug } });
    } catch {
      return null;
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Prévia do App | ${params.slug}` },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BrandedAppPreviewRoute,
});

function BrandedAppPreviewRoute() {
  const { slug } = Route.useParams();
  const initialData = Route.useLoaderData();
  const [liveBundle, setLiveBundle] = useState<BrandedAppRuntimeBundleDTO | null>(initialData || null);
  const [controlledTabId, setControlledTabId] = useState<string | undefined>(undefined);
  const [controlledCity, setControlledCity] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (initialData && !liveBundle) {
      setLiveBundle(initialData);
    }
  }, [initialData, liveBundle]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === WAESY_APP_PREVIEW_STATE && msg.payload) {
        const payload = msg.payload as PreviewStatePayload;
        if (payload.bundle) {
          setLiveBundle(payload.bundle);
        }
        if (typeof payload.activeTabId === "string" && payload.activeTabId.trim()) {
          setControlledTabId(payload.activeTabId);
        }
        if (payload.activeCity !== undefined) {
          setControlledCity(payload.activeCity);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: WAESY_APP_PREVIEW_READY, slug },
          window.location.origin,
        );
      }
    } catch {
      // Ambiente sem frame pai acessível
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [slug]);

  if (!liveBundle) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <EmptyState
          title="Aguardando prévia do Studio"
          description="Conectando ao painel para exibir o aplicativo em tempo real."
        />
      </div>
    );
  }

  return (
    <BrandedAppShell
      bundle={liveBundle}
      isPreview
      controlledTabId={controlledTabId}
      onTabChange={setControlledTabId}
      controlledCity={controlledCity}
    />
  );
}
