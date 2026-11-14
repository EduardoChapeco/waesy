import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Loader2, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolvePublicGroupCampaignInvite } from "@/services/whatsapp-groups.functions";

export const Route = createFileRoute("/g/$slug")({
  head: () => ({ meta: [{ title: "Entrar no Grupo — Waesy" }] }),
  loader: async ({ params }) => {
    try {
      const info = await resolvePublicGroupCampaignInvite({
        data: { slug: params.slug, incrementRedirect: false },
      });
      return { info, slug: params.slug };
    } catch {
      return { info: { found: false as const }, slug: params.slug };
    }
  },
  component: PublicGroupInvitePage,
});

function PublicGroupInvitePage() {
  const { info, slug } = Route.useLoaderData() as {
    info:
      | { found: false }
      | {
          found: true;
          slug: string;
          title: string;
          description: string | null;
          activeGroupName: string;
          memberCount: number;
          overflowThreshold: number;
          maxCapacity: number;
          inviteUrl: string | null;
          rotated: boolean;
        };
    slug: string;
  };
  const [joining, setJoining] = useState(false);

  const handleJoinGroup = async () => {
    setJoining(true);
    try {
      const res = await resolvePublicGroupCampaignInvite({
        data: { slug, incrementRedirect: true },
      });
      if (res.found && res.inviteUrl && typeof window !== "undefined") {
        window.location.href = res.inviteUrl;
        return;
      }
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    // Pré-aquecimento silencioso sem redirecionar automaticamente sem clique
  }, []);

  if (!info.found) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center space-y-4">
          <div className="size-12 rounded-xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
            <Users className="size-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Convite indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este link de grupo foi desativado ou não existe.
          </p>
          <Button asChild className="h-11 min-h-11 w-full">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="size-6" />
          </div>
          <Badge variant="outline" className="text-xs font-medium text-success border-success/30 bg-success/10 gap-2">
            <ShieldCheck className="size-4" />
            <span>Grupo Ativo</span>
          </Badge>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {info.title}
          </h1>
          {info.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {info.description}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Grupo atual disponível</span>
            <span className="font-semibold text-foreground">{info.activeGroupName}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Ocupação atual</span>
            <span className="font-mono text-foreground">
              {info.memberCount} / {info.maxCapacity}
            </span>
          </div>
        </div>

        {info.inviteUrl ? (
          <Button
            type="button"
            onClick={handleJoinGroup}
            disabled={joining}
            className="h-11 min-h-11 w-full text-sm font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {joining ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none motion-reduce:transition-none" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            <span>Entrar no Grupo no WhatsApp</span>
            <ExternalLink className="size-4" />
          </Button>
        ) : (
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-center text-xs text-muted-foreground">
            O link do WhatsApp está sendo provisionado pelo administrador. Tente novamente em instantes.
          </div>
        )}
      </div>
    </main>
  );
}
