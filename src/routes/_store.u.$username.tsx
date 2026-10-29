import { createFileRoute } from "@tanstack/react-router";
import { MemberPublicProfileView, type MembroSearchParams } from "./_store.membro.$id";
import { getPublicMemberProfile } from "@/services/social.functions";

export const Route = createFileRoute("/_store/u/$username")({
  validateSearch: (search: Record<string, unknown>): MembroSearchParams => ({
    modo:
      search.modo === "profissional" || search.modo === "comercial"
        ? (search.modo as "profissional" | "comercial")
        : "social",
  }),
  head: ({ loaderData, search, params }: { loaderData?: { data: any }; search?: MembroSearchParams; params?: any }) => {
    const modo = search?.modo;
    const isCreator = loaderData?.data?.isCreator;
    const profile = loaderData?.data?.profile;
    const fullName = profile?.full_name || "Membro";
    const username = profile?.username ? `@${profile.username}` : "";
    let title = `${fullName} (${username}) | Waesy`;
    if (isCreator && (modo === "comercial" || !modo)) {
      title = `${fullName} — Vitrine & Parcerias | Waesy`;
    } else if (modo === "profissional") {
      title = `${fullName} — Perfil Profissional | Waesy`;
    } else if (modo === "comercial") {
      title = `${fullName} — Catálogo & Desapegos | Waesy`;
    }
    const description = profile?.bio || `Conheça o perfil de ${fullName} no ecossistema Waesy. Conexões locais, portfólio profissional e anúncios.`;
    const canonical = `https://waesy.com.br/u/${profile?.username || params?.username || ""}`;
    const avatar = profile?.avatar_url || "https://waesy.com.br/pwa-512x512.png";

    const jsonLd = profile
      ? {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: title,
          description,
          mainEntity: {
            "@type": "Person",
            name: fullName,
            alternateName: username || undefined,
            description,
            image: avatar,
          },
        }
      : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:site_name", content: "Waesy Local Marketplace" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:image", content: avatar },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "geo.region", content: "BR-SC" },
        { name: "geo.placename", content: "São Miguel do Oeste" },
        { name: "webmcp-endpoint", content: "https://waesy.com.br/api/webmcp.json" },
        { name: "webmcp-type", content: "civilian_member_profile" },
      ],
      links: [
        { rel: "canonical", href: canonical },
        { rel: "alternate", type: "text/markdown", href: canonical },
      ],
      scripts: jsonLd ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] : [],
    };
  },
  loader: async ({ params }): Promise<{ data: any }> => {
    try {
      const usernameParam = params.username;
      const data = await getPublicMemberProfile({ data: { profileId: usernameParam } }).catch(() => null);
      return { data };
    } catch (err) {
      console.error("[loader:_store.u.$username] Unhandled error:", err);
      return { data: null };
    }
  },
  component: MemberVanityPage,
});

export default function MemberVanityPage() {
  const { data } = ((Route.useLoaderData?.() as any) || {});
  const search = Route.useSearch();
  const defaultMode = data?.isCreator ? "comercial" : "social";
  return <MemberPublicProfileView data={data} activeMode={search.modo || defaultMode} />;
}
