import { useState, useRef } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ImageSquare,
  X,
  CircleNotch,
  FilmStrip,
  SignIn,
  ChatCircleText,
  AirplaneTilt,
  Newspaper,
  SquaresFour,
  Slideshow,
  IdentificationBadge,
  Sparkle,
  Storefront,
  MapPin,
  Tag,
  UserPlus,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createPost, type PostType } from "@/services/social.functions";
import { uploadPostMedia } from "@/services/storage.functions";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getMyCreatorProfile } from "@/services/affiliates.functions";
import { cn } from "@/lib/utils";
import { Highlighter } from "lucide-react";
import { extractMediaFromClipboard, fileToBase64 } from "@/lib/clipboard-media";

interface MediaPreviewItem {
  url: string;
  type: "image" | "video";
}

export interface InlinePostComposerProps {
  session?: any;
  profile?: any;
  onSuccess?: () => void;
}

const TEMPLATE_OPTIONS: { id: PostType; label: string; icon: React.ElementType }[] = [
  { id: "simple", label: "Padrão", icon: ChatCircleText },
  { id: "travel", label: "Viagem / Roteiro", icon: AirplaneTilt },
  { id: "grid", label: "Grid de Fotos", icon: SquaresFour },
  { id: "instagram_carousel", label: "Carrossel", icon: Slideshow },
  { id: "news", label: "Notícia", icon: Newspaper },
  { id: "duo_badge", label: "Parceria", icon: IdentificationBadge },
];

