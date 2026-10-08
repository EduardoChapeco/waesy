import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { WandSparkles, Loader2, Save, Check, AlertTriangle, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { StudioTemplateGoal, StudioTemplateDefinition } from "@/lib/builder/studio-catalog";
import type { StudioTemplateManifest } from "@/lib/builder/studio-manifest";
import type { TemplateAuditResult } from "@/lib/builder/studio-template-audit";
import { StudioTemplateManifestSchema } from "@/lib/builder/studio-manifest";
import { generateStudioTemplateDraft } from "@/services/studio-template-generation.functions";
import { listStudioTemplateDrafts, saveStudioTemplateDraft } from "@/services/studio-template-library.functions";
import { z } from "zod";

const FactoryResponseSchema = z.object({
  manifest: StudioTemplateManifestSchema,
  qualityReport: z.object({
    templateId: z.string(),
    templateName: z.string(),
    status: z.enum(["pass", "warn", "fail"]),
    score: z.number(),
    findings: z.array(z.object({
      ruleId: z.string(),
      category: z.enum(["license", "accessibility", "performance", "content", "security"]),
      severity: z.enum(["error", "warning", "info"]),
      path: z.string(),
      message: z.string(),
    })),
    metrics: z.object({
      blockCount: z.number(),
      serializedBytes: z.number(),
      imageReferences: z.number(),
      externalImageReferences: z.number(),
      assetsWithProvenance: z.number(),
    }),
    limitations: z.array(z.string()),
  }),
  provider: z.string(),
  model: z.string(),
  requiresHumanReview: z.literal(true),
  canPublishAsGenerated: z.literal(false),
}).strict();

const GOALS: Array<{ value: StudioTemplateGoal; label: string }> = [
  { value: "lead_capture", label: "Captar contatos" },
  { value: "catalog", label: "Apresentar catálogo" },
  { value: "booking", label: "Gerar agendamentos" },
  { value: "authority", label: "Construir autoridade" },
  { value: "content", label: "Distribuir conteúdo" },
  { value: "purchase", label: "Vender / converter" },
];

const SECTION_OPTIONS = [
  ["hero_minimal_split", "Hero"],
  ["bento_asymmetric_4", "Benefícios"],
  ["media_gallery_mosaic", "Galeria"],
  ["pricing_three_tiers", "Preços"],
  ["testimonials_social_proof", "Prova social real"],
  ["faq_clean_accordion", "FAQ"],
  ["contact_form_direct", "Contato"],
] as const;

interface StudioTemplateFactoryProps {
  onApply: (template: StudioTemplateManifest) => void;
}

export function StudioTemplateFactory({ onApply }: StudioTemplateFactoryProps) {
  const [open, setOpen] = useState(false);
  const [niche, setNiche] = useState("gastronomy");
  const [goal, setGoal] = useState<StudioTemplateGoal>("lead_capture");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [factsText, setFactsText] = useState("");
  const [visualDirection, setVisualDirection] = useState("");
  const [desiredSections, setDesiredSections] = useState<string[]>([]);
  const [manifest, setManifest] = useState<StudioTemplateManifest | null>(null);
  const [qualityReport, setQualityReport] = useState<TemplateAuditResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [library, setLibrary] = useState<StudioTemplateDefinition[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsLoadingLibrary(true);
    setLibraryMessage("");
    listStudioTemplateDrafts({ data: {} })
      .then((response) => {
        if (active) setLibrary(response.drafts as StudioTemplateDefinition[]);
      })
      .catch((error) => {
        if (active) setLibraryMessage(error instanceof Error ? error.message : "Biblioteca indisponível. Confira se a migration foi aplicada.");
      })
      .finally(() => {
        if (active) setIsLoadingLibrary(false);
      });
    return () => { active = false; };
  }, [open]);

  const toggleSection = (type: string) => {
    setDesiredSections((current) => current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type]);
  };

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    setIsGenerating(true);
    setManifest(null);
    setQualityReport(null);
    setSaved(false);
    try {
      const facts = factsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf(":");
          if (separator < 1) return { label: "Fato fornecido", value: line };
          return { label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() };
        });
      const response = FactoryResponseSchema.parse(await generateStudioTemplateDraft({
        data: {
          niche,
          goal,
          businessName,
          businessDescription,
          audience,
          facts,
          visualDirection,
          desiredSections: desiredSections as Array<(typeof SECTION_OPTIONS)[number][0]>,
        },
      }));
      setManifest(response.manifest);
      setQualityReport(response.qualityReport);
      toast.success("Rascunho estruturado gerado. Revise o relatório antes de aplicar ou salvar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o template.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!manifest || isSaving) return;
    setIsSaving(true);
    try {
      await saveStudioTemplateDraft({ data: { manifest } });
      setSaved(true);
      setLibrary((current) => [manifest, ...current.filter((item) => !(item.id === manifest.id && item.version === manifest.version))]);
      toast.success("Rascunho salvo na biblioteca privada da loja.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar; confirme migration e acesso.");
    } finally {
      setIsSaving(false);
    }
  };

  const apply = (template: StudioTemplateManifest) => {
    onApply(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 w-full justify-start gap-2 text-xs">
          <WandSparkles className="size-3.5" /> Criar modelo com IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Waesy Studio — Criador de Páginas com IA</DialogTitle>
          <DialogDescription>
            Descreva o seu negócio e objetivos para gerar uma página personalizada e de alto impacto pronta para edição.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={(event) => void handleGenerate(event)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="studio-niche" className="mb-1 block text-xs font-semibold">Nicho ou Segmento</label>
                <Input id="studio-niche" value={niche} maxLength={96} onChange={(event) => setNiche(event.target.value)} required pattern="[a-z0-9]+([-_][a-z0-9]+)*" placeholder="ex: gastronomia" />
              </div>
              <div>
                <label htmlFor="studio-goal" className="mb-1 block text-xs font-semibold">Objetivo</label>
                <select id="studio-goal" value={goal} onChange={(event) => setGoal(event.target.value as StudioTemplateGoal)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs">
                  {GOALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="studio-business-name" className="mb-1 block text-xs font-semibold">Nome do Negócio</label>
              <Input id="studio-business-name" value={businessName} maxLength={100} onChange={(event) => setBusinessName(event.target.value)} placeholder="Ex.: Bistrô Bella Vita" />
            </div>
            <div>
              <label htmlFor="studio-business-description" className="mb-1 block text-xs font-semibold">Oferta e Diferenciais</label>
              <Textarea id="studio-business-description" value={businessDescription} maxLength={1000} onChange={(event) => setBusinessDescription(event.target.value)} rows={3} placeholder="Descreva os principais produtos ou serviços e por que os clientes escolhem sua empresa." />
            </div>
            <div>
              <label htmlFor="studio-audience" className="mb-1 block text-xs font-semibold">Público-Alvo</label>
              <Input id="studio-audience" value={audience} maxLength={300} onChange={(event) => setAudience(event.target.value)} placeholder="Ex.: Famílias e profissionais que buscam refeições especiais" />
            </div>
            <div>
              <label htmlFor="studio-facts" className="mb-1 block text-xs font-semibold">Informações de Contato e Horários (um por linha)</label>
              <Textarea id="studio-facts" value={factsText} maxLength={6000} onChange={(event) => setFactsText(event.target.value)} rows={4} placeholder={'Cidade: Chapecó\nHorário: Segunda a Sábado das 11h às 23h\nWhatsApp: (49) 99999-9999'} />
            </div>
            <div>
              <label htmlFor="studio-visual" className="mb-1 block text-xs font-semibold">Estilo Visual</label>
              <Input id="studio-visual" value={visualDirection} maxLength={240} onChange={(event) => setVisualDirection(event.target.value)} placeholder="Ex.: minimalista, sofisticado, cores quentes" />
            </div>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold">Seções desejadas (opcional)</legend>
              <div className="flex flex-wrap gap-2">
                {SECTION_OPTIONS.map(([type, label]) => (
                  <label key={type} className="flex min-h-11 items-center gap-2 rounded border px-3 py-2 text-xs">
                    <input type="checkbox" checked={desiredSections.includes(type)} onChange={() => toggleSection(type)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" disabled={isGenerating || niche.trim().length < 2} className="w-full gap-2">
              {isGenerating ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <WandSparkles className="size-4" />}
              {isGenerating ? "Criando e formatando..." : "Criar Modelo"}
            </Button>
          </form>

          <section className="space-y-3" aria-label="Prévia da biblioteca e avaliação">
            {manifest ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{manifest.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{manifest.blocks.length} seções · Pronto para personalização</p>
                  </div>
                  <span className="rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">PRÉVIA</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{manifest.description}</p>
                {qualityReport && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {qualityReport.status === "fail" ? <AlertTriangle className="size-4 text-destructive" /> : <Check className="size-4 text-primary" />}
                      Qualidade do Conteúdo · Pontuação {qualityReport.score}/100
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{qualityReport.findings.filter((finding) => finding.severity === "error").length} itens para revisar antes de publicar na vitrine.</p>
                    {qualityReport.findings.length > 0 && (
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                        {qualityReport.findings.slice(0, 8).map((finding, index) => (
                          <li key={`${finding.ruleId}-${index}`} className={finding.severity === "error" ? "text-destructive" : "text-muted-foreground"}>
                            {finding.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="min-h-11 gap-2 text-xs" onClick={() => void handleSave()} disabled={isSaving || saved}>
                    {isSaving ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" /> : saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
                    {saved ? "Salvo" : "Salvar na biblioteca"}
                  </Button>
                  <Button type="button" className="min-h-11 gap-2 text-xs" onClick={() => apply(manifest)}>
                    <FilePlus2 className="size-3.5" /> Usar este Modelo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
                Preencha as informações do seu negócio ao lado para gerar um modelo exclusivo e otimizado para o seu segmento.
              </div>
            )}

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">Meus drafts salvos</h3>
              {isLoadingLibrary && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none text-muted-foreground" />}
              </div>
              {libraryMessage && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{libraryMessage}</p>}
              {library.length === 0 && !isLoadingLibrary ? <p className="text-xs text-muted-foreground">Nenhum draft salvo nesta loja ainda.</p> : null}
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {library.map((item) => (
                  <div key={`${item.id}-${item.version}`} className="flex items-center justify-between gap-2 rounded bg-muted/40 p-2">
                    <span className="min-w-0 truncate text-xs">{item.name} <span className="text-muted-foreground">· {item.niche}</span></span>
                    <Button type="button" variant="outline" className="min-h-11 shrink-0 px-3 text-xs" onClick={() => apply(item)}>Aplicar</Button>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Rascunhos isolados por loja. A migration <code>studio_template_library</code> precisa estar aplicada para salvar/carregar. A edição da página nunca altera o manifesto salvo.</p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
