import { useState } from "react";
import { Wand2, AlertTriangle, CheckCircle2, Sliders, Type, Clock, Palette, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type {
  MotionStudioTemplateDefinition,
  MotionStudioFieldDefinition,
  MotionStudioGuardrailIssue,
} from "./motion-templates";
import { draftMotionStudioCommandPatch } from "./motion-templates";

type MotionPropsPanelProps = {
  template: MotionStudioTemplateDefinition;
  values: Record<string, unknown>;
  onChangeValue: (fieldId: string, value: unknown) => void;
  onApplyPatch: (patchValues: Record<string, unknown>) => void;
};

export function MotionStudioPropsPanel({
  template,
  values,
  onChangeValue,
  onApplyPatch,
}: MotionPropsPanelProps) {
  const [commandInput, setCommandInput] = useState("");
  const [activeGroup, setActiveGroup] = useState<"Copy" | "Timing" | "Look" | "Assets">("Copy");

  // Validate current draft
  const issues: MotionStudioGuardrailIssue[] = template.validate(values);
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warningCount = issues.filter((i) => i.level === "warning").length;

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const patch = draftMotionStudioCommandPatch(template.id, values, commandInput);
    if (patch) {
      onApplyPatch(patch.nextValues);
      toast.success(patch.summary, {
        description: patch.changes.join(" • "),
      });
      setCommandInput("");
    } else {
      toast.info("Comando não reconhecido. Tente 'mais rapido', 'verde', ou 'headline: Novo Texto'.");
    }
  };

  // Group fields
  const fieldsByGroup = template.fieldDefinitions.filter((f) => f.group === activeGroup);

  return (
    <div className="w-80 border-l border-border/80 bg-card flex flex-col shrink-0 overflow-y-auto no-scrollbar select-none divide-y divide-border/60">
      {/* Smart Command Bar */}
      <div className="p-3.5 space-y-2 bg-muted/20">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Wand2 className="size-3.5 text-primary" />
            <span>Comando Rápido</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">IA Assist</span>
        </div>

        <form onSubmit={handleRunCommand} className="flex gap-1.5">
          <Input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="ex: mais rapido, verde, headline: ..."
            className="h-8 text-xs rounded-xl bg-background border-border/80"
          />
          <Button type="submit" size="sm" variant="secondary" className="h-8 px-2.5 rounded-xl text-xs shrink-0">
            Aplicar
          </Button>
        </form>
      </div>

      {/* Group Navigation Tabs */}
      <div className="p-2 flex items-center justify-between gap-1 bg-muted/30">
        {[
          { id: "Copy", label: "Texto", icon: Type },
          { id: "Timing", label: "Tempo", icon: Clock },
          { id: "Look", label: "Estilo", icon: Palette },
          { id: "Assets", label: "Mídia", icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeGroup === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveGroup(tab.id as any)}
              className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Field Editors */}
      <div className="p-4 space-y-4 flex-1">
        {fieldsByGroup.map((field) => {
          const val = values[field.id];

          if (field.kind === "textarea") {
            return (
              <div key={field.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-bold text-foreground">{field.label}</Label>
                  {field.required && (
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Obrigatório</span>
                  )}
                </div>
                <Textarea
                  value={(val as string) || ""}
                  onChange={(e) => onChangeValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="min-h-[72px] text-xs rounded-xl bg-background resize-none"
                />
              </div>
            );
          }

          if (field.kind === "text") {
            return (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">{field.label}</Label>
                <Input
                  value={(val as string) || ""}
                  onChange={(e) => onChangeValue(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="h-8 text-xs rounded-xl bg-background"
                />
              </div>
            );
          }

          if (field.kind === "number") {
            const min = field.min || 60;
            const max = field.max || 600;
            const step = field.step || 6;
            const currentNum = Number(val) || min;

            return (
              <div key={field.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-bold text-foreground">{field.label}</Label>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {currentNum}f ({(currentNum / 30).toFixed(1)}s)
                  </span>
                </div>
                <Slider
                  value={[currentNum]}
                  min={min}
                  max={max}
                  step={step}
                  onValueChange={([num]) => onChangeValue(field.id, num)}
                />
              </div>
            );
          }

          if (field.kind === "color") {
            return (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">{field.label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(val as string) || template.accentColor}
                    onChange={(e) => onChangeValue(field.id, e.target.value)}
                    className="size-8 rounded-lg border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={(val as string) || template.accentColor}
                    onChange={(e) => onChangeValue(field.id, e.target.value)}
                    className="h-8 text-xs font-mono rounded-xl bg-background flex-1 uppercase"
                  />
                </div>
              </div>
            );
          }

          if (field.kind === "boolean") {
            return (
              <div key={field.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-bold text-foreground">{field.label}</p>
                  {field.description && (
                    <p className="text-[10px] text-muted-foreground">{field.description}</p>
                  )}
                </div>
                <Switch
                  checked={Boolean(val)}
                  onCheckedChange={(chk) => onChangeValue(field.id, chk)}
                />
              </div>
            );
          }

          if (field.kind === "select" && field.options) {
            return (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">{field.label}</Label>
                <Select
                  value={(val as string) || field.options[0]?.value}
                  onValueChange={(nxt) => onChangeValue(field.id, nxt)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Guardrails / Quality Check */}
      <div className="p-3.5 space-y-2 bg-muted/20 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            {errorCount === 0 ? (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="size-3.5 text-rose-500" />
            )}
            <span>Qualidade do Vídeo</span>
          </span>
          <Badge
            variant={errorCount > 0 ? "destructive" : warningCount > 0 ? "secondary" : "outline"}
            className="text-[9px] font-mono"
          >
            {errorCount > 0 ? `${errorCount} bloqueios` : warningCount > 0 ? `${warningCount} alertas` : "100% Validado"}
          </Badge>
        </div>

        {issues.length > 0 ? (
          <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar pr-1">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={`text-[10px] p-1.5 rounded-lg border flex items-start gap-1.5 ${
                  issue.level === "error"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                }`}
              >
                <span className="font-bold shrink-0">{issue.label}:</span>
                <span className="truncate">{issue.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Todas as métricas de tempo, tamanho de cópia e renderização estão nos conformes.
          </p>
        )}
      </div>
    </div>
  );
}
