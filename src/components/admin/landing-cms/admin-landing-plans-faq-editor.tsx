import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type {
  VerticalFaqItemDTO,
  VerticalLandingPageDTO,
  VerticalLandingPlanDTO,
} from "@/lib/vertical-landing-types";

export interface AdminLandingPlansFaqEditorProps {
  draft: VerticalLandingPageDTO;
  onChange: (patch: Partial<VerticalLandingPageDTO>) => void;
}

export function AdminLandingPlansFaqEditor({ draft, onChange }: AdminLandingPlansFaqEditorProps) {
  const plans = draft.plans || [];
  const faqs = draft.faq_items || [];

  const updatePlan = (idx: number, patch: Partial<VerticalLandingPlanDTO>) => {
    onChange({
      plans: plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    });
  };

  const updateFaq = (idx: number, patch: Partial<VerticalFaqItemDTO>) => {
    onChange({
      faq_items: faqs.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pacotes e Planos ({plans.length})</h2>
            <p className="text-xs text-muted-foreground">Valores em R$ e benefícios exibidos neste nicho.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                plans: [
                  ...plans,
                  {
                    id: `plan-${Date.now()}`,
                    sku: draft.vertical_sku || "waesy_retail_commerce",
                    name: "Novo Plano",
                    badge: "Personalizado",
                    tagline: "Pacote dedicado ao nicho.",
                    monthlyPriceCents: 14900,
                    annualPriceCents: 143040,
                    isFeatured: false,
                    ctaLabel: "Assinar Agora",
                    features: ["Acesso completo ao nicho"],
                    limits: ["Até 10 usuários"],
                  },
                ],
              })
            }
            className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
          >
            <Plus className="size-4" />
            <span>Novo Plano</span>
          </Button>
        </div>

        <div className="space-y-4">
          {plans.map((plan, idx) => (
            <div key={plan.id} className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Nome do plano"
                  value={plan.name}
                  onChange={(e) => updatePlan(idx, { name: e.target.value })}
                  className="h-11"
                />
                <Input
                  placeholder="Mensal (R$)"
                  type="number"
                  value={Math.round(plan.monthlyPriceCents / 100)}
                  onChange={(e) => updatePlan(idx, { monthlyPriceCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })}
                  className="h-11"
                />
                <Input
                  placeholder="Anual (R$)"
                  type="number"
                  value={Math.round(plan.annualPriceCents / 100)}
                  onChange={(e) => updatePlan(idx, { annualPriceCents: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })}
                  className="h-11"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Switch checked={Boolean(plan.isFeatured)} onCheckedChange={(v) => updatePlan(idx, { isFeatured: v })} />
                    <span>Destaque</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onChange({ plans: plans.filter((_, i) => i !== idx) })}
                    aria-label="Remover plano"
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border text-destructive hover:bg-destructive/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Recursos separados por vírgula"
                  value={plan.features.join(", ")}
                  onChange={(e) => updatePlan(idx, { features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className="h-11"
                />
                <Input
                  placeholder="Limites separados por vírgula"
                  value={plan.limits.join(", ")}
                  onChange={(e) => updatePlan(idx, { limits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className="h-11"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Perguntas Frequentes ({faqs.length})</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange({ faq_items: [...faqs, { question: "", answer: "" }] })}
            className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
          >
            <Plus className="size-4" />
            <span>Adicionar FAQ</span>
          </Button>
        </div>
        {faqs.map((faq, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
            <Input
              placeholder="Pergunta"
              value={faq.question}
              onChange={(e) => updateFaq(idx, { question: e.target.value })}
              className="h-11 md:col-span-5"
            />
            <Input
              placeholder="Resposta"
              value={faq.answer}
              onChange={(e) => updateFaq(idx, { answer: e.target.value })}
              className="h-11 md:col-span-6"
            />
            <button
              type="button"
              onClick={() => onChange({ faq_items: faqs.filter((_, i) => i !== idx) })}
              aria-label="Remover pergunta"
              className="size-11 min-h-11 min-w-11 rounded-lg border border-border text-destructive hover:bg-destructive/10 flex items-center justify-center md:col-span-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
