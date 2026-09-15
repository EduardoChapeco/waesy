import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { getProfile, updateProfile, requestAccountDeletion, getUserSession } from "@/services/auth.functions";
import { getPostMediaSignedUrl, uploadProfileMediaDirect } from "@/services/storage.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { CitySelect } from "@/components/ui/city-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, Camera, ExternalLink, Loader2, Image as ImageIcon, Trash2, Check, Briefcase, Link as LinkIcon, Plus, Building2, GraduationCap, Layers, Award, Store, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { ProfessionalResumeEditor, ResumeDataDTO } from "@/components/profile/professional-resume-editor";
import { CreatorNicheSelect } from "@/components/profile/creator-niche-select";
import {
  getMyCreatorProfilesList,
  upsertCreatorProfile,
  registerAffiliate,
} from "@/services/affiliates.functions";
import { getCreatorNicheLabel } from "@/lib/constants/creator-niches";

export const Route = createFileRoute("/_store/conta/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil | Waesy" }] }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  loader: async () => {
    try {
      const [res, creatorProfiles] = await Promise.all([
        getProfile().catch(() => null),
        getMyCreatorProfilesList().catch(() => []),
      ]);
      return { profile: res || {}, creatorProfiles: creatorProfiles || [] };
    } catch {
      return { profile: {}, creatorProfiles: [] };
    }
  },
  component: ProfilePage,
});

