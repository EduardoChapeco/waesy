import { createFileRoute } from "@tanstack/react-router";
import { AboutTrustAnchorPage } from "./_store.about";
import { WAESY_CANONICAL_ORIGIN } from "@/lib/agentic/agentic-readiness-engine";

export const Route = createFileRoute("/_store/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Waesy — Marketplace Local, Comércio, Notícias e IA | Waesy" },
      {
        name: "description",
        content:
          "Conheça a história, governança, segurança LGPD e infraestrutura tecnológica da plataforma Waesy (waesy.com.br).",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `${WAESY_CANONICAL_ORIGIN}/icons/icon-512x512.png` },
    ],
    links: [{ rel: "canonical", href: `${WAESY_CANONICAL_ORIGIN}/about` }],
  }),
  component: AboutTrustAnchorPage,
});
