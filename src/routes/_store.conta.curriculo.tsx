import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { getProfile, updateProfile, getUserSession } from "@/services/auth.functions";
import { searchStoresForCompanyAutocomplete } from "@/services/social.functions";
import {
  listUserResumes,
  saveUserResume,
  duplicateUserResume,
  type ResumeItemDTO,
} from "@/services/resumes.functions";
import { ResumeDocument } from "@/components/resume/resume-document";
import { ResumeAnalysisCard } from "@/components/resume/resume-analysis-card";
import { ResumeJobMatchingRail } from "@/components/resume/resume-job-matching-rail";
import { LinkedInProfileImportModal, type LinkedInImportResult } from "@/components/profile/linkedin-profile-import-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SeoGeoOptimizationPanel, type SeoGeoMetadata } from "@/components/seo";
import {
  Printer,
  Download,
  Plus,
  Trash2,
  FileText,
  GraduationCap,
  Briefcase,
  User,
  Linkedin,
  Languages as LanguagesIcon,
  Palette,
  Globe,
  ZoomIn,
  ZoomOut,
  Copy,
  ChevronDown,
  Check,
  X,
  Clock,
  Eye,
  ShieldCheck,
  Star,
  Building2,
  Loader2,
} from "lucide-react";
import type { ResumeDataDTO } from "@/types/resume";

const ACCENT_OPTIONS = [
  { id: "slate", label: "Grafite Executivo", bgClass: "bg-slate-900" },
  { id: "navy", label: "Azul Navy", bgClass: "bg-blue-900" },
  { id: "emerald", label: "Verde Esmeralda", bgClass: "bg-emerald-800" },
  { id: "burgundy", label: "Borgonha", bgClass: "bg-rose-900" },
  { id: "violet", label: "Violeta Tech", bgClass: "bg-purple-900" },
];


