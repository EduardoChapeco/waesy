import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertClassified } from "@/services/classifieds.functions";

interface WorkspaceClassifiedEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "negocio" | "doacao";
  storeId?: string;
  editItem?: any | null;
  onSaved?: () => void;
}

const BUSINESS_SEGMENTS = [
  "Restaurante & Gastronomia",
  "Varejo & Moda",
  "Mercado & Conveniência",
  "Agência de Turismo",
  "Saúde & Estética",
  "Serviços Automotivos",
  "Tecnologia & SaaS",
  "Outro Segmento",
];

function centsToInput(cents: number | null | undefined): string {
  if (!cents || Number(cents) <= 0) return "";
  return (Number(cents) / 100).toFixed(2).replace(".", ",");
}

function inputToCents(raw: string): number {
  const digits = String(raw || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

export function WorkspaceClassifiedEditorDialog({
  open,
  onOpenChange,
  mode,
  storeId,
  editItem,
  onSaved,
}: WorkspaceClassifiedEditorDialogProps) {
  const isBusiness = mode === "negocio";
  const isEditing = Boolean(editItem?.id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [locationName, setLocationName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "completed" | "draft">("active");
  const [valuationText, setValuationText] = useState("");
  const [monthlyRevenueText, setMonthlyRevenueText] = useState("");
  const [netProfitText, setNetProfitText] = useState("");
  const [businessSegment, setBusinessSegment] = useState(BUSINESS_SEGMENTS[0]);
  const [commercialPointType, setCommercialPointType] = useState("");
  const [requiresNda, setRequiresNda] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const attrs = editItem?.attributes || {};
    setTitle(editItem?.title || "");
    setContent(editItem?.content || "");
    setLocationName(editItem?.location_name || "");
    setWhatsapp(editItem?.contact_whatsapp || editItem?.whatsapp || "");
    setStatus(
      editItem?.status === "paused" || editItem?.status === "completed" || editItem?.status === "draft"
        ? editItem.status
        : "active",
    );
    setValuationText(centsToInput(attrs.valuation_cents ?? editItem?.price_cents));
    setMonthlyRevenueText(centsToInput(attrs.monthly_revenue_cents));
    setNetProfitText(centsToInput(attrs.net_profit_cents));
    setBusinessSegment(attrs.business_segment || BUSINESS_SEGMENTS[0]);
    setCommercialPointType(attrs.commercial_point_type || "");
    setRequiresNda(attrs.requires_nda ?? attrs.is_confidential ?? true);
  }, [open, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (cleanTitle.length < 3) {
      toast.error("Informe um título com pelo menos 3 caracteres.");
      return;
    }
    if (cleanContent.length < 10) {
      toast.error("Descreva os detalhes com pelo menos 10 caracteres.");
      return;
    }

    setIsSaving(true);
    try {
      const existingAttrs = editItem?.attributes || {};
      const valuationCents = isBusiness ? inputToCents(valuationText) : 0;
      const monthlyRevenueCents = isBusiness ? inputToCents(monthlyRevenueText) : 0;
      const netProfitCents = isBusiness ? inputToCents(netProfitText) : 0;

      await upsertClassified({
        data: {
          id: editItem?.id || undefined,
          store_id: storeId || null,
          title: cleanTitle,
          content: cleanContent,
          category: isBusiness ? "business" : "donation",
          deal_type: isBusiness ? "repasse" : "doacao",
          price_cents: valuationCents,
          location_name: locationName.trim() || null,
          whatsapp: whatsapp.trim() || null,
          contact_whatsapp: whatsapp.trim() || null,
          status,
          images: Array.isArray(editItem?.images) ? editItem.images : [],
          negotiable: isBusiness,
          attributes: isBusiness
            ? {
                ...existingAttrs,
                niche: "negocio",
                is_business_sale: true,
                valuation_cents: valuationCents,
                monthly_revenue_cents: monthlyRevenueCents || undefined,
                net_profit_cents: netProfitCents || undefined,
                business_segment: businessSegment,
                commercial_point_type: commercialPointType.trim() || undefined,
                requires_nda: requiresNda,
                is_confidential: requiresNda,
              }
            : {
                ...existingAttrs,
                niche: "doacao",
                is_free_donation: true,
              },
        },
      });

      toast.success(
        isEditing
          ? "Registro atualizado no painel da empresa."
          : isBusiness
            ? "Oportunidade publicada no módulo de Captação."
            : "Doação publicada no mural da empresa.",
      );
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar o registro.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            {isEditing
              ? isBusiness
                ? "Editar Oportunidade Empresarial"
                : "Editar Item de Doação"
              : isBusiness
                ? "Nova Oportunidade & Ponto"
                : "Nova Doação Institucional"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isBusiness
              ? "Preencha dados financeiros e proteção NDA diretamente no Workspace."
              : "Cadastre itens excedentes ou campanhas solidárias da sua empresa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-cls-title" className="text-xs font-medium">
              Título *
            </Label>
            <Input
              id="ws-cls-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isBusiness
                  ? "Ex: Ponto comercial equipado no Centro"
                  : "Ex: Lote de cadeiras de escritório em bom estado"
              }
              className="h-11 min-h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-cls-content" className="text-xs font-medium">
              Descrição completa *
            </Label>
            <Textarea
              id="ws-cls-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder={
                isBusiness
                  ? "Descreva estrutura, inventário, contrato de locação e diferenciais..."
                  : "Condições do item, horários de retirada e observações..."
              }
              required
            />
          </div>

          {isBusiness && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ws-cls-val" className="text-xs font-medium">
                    Valor Pedido (R$)
                  </Label>
                  <Input
                    id="ws-cls-val"
                    value={valuationText}
                    onChange={(e) => setValuationText(e.target.value)}
                    placeholder="150000,00"
                    className="h-11 min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-cls-rev" className="text-xs font-medium">
                    Faturamento / Mês
                  </Label>
                  <Input
                    id="ws-cls-rev"
                    value={monthlyRevenueText}
                    onChange={(e) => setMonthlyRevenueText(e.target.value)}
                    placeholder="45000,00"
                    className="h-11 min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-cls-prof" className="text-xs font-medium">
                    Lucro Líquido / Mês
                  </Label>
                  <Input
                    id="ws-cls-prof"
                    value={netProfitText}
                    onChange={(e) => setNetProfitText(e.target.value)}
                    placeholder="12000,00"
                    className="h-11 min-h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Segmento</Label>
                  <Select value={businessSegment} onValueChange={setBusinessSegment}>
                    <SelectTrigger className="h-11 min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_SEGMENTS.map((seg) => (
                        <SelectItem key={seg} value={seg}>
                          {seg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-cls-point" className="text-xs font-medium">
                    Formato / Ponto
                  </Label>
                  <Input
                    id="ws-cls-point"
                    value={commercialPointType}
                    onChange={(e) => setCommercialPointType(e.target.value)}
                    placeholder="Loja de rua, franquia, galpão"
                    className="h-11 min-h-11"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">Proteção por Termo NDA</p>
                  <p className="text-xs text-muted-foreground">
                    Exigir aceite de confidencialidade antes de liberar dados financeiros.
                  </p>
                </div>
                <Switch checked={requiresNda} onCheckedChange={setRequiresNda} />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ws-cls-loc" className="text-xs font-medium">
                Localização / Retirada
              </Label>
              <Input
                id="ws-cls-loc"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Centro ou balcão"
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-cls-wa" className="text-xs font-medium">
                WhatsApp de Contato
              </Label>
              <Input
                id="ws-cls-wa"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Situação</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-11 min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  {!isBusiness && <SelectItem value="completed">Entregue</SelectItem>}
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="h-11 min-h-11 gap-2">
              {isSaving && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
              <span>{isEditing ? "Salvar Alterações" : "Publicar Agora"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
