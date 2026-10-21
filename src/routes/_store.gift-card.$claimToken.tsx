import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Gift,
  Sparkles,
  Lock,
  Loader2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WzCardMockup } from "@/components/wz/WzCardMockup";
import { getGiftCardByClaimToken, claimGiftCard } from "@/services/giftcard.functions";
import { getUserSession } from "@/services/auth.functions";
import { formatWz } from "@/lib/wz-quote-engine";

export const Route = createFileRoute("/_store/gift-card/$claimToken")({
  head: () => ({
    meta: [
      { title: "Você recebeu um presente! | Waesy" },
      { name: "robots", content: "noindex, nofollow" }, // Privado e protegido
    ],
  }),
  loader: async ({ params: { claimToken } }) => {
    try {
      const user = await getUserSession().catch(() => null);
      try {
        const card = await getGiftCardByClaimToken({ data: { claimToken } });
        return {
          claimToken,
          card,
          user,
          error: null,
        };
      } catch (err: unknown) {
        return {
          claimToken,
          card: null,
          user,
          error: err instanceof Error ? err.message : "Vale-presente indisponível.",
        };
      }
    } catch (err) {
      console.error("[loader:_store.gift-card.$claimToken] Erro:", err);
      return { claimToken, card: null, user: null, error: "Erro ao processar presente." };
    }
  },
  component: RecipientGiftOpeningPage,
});

function RecipientGiftOpeningPage() {
  const { claimToken, card, user, error } = (Route.useLoaderData?.() as any) || {};
  const navigate = useNavigate();

  // Estados de Revelação e Experiência
  const [isOpened, setIsOpened] = useState(card?.status === "opened" || card?.status === "claimed");
  const [isOpeningAnimation, setIsOpeningAnimation] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const handleOpenGift = () => {
    setIsOpeningAnimation(true);
    setTimeout(() => {
      setIsOpened(true);
      setIsOpeningAnimation(false);
    }, 700);
  };

  const handleClaim = async () => {
    if (!user) {
      toast.info("Faça login para salvar este presente na sua carteira $WZ.");
      navigate({
        to: "/entrar",
        search: { returnUrl: `/gift/${claimToken}` } as any,
      });
      return;
    }

    setIsClaiming(true);
    try {
      const res = await claimGiftCard({ data: { claimToken } });
      toast.success(res.message || "Vale-presente adicionado com sucesso!");
      navigate({ to: "/conta/gift-cards" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao resgatar vale-presente.");
    } finally {
      setIsClaiming(false);
    }
  };

  if (error || !card) {
    return (
      <div className="w-full max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="size-16 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Lock className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Presente Indisponível</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error || "Este vale-presente não foi localizado ou o link de acesso expirou."}
        </p>
        <div className="pt-2">
          <Button asChild className="rounded-lg h-11 px-5 text-xs font-semibold">
            <Link to="/mercado">Ir para o Mercado</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4 sm:px-6 animate-in fade-in duration-300">
      <div className="w-full max-w-xl mx-auto text-center space-y-6">
        {/* ── FASE 1: CAIXA FECHADA / CONVITE PARA ABERTURA ── */}
        {!isOpened ? (
          <div className="space-y-6 p-8 rounded-lg border border-border/60 bg-card  relative overflow-hidden">
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs font-bold px-3 py-1 border-primary/30 text-primary gap-1">
                <Sparkles className="size-3.5" />
                <span>Presente Especial</span>
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Você recebeu um presente!
              </h1>
              <p className="text-sm text-muted-foreground">
                Enviado com carinho por <strong className="text-foreground">{card.sender_name}</strong>
              </p>
            </div>

            <div className="py-6 flex justify-center">
              <div
                className={`size-28 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform duration-300 ${
                  isOpeningAnimation ? "scale-125 rotate-12 opacity-80" : "animate-bounce motion-reduce:animate-none"
                }`}
              >
                <Gift className="size-14" />
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleOpenGift}
              disabled={isOpeningAnimation}
              className="w-full rounded-lg h-14 min-h-14 font-extrabold text-base bg-primary text-primary-foreground   active:scale-95 transition-transform cursor-pointer"
            >
              {isOpeningAnimation ? "Abrindo presente..." : "Abrir Meu Presente"}
            </Button>
          </div>
        ) : (
          /* ── FASE 2: EXPERIÊNCIA DE REVELAÇÃO DO CARD 3D & VÍDEO ── */
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs font-bold px-3 py-1 border-emerald-500/30 text-emerald-500 gap-1">
                <CheckCircle2 className="size-3.5" />
                <span>Presente Aberto</span>
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {card.sender_name} presenteou você
              </h1>
            </div>

            {/* Mídia em Vídeo Especial (se o remetente gravou vídeo) */}
            {card.media && card.media.media_type === "VIDEO" && (
              <div className="relative w-full max-w-sm mx-auto aspect-video rounded-lg overflow-hidden border border-border/80  bg-muted">
                <video
                  src={card.media.public_url}
                  autoPlay
                  loop
                  playsInline
                  muted={isVideoMuted}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setIsVideoMuted(!isVideoMuted)}
                  aria-label={isVideoMuted ? "Ativar som" : "Desativar som"}
                  className="absolute bottom-3 right-3 h-11 min-h-11 min-w-11 px-3 rounded-lg bg-background/80 text-foreground flex items-center justify-center hover:bg-background transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {isVideoMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              </div>
            )}

            {/* Mockup do Cartão 3D Oficial */}
            <div className="py-2">
              <WzCardMockup
                issuerName={card.issuer_name}
                issuerLogo={card.issuer_logo}
                wzInitial={card.wz_initial}
                wzRemaining={card.wz_remaining}
                recipientName={card.recipient_name}
                senderName={card.sender_name}
                personalMessage={card.personal_message}
                cardDesignId={card.card_design_id}
                scopeType={card.scope_type}
                showFlipButton
              />
            </div>

            {/* Ação de Resgate / Claim */}
            <div className="max-w-sm mx-auto space-y-3">
              {card.status === "claimed" ? (
                <div className="p-4 rounded-lg bg-muted/40 border border-border/60 text-center space-y-2">
                  <span className="text-xs font-bold text-emerald-500 flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-4" /> Vale já adicionado à sua conta
                  </span>
                  <Button asChild className="w-full rounded-lg h-11 text-xs font-bold">
                    <Link to="/conta/gift-cards">Ver Meus Vales</Link>
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full rounded-lg h-14 min-h-14 font-extrabold text-sm sm:text-base bg-foreground text-background hover:bg-foreground/90  cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isClaiming ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      Vinculando à sua conta...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>Adicionar à Minha Conta {formatWz(card.wz_remaining)}</span>
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>
                  {card.scope_type === "MERCHANT"
                    ? `Crédito exclusivo para compras na ${card.issuer_name}.`
                    : "Crédito global para compras e serviços na Waesy."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
