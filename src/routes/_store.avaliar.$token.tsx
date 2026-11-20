import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicReviewBoosterByTokenFn } from "@/services/review-booster.functions";
import { ReviewBoosterForm } from "@/components/reviews/ReviewBoosterForm";

export const Route = createFileRoute("/_store/avaliar/$token")({
  loader: async ({ params }) => {
    try {
      const invite = await getPublicReviewBoosterByTokenFn({ data: { token: params.token } });
      return { invite };
    } catch {
      return { invite: null };
    }
  },
  component: PublicReviewBoosterPage,
});

function PublicReviewBoosterPage() {
  const { invite } = Route.useLoaderData();

  if (!invite) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="size-12 rounded-lg bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          <Building2 className="size-6" />
        </div>
        <h1 className="text-lg font-bold text-foreground mb-2">Link de avaliação indisponível</h1>
        <p className="text-xs text-muted-foreground max-w-sm mb-6">
          Verifique se o endereço enviado pela empresa está completo.
        </p>
        <Button asChild variant="outline" className="h-11 min-h-11 px-6 rounded-lg">
          <Link to="/">Voltar ao Início</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl">
        <ReviewBoosterForm
          token={invite.token}
          storeName={invite.storeName}
          initialCustomerName={invite.customerName}
          destinationOrItem={invite.destinationOrItem}
          initialGmbUrl={invite.gmbReviewUrl}
        />
      </div>
    </main>
  );
}
