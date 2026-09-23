import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Printer,
  Download,
  Share2,
  Eye,
  EyeOff,
  Sparkles,
  QrCode,
  Globe,
  Phone,
  Mail,
  MapPin,
  Building2,
  GraduationCap,
  Award,
  HeartHandshake,
  Check,
  Copy,
  Sliders,
  Layers,
  FileText,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CurriculoFormat = "a4" | "story";
export type CurriculoTemplate = "minimal" | "modern" | "editorial";

export interface CurriculoGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  resumeData: any;
}

const ACCENT_COLORS = [
  { id: "slate", label: "Grafite Executivo", hex: "#18181b", class: "bg-zinc-900" },
  { id: "navy", label: "Azul Navy", hex: "#1e3a8a", class: "bg-blue-900" },
  { id: "emerald", label: "Verde Esmeralda", hex: "#065f46", class: "bg-emerald-800" },
  { id: "burgundy", label: "Borgonha", hex: "#831843", class: "bg-pink-900" },
];

export function CurriculoGeneratorModal({
  open,
  onOpenChange,
  profile,
  resumeData,
}: CurriculoGeneratorModalProps) {
  const [format, setFormat] = useState<CurriculoFormat>("a4");
  const [template, setTemplate] = useState<CurriculoTemplate>("minimal");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  // Controles finos de privacidade & visibilidade
  const [showPhoto, setShowPhoto] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [showExperiences, setShowExperiences] = useState(true);
  const [showEducations, setShowEducations] = useState(true);
  const [showCertifications, setShowCertifications] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showVolunteering, setShowVolunteering] = useState(true);
  const [showLanguages, setShowLanguages] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);

  const previewRef = useRef<HTMLDivElement>(null);

  const experiences = (resumeData?.experiences || []) as any[];
  const educations = (resumeData?.educations || []) as any[];
  const certifications = (resumeData?.certifications || []) as any[];
  const projects = (resumeData?.projects || []) as any[];
  const volunteering = (resumeData?.volunteering || []) as any[];
  const languages = (resumeData?.languages || []) as any[];
  const summary = resumeData?.summary || profile?.bio || "";

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${profile?.username || profile?.id}`
    : `https://waesy.com/u/${profile?.username || profile?.id}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    profileUrl
  )}&bgcolor=ffffff&color=000000&margin=1`;

  // 🖨️ Ação: Imprimir nativamente via window.print()
  const handlePrint = () => {
    window.print();
  };

  // 📥 Ação: Baixar PDF de Ultra Qualidade (jsPDF + html2canvas)
  const handleDownloadPdf = async () => {
    if (!previewRef.current || typeof window === "undefined") return;
    try {
      setIsExporting(true);
      setExportMessage("Renderizando documento em alta resolução (300 DPI)...");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(previewRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      if (format === "a4") {
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        pdf.save(`curriculo-${profile?.username || "profissional"}.pdf`);
      } else {
        // Formato Story / Mobile (1080x1920 pt)
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: [540, 960],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, 540, 960);
        pdf.save(`curriculo-story-${profile?.username || "profissional"}.pdf`);
      }

      toast.success("Currículo em PDF baixado com sucesso!");
    } catch (err: any) {
      console.error("[CurriculoGenerator] Falha ao exportar PDF:", err);
      toast.error("Erro ao gerar PDF do currículo.");
    } finally {
      setIsExporting(false);
      setExportMessage("");
    }
  };

  // 📱 Ação: Baixar Imagem PNG para Story
  const handleDownloadImage = async () => {
    if (!previewRef.current || typeof window === "undefined") return;
    try {
      setIsExporting(true);
      setExportMessage("Gerando imagem para compartilhamento...");

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(previewRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `curriculo-${format}-${profile?.username || "waesy"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Imagem gerada e baixada com sucesso!");
    } catch (err: any) {
      console.error("[CurriculoGenerator] Falha ao exportar imagem:", err);
      toast.error("Erro ao gerar imagem.");
    } finally {
      setIsExporting(false);
      setExportMessage("");
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(profileUrl);
      toast.success("Link do perfil profissional copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] max-h-[95vh] p-0 flex flex-col bg-background overflow-hidden rounded-3xl border border-border shadow-2xl">
        {/* ── TopBar do Gerador ── */}
        <div className="px-6 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 shrink-0">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <span>Gerador de Currículo Digital & Portfólio</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Exporte em ultra-qualidade para impressão formal (A4) ou compartilhamento social (Story 9:16).
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isExporting}
              className="rounded-xl text-xs font-semibold gap-1.5 h-9 cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Imprimir</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="rounded-xl text-xs font-semibold gap-1.5 h-9 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Baixar Imagem</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{isExporting ? exportMessage || "Gerando..." : "Baixar PDF Oficial"}</span>
            </Button>
          </div>
        </div>

        {/* ── Conteúdo Principal em Split: Controles à Esquerda, Live Canvas à Direita ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Painel Esquerdo: Ferramentas, Formato, Template & Toggles */}
          <div className="w-full lg:w-80 border-r border-border/50 p-5 overflow-y-auto space-y-6 shrink-0 bg-card/50">
            {/* 1. Seletor de Formato */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Formato de Saída
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("a4")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition-all cursor-pointer",
                    format === "a4"
                      ? "bg-primary/10 border-primary text-primary shadow-xs"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="size-5" />
                  <span>A4 Vertical</span>
                  <span className="text-[10px] opacity-70">Impressão / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("story")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition-all cursor-pointer",
                    format === "story"
                      ? "bg-primary/10 border-primary text-primary shadow-xs"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Smartphone className="size-5" />
                  <span>Story 9:16</span>
                  <span className="text-[10px] opacity-70">Redes / WhatsApp</span>
                </button>
              </div>
            </div>

            {/* 2. Seletor de Template */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Estilo & Template
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "minimal", label: "Executivo" },
                  { id: "modern", label: "Moderno" },
                  { id: "editorial", label: "Editorial" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as CurriculoTemplate)}
                    className={cn(
                      "h-8 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer truncate",
                      template === t.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Cor de Destaque */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Cor de Destaque
              </label>
              <div className="flex items-center gap-2">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    title={c.label}
                    className={cn(
                      "size-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ring-2",
                      c.class,
                      accentColor.id === c.id ? "ring-primary scale-110" : "ring-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    {accentColor.id === c.id && <Check className="size-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. O que Ocultar / Incluir (Checkboxes de Privacidade) */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Ocultar / Incluir</span>
                <Sliders className="size-3.5 text-muted-foreground" />
              </label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPhoto}
                    onChange={(e) => setShowPhoto(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Foto de Perfil</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Telefone / WhatsApp</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAddress}
                    onChange={(e) => setShowAddress(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Cidade / Estado</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSummary}
                    onChange={(e) => setShowSummary(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Resumo Sobre Mim</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showExperiences}
                    onChange={(e) => setShowExperiences(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Experiências Profissionais</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showEducations}
                    onChange={(e) => setShowEducations(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Formação Acadêmica</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCertifications}
                    onChange={(e) => setShowCertifications(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Licenças & Certificados</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showProjects}
                    onChange={(e) => setShowProjects(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Projetos & Portfólio</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showVolunteering}
                    onChange={(e) => setShowVolunteering(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Voluntariado</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLanguages}
                    onChange={(e) => setShowLanguages(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Idiomas</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={(e) => setShowQrCode(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="font-semibold text-primary">QR Code do Perfil Waesy</span>
                </label>
              </div>
            </div>

            {/* 5. Link Direto */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Link do Perfil Profissional
              </span>
              <div className="flex items-center justify-between text-xs font-mono text-foreground truncate">
                <span className="truncate">{profileUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="size-6 p-0 hover:text-primary cursor-pointer shrink-0 ml-1"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Painel Direito: Canvas de Live Preview com Proporção Precisa */}
          <div className="flex-1 min-h-0 bg-muted/30 p-4 sm:p-8 overflow-y-auto flex items-start justify-center">
            <div
              ref={previewRef}
              id="curriculo-printable-canvas"
              className={cn(
                "bg-white text-zinc-900 shadow-2xl transition-all select-none overflow-hidden curriculo-canvas",
                format === "a4"
                  ? "w-full max-w-[680px] min-h-[960px] p-8 sm:p-10 space-y-6 rounded-2xl border border-zinc-200"
                  : "w-full max-w-[420px] aspect-[9/16] p-6 space-y-4 rounded-3xl border border-zinc-200 flex flex-col justify-between"
              )}
              style={{
                fontFamily:
                  template === "editorial"
                    ? "Georgia, Cambria, serif"
                    : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {/* ── CABEÇALHO DO DOCUMENTO ── */}
              <div
                className={cn(
                  "border-b pb-5 flex items-start justify-between gap-4",
                  template === "modern" ? "border-zinc-800" : "border-zinc-200"
                )}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <h1
                    className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 uppercase"
                    style={{ color: accentColor.hex }}
                  >
                    {profile?.full_name}
                  </h1>

                  {profile?.occupation && (
                    <p className="text-sm font-semibold text-zinc-700 tracking-wide uppercase">
                      {profile.occupation}
                    </p>
                  )}

                  {/* Contatos & Localização */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-xs text-zinc-600 font-medium">
                    {profile?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3 text-zinc-400" />
                        <span>{profile.email}</span>
                      </span>
                    )}
                    {showPhone && profile?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-zinc-400" />
                        <span>{profile.phone}</span>
                      </span>
                    )}
                    {showAddress && (profile?.city || profile?.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3 text-zinc-400" />
                        <span>{[profile.city, profile.state].filter(Boolean).join(", ")}</span>
                      </span>
                    )}
                    {profile?.website && (
                      <span className="flex items-center gap-1">
                        <Globe className="size-3 text-zinc-400" />
                        <span>{profile.website.replace(/^https?:\/\//, "")}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Foto / Avatar ou QR Code */}
                <div className="flex items-center gap-3 shrink-0">
                  {showPhoto && profile?.avatar_url && (
                    <div className="size-16 sm:size-20 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 shadow-2xs">
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="size-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {showQrCode && (
                    <div className="hidden sm:flex flex-col items-center gap-1 p-1 rounded-xl border border-zinc-200 bg-white">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="size-14 object-contain"
                        crossOrigin="anonymous"
                      />
                      <span className="text-[8px] font-bold text-zinc-500 tracking-tighter uppercase">
                        Perfil Digital
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RESUMO EXECUTIVO / SOBRE ── */}
              {showSummary && summary && (
                <div className="space-y-1.5">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                    style={{ color: accentColor.hex }}
                  >
                    Resumo Profissional
                  </h2>
                  <p className="text-xs sm:text-[13px] text-zinc-700 leading-relaxed whitespace-pre-line text-justify">
                    {summary}
                  </p>
                </div>
              )}

              {/* ── EXPERIÊNCIAS PROFISSIONAIS ── */}
              {showExperiences && experiences.length > 0 && (
                <div className="space-y-3">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                    style={{ color: accentColor.hex }}
                  >
                    Trajetória Profissional
                  </h2>
                  <div className="space-y-3 divide-y divide-zinc-100">
                    {experiences.map((exp: any, i: number) => (
                      <div key={i} className={cn("space-y-1", i > 0 && "pt-2.5")}>
                        <div className="flex items-start justify-between text-xs gap-2">
                          <div>
                            <span className="font-bold text-zinc-900 text-sm">{exp.title}</span>
                            <span className="text-zinc-600 font-medium"> • {exp.company}</span>
                            {exp.location && (
                              <span className="text-zinc-500 text-[11px]"> ({exp.location})</span>
                            )}
                          </div>
                          <span className="text-zinc-500 font-mono text-[11px] shrink-0 font-medium">
                            {exp.start_date} – {exp.is_current ? "Atual" : exp.end_date}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                            {exp.description}
                          </p>
                        )}
                        {exp.skills && exp.skills.length > 0 && (
                          <p className="text-[11px] text-zinc-500 pt-0.5">
                            <strong className="text-zinc-700">Competências:</strong>{" "}
                            {exp.skills.join(" • ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── FORMAÇÃO ACADÊMICA ── */}
              {showEducations && educations.length > 0 && (
                <div className="space-y-2">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                    style={{ color: accentColor.hex }}
                  >
                    Formação Acadêmica
                  </h2>
                  <div className="space-y-2">
                    {educations.map((edu: any, i: number) => (
                      <div key={i} className="flex items-start justify-between text-xs">
                        <div>
                          <span className="font-bold text-zinc-900">{edu.school}</span>
                          <p className="text-zinc-600">
                            {[edu.degree, edu.field_of_study].filter(Boolean).join(" em ")}
                          </p>
                        </div>
                        <span className="text-zinc-500 font-mono text-[11px] shrink-0">
                          {edu.start_date} – {edu.end_date || "Presente"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── LICENÇAS E CERTIFICADOS ── */}
              {showCertifications && certifications.length > 0 && (
                <div className="space-y-2">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                    style={{ color: accentColor.hex }}
                  >
                    Certificações & Licenças
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {certifications.map((cert: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                        <span className="font-bold text-zinc-900 block truncate">{cert.name}</span>
                        <span className="text-zinc-500 text-[11px] block">
                          {cert.issuer} {cert.issue_date && `• ${cert.issue_date}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PROJETOS EM DESTAQUE ── */}
              {showProjects && projects.length > 0 && (
                <div className="space-y-2">
                  <h2
                    className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                    style={{ color: accentColor.hex }}
                  >
                    Projetos Realizados
                  </h2>
                  <div className="space-y-2">
                    {projects.map((proj: any, i: number) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900">{proj.title}</span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            {proj.start_date} {proj.end_date ? `– ${proj.end_date}` : ""}
                          </span>
                        </div>
                        {proj.description && (
                          <p className="text-zinc-600 text-[11px] line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── IDIOMAS & VOLUNTARIADO ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {showLanguages && languages.length > 0 && (
                  <div className="space-y-1.5">
                    <h3
                      className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                      style={{ color: accentColor.hex }}
                    >
                      Idiomas
                    </h3>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {languages.map((l: any, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-medium"
                        >
                          <strong>{l.language}:</strong> {l.proficiency}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {showVolunteering && volunteering.length > 0 && (
                  <div className="space-y-1.5">
                    <h3
                      className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-100 pb-0.5"
                      style={{ color: accentColor.hex }}
                    >
                      Voluntariado
                    </h3>
                    <div className="space-y-1 text-xs">
                      {volunteering.slice(0, 2).map((v: any, i: number) => (
                        <div key={i} className="truncate">
                          <span className="font-bold text-zinc-900">{v.role}</span>
                          <span className="text-zinc-500 text-[11px]"> • {v.organization}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RODAPÉ DE VALIDAÇÃO DIGITAL WAESY ── */}
              <div className="pt-4 mt-auto border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span>Certificado e Verificado via Waesy Ecosystem</span>
                <span>{profileUrl.replace(/^https?:\/\//, "")}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
