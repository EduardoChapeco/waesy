import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/marketplace/$storeSlug")({
  loader: ({ params }) => {
    throw redirect({
      to: "/loja/$slug",
      params: { slug: params.storeSlug },
    });
  },
  component: () => null,
});
