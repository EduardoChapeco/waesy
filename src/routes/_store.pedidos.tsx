import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import {
  Package,
  ArrowRight,
  User,
  ShoppingBag,
  MagnifyingGlass,
  Clock,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/state/loading";
import { getIdentity } from "@/services/identity.functions";

const SearchSchema = z.object({
  token: z.string().optional(),
  orderId: z.string().optional(),
});

type PedidosSearch = z.infer<typeof SearchSchema>;

export const Route = createFileRoute("/_store/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus Pedidos & Acompanhamento | Waesy" },
      {
        name: "description",
        content: "Acompanhe seus pedidos em tempo real no Waesy com entrega local e retirada.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): PedidosSearch =>
    SearchSchema.parse(search),
  loader: async ({ deps: search }: { deps: PedidosSearch }) => {
    try {
      const identity = await getIdentity().catch(() => null);
      if (identity?.user?.id && !search.token) {
        throw redirect({ to: "/conta/pedidos" });
      }
      return { isAuthenticated: Boolean(identity?.user?.id) };
    } catch (err) {
      if ((err as any)?.isRedirect || (err as any)?.status === 307 || (err as any)?.status === 308) {
        throw err;
      }
      return { isAuthenticated: false };
    }
  },
  pendingComponent: PageSkeleton,
  component: PublicPedidosTrackingPage,
});

export function PublicPedidosTrackingPage() {
  const [orderQuery, setOrderQuery] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;
    const clean = orderQuery.trim();
    if (typeof window !== "undefined") {
      window.location.href = `/pedido/${encodeURIComponent(clean)}/confirmacao`;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-16 select-none flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md mx-auto space-y-6 text-center">
        <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
          <Package size={36} weight="duotone" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Acompanhe seu Pedido
          </h1>
          <p className="text-xs text-muted-foreground">
            Consulte o status em tempo real com seu código de rastreio ou acesse sua conta civil.
          </p>
        </div>

        {/* Formulário de Busca Direta por Código de Rastreio */}
        <form onSubmit={handleTrackSubmit} className="space-y-3 text-left">
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wider font-bold text-muted-foreground">
              Código do pedido ou token de rastreio:
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                placeholder="Ex: ped_9a8b7c ou token do WhatsApp"
                className="h-11 min-h-11 pl-10 pr-4 rounded-xl text-xs bg-muted/40 border-border/60"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 min-h-11 rounded-xl font-bold text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
          >
            <span>Rastrear Pedido</span>
            <ArrowRight size={14} weight="bold" />
          </Button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border/40" />
          <span className="shrink-0 mx-3 text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
            ou acesse seu histórico
          </span>
          <div className="flex-grow border-t border-border/40" />
        </div>

        {/* Acesso via SSO Civil com login único */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
          <div className="flex items-center gap-3 text-left">
            <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <User size={20} weight="bold" className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-foreground truncate">
                Já possui conta Waesy?
              </h3>
              <p className="text-2xs text-muted-foreground">
                Veja todos os seus pedidos de mercados, restaurantes e lojas em um só lugar.
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="w-full h-11 min-h-11 rounded-xl font-bold text-xs border-border/70 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/entrar" search={{ returnUrl: "/conta/pedidos" }}>
              <span>Entrar na Minha Conta</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
