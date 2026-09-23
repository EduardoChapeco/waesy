import { useState, useEffect } from "react";
import { Users, Plus, Trash2, ShieldCheck, Clock, CheckCircle2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyField } from "@/components/ui/currency-field";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import {
  listEventStaffAllocations,
  saveEventStaffAllocation,
} from "@/services/events.functions";
import { listContractors } from "@/services/admin-team.functions";

interface AlocarEquipeSheetProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TURNOS = [
  { value: "manha", label: "Manhã (08h - 14h)" },
  { value: "tarde", label: "Tarde (14h - 20h)" },
  { value: "noite", label: "Noite (20h - 02h)" },
  { value: "integral", label: "Turno Integral" },
];

export function AlocarEquipeSheet({
  eventId,
  open,
  onOpenChange,
}: AlocarEquipeSheetProps) {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [shiftName, setShiftName] = useState("manha");
  const [remunerationCents, setRemunerationCents] = useState(15000);
  const [notes, setNotes] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [allocData, contData] = await Promise.all([
        listEventStaffAllocations({ data: { eventId } }).catch(() => []),
        listContractors().catch(() => []),
      ]);
      setAllocations(allocData || []);
      setContractors(contData || []);
    } catch (err) {
      console.error("Erro ao carregar escala da equipe:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, eventId]);

  const handleContractorChange = (contractorId: string) => {
    setSelectedContractorId(contractorId);
    if (!contractorId) return;

    const found = contractors.find((c) => c.id === contractorId);
    if (found) {
      if (!roleTitle) {
        const categoryLabels: Record<string, string> = {
          seguranca: "Segurança / Vigilante",
          limpeza: "Equipe de Limpeza",
          buffet: "Buffet / Gastronomia",
          som_iluminacao: "Técnico de Som & Luz",
          fotografia: "Fotógrafo / Videomaker",
          cenografia: "Cenografia & Palco",
          brigadistas: "Brigadista de Incêndio",
          atendimento: "Recepcionista / Hostess",
        };
        setRoleTitle(categoryLabels[found.service_category] || found.name);
      }
      if (found.fixed_fee_cents && found.fixed_fee_cents > 0) {
        setRemunerationCents(found.fixed_fee_cents);
      }
    }
  };

  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      toast.error("Informe a função/posto da alocação.");
      return;
    }

    setSaving(true);
    try {
      await saveEventStaffAllocation({
        data: {
          eventId,
          contractorId: selectedContractorId || undefined,
          roleTitle: roleTitle.trim(),
          shiftName,
          remunerationCents,
          isConfirmed: true,
          notes: notes || undefined,
        },
      });

      toast.success("Membro de equipe alocado com sucesso!");
      setSelectedContractorId("");
      setRoleTitle("");
      setNotes("");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alocar equipe.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <SheetTitle className="text-base font-bold">Escala de Equipe & Staff</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Alocação de coordenadores, seguranças, recepcionistas, caixas e parceiros terceirizados.
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {/* Formulário Rápido de Alocação */}
          <form onSubmit={handleAddAllocation} className="p-4 bg-muted/20 border border-border/60 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-bold text-foreground">Alocar Novo Colaborador / Terceirizado</h4>

            {contractors.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="staff-contractor" className="text-xs">
                  Vincular Terceirizado Cadastrado (Opcional)
                </Label>
                <select
                  id="staff-contractor"
                  value={selectedContractorId}
                  onChange={(e) => handleContractorChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
                >
                  <option value="">Nenhum (Posto Avulso / Equipe Direta)</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.service_category} {c.fixed_fee_cents ? `(${formatMoney(c.fixed_fee_cents)})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="staff-role" className="text-xs">Função / Posto de Trabalho *</Label>
              <Input
                id="staff-role"
                required
                placeholder="Ex: Coordenador de Portaria, Bartender ou Segurança VIP"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-shift" className="text-xs">Turno de Trabalho</Label>
                <select
                  id="staff-shift"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
                >
                  {TURNOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="staff-diaria" className="text-xs">Diária / Cachê (R$)</Label>
                <CurrencyField
                  value={remunerationCents}
                  onChange={(val) => setRemunerationCents(val || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-notes" className="text-xs">Observações / Instruções</Label>
              <Input
                id="staff-notes"
                placeholder="Ex: Traje todo preto, rádio canal 4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <Button type="submit" disabled={saving} size="sm" className="w-full font-bold gap-1.5 h-9">
              <Plus className="size-4" />
              {saving ? "Alocando..." : "Confirmar Alocação"}
            </Button>
          </form>

          {/* Lista de Alocações Atuais */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Equipe Alocada ({allocations.length})
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Total Cachês: {formatMoney(allocations.reduce((acc, a) => acc + (a.remuneration_cents || 0), 0))}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Carregando escala...</p>
            ) : allocations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-xl">
                Nenhum membro escalado para este evento ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {allocations.map((item) => (
                  <Card key={item.id} className="p-3 bg-card border border-border/60 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {item.role_title}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {item.shift_name}
                        </Badge>
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {formatMoney(item.remuneration_cents || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>
                        {item.contractor?.name || item.employee?.full_name || "Colaborador Avulso"}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="size-3" /> Confirmado
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded">
                        {item.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