export function InlinePostComposer({ session, profile, onSuccess }: InlinePostComposerProps) {
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreviewItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PostType>("simple");

  // Template-specific fields
  const [travelOrigin, setTravelOrigin] = useState("");
  const [travelDestination, setTravelDestination] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSource, setNewsSource] = useState("");
  const [badgeTitle, setBadgeTitle] = useState("");
  const [member1Name, setMember1Name] = useState("");
  const [member1Role, setMember1Role] = useState("");
  const [member2Name, setMember2Name] = useState("");
  const [member2Role, setMember2Role] = useState("");

  // BigTech Creator & Collabs Feature Fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [postAsCreator, setPostAsCreator] = useState(false);
  const [isPaidPartnership, setIsPaidPartnership] = useState(false);
  const [partnerStoreName, setPartnerStoreName] = useState("");
  const [partnerCouponCode, setPartnerCouponCode] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationRegion, setLocationRegion] = useState("");
  const [collaboratorHandle, setCollaboratorHandle] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Busca perfil de criador do usuário (se possuir)
  const { data: creatorProfile } = useQuery({
    queryKey: ["my-creator-profile-composer"],
    queryFn: () => getMyCreatorProfile(),
    staleTime: 60_000,
  });

  const hasCreatorProfile = Boolean(creatorProfile?.handle || profile?.active_creator_handle);
  const activeCreatorHandle = creatorProfile?.handle || profile?.active_creator_handle || "";
  const activeCreatorName = creatorProfile?.stage_name || creatorProfile?.name || activeCreatorHandle;

  const isAuthenticated = Boolean(session?.user || session?.id || profile?.id);

  if (!isAuthenticated) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 text-left">
          <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ChatCircleText className="size-6" weight="bold" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground">Participe da Comunidade</h3>
            <p className="text-xs text-muted-foreground">
              Entre na sua conta para publicar fotos, viagens, histórias e dicas locais.
            </p>
          </div>
        </div>
        <Button asChild className="h-11 px-6 rounded-xl font-bold text-xs gap-2 shrink-0 w-full sm:w-auto">
          <Link to="/entrar" search={{ returnUrl: "/feed" }}>
            <SignIn className="size-4" weight="bold" />
            <span>Entrar ou Cadastrar</span>
          </Link>
        </Button>
      </div>
    );
  }

  // Identity extraction unificada
  const effectiveSession = session?.user || session;
  const userAvatar =
    profile?.avatar_url ||
    effectiveSession?.user_metadata?.avatar_url ||
    effectiveSession?.avatar_url ||
    "";
  const userName =
    profile?.full_name ||
    effectiveSession?.user_metadata?.full_name ||
    effectiveSession?.email?.split("@")[0] ||
    "Você";
  const userInitial = (userName || "U")[0].toUpperCase();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (mediaUrls.length + selectedFiles.length > 10) {
      toast.error(`Limite máximo de 10 mídias por post. Você pode adicionar mais ${Math.max(0, 10 - mediaUrls.length)} arquivo(s).`);
      return;
    }

    setIsUploadingMedia(true);

    for (const file of selectedFiles) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" tem formato não suportado. Envie fotos ou vídeos.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" excede o limite de 50MB.`);
        continue;
      }

      const localUrl = URL.createObjectURL(file);
      const mediaType = isVideo ? "video" : "image";
      setMediaPreviews((prev) => [...prev, { url: localUrl, type: mediaType }]);

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await uploadPostMedia({
          data: {
            fileName: file.name,
            fileType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
            base64Data,
          },
        });

        if (res?.url) {
          setMediaUrls((prev) => [...prev, res.url]);
        } else {
          throw new Error("Falha ao processar URL da mídia.");
        }
      } catch (err: any) {
        toast.error(err?.message || `Erro no upload de "${file.name}".`);
        setMediaPreviews((prev) => prev.filter((item) => item.url !== localUrl));
      }
    }

    setIsUploadingMedia(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertHighlight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newContent: string;
    let newCursorPos: number;

    if (selectedText.length > 0) {
      if (selectedText.startsWith("==") && selectedText.endsWith("==") && selectedText.length >= 4) {
        const unwrapped = selectedText.slice(2, -2);
        newContent = content.substring(0, start) + unwrapped + content.substring(end);
        newCursorPos = start + unwrapped.length;
      } else {
        const wrapped = `==${selectedText}==`;
        newContent = content.substring(0, start) + wrapped + content.substring(end);
        newCursorPos = start + wrapped.length;
      }
    } else {
      const placeholder = "==destaque==";
      newContent = content.substring(0, start) + placeholder + content.substring(end);
      newCursorPos = start + placeholder.length;
    }

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const handleClipboardPaste = async (e: React.ClipboardEvent) => {
    const extracted = await extractMediaFromClipboard(e);
    if (!extracted || extracted.length === 0) {
      return;
    }

    e.preventDefault();

    if (mediaUrls.length + extracted.length > 10) {
      toast.error(`Limite máximo de 10 mídias por post. Você pode adicionar mais ${Math.max(0, 10 - mediaUrls.length)} arquivo(s).`);
      return;
    }

    setIsUploadingMedia(true);
    toast.info(`Colando ${extracted.length} mídia(s) em alta resolução...`);

    for (const item of extracted) {
      const file = item.file;
      const isVideo = item.type === "video";
      const localUrl = item.previewUrl || URL.createObjectURL(file);

      setMediaPreviews((prev) => [...prev, { url: localUrl, type: isVideo ? "video" : "image" }]);

      try {
        const base64Data = await fileToBase64(file);
        const res = await uploadPostMedia({
          data: {
            fileName: file.name,
            fileType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
            base64Data,
          },
        });

        if (res?.url) {
          setMediaUrls((prev) => [...prev, res.url]);
        } else {
          throw new Error("Falha ao processar URL da mídia colada.");
        }
      } catch (err: any) {
        toast.error(err?.message || `Erro no upload da mídia colada "${file.name}".`);
        setMediaPreviews((prev) => prev.filter((p) => p.url !== localUrl));
      }
    }

    setIsUploadingMedia(false);
    toast.success("Mídia colada com sucesso!");
  };

  const onSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && mediaUrls.length === 0 && !newsTitle.trim() && !travelDestination.trim()) {
      toast.error("Adicione um texto, foto, roteiro de viagem ou notícia para publicar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const metadata: Record<string, any> = {};

      if (postAsCreator && activeCreatorHandle) {
        metadata.as_creator = true;
        metadata.creator_handle = activeCreatorHandle;
        metadata.creator_name = activeCreatorName;
      }

      if (isPaidPartnership && partnerStoreName.trim()) {
        metadata.sponsored_collab = true;
        metadata.sponsored_store_name = partnerStoreName.trim();
        if (partnerCouponCode.trim()) {
          metadata.coupon_code = partnerCouponCode.trim().toUpperCase();
        }
      }

      if (locationCity.trim() || locationRegion.trim()) {
        metadata.location_city = locationCity.trim();
        metadata.location_region = locationRegion.trim();
      }

      if (collaboratorHandle.trim()) {
        metadata.collaborator = collaboratorHandle.trim();
      }

      if (tagsInput.trim()) {
        metadata.tags = tagsInput
          .split(/[\s,]+/)
          .map((t) => (t.startsWith("#") ? t.slice(1) : t))
          .filter(Boolean);
      }

      if (selectedTemplate === "travel") {
        metadata.is_triptych = true;
        metadata.origin_city = travelOrigin.trim() || "Origem";
        metadata.dest_city = travelDestination.trim() || "Destino Especial";
        metadata.destination_name = travelDestination.trim() || "Roteiro de Viagem";
        metadata.travel_headline = trimmedContent || "Momentos especiais pelo caminho";
      } else if (selectedTemplate === "news") {
        metadata.is_news = true;
        metadata.title = newsTitle.trim() || trimmedContent.slice(0, 60);
        metadata.source = newsSource.trim() || "Imprensa Local";
        metadata.subtitle = trimmedContent;
      } else if (selectedTemplate === "duo_badge") {
        metadata.badge_group_title = badgeTitle.trim() || trimmedContent.slice(0, 40) || "Parceria em Sintonia";
        metadata.member1_name = member1Name.trim() || userName.split(" ")[0];
        metadata.member1_role = member1Role.trim() || "Criação";
        metadata.member2_name = member2Name.trim() || "Colaborador";
        metadata.member2_role = member2Role.trim() || "Parceria";
      }

      await createPost({
        data: {
          content_text: trimmedContent || undefined,
          media_urls: mediaUrls,
          layout_style: selectedTemplate === "instagram_carousel" ? "carousel" : "grid",
          post_type: selectedTemplate,
          location_name: locationCity.trim()
            ? `${locationCity.trim()}${locationRegion.trim() ? ` (${locationRegion.trim()})` : ""}`
            : undefined,
          city: locationCity.trim() || undefined,
          region: locationRegion.trim() || undefined,
          publish_as_handle: postAsCreator && activeCreatorHandle ? activeCreatorHandle : undefined,
          paid_partner_handle: isPaidPartnership && partnerStoreName.trim() ? partnerStoreName.trim() : undefined,
          paid_partner_label: isPaidPartnership && partnerStoreName.trim() ? `Parceria paga com ${partnerStoreName.trim()}` : undefined,
          collaborators: collaboratorHandle.trim() ? [collaboratorHandle.trim()] : undefined,
          tags: tagsInput.trim()
            ? tagsInput
                .split(/[\s,]+/)
                .map((t) => (t.startsWith("#") ? t.slice(1) : t))
                .filter(Boolean)
            : undefined,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          as_store: false,
          reference_type: selectedTemplate === "news" ? "news" : "none",
        },
      });

      toast.success(
        postAsCreator
          ? `Publicado como @${activeCreatorHandle}!`
          : "Publicado com sucesso no feed!"
      );
      setContent("");
      setTravelOrigin("");
      setTravelDestination("");
      setNewsTitle("");
      setNewsSource("");
      setBadgeTitle("");
      setMember1Name("");
      setMember1Role("");
      setMember2Name("");
      setMember2Role("");
      setPartnerStoreName("");
      setPartnerCouponCode("");
      setLocationCity("");
      setLocationRegion("");
      setCollaboratorHandle("");
      setTagsInput("");
      setShowAdvanced(false);
      setMediaUrls([]);
      setMediaPreviews([]);
      setSelectedTemplate("simple");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsExpanded(false);

      await router.invalidate();
      await queryClient.resetQueries({ queryKey: ["community-feed"] });
      await queryClient.refetchQueries({ queryKey: ["community-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["mural-feed"] });
      onSuccess?.();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao publicar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => textareaRef.current?.focus(), 80);
        }}
        className="w-full bg-card rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 border border-border/60 shadow-xs cursor-pointer hover:border-border transition-all active:scale-[0.99] select-none"
      >
        <Avatar className="size-9 sm:size-10 rounded-xl border border-border/50 shrink-0 overflow-hidden bg-muted">
          {userAvatar && <AvatarImage src={userAvatar} alt={userName} className="size-full object-cover" />}
          <AvatarFallback className="text-xs font-bold text-primary bg-primary/10 size-full flex items-center justify-center">
            {userInitial}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 bg-muted/40 hover:bg-muted/60 transition-colors h-10 rounded-xl px-3.5 flex items-center text-xs text-muted-foreground">
          <span className="truncate">Compartilhe uma história, foto ou dica...</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
              setTimeout(() => fileInputRef.current?.click(), 120);
            }}
            className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
            title="Adicionar foto"
          >
            <ImageSquare size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTemplate("travel");
              setIsExpanded(true);
            }}
            className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors hidden xs:flex cursor-pointer"
            title="Roteiro de Viagem"
          >
            <AirplaneTilt size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onPaste={handleClipboardPaste}
      className="w-full bg-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 relative border border-border/60 shadow-xs animate-in fade-in zoom-in-95 duration-200"
    >
      {/* ── 1. Topo: Identificação do Autor + Seletor de Identidade + Botão Fechar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 rounded-xl border border-border/50 shrink-0 overflow-hidden bg-muted">
            {userAvatar && (
              <AvatarImage
                src={userAvatar}
                alt={userName}
                className="size-full object-cover"
              />
            )}
            <AvatarFallback className="text-xs font-bold text-primary bg-primary/10 size-full flex items-center justify-center">
              {userInitial}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate leading-tight">
              {postAsCreator && activeCreatorHandle ? activeCreatorName : userName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {postAsCreator ? `Publicando como @${activeCreatorHandle}` : "Compartilhando na comunidade"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Seletor Multi-Identidade (Pessoal vs. Criador/Marca) */}
          {hasCreatorProfile && (
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => setPostAsCreator(false)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  !postAsCreator
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pessoal
              </button>
              <button
                type="button"
                onClick={() => setPostAsCreator(true)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                  postAsCreator
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkle className="size-3 text-primary" weight="fill" />
                <span>@{activeCreatorHandle}</span>
              </button>
            </div>
          )}

          {/* Botão de Fechar / Encolher Editor */}
          <button
            type="button"
            onClick={() => {
              if (!content.trim() || confirm("Descartar rascunho da publicação?")) {
                setIsExpanded(false);
              }
            }}
            className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
            title="Fechar editor"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── 2. Seletor de Formato Social (Chips Apple HIG) ────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {TEMPLATE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = selectedTemplate === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedTemplate(opt.id)}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 select-none",
                isActive
                  ? "bg-foreground text-background font-bold shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={14} weight={isActive ? "fill" : "bold"} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Campos Específicos por Template ─────────────────────────────── */}
      {selectedTemplate === "travel" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Origem</label>
            <Input
              value={travelOrigin}
              onChange={(e) => setTravelOrigin(e.target.value)}
              placeholder="Ex: Chapecó - SC"
              className="h-11 text-xs bg-background rounded-xl border-border/80"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Destino</label>
            <Input
              value={travelDestination}
              onChange={(e) => setTravelDestination(e.target.value)}
              placeholder="Ex: Serra Gaúcha / Gramado"
              className="h-11 text-xs bg-background rounded-xl border-border/80"
            />
          </div>
        </div>
      )}

      {selectedTemplate === "news" && (
        <div className="space-y-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
          <Input
            value={newsTitle}
            onChange={(e) => setNewsTitle(e.target.value)}
            placeholder="Título da Manchete..."
            className="h-11 text-xs font-bold bg-background rounded-xl border-border/80"
          />
          <Input
            value={newsSource}
            onChange={(e) => setNewsSource(e.target.value)}
            placeholder="Fonte / Veículo de Imprensa (Ex: Folha Regional)..."
            className="h-11 text-xs bg-background rounded-xl border-border/80"
          />
        </div>
      )}

      {selectedTemplate === "duo_badge" && (
        <div className="space-y-2.5 p-3 rounded-2xl bg-muted/30 border border-border/60">
          <Input
            value={badgeTitle}
            onChange={(e) => setBadgeTitle(e.target.value)}
            placeholder="Título da Conexão / Equipe (Ex: Dupla de Inovação)..."
            className="h-11 text-xs font-bold bg-background rounded-xl border-border/80"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={member1Name}
              onChange={(e) => setMember1Name(e.target.value)}
              placeholder="Nome Membro 1"
              className="h-10 text-xs bg-background rounded-xl border-border/80"
            />
            <Input
              value={member1Role}
              onChange={(e) => setMember1Role(e.target.value)}
              placeholder="Função 1"
              className="h-10 text-xs bg-background rounded-xl border-border/80"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={member2Name}
              onChange={(e) => setMember2Name(e.target.value)}
              placeholder="Nome Membro 2"
              className="h-10 text-xs bg-background rounded-xl border-border/80"
            />
            <Input
              value={member2Role}
              onChange={(e) => setMember2Role(e.target.value)}
              placeholder="Função 2"
              className="h-10 text-xs bg-background rounded-xl border-border/80"
            />
          </div>
        </div>
      )}

      {/* ── 4. Área de Texto do Post ───────────────────────────────────────── */}
      <Textarea
        ref={textareaRef}
        placeholder={
          selectedTemplate === "travel"
            ? "Compartilhe dicas do roteiro, fotos do caminho, segredos do destino... (use ==texto== para destacar)"
            : selectedTemplate === "news"
            ? "Escreva o resumo da matéria ou fatos principais... (use ==texto== para destacar)"
            : selectedTemplate === "duo_badge"
            ? "Conte sobre este trabalho em parceria ou conexão..."
            : "O que você gostaria de compartilhar com a comunidade hoje? (use ==texto== para destacar ou cole fotos com Ctrl+V)"
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handleClipboardPaste}
        className="min-h-24 text-sm sm:text-base border border-border/40 rounded-2xl bg-muted/20 focus:bg-background focus:border-primary/40 p-3.5 text-foreground transition-all resize-none focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/70"
      />

      {/* ── 5. Previews de Mídia com Upload Múltiplo (Até 10) ────────────────── */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {mediaPreviews.map((preview, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl bg-black inline-block size-24 shrink-0 border border-border/50"
            >
              {isUploadingMedia && index >= mediaUrls.length && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center z-20 gap-1 text-white">
                  <CircleNotch className="size-5 animate-spin text-primary" />
                  <span className="text-[10px] font-bold">Enviando...</span>
                </div>
              )}

              {preview.type === "video" ? (
                <video
                  src={preview.url}
                  className="size-full object-cover"
                  muted
                  playsInline
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="size-full object-cover"
                />
              )}

              {preview.type === "video" && (
                <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-white px-1.5 py-0.5 rounded-md text-[9px] flex items-center gap-1 font-bold">
                  <FilmStrip size={10} weight="bold" />
                  <span>Vídeo</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute top-1.5 right-1.5 size-6 bg-black/80 text-white rounded-lg flex items-center justify-center hover:bg-black z-30 transition-all hover:scale-110 cursor-pointer"
                aria-label="Remover mídia"
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── 5.5 Painel de Opções Avançadas (Parceria Paga, Cidade, Colaborador, Tags) ── */}
      {showAdvanced && (
        <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/50 space-y-3 animate-in fade-in duration-200">
          {/* Parceria Comercial / Collab */}
          <div className="p-3 rounded-xl bg-card border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Storefront size={16} weight="bold" className="text-primary" />
                <span className="text-xs font-bold text-foreground">Parceria Comercial / Collab</span>
              </div>
              <Button
                type="button"
                variant={isPaidPartnership ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPaidPartnership(!isPaidPartnership)}
                className="h-7 px-2.5 rounded-lg text-[11px] font-semibold"
              >
                {isPaidPartnership ? "Parceria Paga Ativa" : "Marcar Parceria"}
              </Button>
            </div>

            {isPaidPartnership && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Input
                  value={partnerStoreName}
                  onChange={(e) => setPartnerStoreName(e.target.value)}
                  placeholder="Nome da Loja Parceira (Ex: Chapecó Modas)"
                  className="h-10 text-xs rounded-xl"
                />
                <Input
                  value={partnerCouponCode}
                  onChange={(e) => setPartnerCouponCode(e.target.value.toUpperCase())}
                  placeholder="Cupom de Desconto Opcional (Ex: EDU10)"
                  className="h-10 text-xs font-mono uppercase rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Localização & Colaborador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="Cidade (Ex: Chapecó)"
                className="h-10 pl-8 text-xs rounded-xl"
              />
            </div>

            <div className="relative">
              <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={collaboratorHandle}
                onChange={(e) => setCollaboratorHandle(e.target.value)}
                placeholder="Colaborador / Co-autor (@handle)"
                className="h-10 pl-8 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Tags & SEO */}
          <div className="relative">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags e Tópicos (Ex: #gastronomia #dicas #compras)"
              className="h-10 pl-8 text-xs rounded-xl"
            />
          </div>
        </div>
      )}

      {/* ── 6. Barra de Ações (Design Apple HIG: Touch Target 44px) ─────────── */}
      <div className="flex justify-between items-center pt-3 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingMedia || mediaUrls.length >= 10}
            className="h-11 px-4 rounded-xl text-xs font-bold gap-2 border-border/60 hover:bg-muted cursor-pointer"
          >
            <ImageSquare size={18} weight="bold" className="text-primary" />
            <span>
              {mediaUrls.length > 0 ? `Fotos (${mediaUrls.length}/10)` : "Foto / Vídeo"}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleInsertHighlight}
            className="h-11 px-3.5 rounded-xl text-xs font-bold gap-1.5 border-border/60 hover:bg-amber-300/20 hover:text-amber-800 dark:hover:text-amber-200 transition-colors cursor-pointer"
            title="Destacar texto com marca-texto estilo Threads (==texto==)"
          >
            <Highlighter className="size-4 text-amber-500" />
            <span className="hidden sm:inline">Destaque</span>
          </Button>

          <Button
            type="button"
            variant={showAdvanced ? "secondary" : "ghost"}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-11 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal size={16} weight="bold" />
            <span className="hidden sm:inline">Opções Avançadas</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={
            isSubmitting ||
            isUploadingMedia ||
            (!content.trim() && mediaUrls.length === 0 && !newsTitle.trim() && !travelDestination.trim())
          }
          className="h-11 px-7 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs"
        >
          {isSubmitting ? (
            <>
              <CircleNotch size={14} className="animate-spin mr-1.5" />
              Publicando...
            </>
          ) : (
            "Publicar"
          )}
        </Button>
      </div>
    </div>
  );
}
