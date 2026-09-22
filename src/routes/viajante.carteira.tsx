import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plane,
  Ticket,
  ShieldAlert,
  Hotel,
  QrCode,
  X,
  CheckCircle2,
  Maximize2,
  Download,
  Layers,
  ArrowLeft,
  WifiOff,
  Phone,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listClientWalletPasses } from "@/services/client-wallet.functions";
import type { ClientWalletPass, PassType } from "@/types/client-wallet";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { toast } from "sonner";

export const Route = createFileRoute("/viajante/carteira")({
  component: ViajanteCarteiraPage,
});

function getPassConfig(type: PassType) {
  switch (type) {
    case "boarding_pass":
      return { icon: Plane, label: "Embarque", bg: "bg-gradient-to-br from-zinc-900 to-zinc-950" };
    case "insurance":
      return { icon: ShieldAlert, label: "Seguro Viagem", bg: "bg-gradient-to-br from-zinc-900 to-zinc-950" };
    case "ticket":
      return { icon: Ticket, label: "Ingresso", bg: "bg-gradient-to-br from-zinc-900 to-zinc-950" };
    default:
      return { icon: Hotel, label: "Hospedagem", bg: "bg-gradient-to-br from-zinc-900 to-zinc-950" };
  }
}

const OFFLINE_STORAGE_KEY = "waesy_wallet_passes_offline_cache";

