/**
 * workspace.marketing.briefing.tsx
 * Transplantado de: brand-builder-ai/src/pages/BriefingPage.tsx
 * Nativizado para: Waesy — TanStack Router + BFF functions + UI canônica
 *
 * Lógica de negócio preservada:
 * - Serialização JSONB (company / audience / content / market / channels)
 * - Score de completude em tempo real (0-100)
 * - Radar de DNA com 6 dimensões
 * - Pilares de conteúdo e keywords estratégicas
 * - Geração com IA via Edge Function sw-briefing-generate
 */

import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BrainCircuit,
  Wand2,
  Save,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  BarChart3,
  Users,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBrandBriefing,
  saveBrandBriefing,
  generateBrandBriefingWithAI,
  type BrandBriefingDTO,
} from "@/services/studio.functions";
import { getStoreSettings } from "@/services/store.functions";

// ── Rota ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/workspace/marketing/briefing")({
  head: () => ({
    meta: [{ title: "Brand Briefing & DNA Estratégico | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
    const [store, briefing] = await Promise.all([
      getStoreSettings().catch(() => null),
      getBrandBriefing().catch(() => null),
    ]);
    return { store, briefing };
    } catch (err) {
      console.error("[loader:workspace.marketing.briefing] Unhandled loader error:", err);
      return { store: null, briefing: null };
    }
  },
  component: BrandBriefingPage,
});

// ── Tipos locais (transplantados de brand-builder-ai/types/app.types.ts) ─────
interface BriefingForm {
  company_name: string;
  tagline: string;
  segment: string;
  brand_dna: string;
  value_proposition: string;
  main_differentials: string;
  target_audience: string;
  audience_age_range: string;
  brand_personality: string;
  tone_of_voice: string;
  avoid_topics: string;
  content_pillars: string[];
  keywords: string[];
  completeness_score: number;
}

const EMPTY_FORM: BriefingForm = {
  company_name: "",
  tagline: "",
  segment: "",
  brand_dna: "",
  value_proposition: "",
  main_differentials: "",
  target_audience: "",
  audience_age_range: "",
  brand_personality: "",
  tone_of_voice: "",
  avoid_topics: "",
  content_pillars: [],
  keywords: [],
  completeness_score: 0,
};

// ── Helpers de serialização JSONB ←→ Form (transplantados do satélite) ────────
function dbToForm(b: Record<string, any>): BriefingForm {
  const company = b.company || {};
  const audience = b.audience || {};
  const content = b.content || {};

  return {
    ...EMPTY_FORM,
    company_name: company.name || "",
    tagline: company.tagline || "",
    segment: company.segment || "",
    brand_dna: company.brand_dna || "",
    value_proposition: company.value_proposition || content.value_proposition || "",
    main_differentials: company.differentials || "",
    target_audience: audience.description || "",
    audience_age_range: audience.age_range || "",
    brand_personality: audience.personality || "",
    tone_of_voice: content.tone_of_voice || "",
    avoid_topics: content.avoid_topics || "",
    content_pillars: Array.isArray(content.pillars) ? content.pillars : [],
    keywords: Array.isArray(content.keywords) ? content.keywords : [],
    completeness_score: b.completeness_score || 0,
  };
}

function formToDb(f: BriefingForm, score: number) {
  return {
    company: {
      name: f.company_name,
      tagline: f.tagline,
      segment: f.segment,
      brand_dna: f.brand_dna,
      differentials: f.main_differentials,
      value_proposition: f.value_proposition,
    },
    audience: {
      description: f.target_audience,
      age_range: f.audience_age_range,
      personality: f.brand_personality,
    },
    market: {},
    content: {
      tone_of_voice: f.tone_of_voice,
      avoid_topics: f.avoid_topics,
      pillars: f.content_pillars,
      keywords: f.keywords,
      value_proposition: f.value_proposition,
    },
    channels: [],
    completeness_score: score,
  };
}

