import * as React from "react";
import {
  UserCheck,
  Edit3,
  Save,
  Printer,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Users,
  Info,
  Clock,
  Sparkles,
  Plane,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TravelerDossier } from "@/types/travel-dossier";
import { DestinationRegulatoryAlertWidget } from "@/components/tourism/crm/DestinationRegulatoryAlertWidget";

export type TravelerDossierItem = Partial<TravelerDossier> & {
  name?: string;
  passport_expiry?: string;
  rg_issue_date?: string;
};

export interface Customer360EditableCardProps {
  customer: {
    id: string;
    fullName: string;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    birthDate?: string | null;
    notes?: string | null;
    score?: number;
  };
  destination?: string;
  travelDate?: string;
  travelers?: TravelerDossierItem[];
  onSaveCustomer?: (updated: {
    fullName: string;
    taxId: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    birthDate: string;
    notes: string;
  }) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function Customer360EditableCard({
  customer,
  destination = "",
  travelDate,
  travelers = [],
  onSaveCustomer,
  disabled = false,
  className,
}: Customer360EditableCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    fullName: customer.fullName || "",
    taxId: customer.taxId || "",
    email: customer.email || "",
    phone: customer.phone || "",
    city: customer.city || "",
    state: customer.state || "",
    birthDate: customer.birthDate || "",
    notes: customer.notes || "",
  });

  // Auditoria de Validade de Documentos do Titular e Acompanhantes
  const documentAlerts = React.useMemo(() => {
    const alerts: Array<{ travelerName: string; type: "passport" | "rg"; message: string; severity: "danger" | "warning" }> = [];
    const targetRefDate = travelDate ? new Date(travelDate) : new Date();

    travelers.forEach((t) => {
      const name = t.name || t.full_name || "Passageiro";
      const passportExp = t.passport_expiry || t.passport_expiry_date;
      // Checar Passaporte (< 6 meses de validade da viagem)
      if (passportExp) {
        const expiry = new Date(passportExp);
        const sixMonthsBeforeExpiry = new Date(expiry.getTime() - 180 * 24 * 60 * 60 * 1000);
        if (expiry.getTime() < targetRefDate.getTime()) {
          alerts.push({
            travelerName: name,
            type: "passport",
            message: `Passaporte ${t.passport_number || ""} vencido em ${expiry.toLocaleDateString("pt-BR")}. Embarque será recusado!`,
            severity: "danger",
          });
        } else if (targetRefDate.getTime() > sixMonthsBeforeExpiry.getTime()) {
          alerts.push({
            travelerName: name,
            type: "passport",
            message: `Passaporte vence em ${expiry.toLocaleDateString("pt-BR")} (menos de 6 meses da viagem). Risco de recusa na imigração.`,
            severity: "danger",
          });
        }
      }

      // Checar RG (> 10 anos de emissão)
      if (t.rg_issue_date) {
        const issue = new Date(t.rg_issue_date);
        const tenYearsAgo = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000);
        if (issue.getTime() < tenYearsAgo.getTime()) {
          alerts.push({
            travelerName: name,
            type: "rg",
            message: `RG emitido há mais de 10 anos (${issue.toLocaleDateString("pt-BR")}). Para viagens Mercosul, recomenda-se 2ª via atualizada ou Passaporte.`,
            severity: "warning",
          });
        }
      }
    });

    return alerts;
  }, [travelers, travelDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveCustomer) return;
    setIsSaving(true);
    try {
      await onSaveCustomer(form);
      setIsEditing(false);
      toast.success("Ficha do cliente atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar ficha.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* ── CARD PRINCIPAL DO CLIENTE COM ATALHOS ── */}
      <div className="p-6 rounded-2xl border border-border/80 bg-card space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              <UserCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-foreground">{form.fullName}</h3>
                <Badge variant="outline" className="text-2xs font-mono font-bold text-emerald-600 border-emerald-500/30">
                  Cliente Carteira 360°
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">ID do Cliente: {customer.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintDossier}
              className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Imprimir ou baixar PDF da ficha do cliente"
            >
              <Printer className="size-4" />
              <span>Baixar Ficha (PDF)</span>
            </Button>

            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setIsEditing(true)}
                className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Edit3 className="size-4" />
                <span>Editar Ficha</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-11 min-h-11 px-3 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Formulário de Edição Inline */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Nome Completo</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">CPF / Documento</Label>
                <Input
                  value={form.taxId}
                  onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                  placeholder="000.000.000-00"
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Telefone Celular / WhatsApp</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="cliente@exemplo.com"
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Cidade</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Ex: São Miguel do Oeste"
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Estado (UF)</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="SC"
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-11 min-h-11 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Save className="size-4" />
                <span>{isSaving ? "Salvando..." : "Salvar Dados Cadastrais"}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
              <span className="text-2xs font-mono font-bold uppercase text-muted-foreground block">
                Documento / CPF
              </span>
              <p className="font-mono font-bold text-foreground">{form.taxId || "Não informado"}</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
              <span className="text-2xs font-mono font-bold uppercase text-muted-foreground block">
                Contato Principal
              </span>
              <p className="font-semibold text-foreground">{form.phone || form.email || "Não informado"}</p>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
              <span className="text-2xs font-mono font-bold uppercase text-muted-foreground block">
                Localização
              </span>
              <p className="font-semibold text-foreground">
                {form.city ? `${form.city}${form.state ? ` - ${form.state}` : ""}` : "Brasil"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── ALERTA DE INTELIGÊNCIA DE DESTINO & TAXAS REGULATÓRIAS ── */}
      <DestinationRegulatoryAlertWidget destination={destination} />

      {/* ── RADAR DE DOCUMENTOS A VENCER (AVISOS VISUAIS) ── */}
      {documentAlerts.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/5 space-y-3">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Avisos Importantes de Documentação ({documentAlerts.length})</span>
          </div>
          <div className="space-y-2">
            {documentAlerts.map((alt, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg border text-xs flex items-start gap-2",
                  alt.severity === "danger"
                    ? "border-rose-500/40 bg-background text-rose-700 dark:text-rose-400"
                    : "border-warning/40 bg-background text-warning",
                )}
              >
                <AlertTriangle className="size-4 shrink-0 mt-1" />
                <div className="space-y-1">
                  <span className="font-bold block">{alt.travelerName}</span>
                  <p className="text-2xs text-muted-foreground">{alt.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FICHA DOS DEMAIS VIAJANTES / ACOMPANHANTES DA VIAGEM ── */}
      <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Acompanhantes & Passageiros Vinculados ({travelers.length})
            </h4>
          </div>
        </div>

        {travelers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nenhum acompanhante cadastrado nesta viagem além do titular.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {travelers.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground truncate">{t.name || t.full_name}</span>
                  {t.is_primary && (
                    <Badge variant="secondary" className="text-3xs font-mono font-bold uppercase">
                      Titular
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs text-muted-foreground">
                  <div>
                    CPF: <span className="font-mono text-foreground">{t.document_cpf || "Não inf."}</span>
                  </div>
                  <div>
                    Nascimento:{" "}
                    <span className="font-mono text-foreground">
                      {t.birth_date ? new Date(t.birth_date).toLocaleDateString("pt-BR") : "Não inf."}
                    </span>
                  </div>
                  <div>
                    Passaporte:{" "}
                    <span className="font-mono text-foreground">{t.passport_number || "Não inf."}</span>
                  </div>
                  <div>
                    Validade:{" "}
                    <span className="font-mono text-foreground">
                      {t.passport_expiry || t.passport_expiry_date
                        ? new Date(t.passport_expiry || t.passport_expiry_date!).toLocaleDateString("pt-BR")
                        : "Não inf."}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
