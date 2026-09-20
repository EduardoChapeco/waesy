import React, { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Palette,
  Save,
  Wand2,
  RefreshCw,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  Type,
  Layers,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  saveBrandKit,
  getBrandKit,
  generateBrandKitWithAI,
  type BrandKitDTO,
} from "@/services/studio.functions";
import { getStoreSettings } from "@/services/store.functions";

export const Route = createFileRoute("/workspace/marketing/brand-kit")({
  head: () => ({
    meta: [{ title: "Brand Kit & DNA Visual | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
    const [store, brandKit] = await Promise.all([
      getStoreSettings().catch(() => null),
      getBrandKit().catch(() => null),
    ]);
    return { store, brandKit };
    } catch (err) {
      console.error("[loader:workspace.marketing.brand-kit] Unhandled loader error:", err);
      return { store: null, brandKit: null };
    }
  },
  component: BrandKitPage,
});

// ── Tipos locais ─────────────────────────────────────────────────────────────
interface CustomColor {
  name: string;
  hex: string;
}

interface BrandKitForm {
  // Paleta de Cores
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_bg_dark: string;
  color_bg_light: string;
  color_text_dark: string;
  color_text_light: string;
  color_success: string;
  color_warning: string;
  color_danger: string;
  custom_colors: CustomColor[];
  // Tipografia
  font_heading: string;
  font_body: string;
  font_mono: string;
  font_display: string;
  // Logos & Capa
  logo_url: string;
  logo_dark_url: string;
  logo_icon_url: string;
  logo_light_url: string;
  cover_url: string;
  // Estética
  border_radius_scale: "none" | "small" | "medium" | "large" | "pill";
  shadow_style: "none" | "subtle" | "medium" | "strong";
  animation_style: "none" | "smooth" | "snappy" | "playful";
  icon_set: "lucide" | "phosphor" | "heroicons";
}

const EMPTY_FORM: BrandKitForm = {
  color_primary: "#7C3AED",
  color_secondary: "#06B6D4",
  color_accent: "#F59E0B",
  color_bg_dark: "#09090F",
  color_bg_light: "#FFFFFF",
  color_text_dark: "#111111",
  color_text_light: "#F8FAFC",
  color_success: "#10B981",
  color_warning: "#F59E0B",
  color_danger: "#EF4444",
  custom_colors: [],
  font_heading: "Inter",
  font_body: "Inter",
  font_mono: "JetBrains Mono",
  font_display: "Playfair Display",
  logo_url: "",
  logo_dark_url: "",
  logo_icon_url: "",
  logo_light_url: "",
  cover_url: "",
  border_radius_scale: "medium",
  shadow_style: "subtle",
  animation_style: "smooth",
  icon_set: "lucide",
};

const FONTS_SANS = ["Inter", "Roboto", "Outfit", "DM Sans", "Montserrat", "Poppins", "Nunito"];
const FONTS_SERIF = ["Playfair Display", "Merriweather", "Lora", "PT Serif", "Georgia"];
const FONTS_MONO = ["JetBrains Mono", "Fira Code", "Roboto Mono", "Space Mono"];
const FONTS_DISPLAY = ["Bebas Neue", "Oswald", "Syne", "Clash Display", "Anton"];
const ALL_FONTS = [...FONTS_SANS, ...FONTS_SERIF, ...FONTS_MONO, ...FONTS_DISPLAY].sort();

// ── Serialização DB ↔ Form ────────────────────────────────────────────────────
function dbToForm(bk: Record<string, any>, store?: any): BrandKitForm {
  const colors = bk.colors || {};
  const fonts = bk.fonts || {};
  const logos = bk.logos || {};
  const voice = bk.voice || {};

  return {
    ...EMPTY_FORM,
    color_primary: colors.primary || EMPTY_FORM.color_primary,
    color_secondary: colors.secondary || EMPTY_FORM.color_secondary,
    color_accent: colors.accent || EMPTY_FORM.color_accent,
    color_bg_dark: colors.background || EMPTY_FORM.color_bg_dark,
    color_bg_light: colors.bg_light || EMPTY_FORM.color_bg_light,
    color_text_dark: colors.text || EMPTY_FORM.color_text_dark,
    color_text_light: colors.text_light || EMPTY_FORM.color_text_light,
    color_success: colors.success || EMPTY_FORM.color_success,
    color_warning: colors.warning || EMPTY_FORM.color_warning,
    color_danger: colors.danger || EMPTY_FORM.color_danger,
    custom_colors: Array.isArray(colors.palette)
      ? colors.palette.map((hex: string, i: number) => ({ name: `Custom ${i + 1}`, hex }))
      : [],
    font_heading: fonts.heading || EMPTY_FORM.font_heading,
    font_body: fonts.body || EMPTY_FORM.font_body,
    font_mono: fonts.mono || EMPTY_FORM.font_mono,
    font_display: fonts.display || EMPTY_FORM.font_display,
    logo_url: logos.main_url || (store as any)?.logo_url || (store as any)?.settings?.logo_url || "",
    logo_dark_url: logos.dark_url || "",
    logo_icon_url: logos.icon_url || (store as any)?.settings?.favicon_url || "",
    logo_light_url: logos.light_url || "",
    cover_url: logos.cover_url || (store as any)?.banner_url || (store as any)?.settings?.cover_url || (store as any)?.settings?.banner_url || "",
    border_radius_scale: voice.border_radius_scale || EMPTY_FORM.border_radius_scale,
    shadow_style: voice.shadow_style || EMPTY_FORM.shadow_style,
    animation_style: voice.animation_style || EMPTY_FORM.animation_style,
    icon_set: voice.icon_set || EMPTY_FORM.icon_set,
  };
}

function formToPayload(f: BrandKitForm) {
  return {
    colors: {
      primary: f.color_primary,
      secondary: f.color_secondary,
      accent: f.color_accent,
      background: f.color_bg_dark,
      bg_light: f.color_bg_light,
      text: f.color_text_dark,
      text_light: f.color_text_light,
      success: f.color_success,
      warning: f.color_warning,
      danger: f.color_danger,
      palette: f.custom_colors.map((c) => c.hex),
    },
    fonts: {
      heading: f.font_heading,
      body: f.font_body,
      mono: f.font_mono,
      display: f.font_display,
    },
    logos: {
      main_url: f.logo_url || null,
      dark_url: f.logo_dark_url || null,
      icon_url: f.logo_icon_url || null,
      light_url: f.logo_light_url || null,
      cover_url: f.cover_url || null,
    },
    voice: {
      border_radius_scale: f.border_radius_scale,
      shadow_style: f.shadow_style,
      animation_style: f.animation_style,
      icon_set: f.icon_set,
    },
  };
}

// ── Subcomponentes ────────────────────────────────────────────────────────────
function ColorSwatch({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-card/60 transition-colors">
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-lg border border-border/40 shadow-sm cursor-pointer"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-lg"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-none">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        <p className="text-[11px] font-mono text-muted-foreground mt-1 uppercase">{value}</p>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-28 text-xs font-mono text-right border-border/40 bg-transparent"
        maxLength={7}
      />
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export function BrandKitPage() {
  const { brandKit: initialBrandKit, store } = ((Route.useLoaderData?.() as any) || {});
  const [form, setForm] = useState<BrandKitForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"cores" | "tipografia" | "logos" | "estetica" | "preview">("cores");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (initialBrandKit || store) {
      setForm(dbToForm((initialBrandKit as Record<string, any>) || {}, store));
    }
  }, [initialBrandKit, store]);

  const update = (patch: Partial<BrandKitForm>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = formToPayload(form);
      await saveBrandKit({ data: payload });
      setLastSaved(new Date());
      toast.success("Brand Kit salvo com sucesso!", {
        description: "DNA visual consolidado e sincronizado.",
      });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar o Brand Kit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIMagic = async () => {
    setIsGenerating(true);
    toast.info("Diretor de Arte IA operando...", {
      description: "Sintetizando paleta e tipografia a partir do DNA da marca.",
    });
    try {
      const result = await generateBrandKitWithAI({ data: {} });
      if (result?.colors) {
        update({
          color_primary: result.colors.primary || form.color_primary,
          color_secondary: result.colors.secondary || form.color_secondary,
          color_accent: result.colors.accent || form.color_accent,
          color_bg_dark: result.colors.bg_dark || form.color_bg_dark,
          color_bg_light: result.colors.bg_light || form.color_bg_light,
          font_heading: result.fonts?.heading || form.font_heading,
          font_body: result.fonts?.body || form.font_body,
          font_display: result.fonts?.accent || form.font_display,
        });
        toast.success("DNA Visual gerado com sucesso!", {
          description: "Revise a paleta e salve quando estiver satisfeito.",
        });
      }
    } catch (err: any) {
      toast.error("Falha na geração AI. Verifique as chaves de API no Vault.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview CSS dinâmico
  const previewCSS = useMemo(
    () => `
    .bk-heading { font-family: '${form.font_heading}', sans-serif; color: ${form.color_primary}; }
    .bk-display { font-family: '${form.font_display}', serif; color: ${form.color_text_dark}; }
    .bk-body { font-family: '${form.font_body}', sans-serif; color: ${form.color_text_dark}; }
    .bk-mono { font-family: '${form.font_mono}', monospace; }
    .bk-bg { background-color: ${form.color_bg_dark}; color: ${form.color_text_light}; }
    .bk-card {
      background-color: ${form.color_bg_light};
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: ${
        form.border_radius_scale === "small"
          ? "4px"
          : form.border_radius_scale === "medium"
          ? "12px"
          : form.border_radius_scale === "large"
          ? "24px"
          : form.border_radius_scale === "pill"
          ? "999px"
          : "0"
      };
    }
    .bk-btn-primary {
      background: ${form.color_primary};
      color: white;
      border-radius: ${
        form.border_radius_scale === "small"
          ? "4px"
          : form.border_radius_scale === "medium"
          ? "8px"
          : form.border_radius_scale === "large"
          ? "16px"
          : form.border_radius_scale === "pill"
          ? "999px"
          : "0"
      };
    }
    .bk-btn-accent {
      background: ${form.color_accent};
      color: ${form.color_text_dark};
      border-radius: ${
        form.border_radius_scale === "small"
          ? "4px"
          : form.border_radius_scale === "medium"
          ? "8px"
          : form.border_radius_scale === "large"
          ? "16px"
          : form.border_radius_scale === "pill"
          ? "999px"
          : "0"
      };
    }
  `,
    [form]
  );

  const TABS = [
    { id: "cores", label: "Cores", icon: Palette },
    { id: "tipografia", label: "Tipografia", icon: Type },
    { id: "logos", label: "Logos", icon: ImageIcon },
    { id: "estetica", label: "Estética", icon: Sliders },
    { id: "preview", label: "Preview", icon: Eye },
  ] as const;

  return (
    <div className="w-full min-h-full bg-background text-foreground pb-24">
      <style>{previewCSS}</style>

      {/* ── HEADER EXECUTIVO ── */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-0 sm:px-0 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Design System
                </span>
                {lastSaved && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Salvo {lastSaved.toLocaleTimeString("pt-BR")}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-semibold tracking-tight mt-1 text-foreground">
                Brand Kit & DNA Visual
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
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-4 rounded-xl text-xs font-medium gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? "Salvando..." : "Salvar Brand Kit"}
              </Button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center gap-1 mt-4 border-t border-border/20 pt-3 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO POR ABA ── */}
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
        {/* ABA: CORES */}
        {activeTab === "cores" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionCard title="Cores Primárias da Marca" icon={Palette}>
              <div className="space-y-3">
                <ColorSwatch
                  label="Cor Primária"
                  value={form.color_primary}
                  onChange={(v) => update({ color_primary: v })}
                  description="Principal ação, botões e destaques"
                />
                <ColorSwatch
                  label="Cor Secundária"
                  value={form.color_secondary}
                  onChange={(v) => update({ color_secondary: v })}
                  description="Apoio à primária, gradientes e badges"
                />
                <ColorSwatch
                  label="Cor de Acento"
                  value={form.color_accent}
                  onChange={(v) => update({ color_accent: v })}
                  description="Promoções, CTAs secundários e selos"
                />
              </div>
            </SectionCard>

            <SectionCard title="Fundos & Texto" icon={Layers}>
              <div className="space-y-3">
                <ColorSwatch
                  label="Background Dark"
                  value={form.color_bg_dark}
                  onChange={(v) => update({ color_bg_dark: v })}
                  description="Fundo do modo escuro"
                />
                <ColorSwatch
                  label="Background Light"
                  value={form.color_bg_light}
                  onChange={(v) => update({ color_bg_light: v })}
                  description="Fundo do modo claro"
                />
                <ColorSwatch
                  label="Texto Primário (Dark)"
                  value={form.color_text_dark}
                  onChange={(v) => update({ color_text_dark: v })}
                />
                <ColorSwatch
                  label="Texto em Fundo Escuro"
                  value={form.color_text_light}
                  onChange={(v) => update({ color_text_light: v })}
                />
              </div>
            </SectionCard>

            <SectionCard title="Status & Semânticas" icon={CheckCircle2}>
              <div className="space-y-3">
                <ColorSwatch
                  label="Sucesso"
                  value={form.color_success}
                  onChange={(v) => update({ color_success: v })}
                />
                <ColorSwatch
                  label="Alerta"
                  value={form.color_warning}
                  onChange={(v) => update({ color_warning: v })}
                />
                <ColorSwatch
                  label="Erro / Destrutivo"
                  value={form.color_danger}
                  onChange={(v) => update({ color_danger: v })}
                />
              </div>
            </SectionCard>

            <SectionCard title="Paleta Personalizada" icon={Palette}>
              <div className="space-y-3">
                {form.custom_colors.map((cc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <ColorSwatch
                      label={cc.name}
                      value={cc.hex}
                      onChange={(v) => {
                        const next = [...form.custom_colors];
                        next[idx] = { ...cc, hex: v };
                        update({ custom_colors: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        update({ custom_colors: form.custom_colors.filter((_, i) => i !== idx) });
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    update({
                      custom_colors: [
                        ...form.custom_colors,
                        { name: `Custom ${form.custom_colors.length + 1}`, hex: "#8B5CF6" },
                      ],
                    })
                  }
                  className="w-full h-10 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:border-border flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Cor à Paleta
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ABA: TIPOGRAFIA */}
        {activeTab === "tipografia" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {(
              [
                {
                  key: "font_heading",
                  label: "Fonte de Títulos (Heading)",
                  desc: "Usada em H1, H2 e títulos de seção",
                  preview: "Título Principal da Marca",
                  options: FONTS_SANS,
                  sizeClass: "text-3xl font-bold",
                },
                {
                  key: "font_body",
                  label: "Fonte de Corpo (Body)",
                  desc: "Parágrafos, descrições e textos longos",
                  preview:
                    "Este é um parágrafo de exemplo com o texto corrido da sua marca, mostrando como o conteúdo editorial aparece na prática.",
                  options: FONTS_SANS,
                  sizeClass: "text-sm leading-relaxed",
                },
                {
                  key: "font_display",
                  label: "Fonte de Destaque (Display)",
                  desc: "Banners, capas e material gráfico impactante",
                  preview: "DESTAQUE VISUAL",
                  options: FONTS_DISPLAY,
                  sizeClass: "text-4xl font-black tracking-wider uppercase",
                },
                {
                  key: "font_mono",
                  label: "Fonte Monospace (Código)",
                  desc: "Campos de código, preços e elementos técnicos",
                  preview: "R$ 249,90 — SKU-00142",
                  options: FONTS_MONO,
                  sizeClass: "text-lg font-medium",
                },
              ] as const
            ).map(({ key, label, desc, preview, options, sizeClass }) => (
              <div
                key={key}
                className="bg-card border border-border/50 rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-border/30">
                  <Label className="text-sm font-semibold">{label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <div className="p-5 space-y-4">
                  <Select
                    value={(form as any)[key]}
                    onValueChange={(v) => update({ [key]: v } as any)}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-border/50 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_FONTS.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Preview ao vivo */}
                  <div className="p-4 bg-background/50 rounded-xl border border-border/30 min-h-[80px] flex items-center">
                    <p
                      className={`${sizeClass} text-foreground`}
                      style={{ fontFamily: `'${(form as any)[key]}', sans-serif` }}
                    >
                      {preview}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA: LOGOS & CAPA */}
        {activeTab === "logos" && (
          <div className="space-y-6">
            {/* Capa do Anúncio / Card da Empresa no Places (16:10 Canônico) */}
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Capa do Anúncio (Card da Empresa no Places & Vitrines)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Imagem oficial do seu negócio exibida nos cards do Places (Lista Telefônica), vitrines da Home e buscas
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  16:10 Card Places
                </Badge>
              </div>
              <div className="p-5">
                <ImageUpload
                  value={form.cover_url || ""}
                  onChange={(url) => update({ cover_url: url })}
                  onRemove={() => update({ cover_url: "" })}
                  bucket="store-assets"
                  aspect={16 / 10}
                  helperText="Clique ou arraste para carregar a capa do card da sua empresa no Places (Lista Telefônica) com corte 16:10. A capa panorâmica do perfil é gerenciada em Editar Perfil."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(
                [
                  {
                    key: "logo_url",
                    label: "Logo Principal",
                    desc: "Para fundos claros e uso geral",
                  },
                  {
                    key: "logo_dark_url",
                    label: "Logo Dark",
                    desc: "Versão para fundos escuros",
                  },
                  {
                    key: "logo_icon_url",
                    label: "Ícone / Símbolo",
                    desc: "Versão simplificada, favicon e avatar",
                  },
                  {
                    key: "logo_light_url",
                    label: "Logo Light",
                    desc: "Variação clara para overlays e banners",
                  },
                ] as const
              ).map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="bg-card border border-border/50 rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-border/30">
                    <Label className="text-sm font-semibold">{label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <div className="p-5">
                    <ImageUpload
                      value={(form as any)[key] || ""}
                      onChange={(url) => update({ [key]: url } as any)}
                      onRemove={() => update({ [key]: "" } as any)}
                      bucket="store-assets"
                      aspectPreset="square"
                      helperText={`Upload de ${label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: ESTÉTICA */}
        {activeTab === "estetica" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionCard title="Arredondamento (Border Radius)" icon={Sliders}>
              <div className="space-y-2">
                {(
                  [
                    { value: "none", label: "Sem Arredondamento", preview: "0px" },
                    { value: "small", label: "Pequeno", preview: "4px" },
                    { value: "medium", label: "Médio", preview: "12px" },
                    { value: "large", label: "Grande", preview: "24px" },
                    { value: "pill", label: "Pílula", preview: "999px" },
                  ] as const
                ).map(({ value, label, preview }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ border_radius_scale: value })}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-sm ${
                      form.border_radius_scale === value
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/40 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="font-mono text-xs">{preview}</span>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Sombras (Shadow Style)" icon={Layers}>
              <div className="space-y-2">
                {(
                  [
                    { value: "none", label: "Sem Sombra" },
                    { value: "subtle", label: "Sutil — Cards leves" },
                    { value: "medium", label: "Médio — Elementos flutuantes" },
                    { value: "strong", label: "Forte — Modais e CTAs" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ shadow_style: value })}
                    className={`w-full text-left p-3 rounded-xl border transition-colors text-sm ${
                      form.shadow_style === value
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/40 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Animações" icon={Sliders}>
              <div className="space-y-2">
                {(
                  [
                    { value: "none", label: "Sem Animação" },
                    { value: "smooth", label: "Fluida — Transições suaves" },
                    { value: "snappy", label: "Ágil — Rápida e precisa" },
                    { value: "playful", label: "Dinâmica — Bounce e spring" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ animation_style: value })}
                    className={`w-full text-left p-3 rounded-xl border transition-colors text-sm ${
                      form.animation_style === value
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/40 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Conjunto de Ícones" icon={Layers}>
              <div className="space-y-2">
                {(
                  [
                    { value: "lucide", label: "Lucide", desc: "Limpo, moderno, open-source" },
                    { value: "phosphor", label: "Phosphor", desc: "Rico, múltiplos pesos" },
                    { value: "heroicons", label: "Heroicons", desc: "Padrão Tailwind / Stripe" },
                  ] as const
                ).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ icon_set: value })}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      form.icon_set === value
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/40 hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ABA: PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Preview do Design System
              </h3>

              {/* Preview ao vivo com os tokens da marca */}
              <div
                className="bk-bg rounded-2xl overflow-hidden"
                style={{ minHeight: "400px" }}
              >
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
                      ) : (
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: form.color_primary }}
                        >
                          J
                        </div>
                      )}
                      <span
                        className="bk-heading text-lg font-bold"
                        style={{
                          fontFamily: `'${form.font_heading}', sans-serif`,
                          color: form.color_text_light,
                        }}
                      >
                        Sua Marca
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bk-btn-primary px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                        style={{
                          backgroundColor: form.color_primary,
                          color: "white",
                          borderRadius:
                            form.border_radius_scale === "small"
                              ? "4px"
                              : form.border_radius_scale === "medium"
                              ? "8px"
                              : form.border_radius_scale === "large"
                              ? "16px"
                              : form.border_radius_scale === "pill"
                              ? "999px"
                              : "0",
                        }}
                      >
                        CTA Principal
                      </button>
                    </div>
                  </div>

                  {/* Título destaque */}
                  <h1
                    className="text-4xl font-black mb-3"
                    style={{
                      fontFamily: `'${form.font_display}', serif`,
                      color: form.color_text_light,
                    }}
                  >
                    DNA VISUAL DA MARCA
                  </h1>
                  <p
                    className="text-sm mb-6 opacity-70 max-w-lg"
                    style={{
                      fontFamily: `'${form.font_body}', sans-serif`,
                      color: form.color_text_light,
                    }}
                  >
                    Este é o preview do seu sistema de design. Todos os tokens, cores e fontes
                    estão aplicados em tempo real para que você veja o resultado final antes de
                    salvar.
                  </p>

                  {/* Paleta */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      form.color_primary,
                      form.color_secondary,
                      form.color_accent,
                      form.color_success,
                      form.color_warning,
                      form.color_danger,
                      ...form.custom_colors.map((c) => c.hex),
                    ].map((color, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white/20 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Cards de exemplo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {["Produto", "Serviço", "Evento"].map((item, i) => (
                      <div
                        key={i}
                        className="p-4"
                        style={{
                          backgroundColor: form.color_bg_light,
                          borderRadius:
                            form.border_radius_scale === "small"
                              ? "4px"
                              : form.border_radius_scale === "medium"
                              ? "12px"
                              : form.border_radius_scale === "large"
                              ? "24px"
                              : form.border_radius_scale === "pill"
                              ? "32px"
                              : "0",
                          boxShadow:
                            form.shadow_style === "subtle"
                              ? "0 4px 20px rgba(0,0,0,0.1)"
                              : form.shadow_style === "medium"
                              ? "0 10px 30px rgba(0,0,0,0.2)"
                              : form.shadow_style === "strong"
                              ? "0 20px 40px rgba(0,0,0,0.35)"
                              : "none",
                        }}
                      >
                        <p
                          className="font-bold text-sm"
                          style={{
                            fontFamily: `'${form.font_heading}', sans-serif`,
                            color: form.color_text_dark,
                          }}
                        >
                          {item} Exemplo
                        </p>
                        <p
                          className="text-xs mt-1 opacity-70"
                          style={{
                            fontFamily: `'${form.font_body}', sans-serif`,
                            color: form.color_text_dark,
                          }}
                        >
                          Descrição curta do item
                        </p>
                        <div
                          className="mt-3 text-[11px] font-semibold px-2 py-1 inline-block"
                          style={{
                            backgroundColor: form.color_accent,
                            color: form.color_text_dark,
                            borderRadius:
                              form.border_radius_scale === "pill" ? "999px" : "4px",
                          }}
                        >
                          Ver Detalhes
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sumário dos tokens */}
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Sumário de Tokens Ativos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                {[
                  { label: "--color-primary", value: form.color_primary },
                  { label: "--color-secondary", value: form.color_secondary },
                  { label: "--color-accent", value: form.color_accent },
                  { label: "--font-heading", value: form.font_heading },
                  { label: "--font-body", value: form.font_body },
                  { label: "--font-display", value: form.font_display },
                  { label: "--radius", value: form.border_radius_scale },
                  { label: "--shadow", value: form.shadow_style },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-muted-foreground text-[10px] truncate">{label}</p>
                    <p className="text-foreground font-semibold truncate mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
