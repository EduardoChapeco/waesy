import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CitySelect } from "@/components/ui/city-select";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import {
  ProfessionalResumeEditor,
  ResumeDataDTO,
} from "@/components/profile/professional-resume-editor";
import { updateProfile } from "@/services/auth.functions";
import {
  upsertCreatorProfile,
  saveCreatorShowcaseSettings,
  togglePartnerStoreConnection,
} from "@/services/affiliates.functions";
import { uploadProfileMediaDirect } from "@/services/storage.functions";
import { toast } from "sonner";
import { Link, useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  User,
  Briefcase,
  ShoppingBag,
  Link as LinkIcon,
  Lock,
  Camera,
  Trash2,
  Check,
  Plus,
  ShieldCheck,
  Building2,
  Sparkles, ArrowRight,
  ArrowUp,
  ArrowDown,
  Store,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";

export interface ProfileInPageEditorProps {
  isOpen?: boolean;
  onClose: () => void;
  profile: any;
  creatorProfile?: any;
  isCreator?: boolean;
  isBrandPersonaView?: boolean;
  availableStores?: any[];
  ownBrandStores?: any[];
  pinnedProducts?: any[];
  initialTab?: "identidade" | "curriculo" | "vitrine" | "links" | "privacidade";
}

const DEFAULT_SHOWCASE_ORDER = [
  "banner",
  "own_brands",
  "stores",
  "products",
  "events",
];

const SHOWCASE_SECTION_LABELS: Record<string, string> = {
  banner: "Banner de Destaque (16:9)",
  own_brands: "Minhas Próprias Marcas",
  stores: "Lojas Parceiras Comissionadas",
  products: "Produtos Recomendados Fixados",
  events: "Agenda & Eventos",
};

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

function normalizeGenderValue(g?: string): "feminino" | "masculino" | "outro" | "prefiro_nao_dizer" {
  if (!g || g === "not_informed") return "prefiro_nao_dizer";
  if (g === "female" || g === "feminino") return "feminino";
  if (g === "male" || g === "masculino") return "masculino";
  if (g === "other" || g === "non_binary" || g === "outro") return "outro";
  return "prefiro_nao_dizer";
}

export function ProfileInPageEditor({
  isOpen,
  onClose,
  profile,
  creatorProfile,
  isCreator = false,
  isBrandPersonaView = false,
  availableStores = [],
  ownBrandStores = [],
  pinnedProducts = [],
  initialTab = "identidade",
}: ProfileInPageEditorProps) {
  const router = useRouter();

  // Abas canônicas
  const effectiveInitialTab =
    initialTab === "curriculo" && isBrandPersonaView
      ? "vitrine"
      : initialTab === "vitrine" && !isBrandPersonaView
      ? "curriculo"
      : initialTab;
  const [activeTab, setActiveTab] = useState<string>(effectiveInitialTab);

  const [isSaving, setIsSaving] = useState(false);

  // 1. Identidade e Visual
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"feminino" | "masculino" | "outro" | "prefiro_nao_dizer">("prefiro_nao_dizer");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SC");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // 2. Currículo / Perfil Profissional (Civil)
  const [resumeData, setResumeData] = useState<ResumeDataDTO>({
    headline: "",
    summary: "",
    hiringStatus: "open_to_work",
    skills: [],
    availability: {},
    experiences: [],
    educations: [],
    certifications: [],
    projects: [],
    volunteering: [],
    causes: [],
    languages: [],
  });

  // 3. Vitrine Comercial (Marca / Criador)
  const [stageName, setStageName] = useState("");
  const [creatorNiche, setCreatorNiche] = useState("Geral");
  const [showcaseBannerUrl, setShowcaseBannerUrl] = useState("");
  const [showcaseBannerTitle, setShowcaseBannerTitle] = useState("");
  const [showcaseBannerLink, setShowcaseBannerLink] = useState("");
  const [selectedOwnBrandIds, setSelectedOwnBrandIds] = useState<string[]>([]);
  const [selectedPartnerStoreIds, setSelectedPartnerStoreIds] = useState<string[]>([]);
  const [showcaseOrder, setShowcaseOrder] = useState<string[]>(DEFAULT_SHOWCASE_ORDER);

  // 4. Links & Redes Sociais
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [biolinks, setBiolinks] = useState<
    Array<{
      id: string;
      label: string;
      title?: string;
      url: string;
      imageUrl?: string;
      isHighlight?: boolean;
    }>
  >([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkImage, setNewLinkImage] = useState("");
  const [isUploadingBiolinkImage, setIsUploadingBiolinkImage] = useState(false);

  // 5. Privacidade
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hideLocation, setHideLocation] = useState(false);

  // Recorte de Mídia (Avatar 1:1, Capa 21:9, Banner 16:9)
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<"avatar" | "cover" | "showcase_banner">("avatar");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const showcaseBannerInputRef = useRef<HTMLInputElement>(null);
  const biolinkImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && profile) {
      if (isBrandPersonaView && creatorProfile) {
        setFullName(creatorProfile.stage_name || creatorProfile.name || profile.full_name || "");
        setUsername(
          creatorProfile.handle ||
          profile.username ||
          ""
        );
        setCpf(profile.cpf ? maskCpf(profile.cpf) : "");
        setPhone(profile.phone ? maskPhone(profile.phone) : "");
        setCity(creatorProfile.city || profile.city || "");
        setState(creatorProfile.state || profile.state || "SC");
        setBio(creatorProfile.bio || profile.bio || "");
        setOccupation(creatorProfile.category || creatorProfile.niche || "Marca");
        setAvatarUrl(creatorProfile.avatar_url || profile.avatar_url || "");
        setCoverUrl(creatorProfile.cover_url || profile.cover_url || "");
        setShowcaseBannerUrl(creatorProfile.banner_url || "");
        setShowcaseBannerTitle(creatorProfile.banner_title || "");
        setShowcaseBannerLink(creatorProfile.banner_link || "");
        setCreatorNiche(creatorProfile.niche || creatorProfile.category || "Geral");
        setStageName(creatorProfile.stage_name || creatorProfile.name || "");
        setSelectedPartnerStoreIds(creatorProfile.partner_store_ids || []);
        setSelectedOwnBrandIds(
          creatorProfile.social_links?.own_brand_store_ids ||
          creatorProfile.own_brand_store_ids ||
          []
        );
        setShowcaseOrder(
          creatorProfile.showcase_order && creatorProfile.showcase_order.length > 0
            ? creatorProfile.showcase_order
            : DEFAULT_SHOWCASE_ORDER
        );
      } else {
        setFullName(profile.full_name || profile.fullName || "");
        setUsername(profile.username || "");
        setCpf(profile.cpf ? maskCpf(profile.cpf) : "");
        setPhone(profile.phone ? maskPhone(profile.phone) : "");
        setBirthDate(profile.birth_date || profile.birthDate || "");
        setGender(normalizeGenderValue(profile.gender));
        setCity(profile.city || "");
        setState(profile.state || "SC");
        setBio(profile.bio || "");
        setOccupation(profile.occupation || "");
        setAvatarUrl(profile.avatar_url || profile.avatarUrl || "");
        setCoverUrl(profile.cover_url || profile.coverUrl || "");
      }

      setWebsite(profile.website || creatorProfile?.social_links?.website || "");
      setInstagram(
        profile.instagram ||
        creatorProfile?.social_links?.instagram ||
        ""
      );
      setBiolinks(Array.isArray(profile.biolinks) ? profile.biolinks : []);
      setIsAnonymous(profile.is_anonymous ?? profile.isAnonymous ?? false);
      setHideLocation(profile.hide_location ?? profile.hideLocation ?? false);

      const rawResume = profile.resume_data || {};
      setResumeData({
        headline: rawResume.headline || "",
        summary: rawResume.summary || "",
        hiringStatus: rawResume.hiringStatus || "open",
        skills: Array.isArray(rawResume.skills)
          ? rawResume.skills
          : typeof rawResume.skillsString === "string"
          ? rawResume.skillsString.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
        availability: rawResume.availability || {},
        experiences: Array.isArray(rawResume.experiences) ? rawResume.experiences : [],
        educations: Array.isArray(rawResume.educations) ? rawResume.educations : [],
        certifications: Array.isArray(rawResume.certifications) ? rawResume.certifications : [],
        projects: Array.isArray(rawResume.projects) ? rawResume.projects : [],
        volunteering: Array.isArray(rawResume.volunteering) ? rawResume.volunteering : [],
        causes: Array.isArray(rawResume.causes) ? rawResume.causes : [],
        languages: Array.isArray(rawResume.languages) ? rawResume.languages : [],
      });

      setActiveTab(effectiveInitialTab);
    }
  }, [isOpen, profile, creatorProfile, isBrandPersonaView, effectiveInitialTab]);

  const handleFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover" | "showcase_banner"
  ) => {
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
          target:
            type === "avatar"
              ? isBrandPersonaView
                ? "creator_avatar"
                : "avatar"
              : type === "cover"
              ? isBrandPersonaView
                ? "creator_cover"
                : "cover"
              : "biolink_banner",
        },
      });

      if (type === "avatar") {
        setAvatarUrl(res.publicUrl);
        toast.success("Foto de perfil atualizada!");
      } else if (type === "cover") {
        setCoverUrl(res.publicUrl);
        toast.success("Capa panorâmica atualizada!");
      } else if (type === "showcase_banner") {
        setShowcaseBannerUrl(res.publicUrl);
        toast.success("Banner da vitrine atualizado!");
      }
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro no upload da imagem."
      );
    } finally {
      setIsUploadingMedia(false);
    }
  };

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
    toast.success("Link adicionado.");
  };

  const handleRemoveBiolink = (id: string) => {
    setBiolinks((prev) => prev.filter((b) => b.id !== id));
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
      toast.success("Banner do link carregado!");
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro no upload do banner."
      );
    } finally {
      setIsUploadingBiolinkImage(false);
      e.target.value = "";
    }
  };

  const handleTogglePartnerStore = async (storeId: string) => {
    const isCurrentlyConnected = selectedPartnerStoreIds.includes(storeId);
    const nextConnected = !isCurrentlyConnected;

    setSelectedPartnerStoreIds((prev) =>
      nextConnected ? [...prev, storeId] : prev.filter((id) => id !== storeId)
    );

    const effectiveHandle = (
      creatorProfile?.handle ||
      username.trim() ||
      profile?.username ||
      ""
    )
      .toLowerCase()
      .trim()
      .replace(/^@/, "");

    if (effectiveHandle && creatorProfile?.id) {
      try {
        await togglePartnerStoreConnection({
          data: {
            handle: effectiveHandle,
            storeId,
            connect: nextConnected,
          },
        });
      } catch {
        // Persistência final ocorrerá no handleSave
      }
    }
  };

  const handleMoveShowcaseSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= showcaseOrder.length) return;
    setShowcaseOrder((prev) => {
      const next = [...prev];
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const effectiveHandle = (
        username.trim() ||
        creatorProfile?.handle ||
        profile?.username ||
        fullName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 20) ||
        "membro"
      )
        .toLowerCase()
        .replace(/^@/, "");

      if (isBrandPersonaView) {
        // Salvar Perfil de Marca / Criador
        await upsertCreatorProfile({
          data: {
            handle: effectiveHandle,
            stageName: fullName.trim(),
            category: occupation.trim() || creatorNiche || "Geral",
            bio: bio.trim().slice(0, 280),
            avatarUrl: avatarUrl || undefined,
            coverUrl: coverUrl || undefined,
            bannerUrl: showcaseBannerUrl || undefined,
            bannerTitle: showcaseBannerTitle.trim() || undefined,
            bannerLink: showcaseBannerLink.trim() || undefined,
            showcaseOrder,
            partnerStoreIds: selectedPartnerStoreIds,
            ownBrandStoreIds: selectedOwnBrandIds,
            socialLinks: {
              ...(instagram.trim() ? { instagram: instagram.trim().replace(/^@/, "") } : {}),
              ...(website.trim() ? { website: website.trim() } : {}),
              own_brand_store_ids: selectedOwnBrandIds,
            },
          },
        });

        await saveCreatorShowcaseSettings({
          data: {
            handle: effectiveHandle,
            bannerUrl: showcaseBannerUrl || null,
            bannerTitle: showcaseBannerTitle.trim() || null,
            bannerLink: showcaseBannerLink.trim() || null,
            showcaseOrder,
            partnerStoreIds: selectedPartnerStoreIds,
            ownBrandStoreIds: selectedOwnBrandIds,
          },
        }).catch(() => {});

        toast.success("Perfil da marca e vitrine atualizados com sucesso!");
        onClose();
        router.invalidate();
        return;
      }

      // Salvar Perfil Civil
      await updateProfile({
        data: {
          fullName: fullName.trim(),
          username: effectiveHandle || undefined,
          cpf: cpf.replace(/\D/g, "") || undefined,
          phone: phone.replace(/\D/g, "") || undefined,
          birthDate: birthDate || undefined,
          gender: gender || undefined,
          occupation: occupation.trim() || undefined,
          bio: bio.trim().slice(0, 280),
          avatarUrl: avatarUrl || undefined,
          coverUrl: coverUrl || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          website: website.trim() || undefined,
          instagram: instagram.trim().replace(/^@/, "") || undefined,
          biolinks,
          resumeData: resumeData as any,
          isAnonymous,
          hideLocation,
        },
      });

      toast.success("Perfil atualizado com sucesso!");
      onClose();
      router.invalidate();
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro ao salvar alterações."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isOpen === false) return null;

  const charsRemaining = 280 - (bio || "").length;

  return (
    <>
      <div className="w-full space-y-6 animate-in fade-in duration-200">
        {/* Header do Editor In-Page com Título e Ação de Fechar */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isBrandPersonaView ? (
                <Building2 className="size-5 text-primary" />
              ) : (
                <User className="size-5 text-primary" />
              )}
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {isBrandPersonaView ? "Editar Perfil de Marca" : "Editar Meu Perfil"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {isBrandPersonaView
                ? "Atualize as informações públicas, mídias e vitrine da sua marca na comunidade."
                : "Atualize sua identidade civil, apresentação profissional, links e privacidade."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer border-border/70 hover:bg-muted/40"
          >
            <X className="size-4" />
            <span>Fechar</span>
          </Button>
        </div>

          {/* ── 1. Banner de Claridade de Identidade (Padrão Canônico das Imagens 1 e 2) ── */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 sm:p-5 flex items-start justify-between gap-4 text-xs text-foreground">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-card border border-border/50 text-foreground flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                {isBrandPersonaView ? (
                  <Sparkles className="size-5 text-primary" />
                ) : (
                  <ShieldCheck className="size-5 text-primary" />
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm">
                    {isBrandPersonaView ? "Perfil de Marca" : "Conta Civil"}
                  </h3>
                  <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                    {isBrandPersonaView ? "Marca Oficial" : "Perfil Oficial"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {isBrandPersonaView
                    ? "Sua identidade comercial para vitrine, parcerias de produtos e publicações na comunidade."
                    : "Sua identidade pessoal para compras na loja, reservas, contratos e pedidos na comunidade."}
                </p>
              </div>
            </div>
          </div>

          {/* ── 2. Régua Horizontal Canônica de Abas (B.39) ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="tab-list flex items-center overflow-x-auto no-scrollbar pb-1">
              <TabsList className="bg-transparent p-0 gap-2 h-auto flex flex-nowrap">
                <TabsTrigger
                  value="identidade"
                  className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <User className="size-3.5" strokeWidth={1.75} />
                  <span>Identidade</span>
                </TabsTrigger>

                {isBrandPersonaView ? (
                  <TabsTrigger
                    value="vitrine"
                    className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ShoppingBag className="size-3.5" strokeWidth={1.75} />
                    <span>Vitrine</span>
                  </TabsTrigger>
                ) : (
                  <TabsTrigger
                    value="curriculo"
                    className="h-9 px-4 rounded-full text-xs font-semibold gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Briefcase className="size-3.5" strokeWidth={1.75} />
                    <span>Currículo</span>
                  </TabsTrigger>
                )}

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
                ABA 1: IDENTIDADE (Visual + Documentos e Dados)
            ══════════════════════════════════════════════════════════════ */}
            <TabsContent value="identidade" className="space-y-5">
              {/* Card 1: Identidade Visual Canônica (1:1 Squircle) */}
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Camera className="size-4 text-primary shrink-0" />
                    <span>Identidade Visual</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                    1:1 Squircle Canônico
                  </Badge>
                </div>

                {/* Linha Canônica: Avatar Squircle 1:1 e Guia BrandKit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center w-full">
                  {/* Avatar Squircle 1:1 */}
                  <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                      <div className="size-20 sm:size-24 rounded-2xl bg-card border-2 border-border/60 overflow-hidden flex items-center justify-center shadow-xs">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Foto de Perfil"
                            className="size-full object-cover select-none"
                          />
                        ) : (
                          <div className="size-full bg-muted flex items-center justify-center text-xl sm:text-2xl font-black text-primary">
                            {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="absolute inset-0 bg-background/80 text-foreground rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-semibold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Alterar Foto de Perfil (1:1)"
                      >
                        <Camera className="size-4" />
                        <span className="text-xs">Alterar</span>
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelected(e, "avatar")}
                        className="hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Foto de Perfil (1:1)</p>
                      <p className="text-xs text-muted-foreground">
                        Exibida em todos os perfis públicos, comentários e mensagens.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="h-11 min-h-11 px-3 rounded-lg text-xs font-medium cursor-pointer"
                      >
                        <Camera className="size-4 mr-2" />
                        <span>Carregar Foto</span>
                      </Button>
                    </div>
                  </div>

                  {/* Informação BrandKit para Empresas / Marcas */}
                  <div className="rounded-xl bg-muted/20 border border-border/40 p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Sparkles className="size-4 text-primary shrink-0" />
                      <span>Capa dos Feeds & Vitrines</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      A capa das empresas e criadores é exibida exclusivamente nos cards de busca, feeds do guia e vitrines. Ela é gerenciada e padronizada diretamente no Brand Kit.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold gap-2"
                    >
                      <Link to="/workspace/marketing/brand-kit">
                        <span>Acessar Brand Kit</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Card 2: Documentos & Dados Cadastrais */}
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="pb-3 border-b border-border/40">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    {isBrandPersonaView ? "Dados da Marca" : "Documentos & Dados"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      {isBrandPersonaView ? "Nome da Marca / Razão Social *" : "Nome Completo *"}
                    </Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isBrandPersonaView ? "Ex: Excelência Tour" : "Seu nome completo"}
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Nome de Usuário (@) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">
                        @
                      </span>
                      <Input
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                        }
                        placeholder="usuario"
                        className="h-11 pl-7 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Seu identificador único na rede comunitária.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      {isBrandPersonaView ? "Documento (CNPJ ou CPF)" : "CPF (Pessoa Física)"}
                    </Label>
                    <Input
                      value={cpf}
                      onChange={(e) => setCpf(maskCpf(e.target.value))}
                      placeholder={isBrandPersonaView ? "00.000.000/0000-00" : "000.000.000-00"}
                      className="h-11 rounded-lg text-xs font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Necessário para emissão de notas fiscais, contratos e validações de segurança.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="h-11 rounded-lg text-xs font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para confirmações de atendimento, pedidos e segurança em dois fatores.
                    </p>
                  </div>

                  {!isBrandPersonaView ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="h-11 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Gênero</Label>
                        <Select
                          value={gender}
                          onValueChange={(val: any) => setGender(val)}
                        >
                          <SelectTrigger className="h-11 rounded-lg text-xs">
                            <SelectValue placeholder="Selecione o gênero" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prefiro_nao_dizer">Prefiro não informar</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs font-semibold">Categoria / Nicho de Atuação</Label>
                      <Input
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        placeholder="Ex: Agência de Viagens, Gastronomia, Moda & Vestuário"
                        className="h-11 rounded-lg text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs font-semibold">Localização (Cidade e Estado)</Label>
                    <CitySelect
                      stateValue={state}
                      cityValue={city}
                      onStateChange={setState}
                      onCityChange={(c) => setCity(c)}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        {isBrandPersonaView ? "Biografia da Marca (Apresentação)" : "Biografia Pública"}
                      </Label>
                      <span
                        className={cn(
                          "text-xs font-mono",
                          charsRemaining < 20 ? "text-destructive font-bold" : "text-muted-foreground"
                        )}
                      >
                        {charsRemaining} caracteres restantes
                      </span>
                    </div>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 280))}
                      rows={3}
                      placeholder={
                        isBrandPersonaView
                          ? "Descreva sua marca, diferenciais e missão na comunidade..."
                          : "Conte um pouco sobre você, interesses e objetivos..."
                      }
                      className="rounded-lg text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════
                ABA 2 (CIVIL): CURRÍCULO & APRESENTAÇÃO PROFISSIONAL
            ══════════════════════════════════════════════════════════════ */}
            {!isBrandPersonaView && (
              <TabsContent value="curriculo" className="space-y-5">
                <ProfessionalResumeEditor
                  resumeData={resumeData}
                  onChange={setResumeData}
                  avatarUrl={avatarUrl}
                  fullName={fullName}
                />
              </TabsContent>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ABA 2 (MARCA): VITRINE COMERCIAL & AFILIADOS
            ══════════════════════════════════════════════════════════════ */}
            {isBrandPersonaView && (
              <TabsContent value="vitrine" className="space-y-5">
                {/* Card 1: Banner Promocional da Vitrine (16:9 Cinema) */}
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="flex items-center justify-between pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      <Sparkles className="size-4 text-primary shrink-0" />
                      <span>Banner Promocional da Vitrine</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                      16:9 Widescreen
                    </Badge>
                  </div>

                  <div className="aspect-video w-full rounded-lg bg-muted/20 relative overflow-hidden flex items-center justify-center border border-border/40 shadow-xs">
                    {showcaseBannerUrl ? (
                      <img
                        src={showcaseBannerUrl}
                        alt="Banner Promocional"
                        className="size-full object-cover select-none"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground flex flex-col items-center gap-2 p-4 text-center">
                        <Camera className="size-6 text-muted-foreground/60" />
                        <span>Sem banner promocional ativo na vitrine (Proporção 16:9)</span>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => showcaseBannerInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="bg-background/85 hover:bg-background text-foreground backdrop-blur-md border border-border/80 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs h-11 min-h-11"
                      >
                        <Camera className="size-3.5" />
                        <span>Alterar Banner (16:9)</span>
                      </Button>
                      {showcaseBannerUrl && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setShowcaseBannerUrl("")}
                          disabled={isUploadingMedia}
                          className="bg-destructive/85 hover:bg-destructive text-destructive-foreground px-3 py-2 rounded-lg text-xs font-semibold flex items-center cursor-pointer h-11 min-h-11 min-w-11"
                          title="Remover Banner"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <input
                      ref={showcaseBannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelected(e, "showcase_banner")}
                      className="hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Título / Chamada da Campanha</Label>
                      <Input
                        value={showcaseBannerTitle}
                        onChange={(e) => setShowcaseBannerTitle(e.target.value)}
                        placeholder="Ex: Pacotes Especiais de Inverno"
                        className="h-11 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Link de Destino do Banner</Label>
                      <Input
                        value={showcaseBannerLink}
                        onChange={(e) => setShowcaseBannerLink(e.target.value)}
                        placeholder="Ex: /loja/minha-loja ou https://..."
                        className="h-11 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Minhas Próprias Marcas & Lojas Parceiras */}
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="pb-3 border-b border-border/40">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      Minhas Marcas & Lojas Conectadas
                    </h3>
                  </div>

                  {ownBrandStores.length > 0 ? (
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Lojas vinculadas à sua conta exibidas na vitrine:
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ownBrandStores.map((st: any) => {
                          const isSelected = selectedOwnBrandIds.includes(st.id);
                          return (
                            <div
                              key={st.id}
                              className={cn(
                                "p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors",
                                isSelected
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border/60 bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Store className="size-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{st.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{st.city || "SC"}</p>
                                </div>
                              </div>
                              <Switch
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedOwnBrandIds((prev) =>
                                    checked ? [...prev, st.id] : prev.filter((id) => id !== st.id)
                                  );
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma loja própria vinculada a esta conta no momento.
                    </p>
                  )}

                  {availableStores.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border/40">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Lojas parceiras comissionadas conectadas:
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableStores.map((st: any) => {
                          const isConnected = selectedPartnerStoreIds.includes(st.id);
                          return (
                            <div
                              key={st.id}
                              className={cn(
                                "p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors",
                                isConnected
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border/60 bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Store className="size-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{st.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{st.segment || "Parceiro"}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={isConnected ? "default" : "outline"}
                                onClick={() => handleTogglePartnerStore(st.id)}
                                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                {isConnected ? "Conectada" : "Conectar"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: Ordem de Exibição das Seções */}
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="pb-3 border-b border-border/40">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      Ordem de Exibição das Seções na Vitrine
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {showcaseOrder.map((sectionKey, index) => (
                      <div
                        key={sectionKey}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 gap-3"
                      >
                        <span className="text-xs font-semibold text-foreground">
                          {SHOWCASE_SECTION_LABELS[sectionKey] || sectionKey}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => handleMoveShowcaseSection(index, "up")}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer disabled:opacity-30"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={index === showcaseOrder.length - 1}
                            onClick={() => handleMoveShowcaseSection(index, "down")}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer disabled:opacity-30"
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ABA 3: LINKS & REDES SOCIAIS
            ══════════════════════════════════════════════════════════════ */}
            <TabsContent value="links" className="space-y-5">
              {/* Card 1: Redes Sociais Oficiais */}
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="pb-3 border-b border-border/40">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    Redes Sociais Oficiais
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Instagram (@handle)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">
                        @
                      </span>
                      <Input
                        value={instagram}
                        onChange={(e) =>
                          setInstagram(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))
                        }
                        placeholder="perfil.instagram"
                        className="h-11 pl-7 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Website Oficial</Label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://meusite.com.br"
                      className="h-11 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Biolinks Dinâmicos */}
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="pb-3 border-b border-border/40">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    Links Públicos (Biolinks)
                  </h3>
                </div>

                <div className="space-y-3">
                  {biolinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {link.label || link.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{link.url}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveBiolink(link.id)}
                        className="text-muted-foreground hover:text-destructive h-11 min-h-11 px-3 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="p-3 rounded-lg border border-dashed border-border/80 space-y-3 bg-card">
                    <p className="text-xs font-semibold text-foreground">Adicionar Novo Link</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        placeholder="Título do Link (ex: Agendar Consulta)"
                        className="h-11 rounded-lg text-xs"
                      />
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://link-de-destino.com"
                        className="h-11 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddBiolink}
                        className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                      >
                        <Plus className="size-4" />
                        <span>Adicionar Link</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════
                ABA 4: PRIVACIDADE
            ══════════════════════════════════════════════════════════════ */}
            <TabsContent value="privacidade" className="space-y-5">
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="pb-3 border-b border-border/40">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    Privacidade & Visibilidade
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/40 bg-muted/20">
                    <div>
                      <p className="text-xs font-bold text-foreground">Perfil Anônimo</p>
                      <p className="text-xs text-muted-foreground">
                        Oculta seu nome em buscas públicas comunitárias.
                      </p>
                    </div>
                    <Switch
                      checked={isAnonymous}
                      onCheckedChange={setIsAnonymous}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/40 bg-muted/20">
                    <div>
                      <p className="text-xs font-bold text-foreground">Ocultar Minha Cidade</p>
                      <p className="text-xs text-muted-foreground">
                        Não exibe sua localização geográfica no cabeçalho do perfil público.
                      </p>
                    </div>
                    <Switch
                      checked={hideLocation}
                      onCheckedChange={setHideLocation}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ── Modal Footer de Ações ── */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
      </div>

      {/* Modal de Recorte de Imagens (Avatar 1:1, Capa 21:9, Banner 16:9) */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperSrc}
        aspect={cropperType === "avatar" ? 1 : cropperType === "cover" ? 21 / 9 : 16 / 9}
        cropShape={cropperType === "avatar" ? "round" : "rect"}
        title={
          cropperType === "avatar"
            ? "Enquadrar Foto de Perfil (1:1)"
            : cropperType === "cover"
            ? "Enquadrar Capa Panorâmica (21:9)"
            : "Enquadrar Banner Promocional (16:9)"
        }
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
