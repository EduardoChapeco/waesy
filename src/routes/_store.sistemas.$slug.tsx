import { createFileRoute } from "@tanstack/react-router";
import { VerticalLandingView } from "@/components/landing/vertical-landing-view";
import { resolveSubsystemBySlug } from "@/lib/vertical-subsystems";
import { getPublicVerticalLandingFn } from "@/services/vertical-landings.functions";

export const Route = createFileRoute("/_store/sistemas/$slug")({
  staleTime: 15_000,
  loader: async ({ params }) => {
    const landing = await getPublicVerticalLandingFn({ data: { slug: params.slug } });
    return { landing };
  },
  head: ({ loaderData }: any) => {
    const landing = loaderData?.landing;
    const title = landing?.display_name
      ? `${landing.display_name} — Sistema Especializado Waesy`
      : "Sistema Vertical Waesy";
    const desc = landing?.tagline || "Sistema especializado Waesy por nicho com planos e módulos dedicados.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: VerticalSystemLandingRoute,
});

function VerticalSystemLandingRoute() {
  const { landing } = Route.useLoaderData() as { landing: any };
  const subsystem = resolveSubsystemBySlug(landing?.slug);
  return <VerticalLandingView landing={landing} subsystem={subsystem} />;
}