function maskCpf(value: string): string {
 const digits = value.replace(/\D/g, "").slice(0, 11);
 return digits
 .replace(/(\d{3})(\d)/, "$1.$2")
 .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
 .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function ProfilePage() {
  const { profile: rawProfile, creatorProfiles = [] } = (Route.useLoaderData() as any) || {};
  const profile = rawProfile || {};
  const search = (Route.useSearch() as any) || {};
  const defaultTab = search?.tab === "criador" ? "criador" : search?.tab === "profissional" ? "profissional" : search?.tab === "biolinks" ? "biolinks" : "dados";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const primaryCreator = creatorProfiles[0] || null;
  const [creatorHandle, setCreatorHandle] = useState(primaryCreator?.handle || (profile?.username ? `${profile.username}` : ""));
  const [creatorStageName, setCreatorStageName] = useState(primaryCreator?.stage_name || primaryCreator?.name || profile?.fullName || "");
  const [creatorCategory, setCreatorCategory] = useState(primaryCreator?.category || primaryCreator?.niche || "moda_estilo");
  const [creatorBio, setCreatorBio] = useState(primaryCreator?.bio || "");
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState(primaryCreator?.avatar_url || "");
  const [creatorCoverUrl, setCreatorCoverUrl] = useState(primaryCreator?.cover_url || "");
  const [creatorTiktok, setCreatorTiktok] = useState(primaryCreator?.social_links?.tiktok || "");
  const [creatorYoutube, setCreatorYoutube] = useState(primaryCreator?.social_links?.youtube || "");
  const [creatorWhatsapp, setCreatorWhatsapp] = useState(primaryCreator?.social_links?.whatsapp || "");
  const [creatorPrivacyMode, setCreatorPrivacyMode] = useState<"public" | "unlisted" | "private">(primaryCreator?.privacy_mode || "public");

  const creatorAvatarInputRef = useRef<HTMLInputElement>(null);
  const creatorCoverInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Estados de Recorte de Imagem (Faca Contextual Única)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<"avatar" | "cover" | "creator_avatar" | "creator_cover">("avatar");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const initialResume = profile?.resume_data || {};
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || "",
    username: profile?.username || (profile?.email ? profile.email.split("@")[0].toLowerCase().replace(/[^a-z0-9._]/g, "") : "") || (profile?.fullName ? profile.fullName.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, "") : "") || "",
    phone: profile?.phone || "",
    avatarUrl: profile?.avatarUrl || "",
    coverUrl: profile?.coverUrl || "",
    bio: profile?.bio || "",
    occupation: profile?.occupation || "",
    city: profile?.city || "",
    state: profile?.state || "SC",
    instagram: profile?.instagram || "",
    website: profile?.website || "",
    cpf: profile?.cpf ? maskCpf(profile.cpf) : "",
    birthDate: profile?.birthDate || "",
    gender: profile?.gender || "",
    newsletterOptIn: profile?.newsletterOptIn ?? false,
    featuredBannerUrl: profile?.featuredBannerUrl || "",
    featuredBannerLink: profile?.featuredBannerLink || "",
    isAnonymous: profile?.is_anonymous ?? profile?.isAnonymous ?? false,
    privacyMode: (profile?.privacy_mode || profile?.privacyMode || "public") as "public" | "unlisted" | "private",
    hideLocation: profile?.hide_location ?? profile?.hideLocation ?? false,
  });

  // Biolinks
  const [biolinks, setBiolinks] = useState<Array<{ id: string; label: string; url: string; imageUrl?: string; isHighlight?: boolean }>>(
    Array.isArray(profile?.biolinks) ? profile.biolinks : []
  );

  // Perfil Profissional / Currículo (Padrão Executivo Waesy)
  const [resumeData, setResumeData] = useState<ResumeDataDTO>({
    headline: initialResume?.headline || "",
    summary: initialResume?.summary || "",
    hiringStatus: (initialResume?.hiringStatus as any) || "open_to_work",
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

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover" | "creator_avatar" | "creator_cover") => {
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
          fileName: `profile_${type}_${Date.now()}.png`,
          fileType: "image/png",
          base64Data,
          target: type,
        },
      });

      if (type === "avatar") {
        set("avatarUrl", res.publicUrl);
        toast.success("Foto de perfil atualizada com sucesso!");
      } else if (type === "cover") {
        set("coverUrl", res.publicUrl);
        toast.success("Foto de capa atualizada com sucesso!");
      } else if (type === "creator_avatar") {
        setCreatorAvatarUrl(res.publicUrl);
        toast.success("Foto/Logo da marca atualizada com sucesso!");
      } else if (type === "creator_cover") {
        setCreatorCoverUrl(res.publicUrl);
        toast.success("Capa panorâmica da marca atualizada com sucesso!");
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro no upload da imagem.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

 // Funções de Biolinks
 const addBiolink = (isBanner: boolean = false) => {
 setBiolinks((prev) => [
 ...prev,
 {
 id: `link_${Date.now()}`,
 label: isBanner ? "Meu Banner de Ação" : "Meu Link",
 url: "https://",
 imageUrl: isBanner ? "" : undefined,
 isHighlight: false,
 },
 ]);
 };

 const updateBiolink = (idx: number, field: string, value: any) => {
 setBiolinks((prev) => {
 const next = [...prev];
 next[idx] = { ...next[idx], [field]: value };
 return next;
 });
 };

 const removeBiolink = (idx: number) => {
 setBiolinks((prev) => prev.filter((_, i) => i !== idx));
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
 username: formData.username.trim() || undefined,
 phone: formData.phone.trim() || undefined,
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
 gender: (formData.gender as any) || undefined,
 newsletterOptIn: formData.newsletterOptIn,
 biolinks: biolinks.length > 0 ? biolinks : undefined,
 resumeData: {
 ...resumeData,
 headline: resumeData.headline?.trim() || undefined,
 summary: resumeData.summary?.trim() || undefined,
 hiringStatus: resumeData.hiringStatus,
 skills: resumeData.skills || [],
 availability: resumeData.availability,
 experiences: resumeData.experiences,
 educations: resumeData.educations,
 education: resumeData.educations, // retrocompatibilidade
 certifications: resumeData.certifications,
 projects: resumeData.projects,
 volunteering: resumeData.volunteering,
 causes: resumeData.causes,
 languages: resumeData.languages,
 },
 featuredBannerUrl: formData.featuredBannerUrl.trim() || undefined,
 featuredBannerLink: formData.featuredBannerLink.trim() || undefined,
 isAnonymous: formData.isAnonymous,
 privacyMode: formData.isAnonymous ? "unlisted" : "public",
 },
 });

    // Sincroniza Perfil de Criador & Marca se preenchido
    if (creatorHandle?.trim()) {
      const cleanHandle = creatorHandle.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
      if (cleanHandle) {
        await upsertCreatorProfile({
          data: {
            handle: cleanHandle,
            stageName: creatorStageName.trim() || formData.fullName.trim() || cleanHandle,
            category: creatorCategory || "moda_estilo",
            bio: creatorBio.trim() || undefined,
            avatarUrl: creatorAvatarUrl || undefined,
            coverUrl: creatorCoverUrl || undefined,
            socialLinks: {
              instagram: formData.instagram.trim() || undefined,
              tiktok: creatorTiktok.trim() || undefined,
              youtube: creatorYoutube.trim() || undefined,
              whatsapp: creatorWhatsapp.trim() || undefined,
            },
          },
        }).catch((e) => console.warn("Creator profile save warning:", e));

        await registerAffiliate({
          data: {
            handle: cleanHandle,
            displayName: creatorStageName.trim() || formData.fullName.trim() || cleanHandle,
            category: creatorCategory || "moda_estilo",
          },
        }).catch((e) => console.warn("Affiliate sync warning:", e));
      }
    }

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
 if (deleteConfirm !== "EXCLUIR") return;
 setIsDeleting(true);
 try {
 await requestAccountDeletion();
 toast.success("Sua conta foi excluída com sucesso.");
 window.location.href = "/";
 } catch (err) {
 const msg = err instanceof Error ? err.message : "Erro ao excluir conta";
 toast.error(msg);
 } finally {
 setIsDeleting(false);
 }
 };

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Perfil
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer"
          >
            <Link
              to="/membro/$id"
              params={{ id: formData.username || profile.username || profile.id }}
              target="_blank"
            >
              <ExternalLink className="size-3.5 mr-1.5" />
              <span>Ver Perfil Público</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold h-8 px-3 cursor-pointer"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.clipboard) {
                const handle = formData.username || profile.username;
                const link = handle
                  ? `${window.location.origin}/membro/@${handle}`
                  : `${window.location.origin}/membro/${profile.id}`;
                navigator.clipboard.writeText(link);
                toast.success("Link do seu perfil copiado!");
              }
            }}
          >
            <LinkIcon className="size-3.5 mr-1.5" />
            <span>Copiar Link</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center overflow-x-auto no-scrollbar pb-1">
            <TabsList className="bg-transparent p-0 gap-2 h-auto flex flex-nowrap">
              <TabsTrigger
                value="dados"
                className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <User className="size-3.5" />
                <span>Dados & Identidade</span>
              </TabsTrigger>
              <TabsTrigger
                value="criador"
                className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Perfil de Criador & Marca</span>
              </TabsTrigger>
              <TabsTrigger
                value="profissional"
                className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Briefcase className="size-3.5" />
                <span>Perfil Profissional & Currículo</span>
              </TabsTrigger>
              <TabsTrigger
                value="biolinks"
                className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LinkIcon className="size-3.5" />
                <span>Botões de Ação & Links</span>
              </TabsTrigger>
            </TabsList>
          </div>

        {/* ── ABA 1: Dados Pessoais & Fotos ── */}
        <TabsContent value="dados" className="space-y-5">
          {/* Card 1: Fotos de Identidade Visual */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <Camera className="size-4 text-primary shrink-0" />
              <span>1. Fotos de Identidade Visual</span>
            </div>

            {/* Capa Panorâmica (Proporção 3:1 Canônica e Responsiva) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Foto de Capa Panorâmica (Proporção 3:1)</Label>
                {formData.coverUrl && (
                  <button
                    type="button"
                    onClick={() => set("coverUrl", "")}
                    className="text-[11px] text-destructive hover:underline cursor-pointer"
                  >
                    Remover Capa
                  </button>
                )}
              </div>
              <div className="w-full aspect-[3/1] max-h-52 rounded-2xl bg-muted/30 overflow-hidden flex items-center justify-center border border-border/40 relative group shadow-xs">
                {formData.coverUrl ? (
                  <img
                    src={formData.coverUrl}
                    alt="Capa do Perfil"
                    className="size-full object-cover select-none"
                  />
                ) : (
                  <div className="size-full bg-gradient-to-r from-primary/10 via-muted/40 to-primary/15 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
                    <ImageIcon className="size-6 text-primary/40" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Nenhuma capa adicionada (Formato Panorâmico 3:1 — 1200x400)
                    </span>
                  </div>
                )}

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e, "cover")}
                />

                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 pointer-events-none group-hover:pointer-events-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-xl text-xs font-bold gap-1.5 bg-background/95 backdrop-blur-md shadow-md hover:bg-background cursor-pointer min-h-[44px]"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingMedia}
                  >
                    <Camera className="size-4" />
                    <span>{formData.coverUrl ? "Alterar Capa" : "Carregar Capa"}</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2.5 right-2.5 sm:hidden rounded-xl text-xs font-bold gap-1.5 bg-background/90 backdrop-blur-md shadow-xs min-h-[40px]"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingMedia}
                >
                  <Camera className="size-3.5" />
                  <span>{formData.coverUrl ? "Alterar" : "Adicionar"}</span>
                </Button>
              </div>
            </div>

            {/* Avatar Circular */}
            <div className="flex items-center gap-4 pt-2 border-t border-border/40">
              <div className="relative">
                <div className="size-20 sm:size-24 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border border-border/50">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar" className="size-full object-cover" />
                  ) : (
                    <User className="size-8 text-muted-foreground/50" />
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e, "avatar")}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Foto de Perfil (1:1)</Label>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold gap-1.5 border-border min-h-[44px]"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingMedia}
                  >
                    <Camera className="size-3.5" />
                    <span>{formData.avatarUrl ? "Trocar Foto" : "Enviar Foto"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Informações de Identidade & Contato */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <User className="size-4 text-primary shrink-0" />
              <span>2. Dados Básicos & Biografia</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Nome Completo *</Label>
                <Input
                  required
                  value={formData.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-11 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Nome de Usuário (@) *</Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono font-bold text-primary select-none">@</span>
                  <Input
                    required
                    value={formData.username}
                    onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="seunome"
                    className="h-11 rounded-xl text-xs pl-7 font-mono font-semibold bg-background"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Permitida 1 alteração a cada 30 dias. Seu @ anterior fica protegido por 30 dias.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Ocupação / Profissão</Label>
              <Input
                value={formData.occupation}
                onChange={(e) => set("occupation", e.target.value)}
                placeholder="Ex: Arquiteto, Fotógrafo, Estudante..."
                className="h-11 rounded-xl text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Biografia</Label>
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
                maxLength={320}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Conte um pouco sobre você..."
                className="rounded-xl text-xs min-h-[90px] resize-none bg-background"
              />
            </div>
          </div>

          {/* Card 3: Localização & Presença Digital */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <LinkIcon className="size-4 text-primary shrink-0" />
              <span>3. Localização & Presença Digital</span>
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Instagram</Label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  placeholder="usuario"
                  className="h-11 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Site / Link</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://..."
                  className="h-11 rounded-xl text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Privacidade & Identidade Civil (CPF) */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>4. Privacidade & Identidade Civil (CPF)</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {formData.isAnonymous ? "Perfil Discreto" : "Perfil Público"}
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="anonymous-switch" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                    {formData.isAnonymous ? <EyeOff className="size-3.5 text-amber-500" /> : <Eye className="size-3.5 text-primary" />}
                    <span>Perfil Civil Discreto (Ocultar do Diretório e Busca Pública)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Quando ativo, seus dados pessoais e perfil civil não aparecem em buscas abertas do diretório. Suas compras na loja, contratos assinados e saldo de tokens continuam 100% protegidos e ancorados ao seu CPF real.
                  </p>
                </div>

                <Switch
                  id="anonymous-switch"
                  checked={formData.isAnonymous}
                  onCheckedChange={(checked) => {
                    set("isAnonymous", checked);
                    set("privacyMode", checked ? "unlisted" : "public");
                  }}
                  className="shrink-0 mt-1"
                />
              </div>

              <div className="pt-3 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Aviso Comunitário:</span> As publicações na comunidade nunca são anônimas. Para interagir e publicar sob uma marca ou nome artístico, acesse seu Perfil de Criador.
                </p>

                <Button asChild variant="outline" size="sm" className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shrink-0">
                  <Link to="/afiliados">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Perfil de Marca / Criador</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

 {/* ── ABA 2: Perfil Profissional (Padrão Executivo Waesy) ── */}
 <TabsContent value="profissional" className="space-y-6">
 <ProfessionalResumeEditor
 resumeData={resumeData}
 avatarUrl={formData.avatarUrl || profile.avatarUrl || profile.avatar_url}
 fullName={formData.fullName || profile.full_name}
 onChange={(updated) => setResumeData(updated)}
 />
 </TabsContent>

 {/* ── ABA 3: Biolinks & Mini-Banners ── */}
 <TabsContent value="biolinks" className="space-y-6">
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
 <div>
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <LinkIcon className="size-4 text-primary" />
 <span>Botões de Ação & Links na Bio</span>
 </h2>
 <p className="text-xs text-muted-foreground">
 Crie botões normais de link (sem imagem) ou mini-banners gráficos delicados (com imagem 16:9).
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => addBiolink(false)}
 className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer h-9"
 >
 <Plus className="size-3.5" />
 <span>+ Botão Normal</span>
 </Button>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => addBiolink(true)}
 className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer h-9"
 >
 <ImageIcon className="size-3.5" />
 <span>+ Mini-Banner</span>
 </Button>
 </div>
 </div>

 {biolinks.length === 0 ? (
 <div className="border border-dashed border-border/70 p-8 text-center rounded-2xl bg-muted/20 space-y-3">
 <p className="text-xs text-muted-foreground">
 Você ainda não adicionou links ou banners na bio. Escolha uma das opções acima para começar.
 </p>
 <div className="flex items-center justify-center gap-2 pt-1">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => addBiolink(false)}
 className="rounded-xl text-xs font-semibold"
 >
 Criar Botão de Link
 </Button>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => addBiolink(true)}
 className="rounded-xl text-xs font-semibold"
 >
 Criar Mini-Banner
 </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 {biolinks.map((link, idx) => {
 const isBanner = link.imageUrl !== undefined && link.imageUrl !== null;

 return (
 <div
 key={link.id || idx}
 className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3 shadow-2xs"
 >
 <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground">
 Item #{idx + 1}
 </span>
 <Badge variant="outline" className="text-[10px] font-mono">
 {isBanner ? "Mini-Banner Gráfico" : "Botão Normal"}
 </Badge>
 </div>

 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => {
 if (isBanner) {
 updateBiolink(idx, "imageUrl", undefined);
 } else {
 updateBiolink(idx, "imageUrl", "");
 }
 }}
 className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
 >
 {isBanner ? "Converter para Botão Normal" : "Transformar em Banner"}
 </Button>

 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => removeBiolink(idx)}
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
 title="Remover"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">
 {isBanner ? "Título do Banner (opcional)" : "Texto do Botão"}
 </Label>
 <Input
 value={link.label || (link as any).title || ""}
 onChange={(e) => updateBiolink(idx, "label", e.target.value)}
 placeholder={isBanner ? "Ex: Conheça nosso serviço" : "Ex: Falar no WhatsApp"}
 className="h-9 rounded-xl text-xs font-semibold"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-semibold text-muted-foreground">
 Link de Destino (URL)
 </Label>
 <Input
 value={link.url}
 onChange={(e) => updateBiolink(idx, "url", e.target.value)}
 placeholder="https://wa.me/... ou https://..."
 className="h-9 rounded-xl text-xs font-mono"
 />
 </div>
 </div>

 {/* Upload de Imagem dedicado se for Banner */}
 {isBanner && (
 <div className="pt-2 border-t border-border/30 space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground">
 Imagem do Mini-Banner (Enquadramento 16:9 Fiel)
 </Label>
 <div className="max-w-[320px]">
 <ImageUpload
 value={link.imageUrl || null}
 onChange={(url) => updateBiolink(idx, "imageUrl", url)}
 onRemove={() => updateBiolink(idx, "imageUrl", "")}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Formato 16:9 delicado e proporcional"
 />
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}

            {/* Mini-Banner em Destaque Principal em Card Canônico */}
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
                <ImageIcon className="size-4 text-primary shrink-0" />
                <span>Mini-Banner de Destaque / Parceiro Oficial (16:9)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Imagem do Banner (16:9)
                  </Label>
                  <div className="max-w-[320px]">
                    <ImageUpload
                      value={formData.featuredBannerUrl}
                      onChange={(url) => set("featuredBannerUrl", url)}
                      onRemove={() => set("featuredBannerUrl", "")}
                      aspectPreset="widescreen"
                      bucket="cms-media"
                      helperText="Enquadramento 16:9 delicado e proporcional"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Link de Destino
                  </Label>
                  <Input
                    value={formData.featuredBannerLink}
                    onChange={(e) => set("featuredBannerLink", e.target.value)}
                    placeholder="https://excelenciatour.com ou https://..."
                    className="h-11 rounded-xl text-xs font-mono bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    URL aberta quando o visitante clicar no banner de destaque.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── ABA: Perfil de Criador & Marca (Opções Avançadas) ── */}
        <TabsContent value="criador" className="space-y-5">
          {/* Inputs de arquivo ocultos para Marca */}
          <input
            type="file"
            ref={creatorAvatarInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelected(e, "creator_avatar")}
          />
          <input
            type="file"
            ref={creatorCoverInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelected(e, "creator_cover")}
          />

          {/* Card 1: Fotos de Identidade Visual da Marca */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <Camera className="size-4 text-primary shrink-0" />
              <span>1. Fotos de Identidade Visual da Marca</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Foto / Logo da Marca (1:1) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Foto / Logo da Marca (1:1)</span>
                  {creatorAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setCreatorAvatarUrl("")}
                      className="text-[11px] text-destructive hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </Label>
                <div className="flex items-center gap-3">
                  <div className="size-16 rounded-2xl ring-2 ring-border/60 bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {creatorAvatarUrl ? (
                      <img src={creatorAvatarUrl} alt="Logo da Marca" className="size-full object-cover" />
                    ) : (
                      <Sparkles className="size-6 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingMedia}
                      className="rounded-xl text-xs font-semibold h-9 gap-1.5 w-full cursor-pointer"
                      onClick={() => creatorAvatarInputRef.current?.click()}
                    >
                      <Camera className="size-3.5" />
                      <span>{creatorAvatarUrl ? "Alterar Logo/Foto" : "Carregar Foto/Logo"}</span>
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Resolução quadrada (500x500px). Exibido na vitrine e cards de parcerias.
                    </p>
                  </div>
                </div>
              </div>

              {/* Capa Panorâmica da Marca (3:1 Canônica) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Capa Panorâmica da Marca (3:1)</span>
                  {creatorCoverUrl && (
                    <button
                      type="button"
                      onClick={() => setCreatorCoverUrl("")}
                      className="text-[11px] text-destructive hover:underline cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </Label>
                <div className="space-y-2">
                  <div className="w-full aspect-[3/1] max-h-40 rounded-xl ring-1 ring-border/40 bg-muted overflow-hidden flex items-center justify-center">
                    {creatorCoverUrl ? (
                      <img src={creatorCoverUrl} alt="Capa da Marca" className="size-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Sem capa definida (Panorâmica 3:1 — 1200x400)</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingMedia}
                    className="rounded-xl text-xs font-semibold h-9 gap-1.5 w-full cursor-pointer"
                    onClick={() => creatorCoverInputRef.current?.click()}
                  >
                    <ImageIcon className="size-3.5" />
                    <span>{creatorCoverUrl ? "Alterar Capa Panorâmica" : "Carregar Capa da Marca"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Identificação da Marca & Nicho Estruturado */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <Sparkles className="size-4 text-primary shrink-0" />
              <span>2. Identificação da Marca & Nicho de Atuação</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Handle Público da Marca (@) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">@</span>
                  <Input
                    value={creatorHandle}
                    onChange={(e) => setCreatorHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                    placeholder="suamarca"
                    className="h-11 rounded-xl pl-7 text-xs font-mono bg-background"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Identificador único da sua vitrine pública (ex: usewaesy.com/membro/@{creatorHandle || "suamarca"}).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Nome Artístico / Nome da Marca <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={creatorStageName}
                  onChange={(e) => setCreatorStageName(e.target.value)}
                  placeholder="Ex: Eduardo Ramos / Atelier Du"
                  className="h-11 rounded-xl text-xs bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Nome público exibido no topo da sua vitrine e nos destaques de criadores.
                </p>
              </div>
            </div>

            {/* Nicho / Categoria de Mercado com Select Estruturado */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-foreground">
                Nicho / Categoria Principal <span className="text-destructive">*</span>
              </Label>
              <CreatorNicheSelect
                value={creatorCategory}
                onValueChange={setCreatorCategory}
              />
              <p className="text-[10px] text-muted-foreground">
                Selecione o nicho oficial para conectar sua vitrine aos catálogos de marcas e lojistas parceiros.
              </p>
            </div>

            {/* Mini Biografia da Marca */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Mini Bio / Apresentação Comercial
                </Label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {creatorBio.length}/300
                </span>
              </div>
              <Textarea
                value={creatorBio}
                onChange={(e) => setCreatorBio(e.target.value.slice(0, 300))}
                placeholder="Conte sobre sua linha editorial, estilo, o que você recomenda e propostas de parcerias comerciais..."
                rows={3}
                className="rounded-xl text-xs bg-background resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Exibida logo abaixo do título na sua vitrine comercial e em propostas de colaboração.
              </p>
            </div>
          </div>

          {/* Card 3: Canais Sociais & Contato Comercial */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <LinkIcon className="size-4 text-primary shrink-0" />
              <span>3. Canais Oficiais & Contato para Parcerias</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">TikTok</Label>
                <Input
                  value={creatorTiktok}
                  onChange={(e) => setCreatorTiktok(e.target.value)}
                  placeholder="@seutiktok"
                  className="h-10 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">YouTube</Label>
                <Input
                  value={creatorYoutube}
                  onChange={(e) => setCreatorYoutube(e.target.value)}
                  placeholder="@seucanal"
                  className="h-10 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">WhatsApp Comercial</Label>
                <Input
                  value={creatorWhatsapp}
                  onChange={(e) => setCreatorWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-10 rounded-xl text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Opções Avançadas & Governança da Vitrine */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span>4. Governança & Visibilidade da Vitrine</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Visibilidade Pública</Label>
                <Select
                  value={creatorPrivacyMode}
                  onValueChange={(val: any) => setCreatorPrivacyMode(val)}
                >
                  <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="public">Pública (Indexada em Afiliados & Diretório)</SelectItem>
                    <SelectItem value="unlisted">Não listada (Apenas com link direto)</SelectItem>
                    <SelectItem value="private">Privada / Rascunho (Apenas você)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Define se marcas parceiras podem encontrar você nas listas de criadores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-2 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Vitrine de Afiliados</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Conecte produtos de lojistas à sua vitrine e ganhe comissão por cada venda gerada.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Link to="/afiliados">
                      <span>Acessar Painel de Afiliados</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        </Tabs>

 {/* ── Botão Salvar Principal ── */}
 <div className="flex items-center justify-end gap-3 pt-2">
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl px-6 h-11 text-xs font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Salvando...</span>
 </>
 ) : (
 <>
 <Check className="size-4 stroke-[2.5]" />
 <span>Salvar Todas as Alterações</span>
 </>
 )}
 </Button>
 </div>
 </form>

 {/* Modal de Recorte de Imagem */}
 {cropperSrc && (
 <ImageCropperDialog
 open={cropperOpen}
 onOpenChange={(v) => {
 if (!v) setCropperOpen(false);
 }}
 imageSrc={cropperSrc}
 aspect={
   cropperType === "avatar" || cropperType === "creator_avatar"
     ? 1
     : 3 / 1
 }
 cropShape={
   cropperType === "avatar" || cropperType === "creator_avatar"
     ? "round"
     : "rect"
 }
 lockAspect={true}
 title={
   cropperType === "avatar"
     ? "Recortar Foto de Perfil (1:1)"
     : cropperType === "creator_avatar"
     ? "Recortar Foto/Logo da Marca (1:1)"
     : cropperType === "creator_cover"
     ? "Recortar Capa Panorâmica da Marca (3:1)"
     : "Recortar Capa do Perfil (Panorâmica 3:1)"
 }
 onCropComplete={handleCropComplete}
 />
 )}
 </div>
 );
}
