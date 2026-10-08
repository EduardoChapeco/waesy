import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { getProfile, updateProfile, requestAccountDeletion } from "@/services/auth.functions";
import { uploadProfileMediaDirect } from "@/services/storage.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { CitySelect } from "@/components/ui/city-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeMobileHeader } from "@/components/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, Camera, ExternalLink, Loader2, Image as ImageIcon, Trash2, Check, Briefcase, Link as LinkIcon, ShieldCheck, Eye, EyeOff, Building2, ShieldAlert, Phone, Calendar, Lock, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ProfessionalResumeEditor, ResumeDataDTO } from "@/components/profile/professional-resume-editor";

function normalizeGenderValue(g?: string): "feminino" | "masculino" | "outro" | "prefiro_nao_dizer" {
  if (!g || g === "not_informed") return "prefiro_nao_dizer";
  if (g === "female" || g === "feminino") return "feminino";
  if (g === "male" || g === "masculino") return "masculino";
  if (g === "other" || g === "non_binary" || g === "outro") return "outro";
  return "prefiro_nao_dizer";
}

export const Route = createFileRoute("/_store/conta/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil | Waesy" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  loader: async () => {
    try {
      const res = await getProfile().catch(() => null);
      return { profile: res || {} };
    } catch {
      return { profile: {} };
    }
  },
  component: ProfileCivilPage,
});

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

