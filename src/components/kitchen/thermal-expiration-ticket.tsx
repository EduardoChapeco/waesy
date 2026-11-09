import { useState } from "react";
import { Printer, Calendar, Clock, Thermometer, User, Hash, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ThermalExpirationTicketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  batchCode?: string;
  manufacturedAt?: string;
  expiresAt: string;
  storageTemperature?: string;
  responsibleName?: string;
  storeName?: string;
  nicheId?: string;
}

export function ThermalExpirationTicketModal({
  open,
  onOpenChange,
  title,
  batchCode = "LOTE-PADRAO",
  manufacturedAt = new Date().toISOString(),
  expiresAt,
  storageTemperature = "Refrigerado 0°C a 4°C",
  responsibleName = "Cozinha",
  storeName = "Waesy Operações",
  nicheId = "gastronomy",
}: ThermalExpirationTicketProps) {
  const [printSize, setPrintSize] = useState<"58mm" | "80mm">("80mm");
  const defaultTemplate =
    nicheId === "services" || nicheId === "health_beauty"
      ? "service"
      : nicheId === "automotive" || nicheId === "retail"
        ? "kit"
        : "anvisa";
  const [templateMode, setTemplateMode] = useState<"anvisa" | "service" | "kit">(defaultTemplate);
  const templateMeta = {
    anvisa: {
      subtitle: "Controle de Alimento Manipulado (ANVISA RDC 216)",
      itemLabel: "Produto / Preparo:",
      dateLabel: "MANIPULAÇÃO:",
      operatorLabel: "Manipulador:",
      footerNote: "Consumir dentro do prazo de validade sanitária",
    },
    service: {
      subtitle: "Controle de Lote Aberto / Esterilização",
      itemLabel: "Insumo / Frasco / Kit:",
      dateLabel: "ABERTURA / PREPARO:",
      operatorLabel: "Profissional:",
      footerNote: "Uso exclusivo profissional dentro da validade",
    },
    kit: {
      subtitle: "Rastreabilidade de Ordem de Produção / Kit",
      itemLabel: "Sub-Receita / Kit Montado:",
      dateLabel: "PRODUÇÃO:",
      operatorLabel: "Operador:",
      footerNote: "Rastreabilidade interna de lote Kardex",
    },
  }[templateMode];

  const formattedManufactured = new Date(manufacturedAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedExpires = new Date(expiresAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
    toast.success("Comando de impressão enviado para impressora térmica!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-card rounded-lg border border-border shadow-md">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="size-4 text-primary" />
              <span>Etiqueta Térmica de Validade</span>
            </DialogTitle>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrintSize("58mm")}
                className={`h-11 min-h-11 text-2xs font-mono font-bold px-3 rounded-md border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  printSize === "58mm" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPrintSize("80mm")}
                className={`h-11 min-h-11 text-2xs font-mono font-bold px-3 rounded-md border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  printSize === "80mm" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                }`}
              >
                80mm
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {(
              [
                { id: "anvisa", label: "ANVISA Alimentar" },
                { id: "service", label: "Lote Químico / Cabine" },
                { id: "kit", label: "Kit / Produção" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTemplateMode(opt.id)}
                className={`h-11 min-h-11 px-3 rounded-md border text-2xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  templateMode === opt.id
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-muted/30 text-muted-foreground border-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">{templateMeta.subtitle}</DialogDescription>
          {false && (<>
            <div className="hidden"><div>
              <button
                type="button"
                onClick={() => setPrintSize("58mm")}
                className={`text-2xs font-mono font-bold px-2 py-1 rounded border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  printSize === "58mm" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPrintSize("80mm")}
                className={`text-2xs font-mono font-bold px-2 py-1 rounded border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  printSize === "80mm" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                }`}
              >
                80mm
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Conforme as normas sanitárias da Anvisa para alimentos preparados e manipulados.
          </DialogDescription>
          </>)}
        </DialogHeader>

        {/* ── Prévia do Ticket Térmico ── */}
        <div className="py-4 flex justify-center bg-muted/30 rounded-lg border border-dashed border-border/70 overflow-hidden">
          <div
            id="thermal-print-area"
            className={`bg-card text-foreground p-4 rounded-lg border border-border/80 shadow-2xs font-mono select-none min-h-56 ${
              printSize === "58mm" ? "w-56 text-2xs" : "w-72 text-xs"
            }`}
          >
            {/* Cabeçalho */}
            <div className="text-center pb-2 border-b border-border/80 space-y-1">
              <p className="font-extrabold uppercase tracking-tight text-xs text-foreground">{storeName}</p>
              <p className="text-2xs uppercase text-muted-foreground">{templateMeta.subtitle}</p>
            </div>

            {/* Produto */}
            <div className="py-2 text-center border-b border-border/80">
              <p className="text-2xs uppercase text-muted-foreground">{templateMeta.itemLabel}</p>
              <p className="text-sm font-black uppercase tracking-tight mt-1 text-foreground">{title}</p>
              <p className="text-2xs mt-1 font-bold text-muted-foreground font-mono">LOTE: {batchCode}</p>
            </div>

            {/* Datas */}
            <div className="py-2 space-y-2 border-b border-border/80 text-2xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="font-bold">{templateMeta.dateLabel}</span>
                <span className="font-mono text-foreground">{formattedManufactured}</span>
              </div>
              <div className="flex justify-between items-center font-black text-xs text-foreground">
                <span>VALIDADE:</span>
                <span className="underline font-mono">{formattedExpires}</span>
              </div>
            </div>

            {/* Conservação & Manipulador */}
            <div className="pt-2 text-2xs space-y-1">
              <p className="font-bold uppercase text-foreground">Conservação: {storageTemperature}</p>
              <p className="text-muted-foreground">{templateMeta.operatorLabel} <span className="text-foreground">{responsibleName}</span></p>
              <div className="mt-2 pt-2 border-t border-dashed border-border/70 flex items-center justify-between text-3xs font-mono text-muted-foreground">
                <span>RASTREIO KARDEX</span>
                <span className="font-bold text-foreground">#{batchCode}</span>
              </div>
              <p className="text-center text-3xs pt-1 text-muted-foreground uppercase">
                {templateMeta.footerNote}
              </p>
              {false && (
              <p className="text-center text-3xs pt-1 text-muted-foreground uppercase">
                Consumir dentro do prazo de validade
              </p>)}
              <p>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="default"
            className="h-11 min-h-11 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            <span>Imprimir Etiqueta</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
