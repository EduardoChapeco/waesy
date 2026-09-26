import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { getProfile, updateProfile } from "@/services/auth.functions";
import { updateMemberResumeData } from "@/services/social.functions";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Printer,
  Download,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  Smartphone,
  Eye,
  Building2,
  GraduationCap,
  Award,
  Globe,
  Phone,
  Mail,
  MapPin,
  Check,
  ExternalLink,
  Briefcase,
  Layers,
  QrCode,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_store/conta/curriculo")({
  head: () => ({
    meta: [
      { title: "Meu Currículo Profissional & Portfólio | Waesy" },
      {
        name: "description",
        content:
          "Crie, edite e exporte seu currículo digital em PDF de alta qualidade. Compartilhe seu portfólio profissional e candidate-se a vagas na sua região.",
      },
    ],
  }),
  loader: async () => {
    try {
      const profile = await getProfile();
      return { profile: profile || null };
    } catch {
      return { profile: null };
    }
  },
  component: MeuCurriculoPage,
});

export default function MeuCurriculoPage() {
  const router = useRouter();
  const { profile } = (Route.useLoaderData?.() as any) || {};

  const [activeMobileView, setActiveMobileView] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<"a4" | "story">("a4");
  const [template, setTemplate] = useState<"minimal" | "modern" | "editorial">("minimal");

  // Dados Pessoais
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [occupation, setOccupation] = useState(profile?.occupation || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [summary, setSummary] = useState(profile?.resume_data?.summary || profile?.bio || "");

  // Listas Modulares do Currículo
  const [experiences, setExperiences] = useState<any[]>(
    Array.isArray(profile?.resume_data?.experiences) ? profile.resume_data.experiences : []
  );
  const [educations, setEducations] = useState<any[]>(
    Array.isArray(profile?.resume_data?.educations) ? profile.resume_data.educations : []
  );
  const [certifications, setCertifications] = useState<any[]>(
    Array.isArray(profile?.resume_data?.certifications) ? profile.resume_data.certifications : []
  );
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(profile?.resume_data?.skills) ? profile.resume_data.skills : []
  );
  const [newSkill, setNewSkill] = useState("");

  const [showPhoto, setShowPhoto] = useState(true);

  const previewRef = useRef<HTMLDivElement>(null);

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${profile?.username || profile?.id}`
    : `https://usewaesy.pages.dev/u/${profile?.username || profile?.id}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    profileUrl
  )}&bgcolor=ffffff&color=000000&margin=1`;

  // Salvar no Banco via BFF Server Functions
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updatedResumeData = {
        ...(profile?.resume_data || {}),
        summary,
        experiences,
        educations,
        certifications,
        skills,
        custom_format: format,
        custom_template: template,
        updated_at: new Date().toISOString(),
      };

      await Promise.all([
        updateMemberResumeData({ data: { resumeData: updatedResumeData } }),
        updateProfile({
          data: {
            fullName,
            occupation,
            phone,
            city,
            state,
            website,
            bio: summary,
          },
        }),
      ]);

      toast.success("Currículo e dados profissionais salvos com sucesso!");
      router.invalidate();
    } catch (err: any) {
      console.error("[_store.conta.curriculo] Erro ao salvar:", err);
      toast.error(err?.message || "Erro ao salvar informações do currículo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Imprimir nativamente via window.print()
  const handlePrint = () => {
    window.print();
  };

  // Exportar PDF em Alta Resolução
  const handleDownloadPdf = async () => {
    if (!previewRef.current || typeof window === "undefined") return;
    try {
      setIsExporting(true);
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(previewRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      if (format === "a4") {
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        pdf.save(`curriculo-${profile?.username || "waesy"}.pdf`);
      } else {
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [540, 960] });
        pdf.addImage(imgData, "JPEG", 0, 0, 540, 960);
        pdf.save(`curriculo-story-${profile?.username || "waesy"}.pdf`);
      }
      toast.success("PDF gerado e baixado com sucesso!");
    } catch (err) {
      console.error("[_store.conta.curriculo] Falha ao exportar PDF:", err);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handlers para adicionar itens
  const addExperience = () => {
    setExperiences([
      {
        id: crypto.randomUUID(),
        title: "Novo Cargo",
        company: "Nome da Empresa",
        start_date: "2024",
        end_date: "",
        is_current: true,
        description: "",
      },
      ...experiences,
    ]);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: string, val: any) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: val };
    setExperiences(updated);
  };

  const addEducation = () => {
    setEducations([
      {
        id: crypto.randomUUID(),
        school: "Instituição de Ensino",
        degree: "Graduação / Curso",
        field_of_study: "Área de Formação",
        start_date: "2020",
        end_date: "2024",
      },
      ...educations,
    ]);
  };

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: string, val: any) => {
    const updated = [...educations];
    updated[index] = { ...updated[index], [field]: val };
    setEducations(updated);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <User className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Faça login para acessar seu currículo digital</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Crie seu currículo profissional, exporte em PDF de alta qualidade e compartilhe com recrutadores da região.
        </p>
        <Button asChild className="rounded-xl h-11 min-h-[44px] px-6 text-xs font-bold">
          <Link to="/entrar">Acessar Conta</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* ── Top Bar Canônica: Meu Currículo Digital ── */}
      <header className="h-14 px-3 sm:px-6 border-b border-border/50 bg-background/95 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Meu Currículo</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Portfólio & PDF Digital</span>
          </div>
        </div>

        {/* Seletor de Formato & Ações de Exportação */}
        <div className="flex items-center gap-2">
          {/* Alternador Mobile Editar / Visualizar */}
          <div className="flex lg:hidden items-center gap-1 p-0.5 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMobileView("edit")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[36px]",
                activeMobileView === "edit" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground"
              )}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileView("preview")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[36px]",
                activeMobileView === "preview" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground"
              )}
            >
              Prévia
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-xl bg-muted/50 border border-border/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFormat("a4")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                format === "a4" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground"
              )}
            >
              A4 Folha
            </button>
            <button
              type="button"
              onClick={() => setFormat("story")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                format === "story" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground"
              )}
            >
              Story 9:16
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 min-h-[44px] rounded-xl text-xs font-semibold gap-1.5 cursor-pointer hidden md:flex"
          >
            <Printer className="size-3.5" />
            <span>Imprimir</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="h-9 min-h-[44px] rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Baixar PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 min-h-[44px] rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer px-4"
          >
            <Save className="size-3.5" />
            <span>{isSaving ? "Salvando..." : "Salvar"}</span>
          </Button>
        </div>
      </header>

      {/* ── Split Screen: Editor Modular à Esquerda, Truthful Preview à Direita ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* COLUNA ESQUERDA: Formulários Modulares */}
        <div
          className={cn(
            "w-full lg:w-[480px] xl:w-[520px] border-r border-border/50 p-4 sm:p-5 overflow-y-auto space-y-5 bg-card/40 shrink-0",
            activeMobileView === "preview" ? "hidden lg:block" : "block"
          )}
        >
          {/* Seção 1: Dados Pessoais & Contatos */}
          <div className="space-y-4 p-4 rounded-2xl bg-card border border-border/50 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>1. Identificação & Contato</span>
              <span className="text-[10px] text-muted-foreground font-mono">Cabeçalho</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px]">Nome Completo</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Cargo / Headline Profissional</Label>
                <Input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Ex: Desenvolvedor Front-end / Vendedor Comercial"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Telefone / WhatsApp</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Cidade / Estado</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Chapecó, SC"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Website ou Portfólio</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://meusite.com"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Resumo Executivo / Sobre */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
              <span>2. Resumo Profissional</span>
              <Sparkles className="size-3.5 text-primary" />
            </h3>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Descreva de forma concisa sua especialidade, principais realizações e objetivos profissionais..."
              rows={4}
              className="rounded-xl text-xs leading-relaxed"
            />
          </div>

          {/* Seção 3: Trajetória & Experiências */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                3. Experiências ({experiences.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addExperience}
                className="h-8 px-2.5 rounded-lg text-[11px] font-semibold gap-1 cursor-pointer min-h-[36px]"
              >
                <Plus className="size-3" />
                <span>Adicionar</span>
              </Button>
            </div>

            <div className="space-y-3">
              {experiences.map((exp, idx) => (
                <div key={exp.id || idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(idx, "title", e.target.value)}
                      placeholder="Cargo"
                      className="h-8 rounded-lg text-xs font-bold flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="size-7 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center cursor-pointer min-h-[28px]"
                      title="Excluir experiência"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(idx, "company", e.target.value)}
                      placeholder="Empresa"
                      className="h-8 rounded-lg text-xs"
                    />
                    <Input
                      value={exp.start_date}
                      onChange={(e) => updateExperience(idx, "start_date", e.target.value)}
                      placeholder="Ano / Período"
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <Textarea
                    value={exp.description || ""}
                    onChange={(e) => updateExperience(idx, "description", e.target.value)}
                    placeholder="Principais entregas e resultados alcançados..."
                    rows={2}
                    className="rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Seção 4: Formação Acadêmica */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                4. Formação Acadêmica ({educations.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addEducation}
                className="h-8 px-2.5 rounded-lg text-[11px] font-semibold gap-1 cursor-pointer min-h-[36px]"
              >
                <Plus className="size-3" />
                <span>Adicionar</span>
              </Button>
            </div>

            <div className="space-y-3">
              {educations.map((edu, idx) => (
                <div key={edu.id || idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={edu.school}
                      onChange={(e) => updateEducation(idx, "school", e.target.value)}
                      placeholder="Universidade / Escola / Instituto"
                      className="h-8 rounded-lg text-xs font-bold flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="size-7 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center cursor-pointer min-h-[28px]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <Input
                    value={edu.field_of_study || ""}
                    onChange={(e) => updateEducation(idx, "field_of_study", e.target.value)}
                    placeholder="Curso / Área de estudo"
                    className="h-8 rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Seção 5: Competências & Habilidades */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              5. Competências & Especialidades
            </h3>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                placeholder="Ex: Atendimento ao Cliente, React, Vendas..."
                className="h-8 rounded-xl text-xs flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddSkill}
                className="h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Adicionar
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-[11px] gap-1 px-2.5 py-0.5 rounded-lg cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => handleRemoveSkill(skill)}
                    title="Clique para remover"
                  >
                    <span>{skill}</span>
                    <span className="text-[10px] opacity-60">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Seção 6: Personalização Visual */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/50 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              6. Personalização & Layout
            </h3>
            <div className="space-y-2 text-xs">
              <Label className="text-[11px]">Template Visual</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "minimal", label: "Executivo" },
                  { id: "modern", label: "Moderno" },
                  { id: "editorial", label: "Editorial" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as any)}
                    className={cn(
                      "h-9 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[36px]",
                      template === t.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Links Rápidos do Ecossistema Civil */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex flex-col gap-2 text-xs">
            <span className="font-bold text-foreground">Ações de Carreira</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1.5">
                <Link to="/conta/candidaturas">
                  <Briefcase className="size-3.5" />
                  <span>Minhas Candidaturas</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1.5">
                <Link to="/empregos">
                  <ExternalLink className="size-3.5" />
                  <span>Ver Vagas Abertas</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1.5">
                <Link to="/membro/$id" params={{ id: profile.username || profile.id }}>
                  <User className="size-3.5" />
                  <span>Perfil Público</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Truthful Preview Live Canvas */}
        <div
          className={cn(
            "flex-1 min-h-0 bg-muted/40 p-4 sm:p-8 overflow-y-auto flex items-start justify-center",
            activeMobileView === "edit" ? "hidden lg:flex" : "flex"
          )}
        >
          <div
            ref={previewRef}
            className={cn(
              "bg-white text-zinc-900 shadow-xs transition-all select-none overflow-hidden",
              format === "a4"
                ? "w-full max-w-[650px] min-h-[920px] p-8 sm:p-10 space-y-6 rounded-2xl border border-zinc-200"
                : "w-full max-w-[400px] aspect-[9/16] p-6 space-y-4 rounded-3xl border border-zinc-200 flex flex-col justify-between"
            )}
            style={{
              fontFamily:
                template === "editorial"
                  ? "Georgia, Cambria, serif"
                  : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* Cabeçalho */}
            <div className="border-b border-zinc-200 pb-4 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                  {fullName || "Seu Nome Completo"}
                </h1>
                {occupation && (
                  <p className="text-xs sm:text-sm font-semibold text-zinc-700 tracking-wide uppercase">
                    {occupation}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-zinc-600 font-medium">
                  {profile.email && <span>{profile.email}</span>}
                  {phone && <span>• {phone}</span>}
                  {city && <span>• {city}</span>}
                  {website && <span>• {website.replace(/^https?:\/\//, "")}</span>}
                </div>
              </div>

              {profile?.avatar_url && showPhoto && (
                <div className="size-16 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                  <img src={profile.avatar_url} alt={fullName} className="size-full object-cover" />
                </div>
              )}
            </div>

            {/* Resumo */}
            {summary && (
              <div className="space-y-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-100 pb-0.5">
                  Resumo Profissional
                </h2>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line text-justify">
                  {summary}
                </p>
              </div>
            )}

            {/* Experiências */}
            {experiences.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-100 pb-0.5">
                  Trajetória Profissional
                </h2>
                <div className="space-y-2.5 divide-y divide-zinc-100">
                  {experiences.map((exp: any, i: number) => (
                    <div key={exp.id || i} className={cn("space-y-0.5", i > 0 && "pt-2")}>
                      <div className="flex items-start justify-between text-xs">
                        <span className="font-bold text-zinc-900">{exp.title}</span>
                        <span className="text-zinc-500 font-mono text-[11px]">{exp.start_date}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-zinc-600">{exp.company}</p>
                      {exp.description && (
                        <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formação */}
            {educations.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-100 pb-0.5">
                  Formação Acadêmica
                </h2>
                <div className="space-y-1.5">
                  {educations.map((edu: any, i: number) => (
                    <div key={edu.id || i} className="flex items-start justify-between text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{edu.school}</span>
                        <p className="text-zinc-600 text-[11px]">{edu.field_of_study}</p>
                      </div>
                      <span className="text-zinc-500 font-mono text-[11px]">{edu.start_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competências */}
            {skills.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 border-b border-zinc-100 pb-0.5">
                  Competências Principais
                </h2>
                <div className="flex flex-wrap gap-1 pt-1">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé Digital */}
            <div className="pt-4 mt-auto border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>Waesy Professional Ecosystem</span>
              <span>{profileUrl.replace(/^https?:\/\//, "")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