export default function ViajanteCarteiraPage() {
  const [selectedPass, setSelectedPass] = useState<ClientWalletPass | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [fullscreenQrPass, setFullscreenQrPass] = useState<ClientWalletPass | null>(null);
  const [cachedPasses, setCachedPasses] = useState<ClientWalletPass[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (saved) {
        setCachedPasses(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  const { data: serverPasses = [] } = useQuery({
    queryKey: ["client-wallet-passes"],
    queryFn: async () => {
      const res = await listClientWalletPasses({ data: {} });
      return res || [];
    },
  });

  useEffect(() => {
    if (serverPasses && serverPasses.length > 0) {
      try {
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(serverPasses));
        setCachedPasses(serverPasses);
      } catch (_) {}
    }
  }, [serverPasses]);

  const passes = serverPasses.length > 0 ? serverPasses : cachedPasses;
  const isServingOffline = serverPasses.length === 0 && cachedPasses.length > 0;

  const handleDownloadPdf = async (pass: ClientWalletPass) => {
    const elementId = `pass-card-${pass.id}`;
    const success = await exportElementAsPdf(elementId, `Voucher_${pass.barcode_value}`);
    if (success) {
      toast.success("Documento baixado");
    } else {
      toast.error("Não foi possível gerar o arquivo");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start p-4 sm:p-6 pb-24">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Top Bar Sóbria */}
        <div className="flex items-center justify-between">
          <Link
            to="/conta/viagens"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Viagens</span>
          </Link>

          <div className="flex items-center gap-2">
            {isServingOffline && (
              <Badge variant="outline" className="text-[10px] font-normal border-border text-muted-foreground">
                <WifiOff className="size-3 mr-1" />
                Offline
              </Badge>
            )}

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-medium border-border/60"
            >
              <a
                href="https://wa.me/5549999999999?text=Ol%C3%A1%2C%20preciso%20de%20atendimento%20sobre%20minha%20reserva."
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone className="size-3.5 mr-1.5 text-muted-foreground" />
                <span>Suporte</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Título Direto e Neutro (Sem slogans nem crachás prolixos) */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Documentos de Embarque
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bilhetes, confirmações e apólices emitidos
            </p>
          </div>

          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cartões
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* ── CONTEÚDO: CARTÕES OU LISTA ── */}
        {passes.length === 0 ? (
          <div className="w-full rounded-2xl border border-border/60 bg-card p-10 sm:p-14 text-center space-y-2">
            <Ticket className="size-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Nenhum documento disponível</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Os bilhetes e confirmações serão disponibilizados aqui após a emissão pela agência.
            </p>
          </div>
        ) : viewMode === "cards" ? (
          /* ── VISUALIZAÇÃO EM CARTÕES ── */
          <div className="relative pt-2 pb-24" style={{ perspective: "1200px" }}>
            {passes.map((pass, index) => {
              const config = getPassConfig(pass.pass_type);
              const Icon = config.icon;
              const isSelected = selectedPass?.id === pass.id;
              const isHidden = selectedPass && !isSelected;

              if (isHidden) return null;

              return (
                <div
                  key={pass.id}
                  id={`pass-card-${pass.id}`}
                  onClick={() => setSelectedPass(isSelected ? null : pass)}
                  className={`
                    w-full rounded-2xl p-6 text-white cursor-pointer transition-all duration-300 border border-border/40
                    ${config.bg}
                    ${isSelected ? "relative z-50 min-h-[500px]" : "h-48 mb-[-105px] hover:-translate-y-2"}
                  `}
                  style={{
                    transform: !isSelected
                      ? `translateY(${index * 8}px) scale(${1 - index * 0.02})`
                      : "none",
                    zIndex: isSelected ? 50 : 40 - index,
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
                      <Icon className="size-3.5" />
                      <span>{config.label}</span>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPdf(pass);
                          }}
                          className="size-7 rounded-md text-zinc-300 hover:text-white hover:bg-white/10"
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPass(null);
                          }}
                          className="size-7 rounded-md text-zinc-300 hover:text-white hover:bg-white/10"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <h2 className="text-lg sm:text-xl font-bold leading-tight">{pass.title}</h2>
                    <p className="text-zinc-400 text-xs mt-0.5">{pass.subtitle}</p>
                  </div>

                  {isSelected ? (
                    <div className="mt-6 bg-card text-card-foreground rounded-xl p-5 flex flex-col items-center border border-border/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFullscreenQrPass(pass);
                        }}
                        className="p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <QrCode className="size-32 text-foreground" strokeWidth={1.5} />
                      </button>

                      <div className="mt-2 text-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                          Código de Embarque
                        </span>
                        <p className="font-mono text-base font-bold text-foreground mt-0.5">
                          {pass.barcode_value}
                        </p>
                      </div>

                      <div className="mt-4 w-full flex justify-between items-center text-xs border-t border-border/60 pt-3">
                        <span className="text-muted-foreground">Status</span>
                        <span className="text-foreground font-medium flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="size-3.5 text-primary" />
                          Confirmado
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center text-[11px] text-zinc-400">
                      <span>Ver detalhes</span>
                      <span className="font-mono">{pass.barcode_value.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── VISUALIZAÇÃO EM LISTA ── */
          <div className="space-y-2.5">
            {passes.map((pass) => {
              const config = getPassConfig(pass.pass_type);
              const Icon = config.icon;

              return (
                <div
                  key={pass.id}
                  id={`pass-card-${pass.id}`}
                  className="rounded-xl border border-border/60 bg-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <Icon className="size-3" />
                        {config.label}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {pass.barcode_value}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {pass.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {pass.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPdf(pass)}
                      className="h-8 px-2.5 rounded-lg text-xs font-medium"
                    >
                      <Download className="size-3.5 mr-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setFullscreenQrPass(pass)}
                      className="h-8 px-3 rounded-lg text-xs font-medium"
                    >
                      Exibir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL DE APRESENTAÇÃO DE QR CODE (LIMPO) ── */}
      <Dialog
        open={Boolean(fullscreenQrPass)}
        onOpenChange={(open) => !open && setFullscreenQrPass(null)}
      >
        <DialogContent className="max-w-sm p-6 bg-card text-foreground rounded-2xl border border-border/60 shadow-lg text-center">
          <DialogHeader className="w-full text-center">
            <DialogTitle className="text-base font-bold text-foreground">
              Apresentação para Embarque
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Aproxime o código do leitor ótico
            </DialogDescription>
          </DialogHeader>

          {fullscreenQrPass && (
            <div className="my-4 p-4 bg-background rounded-xl border border-border/60 flex flex-col items-center">
              <QrCode className="size-48 text-foreground" strokeWidth={1.5} />
              <p className="mt-2 font-mono text-sm font-bold text-foreground">
                {fullscreenQrPass.barcode_value}
              </p>
            </div>
          )}

          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-foreground">
              {fullscreenQrPass?.title}
            </p>
            <Button
              onClick={() => setFullscreenQrPass(null)}
              variant="outline"
              className="w-full h-9 rounded-lg font-medium text-xs"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
