import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Info,
  ExternalLink,
  MessageCircle,
  Share2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MatchCardDTO,
  recordMatchSwipeAndAnalyzeFn,
  stitchMatchBrainToCustomerOrLeadFn,
} from "@/services/match-engine.functions";

interface OmniMatchDeckViewProps {
  storeId: string;
  storeName: string;
  storeSlug?: string;
  cards: MatchCardDTO[];
  visitorSessionId: string;
  whatsappNumber?: string;
  onFinishDeck?: () => void;
  accentColor?: string;
}

interface SwipeHistoryItem {
  card: MatchCardDTO;
  action: "like" | "pass" | "superlike";
}

export function OmniMatchDeckView({
  storeId,
  storeName,
  storeSlug,
  cards: initialCards,
  visitorSessionId,
  whatsappNumber,
  onFinishDeck,
}: OmniMatchDeckViewProps) {
  const [deck, setDeck] = useState<MatchCardDTO[]>(initialCards);
  const [history, setHistory] = useState<SwipeHistoryItem[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [detailCard, setDetailCard] = useState<MatchCardDTO | null>(null);

  const startPosRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef(Date.now());
  const cardElementRef = useRef<HTMLDivElement | null>(null);

  const currentCard = useMemo(() => {
    return deck[activeCardIndex] || null;
  }, [deck, activeCardIndex]);

  const isFinished = activeCardIndex >= deck.length;

  const likesCount = useMemo(() => {
    return history.filter((h) => h.action !== "pass").length;
  }, [history]);

  // Executa o swipe com registro assíncrono no backend
  const handleExecuteSwipe = useCallback(
    async (action: "like" | "pass" | "superlike") => {
      if (!currentCard) return;

      const dwellTimeMs = Date.now() - startTimeRef.current;
      const swipedCard = currentCard;

      setHistory((prev) => [{ card: swipedCard, action }, ...prev]);
      setActiveCardIndex((prev) => prev + 1);
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
      startTimeRef.current = Date.now();

      try {
        await recordMatchSwipeAndAnalyzeFn({
          data: {
            storeId,
            visitorSessionId,
            cardId: swipedCard.id,
            action,
            dwellTimeMs,
          },
        });
      } catch (err) {
        console.warn("[OmniMatch] Falha silenciosa ao registrar swipe:", err);
      }
    },
    [currentCard, storeId, visitorSessionId]
  );

  // Desfazer último swipe
  const handleUndo = useCallback(() => {
    if (history.length === 0 || activeCardIndex === 0) return;
    setHistory((prev) => prev.slice(1));
    setActiveCardIndex((prev) => Math.max(0, prev - 1));
    setDragOffset({ x: 0, y: 0 });
    startTimeRef.current = Date.now();
    toast.info("Ação desfeita");
  }, [history, activeCardIndex]);

  // Teclas de atalho para acessibilidade WCAG
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSummaryModal || detailCard) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleExecuteSwipe("pass");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleExecuteSwipe("like");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleExecuteSwipe("superlike");
      } else if (e.key === "Backspace" || (e.ctrlKey && e.key === "z")) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExecuteSwipe, handleUndo, showSummaryModal, detailCard]);

  // FÍSICA DE ARRASTO 60FPS VIA POINTER EVENTS (TOUCH/MOUSE UNIFICADOS)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isFinished) return;
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const threshold = 90;
    if (dragOffset.x > threshold) {
      handleExecuteSwipe("like");
    } else if (dragOffset.x < -threshold) {
      handleExecuteSwipe("pass");
    } else if (dragOffset.y < -threshold * 1.5) {
      handleExecuteSwipe("superlike");
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Envio de formulário de contato e abertura do WhatsApp com roteiro
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || leadPhone.length < 8) {
      toast.error("Informe seu nome e telefone para contato.");
      return;
    }

    setIsSubmittingLead(true);
    try {
      await stitchMatchBrainToCustomerOrLeadFn({
        data: {
          storeId,
          visitorSessionId,
          fullName: leadName.trim(),
          phone: leadPhone.trim(),
        },
      });

      toast.success("Perfil sincronizado com o consultor!");
      setShowSummaryModal(false);

      if (whatsappNumber) {
        const cleanPhone = whatsappNumber.replace(/\D/g, "");
        const matchedTitles = history
          .filter((h) => h.action !== "pass")
          .map((h) => `• ${h.card.title}`)
          .slice(0, 4)
          .join("\n");

        const msg = encodeURIComponent(
          `Olá ${storeName}! Meu nome é ${leadName.trim()}.\nAcabei de explorar o OmniMatch e selecionei meus favoritos:\n${matchedTitles}\n\nPode me enviar mais detalhes e cotação?`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar com o WhatsApp.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Ângulo de rotação dinâmico baseado no arrasto horizontal
  const rotationAngle = (dragOffset.x / 20).toFixed(2);
  const opacityLike = Math.min(1, Math.max(0, dragOffset.x / 80));
  const opacityPass = Math.min(1, Math.max(0, -dragOffset.x / 80));
  const opacitySuper = Math.min(1, Math.max(0, -dragOffset.y / 100));

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-96 max-w-sm mx-auto select-none px-4 py-2">
      {/* ── BARRA SUPERIOR DE PROGRESSO E AÇÃO ── */}
      <div className="w-full flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground">
            {isFinished ? "Concluído" : `Opção ${activeCardIndex + 1} de ${deck.length}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && !isFinished && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              aria-label="Desfazer último swipe"
              className="h-11 min-h-11 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="size-3.5" />
              <span>Desfazer</span>
            </Button>
          )}

          <Badge variant="secondary" className="text-xs font-bold font-mono">
            {likesCount} matches
          </Badge>
        </div>
      </div>

      {/* ── PALCO CENTRAL DE CARTAS INTERATIVAS ── */}
      <div className="relative w-full aspect-3/4 max-h-120 flex items-center justify-center my-auto">
        {isFinished ? (
          /* ESTADO FINAL: RESUMO DO PERFIL DESCOBERTO */
          <div className="w-full h-full rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-between text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-3 my-auto">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="size-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Seu Perfil foi Mapeado!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Analisamos suas escolhas e identificamos as melhores ofertas e roteiros sob medida para o seu estilo.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {history
                  .filter((h) => h.action !== "pass")
                  .slice(0, 3)
                  .map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs px-2 py-1">
                      {h.card.title}
                    </Badge>
                  ))}
              </div>
            </div>

            <div className="w-full space-y-2 pt-2">
              <Button
                type="button"
                onClick={() => setShowSummaryModal(true)}
                className="w-full h-11 min-h-11 font-bold text-xs gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="size-4" />
                <span>Receber Roteiro no WhatsApp</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveCardIndex(0);
                  setHistory([]);
                }}
                className="w-full h-11 min-h-11 font-medium text-xs rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Recomeçar Escolhas
              </Button>
            </div>
          </div>
        ) : (
          /* CARTÃO ATIVO COM FÍSICA DE POINTER 60FPS */
          currentCard && (
            <div
              ref={cardElementRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotationAngle}deg)`,
                touchAction: "none",
              }}
              className={cn(
                "absolute inset-0 rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing",
                isDragging ? "transition-none" : "transition-transform duration-200 ease-out"
              )}
            >
              {/* INDICADORES VISUAIS DE SWIPE NA TELA (LIKE / PASS / SUPER) */}
              {opacityLike > 0.1 && (
                <div
                  style={{ opacity: opacityLike }}
                  className="absolute top-4 left-4 z-20 px-3 py-1 border-2 border-emerald-500 text-emerald-500 rounded-lg font-black text-sm uppercase tracking-widest bg-emerald-500/10 pointer-events-none -rotate-12"
                >
                  CURTI
                </div>
              )}
              {opacityPass > 0.1 && (
                <div
                  style={{ opacity: opacityPass }}
                  className="absolute top-4 right-4 z-20 px-3 py-1 border-2 border-rose-500 text-rose-500 rounded-lg font-black text-sm uppercase tracking-widest bg-rose-500/10 pointer-events-none rotate-12"
                >
                  PASSO
                </div>
              )}
              {opacitySuper > 0.1 && (
                <div
                  style={{ opacity: opacitySuper }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 z-20 px-4 py-1 border-2 border-warning text-warning rounded-lg font-black text-sm uppercase tracking-widest bg-warning/10 pointer-events-none"
                >
                  SUPER LIKE
                </div>
              )}

              {/* IMAGEM DE CAPA COM ASPECT RATIO CONTROLADO */}
              <div className="relative w-full h-3/5 bg-muted overflow-hidden">
                {currentCard.coverImageUrl ? (
                  <img
                    src={currentCard.coverImageUrl}
                    alt={currentCard.title}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground p-4">
                    <Sparkles className="size-12 opacity-30" />
                  </div>
                )}

                {/* BADGE DE TIPO OU AFINIDADE */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                  {currentCard.badge && (
                    <Badge className="bg-background/90 text-foreground backdrop-blur-sm text-xs font-bold border border-border">
                      {currentCard.badge}
                    </Badge>
                  )}
                  {currentCard.cardKind !== "trade_off" && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Oferta Exclusiva
                    </Badge>
                  )}
                </div>
              </div>

              {/* CONTEÚDO DESCRITIVO INFERIOR */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2 bg-card">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground leading-snug tracking-tight">
                    {currentCard.title}
                  </h4>
                  {currentCard.subtitle && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {currentCard.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailCard(currentCard)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
                  >
                    <Info className="size-3.5" />
                    <span>Detalhes</span>
                  </Button>

                  <span className="text-xs font-mono text-muted-foreground">
                    Arraste para decidir
                  </span>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── BOTÕES TÁTEIS CANÔNICOS INFERIORES (PISO 44PX WCAG 2.2 AA) ── */}
      {!isFinished && (
        <div className="w-full flex items-center justify-center gap-3 pt-3">
          {/* BOTÃO DISLIKE / PASS */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleExecuteSwipe("pass")}
            aria-label="Passar opção (não gostei)"
            className="size-12 rounded-full border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-6" />
          </Button>

          {/* BOTÃO SUPER LIKE */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handleExecuteSwipe("superlike")}
            aria-label="Super Like (amei muito)"
            className="size-11 rounded-full border border-warning/30 text-warning hover:bg-warning/10 hover:text-warning transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className="size-5" />
          </Button>

          {/* BOTÃO LIKE */}
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={() => handleExecuteSwipe("like")}
            aria-label="Curtir opção (quero este)"
            className="size-12 rounded-full bg-emerald-600 text-primary-foreground hover:bg-emerald-700 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Heart className="size-6 fill-current" />
          </Button>
        </div>
      )}

      {/* ── MODAL DE DETALHES DA CARTA ── */}
      <Dialog open={Boolean(detailCard)} onOpenChange={(open) => !open && setDetailCard(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {detailCard?.title}
            </DialogTitle>
            {detailCard?.badge && (
              <DialogDescription className="text-xs text-muted-foreground">
                {detailCard.badge}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {detailCard?.coverImageUrl && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                <img
                  src={detailCard.coverImageUrl}
                  alt={detailCard.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
              {detailCard?.subtitle || "Sem descrição adicional informada."}
            </p>

            {detailCard?.tradeOffAxis && (
              <div className="p-3 rounded-lg bg-muted border border-border text-xs space-y-1">
                <div className="font-bold text-foreground">Eixo de Preferência:</div>
                <div className="text-muted-foreground capitalize">
                  {detailCard.tradeOffAxis.replace(/_/g, " ")}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailCard(null)}
              className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CAPTAÇÃO DE LEAD / WHATSAPP STITCHING ── */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Receber Roteiro Personalizado
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Preencha para que nossa equipe monte sua proposta sob medida no WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLeadSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lead-name" className="text-xs font-semibold text-foreground">
                Seu Nome Completo
              </Label>
              <Input
                id="lead-name"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="h-11 min-h-11 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-phone" className="text-xs font-semibold text-foreground">
                WhatsApp com DDD
              </Label>
              <Input
                id="lead-phone"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 min-h-11 text-xs rounded-xl"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSummaryModal(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSubmittingLead}
                className="h-11 min-h-11 px-5 text-xs font-bold gap-2 rounded-xl"
              >
                {isSubmittingLead ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <MessageCircle className="size-4" />
                )}
                <span>Abrir WhatsApp</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