function CompanyStoreSelector({
  company,
  storeId,
  storeLogo,
  onChangeCompany,
  onSelectStore,
  onClearStore,
}: {
  company: string;
  storeId?: string;
  storeLogo?: string;
  onChangeCompany: (name: string) => void;
  onSelectStore: (store: { id: string; name: string; logo_url: string | null }) => void;
  onClearStore: () => void;
}) {
  const [query, setQuery] = useState(company || "");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setQuery(company || "");
  }, [company]);

  useEffect(() => {
    if (!isOpen || !query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchStoresForCompanyAutocomplete({ data: { query: query.trim() } });
        setResults(res || []);
      } catch (e) {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (storeId) {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2.5 min-w-0">
          {storeLogo ? (
            <img src={storeLogo} alt={company} className="size-8 rounded object-cover border border-border/40 shrink-0" />
          ) : (
            <div className="size-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground truncate">{company}</span>
              <Badge variant="outline" className="text-3xs text-primary border-primary/40 bg-primary/10 gap-1 px-1.5 py-0 h-4">
                <Check className="size-2.5" />
                <span>Empresa Verificada</span>
              </Badge>
            </div>
            <p className="text-3xs text-muted-foreground">Vinculada à plataforma Waesy</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearStore}
          className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Desvincular loja"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChangeCompany(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Nome da Empresa (digite para buscar no Waesy...)"
        className="h-11 min-h-11 rounded-lg text-xs font-semibold pr-9"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        {isSearching ? <Loader2 className="size-4 animate-spin text-primary" /> : <Building2 className="size-4" />}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden py-1 max-h-56 overflow-y-auto">
          <div className="px-3 py-1 text-3xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
            Lojas & Empresas Verificadas no Waesy
          </div>
          {results.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => {
                onSelectStore(st);
                setIsOpen(false);
              }}
              className="w-full min-h-11 flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors cursor-pointer text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {st.logo_url ? (
                <img src={st.logo_url} alt={st.name} className="size-7 rounded object-cover border border-border/40 shrink-0" />
              ) : (
                <div className="size-7 rounded bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Building2 className="size-3.5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground truncate">{st.name}</span>
                  <Badge variant="outline" className="text-3xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10 px-1 py-0 h-3.5">
                    Verificada
                  </Badge>
                </div>
                {(st.city || st.state) && (
                  <p className="text-3xs text-muted-foreground truncate">{[st.city, st.state].filter(Boolean).join(" - ")}</p>
                )}
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-3xs text-muted-foreground bg-muted/20 border-t border-border/40">
            Ou mantenha o nome digitado para empresas fora da plataforma.
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_store/conta/curriculo")({
  head: () => ({
    meta: [
      { title: "Criador de Currículo Profissional | Waesy" },
      {
        name: "description",
        content:
          "Crie, edite e exporte seu currículo digital em PDF de alta qualidade. Matching de vagas, candidatura rápida e templates otimizados para sistemas ATS.",
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const session = await getUserSession().catch(() => null);
    if (!session) {
      throw redirect({
        to: "/entrar",
        search: { returnUrl: location.pathname + (location.searchStr || "") },
      });
    }
  },
  loader: async () => {
    try {
      const [profile, resumes] = await Promise.all([
        getProfile().catch(() => null),
        listUserResumes().catch(() => []),
      ]);
      return { profile: profile || null, resumes: resumes || [] };
    } catch {
      return { profile: null, resumes: [] };
    }
  },
  component: MeuCurriculoPage,
});

export default function MeuCurriculoPage() {
  const router = useRouter();
  const { profile, resumes: initialResumes } = (Route.useLoaderData?.() as any) || {};

  // ── ESTADOS DE CURRÍCULOS & SELEÇÃO ──
  const [resumesList, setResumesList] = useState<ResumeItemDTO[]>(
    Array.isArray(initialResumes) && initialResumes.length > 0 ? initialResumes : []
  );
  const [activeResumeIndex, setActiveResumeIndex] = useState(0);
  const activeResume = resumesList[activeResumeIndex] || null;

  // ── ESTADO DA VIEW ATIVA NO EDITOR ──
  const [activeTab, setActiveTab] = useState<"conteudo" | "design" | "seo" | "analisar" | "vagas" | "integracoes">("conteudo");
  const [activeMobileView, setActiveMobileView] = useState<"edit" | "preview">("edit");
  const [seoGeo, setSeoGeo] = useState<SeoGeoMetadata>({
    seoTitle: "",
    seoDescription: "",
    keywords: [],
    allowAiIndexing: true,
  });

  // ── ESTADOS DE ZOOM DA FOLHA A4 ──
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // ── ESTADOS DO EDITOR (SINCRONIZADOS COM activeResume) ──
  const [resumeTitle, setResumeTitle] = useState(activeResume?.title || "Currículo Principal");
  const [templateId, setTemplateId] = useState<"minimal" | "modern" | "ats_friendly" | "editorial" | "creative">(
    (activeResume?.template_id as any) || "minimal"
  );
  const [accentColor, setAccentColor] = useState(activeResume?.accent_color || "slate");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">(
    (activeResume?.font_family as any) || "sans"
  );
  const [spacingDensity, setSpacingDensity] = useState<"compact" | "normal" | "relaxed">(
    (activeResume?.spacing_density as any) || "normal"
  );
  const [showPhoto, setShowPhoto] = useState(activeResume?.show_photo !== false);

  // Identificação Civil & Profissional
  const [fullName, setFullName] = useState(profile?.fullName || profile?.full_name || "");
  const [occupation, setOccupation] = useState(
    activeResume?.data?.headline || profile?.occupation || ""
  );
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [summary, setSummary] = useState(activeResume?.data?.summary || profile?.bio || "");

  // Listas Modulares
  const [experiences, setExperiences] = useState<any[]>(
    Array.isArray(activeResume?.data?.experiences) ? activeResume.data.experiences : []
  );
  const [educations, setEducations] = useState<any[]>(
    Array.isArray(activeResume?.data?.educations) ? activeResume.data.educations : []
  );
  const [certifications, setCertifications] = useState<any[]>(
    Array.isArray(activeResume?.data?.certifications) ? activeResume.data.certifications : []
  );
  const [licenses, setLicenses] = useState<any[]>(
    Array.isArray(activeResume?.data?.licenses) ? activeResume.data.licenses : []
  );
  const [projects, setProjects] = useState<any[]>(
    Array.isArray(activeResume?.data?.projects) ? activeResume.data.projects : []
  );
  const [languages, setLanguages] = useState<any[]>(
    Array.isArray(activeResume?.data?.languages) ? activeResume.data.languages : []
  );
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(activeResume?.data?.skills) ? activeResume.data.skills : []
  );
  const [newSkill, setNewSkill] = useState("");

  // Modais & Processamentos
  const [isLinkedInImportOpen, setIsLinkedInImportOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isExporting, setIsExporting] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${profile?.username || profile?.id}`
    : `https://waesy.com/u/${profile?.username || profile?.id}`;

  const resolvedAvatarUrl = profile?.avatarUrl || profile?.avatar_url || "";

  // Sincronizar quando troca de currículo ativo
  useEffect(() => {
    if (activeResume) {
      setResumeTitle(activeResume.title || "Currículo");
      setTemplateId(activeResume.template_id || "minimal");
      setAccentColor(activeResume.accent_color || "slate");
      setFontFamily(activeResume.font_family || "sans");
      setSpacingDensity(activeResume.spacing_density || "normal");
      setShowPhoto(activeResume.show_photo !== false);

      const d = activeResume.data || {};
      if (d.headline) setOccupation(d.headline);
      if (d.summary) setSummary(d.summary);
      if (Array.isArray(d.experiences)) setExperiences(d.experiences);
      if (Array.isArray(d.educations)) setEducations(d.educations);
      if (Array.isArray(d.certifications)) setCertifications(d.certifications);
      if (Array.isArray(d.licenses)) setLicenses(d.licenses);
      if (Array.isArray(d.projects)) setProjects(d.projects);
      if (Array.isArray(d.languages)) setLanguages(d.languages);
      if (Array.isArray(d.skills)) setSkills(d.skills);
    }
  }, [activeResumeIndex]);

  const normalizedExperiences = useMemo(() => {
    return experiences.map((exp) => ({
      ...exp,
      salary_cents: exp.last_salary ? Math.round(Number(exp.last_salary) * 100) : (exp.salary_cents || null),
      would_recommend: exp.would_recommend !== false,
    }));
  }, [experiences]);

  const currentResumeData: ResumeDataDTO = {
    headline: occupation,
    summary,
    experiences: normalizedExperiences,
    educations,
    certifications,
    licenses,
    projects,
    languages,
    skills,
    custom_template: templateId,
  };

  const handleSave = async (silent = false) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus("saving");
    try {
      await saveUserResume({
        data: {
          id: activeResume?.id !== "default-resume" ? activeResume?.id : undefined,
          title: resumeTitle.trim() || "Currículo Principal",
          isDefault: activeResume?.is_default ?? true,
          isPublic: activeResume?.is_public ?? false,
          templateId,
          accentColor,
          fontFamily,
          spacingDensity,
          showPhoto,
          data: currentResumeData as Record<string, any>,
        },
      });

      // Sincroniza identidade civil em profiles e avaliações de empregadores (InfoJobs / Glassdoor)
      await updateProfile({
        data: {
          fullName: fullName.trim() || profile?.fullName || profile?.full_name || "Usuário",
          occupation: occupation.trim(),
          phone: phone.trim(),
          city: city.trim(),
          state: state.trim(),
          website: website.trim(),
          bio: summary.trim(),
          resumeData: {
            ...currentResumeData,
            experiences: normalizedExperiences,
          },
        },
      }).catch((profileErr) => {
        console.error("[curriculo] Falha ao sincronizar profile/employer_reviews:", profileErr);
      });

      setSaveStatus("saved");
      if (!silent) {
        toast.success("Currículo salvo com sucesso!");
      }
    } catch (err: any) {
      console.error("[curriculo] Erro ao salvar:", err);
      setSaveStatus("unsaved");
      if (!silent) {
        toast.error(err?.message || "Erro ao salvar currículo.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Autosave trigger
  useEffect(() => {
    setSaveStatus("unsaved");
    const timer = setTimeout(() => {
      handleSave(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    resumeTitle,
    templateId,
    accentColor,
    fontFamily,
    spacingDensity,
    showPhoto,
    fullName,
    occupation,
    phone,
    city,
    state,
    website,
    summary,
    experiences,
    educations,
    certifications,
    licenses,
    projects,
    languages,
    skills,
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (typeof window === "undefined") return;
    try {
      setIsExporting(true);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageWidth = 210;
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      let currentY = 18;

      const checkPageBreak = (neededSpace: number) => {
        if (currentY + neededSpace > 280) {
          pdf.addPage();
          currentY = 18;
        }
      };

      // Header: Nome
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(20, 20, 20);
      pdf.text(fullName || "Nome do Profissional", margin, currentY);
      currentY += 6;

      // Cargo
      if (occupation) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(70, 70, 70);
        pdf.text(occupation, margin, currentY);
        currentY += 5;
      }

      // Linha de Contato
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(90, 90, 90);
      const contactBits = [
        phone,
        profile?.email,
        city && state ? `${city} - ${state}` : city || state,
        website,
      ].filter(Boolean);
      if (contactBits.length > 0) {
        pdf.text(contactBits.join("  |  "), margin, currentY);
        currentY += 5;
      }

      // Linha divisória
      pdf.setDrawColor(210, 215, 220);
      pdf.setLineWidth(0.4);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 7;

      // Resumo Profissional
      if (summary) {
        checkPageBreak(25);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text("RESUMO PROFISSIONAL", margin, currentY);
        currentY += 4.5;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        const splitSummary = pdf.splitTextToSize(summary, contentWidth);
        pdf.text(splitSummary, margin, currentY);
        currentY += splitSummary.length * 4.2 + 5;
      }

      // Experiências
      if (experiences.length > 0) {
        checkPageBreak(25);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text("EXPERIÊNCIA PROFISSIONAL", margin, currentY);
        currentY += 5;

        for (const exp of experiences) {
          checkPageBreak(20);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(35, 35, 35);
          pdf.text(`${exp.role} — ${exp.company}`, margin, currentY);
          currentY += 4;

          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8.5);
          pdf.setTextColor(110, 110, 110);
          const periodStr = `${exp.startDate || ""} - ${exp.endDate || "Atual"}`;
          pdf.text(periodStr, margin, currentY);
          currentY += 4;

          if (exp.description) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8.5);
            pdf.setTextColor(60, 60, 60);
            const splitDesc = pdf.splitTextToSize(exp.description, contentWidth);
            checkPageBreak(splitDesc.length * 3.8);
            pdf.text(splitDesc, margin, currentY);
            currentY += splitDesc.length * 3.8;
          }
          currentY += 3.5;
        }
        currentY += 2;
      }

      // Formação Acadêmica
      if (educations.length > 0) {
        checkPageBreak(20);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text("FORMAÇÃO ACADÊMICA", margin, currentY);
        currentY += 5;

        for (const ed of educations) {
          checkPageBreak(15);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9.5);
          pdf.setTextColor(35, 35, 35);
          pdf.text(`${ed.degree} — ${ed.institution}`, margin, currentY);
          currentY += 4;

          if (ed.startDate || ed.endDate) {
            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(8.5);
            pdf.setTextColor(110, 110, 110);
            pdf.text(`${ed.startDate || ""} - ${ed.endDate || ""}`, margin, currentY);
            currentY += 4;
          }
          currentY += 2;
        }
        currentY += 2;
      }

      // Competências
      if (skills.length > 0) {
        checkPageBreak(18);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text("COMPETÊNCIAS & HABILIDADES", margin, currentY);
        currentY += 4.5;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        const splitSkills = pdf.splitTextToSize(skills.join("  •  "), contentWidth);
        pdf.text(splitSkills, margin, currentY);
        currentY += splitSkills.length * 4.2 + 4;
      }

      // Idiomas
      if (languages.length > 0) {
        checkPageBreak(18);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text("IDIOMAS", margin, currentY);
        currentY += 4.5;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        const langText = languages.map((l) => `${l.name} (${l.level})`).join("  •  ");
        const splitLang = pdf.splitTextToSize(langText, contentWidth);
        pdf.text(splitLang, margin, currentY);
        currentY += splitLang.length * 4.2 + 4;
      }

      // Certificações
      if (certifications.length > 0) {
        checkPageBreak(18);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.setTextColor(30, 30, 30);
        pdf.text("CERTIFICAÇÕES", margin, currentY);
        currentY += 4.5;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        const certText = certifications
          .map((c) => `${c.name} (${c.issuer}${c.issueDate ? ` - ${c.issueDate}` : ""})`)
          .join("  •  ");
        const splitCert = pdf.splitTextToSize(certText, contentWidth);
        pdf.text(splitCert, margin, currentY);
        currentY += splitCert.length * 4.2 + 4;
      }

      const cleanName = (fullName || "curriculo")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-");

      pdf.save(`${cleanName}-curriculo-ats.pdf`);
      toast.success("Currículo em PDF estruturado (compatível com ATS) gerado com sucesso!");
    } catch (err) {
      console.error("[curriculo] Erro ao exportar PDF:", err);
      toast.error("Não foi possível gerar o PDF estruturado. Recomendamos usar o botão Imprimir para salvar como PDF nativo.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateTitle.trim()) {
      toast.error("Informe um nome para o novo currículo.");
      return;
    }
    try {
      const res = await duplicateUserResume({
        data: {
          sourceResumeId: activeResume?.id || "default-resume",
          newTitle: duplicateTitle.trim(),
        },
      });

      if (res.duplicatedResume) {
        setResumesList((prev) => [res.duplicatedResume, ...prev]);
        setActiveResumeIndex(0);
        setIsDuplicateDialogOpen(false);
        setDuplicateTitle("");
        toast.success(`Currículo "${duplicateTitle}" criado com sucesso!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar currículo.");
    }
  };

  const handleAdaptForJob = (jobTitle: string) => {
    setDuplicateTitle(`Currículo - ${jobTitle}`);
    setIsDuplicateDialogOpen(true);
  };

  const handleLinkedInImport = (imported: LinkedInImportResult) => {
    if (imported.headline) setOccupation(imported.headline);
    if (imported.summary) setSummary(imported.summary);
    if (imported.experiences.length > 0) {
      setExperiences((prev) => [...imported.experiences, ...prev]);
    }
    if (imported.educations.length > 0) {
      setEducations((prev) => [...imported.educations, ...prev]);
    }
    if (imported.skills.length > 0) {
      setSkills((prev) => Array.from(new Set([...prev, ...imported.skills])));
    }
    toast.success("Dados incorporados ao currículo!");
  };

  const addExperience = () => {
    setExperiences([
      {
        id: `exp-${Date.now()}`,
        title: "",
        company: "",
        start_date: new Date().getFullYear().toString(),
        end_date: "",
        is_current: true,
        description: "",
      },
      ...experiences,
    ]);
  };

  const removeExperience = (idx: number) => {
    setExperiences(experiences.filter((_, i) => i !== idx));
  };

  const updateExperience = (idx: number, field: string, val: any) => {
    const updated = [...experiences];
    updated[idx] = { ...updated[idx], [field]: val };
    setExperiences(updated);
  };

  const addEducation = () => {
    setEducations([
      {
        id: `edu-${Date.now()}`,
        school: "",
        field_of_study: "",
        degree: "",
        start_date: new Date().getFullYear().toString(),
        end_date: "",
      },
      ...educations,
    ]);
  };

  const removeEducation = (idx: number) => {
    setEducations(educations.filter((_, i) => i !== idx));
  };

  const updateEducation = (idx: number, field: string, val: any) => {
    const updated = [...educations];
    updated[idx] = { ...updated[idx], [field]: val };
    setEducations(updated);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  if (!profile) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <User className="size-8" />
        </div>
        <h2 className="text-xl font-bold">Acesse seu Currículo Digital</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          Crie seu currículo profissional, exporte em PDF de alta qualidade e candidate-se a vagas na sua região.
        </p>
        <Button asChild className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Link to="/entrar">Acessar Conta</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-background font-sans text-foreground">
      {/* ── TOPBAR DO CRIADOR DE CURRÍCULO ── */}
      <header className="h-16 px-4 sm:px-6 border-b border-border/60 bg-card/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="size-11 min-h-11 rounded-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/conta" aria-label="Voltar para Minha Conta">
              <ChevronDown className="size-5 rotate-90" />
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={resumeTitle}
                onChange={(e) => setResumeTitle(e.target.value)}
                className="text-sm font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none max-w-xs truncate"
                placeholder="Título do Currículo"
              />
              {/* Indicador de Status de Autosave */}
              <div className="flex items-center gap-1 text-xs">
                {saveStatus === "saving" ? (
                  <span className="text-amber-500 font-mono flex items-center gap-1">
                    <Clock className="size-3 animate-spin motion-reduce:animate-none" />
                    <span className="hidden sm:inline">Salvando...</span>
                  </span>
                ) : saveStatus === "saved" ? (
                  <span className="text-emerald-500 font-mono flex items-center gap-1">
                    <Check className="size-3" />
                    <span className="hidden sm:inline">Salvo</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground font-mono">
                    <span className="hidden sm:inline">• Editando</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground truncate hidden sm:block">
              {fullName} • {resumesList.length} versão{resumesList.length !== 1 ? "ões" : ""}
            </div>
          </div>
        </div>

        {/* Ações Globais: Versões, Imprimir e PDF */}
        <div className="flex items-center gap-2">
          {/* Seletor de Versões de Currículo */}
          {resumesList.length > 1 && (
            <Select
              value={String(activeResumeIndex)}
              onValueChange={(val) => setActiveResumeIndex(Number(val))}
            >
              <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs font-semibold max-w-xs hidden sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <SelectValue placeholder="Alternar versão" />
              </SelectTrigger>
              <SelectContent>
                {resumesList.map((r, idx) => (
                  <SelectItem key={r.id} value={String(idx)}>
                    {r.title} {r.is_default ? "(Padrão)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDuplicateTitle(`${resumeTitle} (Cópia)`);
              setIsDuplicateDialogOpen(true);
            }}
            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 hidden md:flex cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Duplicar para criar versão para outra vaga ou área"
          >
            <Copy className="size-4" />
            <span>Duplicar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Imprimir ou Salvar como PDF nativo"
          >
            <Printer className="size-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="size-4" />
            <span>{isExporting ? "Gerando..." : "Baixar PDF"}</span>
          </Button>
        </div>
      </header>

      {/* ── ALTERNADOR MOBILE (EDITAR ↔ VER FOLHA A4) ── */}
      <div className="lg:hidden px-4 py-2 border-b border-border/40 bg-card/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/40 text-xs font-semibold flex-1">
          <button
            type="button"
            onClick={() => setActiveMobileView("edit")}
            className={cn(
              "flex-1 h-11 min-h-11 rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeMobileView === "edit"
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="size-4" />
            <span>Editar Conteúdo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileView("preview")}
            className={cn(
              "flex-1 h-11 min-h-11 rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeMobileView === "preview"
                ? "bg-card text-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="size-4" />
            <span>Folha A4 (Preview)</span>
          </button>
        </div>
      </div>

      {/* ── CORPO PRINCIPAL COM DIVISÃO DE TELAS ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUNA ESQUERDA: EDITOR MODULAR COM 4 ABAS */}
        <div
          className={cn(
            "w-full lg:w-1/2 xl:w-2/5 border-r border-border/60 bg-background flex flex-col shrink-0 h-full overflow-hidden",
            activeMobileView === "preview" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Navegação de Abas do Editor */}
          {/* design-lint-ignore DL-30 reason:"B39 single continuous horizontal tabs navigation requirement" expiry:"2030-01-01" */}
          <div className="flex border-b border-border/60 px-4 bg-muted/20 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: "conteudo", label: "Conteúdo", icon: FileText },
              { id: "design", label: "Design & Estilo", icon: Palette },
              { id: "seo", label: "SEO & Busca", icon: Globe },
              { id: "analisar", label: "Análise ATS", icon: ShieldCheck },
              { id: "vagas", label: "Vagas & Match", icon: Briefcase },
              { id: "integracoes", label: "LinkedIn", icon: Linkedin },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Área com Rolagem de Cada Aba */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ── ABA 1: CONTEÚDO E DADOS ESTRUTURADOS ── */}
            {activeTab === "conteudo" && (
              <div className="space-y-6">
                {/* Seção 1: Identificação Civil & Contato */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Identificação & Contato
                  </h3>
                  <div className="space-y-4 text-xs">
                    <div>
                      <Label className="text-xs">Nome Completo</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo Silveira"
                        className="h-11 min-h-11 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cargo Desejado / Headline</Label>
                      <Input
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Ex: Gerente Comercial | Especialista de Varejo"
                        className="h-11 min-h-11 rounded-lg text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">E-mail de Contato</Label>
                        <Input
                          value={profile.email || ""}
                          disabled
                          className="h-11 min-h-11 rounded-lg text-xs bg-muted/40 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Telefone / WhatsApp</Label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(49) 99999-9999"
                          className="h-11 min-h-11 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Cidade</Label>
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="São Miguel do Oeste"
                          className="h-11 min-h-11 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Estado (UF)</Label>
                        <Input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="SC"
                          maxLength={2}
                          className="h-11 min-h-11 rounded-lg text-xs uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Website / Portfólio (Opcional)</Label>
                      <Input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://meuportfolio.com"
                        className="h-11 min-h-11 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Resumo Profissional */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Resumo Profissional
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      {summary.length} caracteres
                    </span>
                  </div>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Apresente sua trajetória, principais realizações e objetivos profissionais de forma concisa e objetiva..."
                    rows={4}
                    className="text-xs rounded-lg leading-relaxed"
                  />
                </div>

                {/* Seção 3: Experiências Profissionais */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Trajetória Profissional ({experiences.length})
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addExperience}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Plus className="size-4" />
                      <span>Adicionar Cargo</span>
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {experiences.length === 0 ? (
                      <EmptyState
                        icon={Briefcase}
                        title="Nenhuma experiência adicionada"
                        description="Adicione seus cargos anteriores ou projetos para enriquecer seu currículo."
                      />
                    ) : (
                      experiences.map((exp, idx) => (
                        <div
                          key={exp.id || idx}
                          className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={exp.title || ""}
                              onChange={(e) => updateExperience(idx, "title", e.target.value)}
                              placeholder="Cargo (Ex: Gerente de Vendas)"
                              className="h-11 min-h-11 rounded-lg text-xs font-bold flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => removeExperience(idx)}
                              className="size-11 min-h-11 min-w-11 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title="Remover cargo"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          <CompanyStoreSelector
                            company={exp.company || ""}
                            storeId={exp.store_id}
                            storeLogo={exp.store_logo}
                            onChangeCompany={(val) => {
                              const updated = [...experiences];
                              updated[idx] = { ...updated[idx], company: val, store_id: undefined, store_logo: undefined };
                              setExperiences(updated);
                            }}
                            onSelectStore={(st) => {
                              const updated = [...experiences];
                              updated[idx] = { ...updated[idx], company: st.name, store_id: st.id, store_logo: st.logo_url || undefined };
                              setExperiences(updated);
                            }}
                            onClearStore={() => {
                              const updated = [...experiences];
                              updated[idx] = { ...updated[idx], store_id: undefined, store_logo: undefined };
                              setExperiences(updated);
                            }}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={exp.start_date || ""}
                              onChange={(e) => updateExperience(idx, "start_date", e.target.value)}
                              placeholder="Início (Ex: 2021 ou Mar/2021)"
                              className="h-11 min-h-11 rounded-lg text-xs"
                            />
                            <Input
                              value={exp.is_current ? "Presente" : exp.end_date || ""}
                              onChange={(e) => updateExperience(idx, "end_date", e.target.value)}
                              placeholder="Fim (Ex: 2024)"
                              disabled={exp.is_current}
                              className="h-11 min-h-11 rounded-lg text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={Boolean(exp.is_current)}
                                onCheckedChange={(val) => updateExperience(idx, "is_current", val)}
                              />
                              <Label className="text-xs">Trabalho atualmente aqui</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={exp.is_included !== false}
                                onCheckedChange={(val) => updateExperience(idx, "is_included", val)}
                              />
                              <Label className="text-xs text-muted-foreground">Exibir no currículo</Label>
                            </div>
                          </div>

                          <Textarea
                            value={exp.description || ""}
                            onChange={(e) => updateExperience(idx, "description", e.target.value)}
                            placeholder="Descreva suas responsabilidades, projetos e realizações alcançadas..."
                            rows={3}
                            className="rounded-lg text-xs"
                          />

                          {/* ── PAINEL CONFIDENCIAL: INTELIGÊNCIA SALARIAL & AVALIAÇÃO DE EMPREGADOR (Glassdoor/InfoJobs) ── */}
                          <div className="pt-3 border-t border-border/60 space-y-3 bg-muted/40 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-3xs font-bold text-muted-foreground uppercase tracking-wider">
                                <ShieldCheck className="size-3.5 text-primary" />
                                <span>Inteligência Confidencial (Nunca exibida no PDF do currículo)</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-3xs font-semibold text-muted-foreground block mb-1">
                                  Último Salário Bruto (Opcional - R$)
                                </label>
                                <Input
                                  value={exp.last_salary ? String(exp.last_salary) : ""}
                                  onChange={(e) => updateExperience(idx, "last_salary", Number(e.target.value) || undefined)}
                                  placeholder="Ex: 4500"
                                  type="number"
                                  className="h-11 min-h-11 rounded-lg text-xs"
                                />
                              </div>

                              <div>
                                <label className="text-3xs font-semibold text-muted-foreground block mb-1">
                                  Motivo de Saída / Transição
                                </label>
                                <Input
                                  value={exp.exit_reason || ""}
                                  onChange={(e) => updateExperience(idx, "exit_reason", e.target.value)}
                                  placeholder="Ex: Busca de novos desafios / Reestruturação"
                                  className="h-11 min-h-11 rounded-lg text-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-3xs font-semibold text-muted-foreground block mb-1">
                                Avaliação Geral da Empresa (Ambiente & Gestão: 1 a 5)
                              </label>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateExperience(idx, "company_rating", star)}
                                    aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                                    className={`size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                      (exp.company_rating || 0) >= star
                                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                                        : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                                    }`}
                                  >
                                    {star}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="pt-1">
                              <label className="text-3xs font-semibold text-muted-foreground block mb-1">
                                Recomendaria esta empresa a amigos? (Gostava de trabalhar lá?)
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateExperience(idx, "would_recommend", true)}
                                  className={`h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    exp.would_recommend !== false
                                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                                      : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                                  }`}
                                >
                                  <Check className="size-4" />
                                  <span>Sim, recomendo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateExperience(idx, "would_recommend", false)}
                                  className={`h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    exp.would_recommend === false
                                      ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40"
                                      : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                                  }`}
                                >
                                  <X className="size-4" />
                                  <span>Não recomendo</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Seção 4: Formação Acadêmica */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Formação Acadêmica ({educations.length})
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addEducation}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Plus className="size-4" />
                      <span>Adicionar Formação</span>
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {educations.length === 0 ? (
                      <EmptyState
                        icon={GraduationCap}
                        title="Nenhuma formação cadastrada"
                        description="Informe suas graduações, cursos técnicos ou pós-graduações."
                      />
                    ) : (
                      educations.map((edu, idx) => (
                        <div
                          key={edu.id || idx}
                          className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={edu.school || ""}
                              onChange={(e) => updateEducation(idx, "school", e.target.value)}
                              placeholder="Instituição (Ex: UNOESC, USP, Senai)"
                              className="h-11 min-h-11 rounded-lg text-xs font-bold flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => removeEducation(idx)}
                              className="size-11 min-h-11 min-w-11 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                          <Input
                            value={edu.field_of_study || ""}
                            onChange={(e) => updateEducation(idx, "field_of_study", e.target.value)}
                            placeholder="Curso / Área (Ex: Administração, Ciência da Computação)"
                            className="h-11 min-h-11 rounded-lg text-xs"
                          />
                          <Input
                            value={edu.start_date || ""}
                            onChange={(e) => updateEducation(idx, "start_date", e.target.value)}
                            placeholder="Período ou Ano de Conclusão (Ex: 2018 - 2022)"
                            className="h-11 min-h-11 rounded-lg text-xs"
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Seção 5: Competências & Habilidades */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Competências & Habilidades
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                      placeholder="Ex: Gestão de Equipes, React, Vendas B2B, Negociação..."
                      className="h-11 min-h-11 rounded-lg text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddSkill}
                      className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Adicionar
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs px-3 py-1 rounded-md cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => handleRemoveSkill(skill)}
                          title="Clique para remover"
                        >
                          <span>{skill}</span>
                          <span className="opacity-60">×</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ABA 2: DESIGN & TEMPLATES ── */}
            {activeTab === "design" && (
              <div className="space-y-6">
                {/* 1. Escolha de Template */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Modelos de Apresentação (Templates Canônicos)
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: "minimal",
                        title: "Executivo / Minimalista",
                        desc: "1 coluna linear, tipografia limpa e linha do tempo formal. Ideal para liderança e corporativo.",
                      },
                      {
                        id: "modern",
                        title: "Moderno com Sidebar",
                        desc: "2 colunas equilibradas com painel lateral de contatos e competências.",
                      },
                      {
                        id: "ats_friendly",
                        title: "ATS-Friendly Otimizado",
                        desc: "Estrutura 100% linear sem tabelas ou caixas paralelas. Máxima leitura por robôs de recrutamento.",
                      },
                      {
                        id: "editorial",
                        title: "Editorial Clássico",
                        desc: "Tipografia serifada requintada. Perfeito para advocacia, consultoria e área acadêmica.",
                      },
                      {
                        id: "creative",
                        title: "Criativo & Tech",
                        desc: "Destaques visuais e linhas de acento na cor de sua escolha.",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateId(t.id as any)}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          templateId === t.id
                            ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                            : "bg-muted/20 border-border/60 hover:bg-muted/40 text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{t.title}</span>
                          {templateId === t.id && <Check className="size-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Cores de Destaque */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Cor de Destaque
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ACCENT_OPTIONS.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setAccentColor(col.id)}
                        className={cn(
                          "h-11 min-h-11 px-3 rounded-lg border flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          accentColor === col.id
                            ? "border-primary bg-primary/10 text-foreground font-bold"
                            : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                        )}
                      >
                        <span className={cn("size-4 rounded-full shrink-0", col.bgClass)} />
                        <span className="truncate">{col.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Tipografia & Densidade */}
                <div className="p-4 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Tipografia & Espaçamento
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div>
                      <Label className="text-xs">Família Tipográfica</Label>
                      <Select value={fontFamily} onValueChange={(val: any) => setFontFamily(val)}>
                        <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <SelectValue placeholder="Fonte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sans">Inter / Sem Serifa (Moderna & Clara)</SelectItem>
                          <SelectItem value="serif">Merriweather / Serifada (Clássica & Editorial)</SelectItem>
                          <SelectItem value="mono">Roboto Mono (Técnica & Desenvolvedor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Densidade de Margens e Espaçamento</Label>
                      <Select value={spacingDensity} onValueChange={(val: any) => setSpacingDensity(val)}>
                        <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <SelectValue placeholder="Densidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compacto (Mais conteúdo por página)</SelectItem>
                          <SelectItem value="normal">Padrão Equilibrado</SelectItem>
                          <SelectItem value="relaxed">Confortável / Amplo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div>
                        <Label className="text-xs font-semibold">Foto de Perfil</Label>
                        <p className="text-xs text-muted-foreground">Exibir foto no cabeçalho do documento</p>
                      </div>
                      <Switch checked={showPhoto} onCheckedChange={setShowPhoto} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ABA: OTIMIZAÇÃO SEO, GEO E INDEXAÇÃO AGÊNTICA ── */}
            {activeTab === "seo" && (
              <div className="space-y-4">
                <SeoGeoOptimizationPanel
                  value={seoGeo}
                  onChange={setSeoGeo}
                  referenceTitle={`${fullName} - ${occupation}`}
                  referenceDescription={summary}
                  referenceAddress={`${city} / ${state}`}
                  defaultOpen={true}
                />
              </div>
            )}

            {/* ── ABA 3: ANÁLISE DE COMPLETUDE & ASSISTENTE ATS ── */}
            {activeTab === "analisar" && (
              <ResumeAnalysisCard
                data={currentResumeData}
                fullName={fullName}
                email={profile.email}
                phone={phone}
                city={city}
                templateId={templateId}
              />
            )}

            {/* ── ABA 4: VAGAS & MATCHING INTELIGENTE ── */}
            {activeTab === "vagas" && (
              <ResumeJobMatchingRail
                resumeData={currentResumeData}
                fullName={fullName}
                email={profile.email}
                phone={phone}
                currentCity={city}
                onAdaptResumeForJob={handleAdaptForJob}
              />
            )}

            {/* ── ABA 5: INTEGRAÇÃO LINKEDIN ── */}
            {activeTab === "integracoes" && (
              <div className="p-6 rounded-lg bg-card border border-border/60 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Linkedin className="size-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Sincronização com LinkedIn</h3>
                    <p className="text-xs text-muted-foreground">Integração oficial sem scraping ou métodos não autorizados.</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Conecte sua conta do LinkedIn via OpenID Connect para sincronizar sua foto de perfil, e-mail verificado e headline, ou importe seu arquivo de dados oficial exportado para extrair histórico de cargos.
                </p>

                <Button
                  type="button"
                  onClick={() => setIsLinkedInImportOpen(true)}
                  className="w-full h-11 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Linkedin className="size-4 fill-current" />
                  <span>Abrir Central do LinkedIn</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: DESK DE VISUALIZAÇÃO A4 (ZERO CONTAMINAÇÃO DARK MODE) */}
        <div
          className={cn(
            "flex-1 bg-zinc-900/10 dark:bg-zinc-950 p-4 sm:p-8 overflow-y-auto flex flex-col items-center justify-start min-h-screen relative no-scrollbar",
            activeMobileView === "edit" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Barra de Zoom da Folha A4 */}
          <div className="sticky top-2 z-20 mb-4 px-3 py-1 rounded-full bg-card/90 backdrop-blur-md border border-border/60 shadow-xs flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Reduzir Zoom"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="font-mono font-bold text-xs min-w-12 text-center text-foreground">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 15))}
              className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Aumentar Zoom"
            >
              <ZoomIn className="size-4" />
            </button>
            <div className="h-4 w-px bg-border/60 mx-1" />
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="h-11 min-h-11 px-3 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              A4 100%
            </button>
          </div>

          {/* Container do Documento com Escala Controlada */}
          <div
            className="w-full flex justify-center transition-transform origin-top"
          >
            <ResumeDocument
              ref={previewRef}
              data={currentResumeData}
              fullName={fullName}
              avatarUrl={resolvedAvatarUrl}
              email={profile.email}
              phone={phone}
              city={city}
              state={state}
              website={website}
              templateId={templateId}
              accentColor={accentColor}
              fontFamily={fontFamily}
              spacingDensity={spacingDensity}
              showPhoto={showPhoto}
              profileUrl={profileUrl}
            />
          </div>
        </div>
      </div>

      {/* ── MODAL DE DUPLICAÇÃO DE CURRÍCULO ── */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Duplicar Currículo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie uma versão dedicada para concorrer a vagas específicas ou áreas diferentes sem alterar seu currículo principal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Label className="text-xs font-semibold">Nome da Nova Versão</Label>
            <Input
              value={duplicateTitle}
              onChange={(e) => setDuplicateTitle(e.target.value)}
              placeholder="Ex: Currículo - Desenvolvedor Front-end"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDuplicateDialogOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDuplicate}
              className="h-11 min-h-11 px-6 text-xs font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Criar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL OFICIAL DO LINKEDIN ── */}
      <LinkedInProfileImportModal
        open={isLinkedInImportOpen}
        onOpenChange={setIsLinkedInImportOpen}
        onImport={handleLinkedInImport}
      />
    </div>
  );
}