// ── Score de completude (transplantado do satélite) ───────────────────────────
function calculateCompleteness(f: BriefingForm): number {
  let score = 0;
  if (f.company_name?.trim()) score += 10;
  if (f.segment?.trim()) score += 10;
  if (f.target_audience?.trim()) score += 15;
  if (f.brand_personality?.trim()) score += 10;
  if (f.main_differentials?.trim()) score += 10;
  if (f.value_proposition?.trim()) score += 15;
  if (f.content_pillars?.length >= 3) score += 15;
  if (f.keywords?.length >= 5) score += 15;
  return Math.min(score, 100);
}

// ── Subcomponentes de formulário canônicos (Waesy Clean Paradigm) ───────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border-border/50 bg-background/50 text-sm"
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="rounded-xl border-border/50 bg-background/50 text-sm resize-none"
      />
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function BrandBriefingPage() {
  const { briefing: initialBriefing } = ((Route.useLoaderData?.() as any) || {});

  const [form, setForm] = useState<BriefingForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Deserializa JSONB do banco → form plano (lógica do satélite)
  useEffect(() => {
    if (!initialBriefing) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm(dbToForm(initialBriefing as Record<string, any>));
  }, [initialBriefing]);

  const updateForm = (updates: Partial<BriefingForm>) => {
    const next = { ...form, ...updates };
    next.completeness_score = calculateCompleteness(next);
    setForm(next);
  };

  // ── Salvar (BFF — sem acesso direto ao Supabase no frontend) ─────────────
  const handleSave = async (f = form) => {
    setIsSaving(true);
    try {
      const score = calculateCompleteness(f);
      const payload = formToDb(f, score);
      await saveBrandBriefing({ data: payload });
      setForm((prev) => ({ ...prev, completeness_score: score }));
      toast.success("DNA Estratégico salvo com sucesso!", {
        description: "Briefing sincronizado e pronto para alimentar os módulos de IA.",
      });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar o briefing.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Geração com IA (Edge Function sw-briefing-generate via BFF) ───────────
  const handleAIMagic = async () => {
    setIsGenerating(true);
    toast.info("IA Estrategista em ação...", {
      description: "Redigindo DNA estratégico com base nos dados da marca.",
    });
    try {
      const result = await generateBrandBriefingWithAI({
        data: {
          company_name: form.company_name,
          segment: form.segment,
          target_audience: form.target_audience,
          main_differentials: form.main_differentials,
        },
      });

      if (result) {
        const nextForm: BriefingForm = {
          ...form,
          brand_dna: result.brand_dna || form.brand_dna,
          tone_of_voice: result.tone_of_voice || form.tone_of_voice,
          main_differentials: result.main_differentials || form.main_differentials,
          value_proposition: result.value_proposition || form.value_proposition,
          content_pillars: Array.isArray(result.content_pillars)
            ? result.content_pillars
            : form.content_pillars,
          keywords: Array.isArray(result.keywords) ? result.keywords : form.keywords,
        };
        updateForm(nextForm);
        await handleSave(nextForm);
        toast.success("Briefing gerado com sucesso!");
      }
    } catch (err: any) {
      toast.error("Falha ao conectar com a IA. Verifique as chaves de API no Vault.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Gerenciar pilares e keywords (lógica do satélite) ────────────────────
  const handlePillarChange = (index: number, val: string) => {
    const next = [...form.content_pillars];
    next[index] = val;
    updateForm({ content_pillars: next });
  };
  const addPillar = () =>
    updateForm({ content_pillars: [...form.content_pillars, ""] });
  const removePillar = (i: number) =>
    updateForm({ content_pillars: form.content_pillars.filter((_, idx) => idx !== i) });

  const handleKeywordChange = (index: number, val: string) => {
    const next = [...form.keywords];
    next[index] = val;
    updateForm({ keywords: next });
  };
  const addKeyword = () => updateForm({ keywords: [...form.keywords, ""] });
  const removeKeyword = (i: number) =>
    updateForm({ keywords: form.keywords.filter((_, idx) => idx !== i) });

  // ── Score visual (transplantado do satélite) ─────────────────────────────
  const score = calculateCompleteness(form);
  const scoreColor =
    score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  // Dimensões do radar (transplantadas do satélite)
  const dimensions = [
    { label: "Empresa", ok: !!form.company_name && !!form.segment },
    { label: "Audiência", ok: !!form.target_audience && !!form.brand_personality },
    { label: "Diferenciais", ok: !!form.main_differentials && !!form.value_proposition },
    { label: "Tom de Voz", ok: !!form.tone_of_voice },
    { label: "Pilares", ok: form.content_pillars.length >= 3 },
    { label: "Keywords", ok: form.keywords.length >= 5 },
  ];

  return (
    <div className="w-full min-h-full bg-background text-foreground pb-24">
      {/* ── HEADER EXECUTIVO ── */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-0 sm:px-0 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Estratégia Engine
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  DNA {score}% completo
                </span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-1 text-foreground">
                Brand Briefing & DNA Estratégico
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIMagic}
                disabled={isGenerating}
                className="h-9 px-4 rounded-xl text-xs font-medium gap-2"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                {isGenerating ? "Gerando..." : "Gerar com IA"}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="h-9 px-4 rounded-xl text-xs font-medium gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? "Salvando..." : "Salvar Briefing"}
              </Button>
            </div>
          </div>

          {/* Barra de completude */}
          <div className="mt-3">
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${score}%`,
                  background: `linear-gradient(to right, ${scoreColor}88, ${scoreColor})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL: Editor + Painel Radar ── */}
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 animate-in fade-in duration-200">
        {/* COLUNA 1: Editor (transplantada do satélite, adaptada ao Clean Paradigm) */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Identidade da Empresa */}
          <SectionCard
            title="Identidade da Empresa"
            description="Informações fundamentais sobre a marca e seu posicionamento."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Nome da Empresa"
                value={form.company_name}
                onChange={(v) => updateForm({ company_name: v })}
                placeholder="Sua Marca, Referência 1, Referência 2..."
                required
              />
              <Field
                label="Segmento / Nicho"
                value={form.segment}
                onChange={(v) => updateForm({ segment: v })}
                placeholder="Marketplace, Moda, Turismo..."
                required
              />
              <Field
                label="Tagline"
                value={form.tagline}
                onChange={(v) => updateForm({ tagline: v })}
                placeholder="Think different. Just do it..."
              />
              <Field
                label="Proposta de Valor"
                value={form.value_proposition}
                onChange={(v) => updateForm({ value_proposition: v })}
                placeholder="O que você entrega de único?"
                required
              />
            </div>
            <FieldArea
              label="DNA da Marca"
              value={form.brand_dna}
              onChange={(v) => updateForm({ brand_dna: v })}
              placeholder="Descreva a essência e personalidade da marca em profundidade..."
            />
            <FieldArea
              label="Diferenciais Competitivos"
              value={form.main_differentials}
              onChange={(v) => updateForm({ main_differentials: v })}
              placeholder="O que te faz único contra a concorrência?"
              required
            />
          </SectionCard>

          {/* Audiência e Persona */}
          <SectionCard
            title="Audiência e Persona"
            description="Defina para quem você cria e o que essa pessoa espera."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Faixa Etária"
                value={form.audience_age_range}
                onChange={(v) => updateForm({ audience_age_range: v })}
                placeholder="25-40 anos, Millennials..."
              />
              <Field
                label="Tom de Voz"
                value={form.tone_of_voice}
                onChange={(v) => updateForm({ tone_of_voice: v })}
                placeholder="Profissional, Descontraído, Inspiracional..."
              />
              <Field
                label="Personalidade da Marca"
                value={form.brand_personality}
                onChange={(v) => updateForm({ brand_personality: v })}
                placeholder="Inovadora, Acolhedora, Disruptiva..."
              />
              <Field
                label="Evitar Tópicos"
                value={form.avoid_topics}
                onChange={(v) => updateForm({ avoid_topics: v })}
                placeholder="Política, religião, concorrente X..."
              />
            </div>
            <FieldArea
              label="Descrição do Público-Alvo"
              value={form.target_audience}
              onChange={(v) => updateForm({ target_audience: v })}
              placeholder="Quem compra? Quais dores tem? O que deseja? Onde está?"
              required
            />
          </SectionCard>

          {/* Pilares de Conteúdo */}
          <SectionCard
            title="Pilares de Conteúdo"
            description="Temas que guiam toda a produção de conteúdo da marca (mín. 3)."
          >
            <div className="space-y-2">
              {form.content_pillars.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={p}
                    onChange={(e) => handlePillarChange(i, e.target.value)}
                    placeholder={`Pilar ${i + 1} — ex: Inovação, Sustentabilidade...`}
                    className="h-10 rounded-xl border-border/50 text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removePillar(i)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addPillar}
              className="w-full h-10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-border flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Pilar de Conteúdo
            </button>
          </SectionCard>

          {/* Keywords Estratégicas */}
          <SectionCard
            title="Keywords Estratégicas"
            description="Palavras-chave que aparecem em todo conteúdo gerado (mín. 5)."
          >
            <div className="flex flex-wrap gap-2">
              {form.keywords.map((k, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-muted/40 border border-border/40 rounded-lg px-2 py-1"
                >
                  <Input
                    value={k}
                    onChange={(e) => handleKeywordChange(i, e.target.value)}
                    placeholder="keyword..."
                    className="bg-transparent border-0 h-auto p-0 text-xs w-24 shadow-none focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyword(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addKeyword}
              className="h-9 px-4 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Keyword
            </button>
          </SectionCard>
        </div>

        {/* COLUNA 2: Painel Radar do DNA (transplantado do satélite) */}
        <div className="w-72 xl:w-80 shrink-0 hidden lg:flex flex-col gap-4 sticky top-32 self-start">

          {/* Score circular */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Radar do DNA</h3>
            </div>

            {/* SVG circular score (transplantado do satélite) */}
            <div className="relative flex items-center justify-center mb-6">
              <svg className="w-28 h-28" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="3"
                  strokeDasharray={`${score}, 100`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 0.7s ease" }}
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-3xl font-black" style={{ color: scoreColor }}>
                  {score}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">/ 100</p>
              </div>
            </div>

            {/* Dimensões do radar */}
            <div className="space-y-2.5">
              {dimensions.map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span
                    className={`text-xs font-semibold ${
                      ok ? "text-emerald-500" : "text-muted-foreground/40"
                    }`}
                  >
                    {ok ? "✓ OK" : "○ Faltando"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CCP Ativo (transplantado do satélite) */}
          {score >= 60 && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CCP Ativo
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Este briefing alimenta automaticamente a geração de Posts, Vídeos, Brand Kit
                e Bio Links da sua marca.
              </p>
            </div>
          )}

          {/* Módulos que consomem o briefing */}
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">
                Módulos alimentados
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                "Brand Kit",
                "Canvas dos 7 Pecados",
                "Radar de Concorrentes",
                "Anúncios",
                "Video Studio",
              ].map((m) => (
                <span
                  key={m}
                  className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Schema real do banco (debug transparente) */}
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
              Schema JSONB no banco
            </p>
            <pre className="text-[10px] text-muted-foreground leading-relaxed overflow-auto">
              {`company.name: "${form.company_name || "—"}"
company.segment: "${form.segment || "—"}"
audience.personality: "${form.brand_personality || "—"}"
content.pillars: [${form.content_pillars.length} itens]
content.keywords: [${form.keywords.length} itens]`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
