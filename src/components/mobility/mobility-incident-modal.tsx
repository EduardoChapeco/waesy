import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LifeBuoy, PackageOpen, ShieldAlert, AlertCircle, Phone, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitMobilityIncidentReport } from "@/services/mobility.functions";
import { toast } from "sonner";

interface MobilityIncidentModalProps {
  requestId: string | null;
  driverName?: string;
  defaultType?: "lost_item" | "property_damage" | "safety_concern" | "route_dispute" | "helper_issue";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const INCIDENT_TYPES = [
  {
    id: "lost_item",
    label: "Esqueci um item / objeto no veículo",
    desc: "Carteira, celular, chave, documento ou sacola esquecida.",
    icon: PackageOpen,
  },
  {
    id: "safety_concern",
    label: "Segurança ou conduta do parceiro",
    desc: "Problema com direção perigosa, desrespeito ou comportamento.",
    icon: ShieldAlert,
  },
  {
    id: "route_dispute",
    label: "Contestação de rota ou cobrança",
    desc: "Divergência de trajeto, paradas extras ou valor cobrado.",
    icon: AlertCircle,
  },
  {
    id: "property_damage",
    label: "Avaria ou dano à carga/pacote",
    desc: "Item danificado durante o transporte ou entrega.",
    icon: AlertCircle,
  },
];

export function MobilityIncidentModal({
  requestId,
  driverName = "Condutor",
  defaultType = "lost_item",
  isOpen,
  onOpenChange,
}: MobilityIncidentModalProps) {
  const [incidentType, setIncidentType] = useState<any>(defaultType);
  const [title, setTitle] = useState(
    defaultType === "lost_item"
      ? "Objeto esquecido no veículo"
      : "Relato de suporte contextual",
  );
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const reportMutation = useMutation({
    mutationFn: () =>
      submitMobilityIncidentReport({
        data: {
          mobilityRequestId: requestId!,
          incidentType,
          title: title.trim(),
          description: description.trim(),
          contactPhone: contactPhone.trim() || undefined,
        },
      }),
    onSuccess: (res: any) => {
      setIsSuccess(true);
      setTicketId(res.report?.id?.slice(0, 8) || "GO-SUP");
      toast.success("Protocolo aberto na Central de Ajuda Waesy Go.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao registrar incidente.");
    },
  });

  const handleSubmit = () => {
    if (!requestId) return;
    if (!description.trim() || description.trim().length < 10) {
      toast.error("Por favor, descreva detalhadamente a situação (mínimo 10 caracteres).");
      return;
    }
    reportMutation.mutate();
  };

  const handleClose = () => {
    setIsSuccess(false);
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-6 bg-card border border-border">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
              <LifeBuoy className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">
                Central de Ajuda & Suporte Waesy Go
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Atendimento intermediado para a viagem com {driverName}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                Protocolo #{ticketId?.toUpperCase()} Aberto
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Nossa equipe de mediação e o condutor parceiro foram notificados através do canal seguro. Você receberá atualizações por WhatsApp e no app.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleClose}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold bg-foreground text-background"
            >
              Concluir
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 text-xs">
            {/* Seletor de Tipo */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                O que aconteceu?
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {INCIDENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = incidentType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setIncidentType(t.id);
                        if (t.id === "lost_item") setTitle("Objeto esquecido no veículo");
                        else if (t.id === "safety_concern") setTitle("Preocupação com segurança");
                        else if (t.id === "route_dispute") setTitle("Contestação de trajeto ou valor");
                        else setTitle("Avaria em pacote ou móvel");
                      }}
                      className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                        isSelected
                          ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                          : "bg-muted/20 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Icon className="size-4 shrink-0 mt-1" />
                      <div>
                        <span className="block leading-tight">{t.label}</span>
                        <span className={`text-xs font-normal block ${isSelected ? "text-background/80" : "text-muted-foreground"}`}>
                          {t.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descrição Detalhada */}
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descreva o ocorrido
              </Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  incidentType === "lost_item"
                    ? "Ex: Deixei uma jaqueta preta no banco de trás do carro por volta das 14h..."
                    : "Explique com clareza o que houve para podermos te ajudar..."
                }
                className="rounded-lg p-3 text-xs bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>

            {/* Telefone de Contato para Intermediação */}
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Telefone para contato / retorno
              </Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 min-h-11 px-3 rounded-lg text-xs bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-snug">
              Para resguardar a privacidade de ambas as partes, o canal de comunicação é mediado pela plataforma sem exposição indevida de dados pessoais sensíveis.
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 min-h-11 rounded-lg text-xs font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={reportMutation.isPending}
                className="flex-1 h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              >
                {reportMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <span>Registrar Chamado</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