function ProfileCivilPage() {
  const { profile: rawProfile } = (Route.useLoaderData() as any) || {};
  const profile = rawProfile || {};
  const search = (Route.useSearch() as any) || {};
  const defaultTab =
    search?.tab === "profissional"
      ? "profissional"
      : search?.tab === "privacidade"
      ? "privacidade"
      : search?.tab === "links" || search?.tab === "comercial"
      ? "links"
      : "dados";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const biolinkImageInputRef = useRef<HTMLInputElement>(null);

  // Estados de Recorte de Imagem (1:1 Avatar, 21:9 Capa)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<"avatar" | "cover">("avatar");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingBiolinkImage, setIsUploadingBiolinkImage] = useState(false);

  const initialResume = profile?.resume_data || {};
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || "",
    username:
      profile?.username ||
      (profile?.email ? profile.email.split("@")[0].toLowerCase().replace(/[^a-z0-9._]/g, "") : "") ||
      (profile?.fullName ? profile.fullName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "") : "") ||
      "",
    phone: profile?.phone ? maskPhone(profile.phone) : "",
    avatarUrl: profile?.avatarUrl || profile?.avatar_url || "",
    coverUrl: profile?.coverUrl || profile?.cover_url || "",
    bio: profile?.bio || "",
    occupation: profile?.occupation || "",
    city: profile?.city || "",
    state: profile?.state || "SC",
    instagram: profile?.instagram || "",
    website: profile?.website || "",
    cpf: profile?.cpf ? maskCpf(profile.cpf) : "",
    birthDate: profile?.birthDate || profile?.birth_date || "",
    gender: normalizeGenderValue(profile?.gender),
    newsletterOptIn: profile?.newsletterOptIn ?? false,
    isAnonymous: profile?.is_anonymous ?? profile?.isAnonymous ?? false,
    hideLocation: profile?.hide_location ?? profile?.hideLocation ?? false,
  });

  // Perfil Profissional / Currículo (Padrão Executivo Waesy)
  const [resumeData, setResumeData] = useState<ResumeDataDTO>({
    headline: initialResume?.headline || "",
    summary: initialResume?.summary || "",
    hiringStatus: initialResume?.hiringStatus || "open",
    skills: Array.isArray(initialResume?.skills)
      ? initialResume.skills
      : typeof initialResume?.skillsString === "string"
      ? initialResume.skillsString.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
    availability: initialResume?.availability || {},
    experiences: Array.isArray(initialResume?.experiences) ? initialResume.experiences : [],
    educations: Array.isArray(initialResume?.educations)
      ? initialResume.educations
      : Array.isArray(initialResume?.education)
      ? initialResume.education.map((e: any) => ({
          id: e.id || `edu_${Date.now()}`,
          school: e.institution || e.school || "",
          degree: e.degree || "",
          start_date: e.startDate || e.start_date || "",
          end_date: e.year || e.endDate || e.end_date || "",
          description: e.description || "",
        }))
      : [],
    certifications: Array.isArray(initialResume?.certifications) ? initialResume.certifications : [],
    projects: Array.isArray(initialResume?.projects) ? initialResume.projects : [],
    volunteering: Array.isArray(initialResume?.volunteering) ? initialResume.volunteering : [],
    causes: Array.isArray(initialResume?.causes) ? initialResume.causes : [],
    languages: Array.isArray(initialResume?.languages) ? initialResume.languages : [],
  });

  // Biolinks / Links Externos Públicos (Exibidos no Perfil Público)
  const [biolinks, setBiolinks] = useState<
    Array<{
      id: string;
      label: string;
      title?: string;
      url: string;
      imageUrl?: string;
      isHighlight?: boolean;
    }>
  >(Array.isArray(profile?.biolinks) ? profile.biolinks : []);

  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkImage, setNewLinkImage] = useState("");

  const handleAddBiolink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      toast.error("Informe o título e o endereço (URL) do link.");
      return;
    }
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const newEntry = {
      id: `bio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: newLinkLabel.trim(),
      title: newLinkLabel.trim(),
      url,
      imageUrl: newLinkImage.trim() || undefined,
      isHighlight: false,
    };
    setBiolinks((prev) => [...prev, newEntry]);
    setNewLinkLabel("");
    setNewLinkUrl("");
    setNewLinkImage("");
    toast.success("Link adicionado à lista. Salve as alterações para persistir.");
  };

  const handleRemoveBiolink = (id: string) => {
    setBiolinks((prev) => prev.filter((b) => b.id !== id));
  };

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
      setCropperType(type);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBiolinkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBiolinkImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await uploadProfileMediaDirect({
        data: {
          fileName: `biolink_${Date.now()}.${file.name.split(".").pop() || "png"}`,
          fileType: file.type || "image/png",
          base64Data,
          target: "biolink_banner",
        },
      });

      setNewLinkImage(res.publicUrl);
      toast.success("Imagem de fundo do link enviada com sucesso!");
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro no upload do banner.");
    } finally {
      setIsUploadingBiolinkImage(false);
      e.target.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setIsUploadingMedia(true);

    try {
      const type = cropperType;
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });

      const res = await uploadProfileMediaDirect({
        data: {
          fileName: `perfil_${type}_${Date.now()}.png`,
          fileType: "image/png",
          base64Data,
          target: type,
        },
      });

      if (type === "avatar") {
        set("avatarUrl", res.publicUrl);
        toast.success("Foto de perfil atualizada!");
      } else if (type === "cover") {
        set("coverUrl", res.publicUrl);
        toast.success("Foto de capa atualizada!");
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro no upload da imagem.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanUser = formData.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUser || cleanUser.length < 3) {
      toast.error("O nome de usuário (@) é obrigatório e deve ter no mínimo 3 caracteres.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        data: {
          fullName: formData.fullName.trim(),
          username: cleanUser,
          phone: formData.phone.replace(/\D/g, "") || undefined,
          avatarUrl: formData.avatarUrl || undefined,
          coverUrl: formData.coverUrl || undefined,
          bio: formData.bio.trim() || undefined,
          occupation: formData.occupation.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          website: formData.website.trim() || undefined,
          cpf: formData.cpf.replace(/\D/g, "") || undefined,
          birthDate: formData.birthDate || undefined,
          gender: formData.gender as any,
          newsletterOptIn: formData.newsletterOptIn,
          isAnonymous: formData.isAnonymous,
          privacyMode: formData.isAnonymous ? "unlisted" : "public",
          hideLocation: formData.hideLocation,
          biolinks: biolinks.map((b) => ({
            id: b.id,
            label: b.label.trim(),
            title: b.title?.trim() || b.label.trim(),
            url: b.url.trim(),
            imageUrl: b.imageUrl?.trim() || undefined,
            isHighlight: Boolean(b.isHighlight),
          })),
          resumeData: {
            ...resumeData,
            headline: resumeData.headline?.trim() || undefined,
            summary: resumeData.summary?.trim() || undefined,
            hiringStatus: resumeData.hiringStatus,
            skills: resumeData.skills || [],
            availability: resumeData.availability,
            experiences: resumeData.experiences,
            educations: resumeData.educations,
            certifications: resumeData.certifications,
            projects: resumeData.projects,
            volunteering: resumeData.volunteering,
            causes: resumeData.causes,
            languages: resumeData.languages,
          },
        },
      });

      toast.success("Perfil e preferências salvos com sucesso!");
      router.invalidate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar perfil";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "EXCLUIR") {
      toast.error('Digite a palavra "EXCLUIR" em maiúsculas para confirmar.');
      return;
    }
    setIsDeleting(true);
    try {
      await requestAccountDeletion();
      toast.success("Sua conta civil foi agendada para exclusão definitiva.");
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao solicitar exclusão";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Canonical Navigation Header ── */}
      <NativeMobileHeader
        title="Perfil"
        fallbackHref="/conta"
        rightActions={
          <div className="flex items-center gap-2 sm:gap-2">
            {!formData.isAnonymous && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer shadow-none"
              >
                <Link
                  to="/membro/$id"
                  params={{ id: formData.username || profile.username || profile.id }}
                  target="_blank"
                >
                  <ExternalLink className="size-4 mr-2 text-primary" />
                  <span className="hidden sm:inline">Ver Perfil Público</span>
                  <span className="sm:hidden">Público</span>
                </Link>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer shadow-none"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  const handle = formData.username || profile.username;
                  const link = handle
                    ? `${window.location.origin}/membro/@${handle}`
                    : `${window.location.origin}/membro/${profile.id}`;
                  navigator.clipboard.writeText(link);
                  toast.success("Link do perfil copiado!");
                }
              }}
            >
              <LinkIcon className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Copiar Link</span>
            </Button>
          </div>
        }
      />

      {/* ── 1.1 Desktop Inpage Header (Apple HIG) ── */}
      <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <div className="flex items-center gap-2">
          {!formData.isAnonymous && (
            <Button
              asChild
              variant="outline"
              className="rounded-lg text-xs font-semibold h-11 px-4 cursor-pointer"
            >
              <Link
                to="/membro/$id"
                params={{ id: formData.username || profile.username || profile.id }}
                target="_blank"
              >
                <ExternalLink className="size-4 mr-2 text-primary" />
                <span>Ver Perfil Público</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Banner Informativo do Perfil Pessoal ── */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-4 text-xs text-foreground">
        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground text-sm">Perfil Pessoal</h3>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              Titular da Conta
            </Badge>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
            Estes são os seus dados como usuário na plataforma, utilizados para{" "}
            <strong>compras, ingressos, pedidos e comunicação com estabelecimentos</strong>.
            Para alternar e gerenciar lojas, empresas ou projetos profissionais, utilize o{" "}
            <Link to="/conta" className="text-primary font-semibold hover:underline">
              painel de contas
            </Link>{" "}
            no menu superior.
          </p>
        </div>
      </div>

      {/* ── 3. Formulário de Perfil Civil com 3 Abas Estritas ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center overflow-x-auto no-scrollbar pb-1">
            <TabsList className="bg-transparent p-0 gap-2 h-auto flex flex-nowrap">
              <TabsTrigger
                value="dados"
                className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <User className="size-3.5" strokeWidth={1.75} />
                <span>Identidade</span>
              </TabsTrigger>
              <TabsTrigger
                value="profissional"
                className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Briefcase className="size-3.5" strokeWidth={1.75} />
                <span>Currículo</span>
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LinkIcon className="size-3.5" strokeWidth={1.75} />
                <span>Links</span>
              </TabsTrigger>
              <TabsTrigger
                value="privacidade"
                className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Lock className="size-3.5" strokeWidth={1.75} />
                <span>Privacidade</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              ABA 1: DADOS PESSOAIS & IDENTIDADE CIVIL
          ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="dados" className="space-y-5">
            {/* Card 1: Fotos Pessoais (Avatar 1:1 e Capa 3:1) */}
            {/* Card 1: Identidade Visual Canônica: Foto 1:1 Squircle ao lado da Capa 21:9 */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                  <Camera className="size-4 text-primary shrink-0" />
                  <span>Identidade Visual</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  1:1 Squircle + 21:9 Panorâmica
                </Badge>
              </div>

              {/* Linha Canônica: Avatar Squircle 1:1 ao lado da Capa 21:9 */}
              <div className="flex items-center gap-3 sm:gap-5 w-full">
                {/* Avatar Squircle 1:1 */}
                <div className="relative group shrink-0">
                  <div className="size-20 sm:size-28 md:size-32 rounded-lg bg-card border-2 border-border/60 overflow-hidden flex items-center justify-center shadow-xs">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Foto de Perfil"
                        className="size-full object-cover select-none"
                      />
                    ) : (
                      <div className="size-full bg-muted flex items-center justify-center text-xl sm:text-3xl font-black text-primary">
                        {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="absolute inset-0 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-semibold gap-1 cursor-pointer"
                    title="Alterar Foto de Perfil (1:1)"
                  >
                    <Camera className="size-4 sm:size-5" />
                    <span className="text-[10px]">Alterar</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e, "avatar")}
                  />
                </div>

                {/* Capa Panorâmica Canônica 21:9 ao lado */}
                <div className="flex-1 min-w-0 h-20 sm:h-28 md:h-32 rounded-lg bg-muted/20 relative overflow-hidden flex items-center group border border-border/40">
                  {formData.coverUrl ? (
                    <img
                      src={formData.coverUrl}
                      alt="Capa do Perfil"
                      className="size-full object-cover select-none"
                    />
                  ) : (
                    <div className="size-full bg-gradient-to-r from-primary/10 via-muted/40 to-primary/15 flex items-center justify-center text-muted-foreground p-3 text-center">
                      <span className="text-xs font-medium">Sem imagem de capa (Proporção 21:9)</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-background/85 hover:bg-background backdrop-blur-md border border-border/80 text-foreground px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
                    title="Alterar Capa (21:9)"
                  >
                    <Camera className="size-3.5" />
                    <span className="hidden sm:inline">Alterar Capa (21:9)</span>
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelected(e, "cover")}
                  />
                </div>
              </div>

              {formData.coverUrl && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => set("coverUrl", "")}
                    className="text-[11px] text-destructive hover:underline cursor-pointer"
                  >
                    Remover Imagem de Capa
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Dados Básicos & Documentos Civis (CPF, Nome, Nascimento) */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                <User className="size-4 text-primary shrink-0" />
                <span>Documentos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Nome Completo *</Label>
                  <Input
                    required
                    value={formData.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-11 rounded-lg text-base sm:text-xs bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Nome de Usuário (@) *</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-bold text-primary select-none">@</span>
                    <Input
                      required
                      value={formData.username}
                      onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="seunome"
                      className="h-11 rounded-lg text-base sm:text-xs pl-7 font-mono font-semibold bg-background"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Seu identificador único na rede comunitária.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* CPF com Máscara e Validação */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    <span>CPF (Pessoa Física)</span>
                  </Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => set("cpf", maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="h-11 rounded-lg text-base sm:text-xs font-mono bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Necessário para emissão de notas fiscais, ingressos nominais e assinatura de contratos.
                  </p>
                </div>

                {/* Telefone / WhatsApp */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Phone className="size-3 text-primary" />
                    <span>Telefone / WhatsApp</span>
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => set("phone", maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-11 rounded-lg text-base sm:text-xs font-mono bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Para confirmação de entregas e códigos de verificação em dois fatores.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Data de Nascimento */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="size-3 text-primary" />
                    <span>Data de Nascimento</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => set("birthDate", e.target.value)}
                    className="h-11 rounded-lg text-base sm:text-xs bg-background"
                  />
                </div>

                {/* Gênero */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Gênero</Label>
                  <Select value={formData.gender} onValueChange={(val) => set("gender", normalizeGenderValue(val))}>
                    <SelectTrigger className="h-11 rounded-lg text-base sm:text-xs bg-background">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro_nao_dizer">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold text-foreground">Ocupação / Cargo</Label>
                <Input
                  value={formData.occupation}
                  onChange={(e) => set("occupation", e.target.value)}
                  placeholder="Ex: Arquiteto, Fotógrafo, Motorista, Desenvolvedor..."
                  className="h-11 rounded-lg text-base sm:text-xs bg-background"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Biografia Pessoal</Label>
                  <span
                    className={cn(
                      "text-[10px] font-mono",
                      formData.bio.length > 280 ? "text-amber-500 font-bold" : "text-muted-foreground"
                    )}
                  >
                    {formData.bio.length}/280
                  </span>
                </div>
                <Textarea
                  value={formData.bio}
                  maxLength={280}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Apresente-se à comunidade civil..."
                  className="rounded-lg text-base sm:text-xs min-h-[80px] resize-none bg-background"
                />
              </div>
            </div>

            {/* Card 3: Localização & Redes Pessoais */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                <LinkIcon className="size-4 text-primary shrink-0" />
                <span>Endereço e Contato</span>
              </div>

              <div className="pt-1">
                <CitySelect
                  stateValue={formData.state || "SC"}
                  cityValue={formData.city || ""}
                  onStateChange={(uf) => set("state", uf)}
                  onCityChange={(city) => set("city", city)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Instagram Pessoal</Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => set("instagram", e.target.value)}
                    placeholder="usuario"
                    className="h-11 rounded-lg text-base sm:text-xs bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Site / Portfólio Pessoal</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="https://..."
                    className="h-11 rounded-lg text-base sm:text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              ABA 2: PERFIL PROFISSIONAL & RECURSOS HUMANOS (RH)
          ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="profissional" className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 flex items-start gap-3 text-xs text-foreground">
              <Briefcase className="size-4 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Vínculo Profissional e Candidaturas</p>
                <p className="text-[11px] text-muted-foreground">
                  Seu currículo profissional é utilizado para candidaturas a vagas locais, prestação de serviços e
                  habilitação operacional (ex: entregadores MotoLink e motoristas).
                </p>
              </div>
            </div>

            <ProfessionalResumeEditor
              resumeData={resumeData}
              avatarUrl={formData.avatarUrl || profile.avatarUrl || profile.avatar_url}
              fullName={formData.fullName || profile.full_name}
              onChange={(updated) => setResumeData(updated)}
            />
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              ABA 3: LINKS EXTERNOS & BIOLINKS PÚBLICOS
          ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="links" className="space-y-5">
            {/* Callout Informativo */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 flex items-start gap-3 text-xs text-foreground">
              <LinkIcon className="size-4 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Biolinks e Botões Públicos</p>
                <p className="text-[11px] text-muted-foreground">
                  Links rápidos e banners visuais exibidos diretamente no cabeçalho do seu perfil público de membro.
                </p>
              </div>
            </div>

            {/* Formulário para Adicionar Novo Link */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                  <Plus className="size-4 text-primary shrink-0" />
                  <span>Novo Link</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  Botão ou Banner 21:9
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Título do Botão *</Label>
                  <Input
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Ex: Meu Portfólio, WhatsApp, Canal"
                    className="h-11 rounded-lg text-base sm:text-xs bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Endereço (URL) *</Label>
                  <Input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-11 rounded-lg text-base sm:text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Imagem de Fundo / Banner do Botão (Opcional - Proporção 21:9)
                </Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {newLinkImage ? (
                    <div className="relative h-14 w-32 rounded-lg overflow-hidden border border-border/60 bg-muted shrink-0 group">
                      <img src={newLinkImage} alt="Banner" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewLinkImage("")}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : null}
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={newLinkImage}
                      onChange={(e) => setNewLinkImage(e.target.value)}
                      placeholder="Cole o endereço da imagem ou envie do seu dispositivo..."
                      className="h-11 rounded-lg text-base sm:text-xs bg-background font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingBiolinkImage}
                      onClick={() => biolinkImageInputRef.current?.click()}
                      className="h-11 px-4 rounded-lg text-xs font-semibold shrink-0 cursor-pointer gap-2"
                    >
                      <Camera className="size-3.5" />
                      <span>{isUploadingBiolinkImage ? "Enviando..." : "Enviar Imagem"}</span>
                    </Button>
                    <input
                      ref={biolinkImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBiolinkImageUpload}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Se adicionada, o link será exibido como um card visual destacado no topo do perfil público.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleAddBiolink}
                  className="rounded-lg h-11 px-5 text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer shadow-xs active:scale-98"
                >
                  <Plus className="size-4" />
                  <span>Adicionar à Lista</span>
                </Button>
              </div>
            </div>

            {/* Lista de Links Cadastrados */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                  <LinkIcon className="size-4 text-primary shrink-0" />
                  <span>Links Salvos</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {biolinks.length} {biolinks.length === 1 ? "link" : "links"}
                </Badge>
              </div>

              {biolinks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <LinkIcon className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs">Nenhum link adicionado ainda.</p>
                  <p className="text-[10px] text-muted-foreground/75">
                    Utilize o formulário acima para adicionar links externos ou redes personalizadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {biolinks.map((link, idx) => (
                    <div
                      key={link.id || idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {link.imageUrl ? (
                          <div className="size-10 rounded-md overflow-hidden bg-muted border border-border/60 shrink-0">
                            <img
                              src={link.imageUrl}
                              alt={link.label}
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <ExternalLink className="size-4" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {link.label || link.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {link.url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="size-9 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer" title="Testar Link">
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBiolink(link.id)}
                          className="size-9 p-0 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Remover Link"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prévia Fiel ao Perfil Público */}
            {biolinks.length > 0 && (
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Eye className="size-4 text-primary shrink-0" />
                    <span>Prévia</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                    Visualização Pública
                  </Badge>
                </div>

                <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-3">
                  {/* Banners 16:9 */}
                  {biolinks.some((b) => !!b.imageUrl) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {biolinks.filter((b) => !!b.imageUrl).map((link, idx) => (
                        <div
                          key={link.id || idx}
                          className="block w-full aspect-video rounded-lg overflow-hidden border border-border/60 relative select-none"
                        >
                          <img
                            src={link.imageUrl}
                            alt={link.label}
                            className="size-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-3">
                            <span className="text-xs font-bold text-white truncate flex items-center justify-between gap-1">
                              <span>{link.label || link.title}</span>
                              <ExternalLink className="size-3 text-white/80 shrink-0" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Botões Minimalistas */}
                  {biolinks.some((b) => !b.imageUrl) && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full sm:flex-wrap">
                      {biolinks.filter((b) => !b.imageUrl).map((link, idx) => (
                        <div
                          key={link.id || idx}
                          className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold shrink-0 bg-transparent text-foreground border border-border/50"
                        >
                          <span>{link.label || link.title}</span>
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              ABA 4: PRIVACIDADE, SEGURANÇA & LGPD
          ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="privacidade" className="space-y-5">
            {/* Card 1: Visibilidade & Anonimato */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <span>Visibilidade</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {formData.isAnonymous ? "Perfil Discreto" : "Perfil Público"}
                </Badge>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label
                      htmlFor="anonymous-switch"
                      className="text-xs font-bold text-foreground flex items-center gap-2 cursor-pointer"
                    >
                      {formData.isAnonymous ? (
                        <EyeOff className="size-3.5 text-amber-500" />
                      ) : (
                        <Eye className="size-3.5 text-primary" />
                      )}
                      <span>Perfil Discreto (Ocultar do Diretório)</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Quando ativo, sua conta civil não é indexada na busca de membros nem no diretório público. Suas
                      compras, ingressos e contratos assinados continuam seguros e associados ao seu CPF real.
                    </p>
                  </div>

                  <Switch
                    id="anonymous-switch"
                    checked={formData.isAnonymous}
                    onCheckedChange={(checked) => set("isAnonymous", checked)}
                    className="shrink-0 mt-1"
                  />
                </div>

                <div className="pt-3 border-t border-border/30 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="location-switch" className="text-xs font-bold text-foreground cursor-pointer">
                      Ocultar Cidade / Localização
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Impede que sua cidade seja exibida publicamente nos feeds comunitários.
                    </p>
                  </div>

                  <Switch
                    id="location-switch"
                    checked={formData.hideLocation}
                    onCheckedChange={(checked) => set("hideLocation", checked)}
                    className="shrink-0 mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Preferências de Notificações */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                <Lock className="size-4 text-primary shrink-0" />
                <span>Comunicação</span>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border/40 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="newsletter-switch" className="text-xs font-bold text-foreground cursor-pointer">
                    Comunicados e Atualizações Legais
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Receba resumos de transações, atualizações de termos de uso e novidades dos comércios locais no seu
                    e-mail cadastrado.
                  </p>
                </div>

                <Switch
                  id="newsletter-switch"
                  checked={formData.newsletterOptIn}
                  onCheckedChange={(checked) => set("newsletterOptIn", checked)}
                  className="shrink-0 mt-1"
                />
              </div>
            </div>

            {/* Card 3: Zona de Perigo — Direito ao Esquecimento LGPD */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-destructive pb-3 border-b border-destructive/20">
                <ShieldAlert className="size-4 text-destructive shrink-0" />
                <span>Exclusão de Conta</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-foreground font-semibold">Excluir permanentemente minha Conta Civil</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ao solicitar a exclusão, todos os seus dados pessoais, histórico de navegação e acessos serão revogados.
                  Por exigência da legislação fiscal brasileira, dados de notas fiscais e comprovantes de compras
                  efetuadas permanecerão arquivados de forma anônima pelo período legal de 5 anos.
                </p>
              </div>

              <div className="pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-lg text-xs font-bold gap-2 h-10 px-4 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Solicitar Exclusão da Conta</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-lg max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                        <ShieldAlert className="size-5 shrink-0" />
                        <span>Confirmar Exclusão de Conta</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-xs text-muted-foreground space-y-2 pt-2">
                        <p>
                          Esta ação é <strong>irreversível</strong>. Sua conta civil será desativada imediatamente e
                          todos os vínculos profissionais serão encerrados.
                        </p>
                        <p>
                          Para confirmar, digite a palavra <strong>EXCLUIR</strong> no campo abaixo:
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-2">
                      <Input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="Digite EXCLUIR"
                        className="h-10 text-base sm:text-xs font-mono font-bold text-destructive border-destructive/40"
                      />
                    </div>

                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel className="rounded-lg text-xs font-semibold h-10">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm !== "EXCLUIR" || isDeleting}
                        className="rounded-lg text-xs font-bold h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Excluindo..." : "Confirmar Exclusão Definitiva"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Botão Salvar Principal (Desktop: Alinhado à Direita | Mobile: Espaçado) ── */}
        <div className="flex items-center justify-end gap-3 pt-2 w-full">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto rounded-lg px-6 h-11 text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer shadow-xs active:scale-98"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="size-4 stroke-[2.5]" />
                <span>Salvar Perfil</span>
              </>
            )}
          </Button>
        </div>

        {/* ── Barra de Ação Flutuante Mobile (<640px) para Salvar sem Rolar a Página Toda ── */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 pb-safe bg-background border-t border-border/40 z-30">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg h-11 text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="size-4 stroke-[2.5]" />
                <span>Salvar Perfil</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Modal de Recorte de Imagem (1:1 Avatar, 21:9 Capa) */}
      {cropperSrc && (
        <ImageCropperDialog
          open={cropperOpen}
          onOpenChange={(v) => {
            if (!v) setCropperOpen(false);
          }}
          imageSrc={cropperSrc}
          aspect={cropperType === "avatar" ? 1 : 21 / 9}
          cropShape="rect"
          lockAspect={true}
          title={
            cropperType === "avatar"
              ? "Recortar Foto de Perfil (1:1)"
              : "Recortar Capa do Perfil (Panorâmica 21:9)"
          }
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
