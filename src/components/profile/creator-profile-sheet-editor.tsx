import React, { useState, useEffect, useRef } from "react";
import { SheetPage } from "@/components/ui/sheet-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { CreatorNicheSelect } from "@/components/profile/creator-niche-select";
import { getPostMediaSignedUrl, uploadProfileMediaDirect } from "@/services/storage.functions";
import { upsertCreatorProfile, registerAffiliate } from "@/services/affiliates.functions";
import { toast } from "sonner";
import {
  Camera,
  Image as ImageIcon,
  User,
  Star,
  Globe,
  Instagram,
  Share2,
  ShieldCheck,
  Check,
  Loader2,
  SlidersHorizontal,
  UserCheck,
  Video,
  Youtube,
  MessageCircle,
} from "lucide-react";

export interface CreatorProfileSheetData {
  handle: string;
  stageName: string;
  bio?: string;
  category?: string;
  avatarUrl?: string;
  coverUrl?: string;
  socialLinks?: Record<string, string>;
  pinnedProducts?: string[];
  privacyMode?: "public" | "unlisted" | "private";
  isAnonymous?: boolean;
}

export interface CreatorProfileSheetEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<CreatorProfileSheetData> | null;
  isNew?: boolean;
  mode?: "affiliate" | "creator";
  onSuccess?: (savedData: CreatorProfileSheetData) => void;
}

export function CreatorProfileSheetEditor({
  open,
  onOpenChange,
  initialData,
  isNew = false,
  mode = "creator",
  onSuccess,
}: CreatorProfileSheetEditorProps) {
  const isAffiliate = mode === "affiliate";

  const [handle, setHandle] = useState("");
  const [stageName, setStageName] = useState("");
  const [category, setCategory] = useState("moda_estilo");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [privacyMode, setPrivacyMode] = useState<"public" | "unlisted" | "private">("public");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Estados de Recorte de Imagem (Idêntico a _store.conta.perfil.tsx)
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperType, setCropperType] = useState<"avatar" | "cover">("avatar");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  useEffect(() => {
    if (open) {
      setHandle(initialData?.handle || "");
      setStageName(initialData?.stageName || "");
      setCategory(initialData?.category || "moda_estilo");
      setBio(initialData?.bio || "");
      setAvatarUrl(initialData?.avatarUrl || "");
      setCoverUrl(initialData?.coverUrl || "");

      const socials = initialData?.socialLinks || {};
      setInstagram(socials.instagram || "");
      setTiktok(socials.tiktok || "");
      setYoutube(socials.youtube || "");
      setWhatsapp(socials.whatsapp || "");
      setWebsite(socials.website || "");

      setPrivacyMode(initialData?.privacyMode || "public");
      setIsAnonymous(initialData?.isAnonymous ?? false);
    }
  }, [open, initialData]);

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

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setIsUploadingMedia(true);

    try {
      const ext = croppedBlob.type === "image/png" ? "png" : "jpg";
      const targetPrefix = cropperType === "avatar" ? "creator_avatar" : "creator_cover";
      const fileName = `${targetPrefix}_${Date.now()}.${ext}`;

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });
      const base64Data = await base64Promise;

      const { publicUrl } = await uploadProfileMediaDirect({
        data: {
          base64Data,
          fileName,
          fileType: croppedBlob.type || "image/jpeg",
          target: cropperType === "avatar" ? "creator_avatar" : "creator_cover",
        },
      });

      if (cropperType === "avatar") {
        setAvatarUrl(publicUrl);
        toast.success(isAffiliate ? "Foto de identificação do parceiro atualizada!" : "Avatar da marca atualizado com sucesso!");
      } else {
        setCoverUrl(publicUrl);
        toast.success(isAffiliate ? "Capa de identificação do parceiro atualizada!" : "Foto de capa panorâmica atualizada com sucesso!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar imagem.");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanHandle || cleanHandle.length < 3) {
      toast.error("O identificador único (@handle) deve ter no mínimo 3 caracteres.");
      return;
    }

    if (!stageName.trim()) {
      toast.error(isAffiliate ? "O nome de exibição do parceiro é obrigatório." : "O nome artístico ou da marca é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const socialLinks: Record<string, string> = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (tiktok.trim()) socialLinks.tiktok = tiktok.trim();
      if (youtube.trim()) socialLinks.youtube = youtube.trim();
      if (whatsapp.trim()) socialLinks.whatsapp = whatsapp.trim();
      if (website.trim()) socialLinks.website = website.trim();

      // Sincroniza em creator_profiles
      await upsertCreatorProfile({
        data: {
          handle: cleanHandle,
          stageName: stageName.trim(),
          bio: bio.trim() || undefined,
          category,
          avatarUrl: avatarUrl || undefined,
          coverUrl: coverUrl || undefined,
          socialLinks,
          pinnedProducts: initialData?.pinnedProducts || [],
        },
      });

      // Sincroniza também no registro de afiliados
      await registerAffiliate({
        data: {
          handle: cleanHandle,
          displayName: stageName.trim(),
          bio: bio.trim() || undefined,
          category,
          socialChannel: instagram ? "instagram" : "other",
          socialHandle: instagram || undefined,
        },
      }).catch(() => null);

      toast.success(
        isNew
          ? (isAffiliate ? `Perfil de parceiro @${cleanHandle} ativado com sucesso!` : `Perfil @${cleanHandle} ativado com sucesso!`)
          : (isAffiliate ? `Perfil de parceiro @${cleanHandle} atualizado com sucesso!` : `Perfil @${cleanHandle} atualizado com sucesso!`)
      );

      const savedPayload: CreatorProfileSheetData = {
        handle: cleanHandle,
        stageName: stageName.trim(),
        bio: bio.trim(),
        category,
        avatarUrl,
        coverUrl,
        socialLinks,
        privacyMode,
        isAnonymous,
        pinnedProducts: initialData?.pinnedProducts || [],
      };

      onOpenChange(false);
      onSuccess?.(savedPayload);
    } catch (err: any) {
      toast.error(err?.message || (isAffiliate ? "Erro ao salvar perfil de parceiro." : "Erro ao salvar perfil de criador."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SheetPage
        open={open}
        onOpenChange={onOpenChange}
        size="lg"
        title={
          <div className="flex items-center gap-3">
            {isAffiliate ? (
              <UserCheck className="size-5 text-primary" />
            ) : (
              <Star className="size-5 text-primary" />
            )}
            <span>
              {isAffiliate
                ? (isNew ? "Ativar Perfil de Parceiro" : "Editar Perfil de Parceiro")
                : (isNew ? "Ativar Perfil de Criador & Marca" : "Editar Perfil de Criador & Marca")}
            </span>
            {handle && (
              <Badge variant="outline" className="font-mono text-xs">
                @{handle}
              </Badge>
            )}
          </div>
        }
        description={
          isAffiliate
            ? "Defina sua identificação de parceiro, dados de divulgação e canais de indicação."
            : "Defina sua identidade visual, segmento de atuação e canais para curar vitrines."
        }
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-11 min-h-11 px-4 rounded-lg text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving || isUploadingMedia}
              className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>
                    {isNew
                      ? (isAffiliate ? "Ativar Perfil de Parceiro" : "Ativar Perfil")
                      : (isAffiliate ? "Salvar Perfil de Parceiro" : "Salvar Alterações")}
                  </span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="p-4 sm:p-6 space-y-6">
          <Tabs defaultValue="dados" className="space-y-6">
            <TabsList className="bg-muted/30 p-1 rounded-lg h-11 flex gap-1 w-full sm:w-auto">
              <TabsTrigger
                value="dados"
                className="flex-1 sm:flex-initial h-9 rounded-lg text-xs font-bold gap-2 cursor-pointer"
              >
                {isAffiliate ? <UserCheck className="size-3.5" /> : <User className="size-3.5" />}
                <span>{isAffiliate ? "Identidade do Parceiro" : "Identidade"}</span>
              </TabsTrigger>
              <TabsTrigger
                value="redes"
                className="flex-1 sm:flex-initial h-9 rounded-lg text-xs font-bold gap-2 cursor-pointer"
              >
                <Share2 className="size-3.5" />
                <span>Canais</span>
              </TabsTrigger>
              <TabsTrigger
                value="avancado"
                className="flex-1 sm:flex-initial h-9 rounded-lg text-xs font-bold gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>Avançado</span>
              </TabsTrigger>
            </TabsList>

            {/* ─── TAB 1: IDENTIDADE ─── */}
            <TabsContent value="dados" className="space-y-5 mt-0">
              {/* Card 1: Fotos com Ferramenta de Recorte e Zoom */}
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <Camera className="size-4 text-primary shrink-0" />
                    <span>{isAffiliate ? "Identidade do Parceiro" : "Identidade Visual da Marca"}</span>
                  </div>
                  <span className="text-2xs text-muted-foreground font-mono">
                    1:1 Squircle + 21:9 Panorâmica
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Foto de Perfil 1:1 Squircle */}
                  <div className="relative size-20 sm:size-24 rounded-lg bg-muted/30 border border-border/50 shrink-0 overflow-hidden group flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={stageName || handle}
                        className="size-full object-cover select-none"
                      />
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold uppercase text-primary">
                        {(stageName || handle || "P").charAt(0)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingMedia}
                      className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-foreground gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={isAffiliate ? "Alterar Foto do Parceiro" : "Alterar Foto do Perfil"}
                    >
                      <Camera className="size-4" />
                      <span className="text-2xs">Alterar</span>
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
                  <div className="flex-1 min-w-0 h-20 sm:h-24 rounded-lg bg-muted/20 relative overflow-hidden flex items-center group border border-border/40">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt="Capa"
                        className="size-full object-cover select-none"
                      />
                    ) : (
                      <div className="size-full bg-muted/40 flex items-center justify-center text-muted-foreground p-3 text-center">
                        <span className="text-xs font-medium">
                          {isAffiliate ? "Capa do parceiro (21:9)" : "Sem capa (21:9)"}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingMedia}
                      className="absolute top-2.5 right-2.5 bg-background/90 hover:bg-background border border-border/80 text-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

                {coverUrl && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setCoverUrl("")}
                      className="text-2xs text-destructive hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Remover Capa
                    </button>
                  </div>
                )}
              </div>

              {/* Card 2: Dados Básicos & Nicho Estruturado */}
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                  <User className="size-4 text-primary shrink-0" />
                  <span>{isAffiliate ? "2. Identificação e Área de Atuação" : "2. Identificação e Segmento"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Identificador Único (@handle) *</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                        @
                      </span>
                      <Input
                        value={handle}
                        onChange={(e) =>
                          setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                        }
                        placeholder={isAffiliate ? "seu_codigo_ou_marca" : "seu_nome_ou_marca"}
                        className="h-11 pl-8 rounded-lg text-xs font-mono"
                        required
                        disabled={!isNew && !!initialData?.handle}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      {isAffiliate ? "Nome de Exibição do Parceiro *" : "Nome Artístico / Marca Pública *"}
                    </Label>
                    <Input
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      placeholder={isAffiliate ? "Ex: Eduardo Ramos, Achei em Chapecó" : "Ex: Ana Silva, TechReview, Modas BR"}
                      className="h-11 rounded-lg text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    {isAffiliate ? "Área de Atuação / Divulgação *" : "Segmento Principal *"}
                  </Label>
                  <CreatorNicheSelect
                    value={category}
                    onValueChange={(val: string) => setCategory(val)}
                  />
                  <p className="text-2xs text-muted-foreground">
                    {isAffiliate
                      ? "Define sua principal categoria de recomendação e afiliação comercial."
                      : "Define o nicho de curadoria para vitrines de produtos e lojas parceiras."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    {isAffiliate ? "Apresentação do Parceiro" : "Mini-Biografia Pública"}
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      isAffiliate
                        ? "Conte sobre seus canais de divulgação, nicho de público ou estilo de recomendação..."
                        : "Conte sobre sua curadoria, estilo ou propostas de parceria..."
                    }
                    rows={3}
                    maxLength={500}
                    className="rounded-lg text-xs resize-none"
                  />
                  <div className="flex justify-between text-2xs text-muted-foreground">
                    <span>
                      {isAffiliate
                        ? "Aparece para as lojas parceiras e em seus canais de indicação."
                        : "Aparece no topo da sua vitrine pública."}
                    </span>
                    <span>{bio.length}/500 caracteres</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── TAB 2: REDES SOCIAIS & CANAIS ─── */}
            <TabsContent value="redes" className="space-y-5 mt-0">
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                  <Share2 className="size-4 text-primary shrink-0" />
                  <span>{isAffiliate ? "Canais de Divulgação e Contato" : "Canais Sociais e Pontos de Contato"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <Instagram className="size-3.5 text-primary" />
                      <span>Instagram</span>
                    </Label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@seu_perfil"
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <Video className="size-3.5 text-primary" />
                      <span>TikTok</span>
                    </Label>
                    <Input
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@seu_tiktok"
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <Youtube className="size-3.5 text-primary" />
                      <span>YouTube</span>
                    </Label>
                    <Input
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      placeholder="Canal ou link completo"
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <MessageCircle className="size-3.5 text-primary" />
                      <span>WhatsApp de Parcerias</span>
                    </Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(DDD) 99999-9999"
                      className="h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Globe className="size-3.5 text-primary" />
                    <span>Website / Blog / Link Externo</span>
                  </Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://seusite.com.br"
                    className="h-11 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ─── TAB 3: OPÇÕES AVANÇADAS ─── */}
            <TabsContent value="avancado" className="space-y-5 mt-0">
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <span>{isAffiliate ? "Governança e Privacidade de Indicação" : "Governança e Privacidade da Vitrine"}</span>
                </div>

                <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">
                        {isAffiliate ? "Visibilidade nas Buscas e Parcerias" : "Visibilidade da Vitrine"}
                      </h4>
                      <p className="text-2xs text-muted-foreground">
                        {isAffiliate
                          ? "Define se sua identificação de parceiro aparece no diretório de parceiros e nas buscas da rede."
                          : "Define se sua vitrine aparece no diretório público de criadores e nas buscas da rede."}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                      <Button
                        type="button"
                        size="sm"
                        variant={privacyMode === "public" ? "default" : "ghost"}
                        onClick={() => setPrivacyMode("public")}
                        className="h-9 px-3 rounded-md text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Pública
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={privacyMode === "unlisted" ? "default" : "ghost"}
                        onClick={() => setPrivacyMode("unlisted")}
                        className="h-9 px-3 rounded-md text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Não Listada
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Monetização e Comissões
                  </h4>
                  <p className="text-2xs text-muted-foreground leading-relaxed">
                    Seus links de afiliação e cupons vinculados ao seu @handle continuam ativos e gerando comissões e tokens registrados na sua conta.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetPage>

      {/* Modal Canônico de Recorte com Zoom (ImageCropperDialog) */}
      <ImageCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperSrc}
        aspect={cropperType === "avatar" ? 1 : 21 / 9}
        cropShape="rect"
        lockAspect={true}
        title={
          cropperType === "avatar"
            ? (isAffiliate ? "Recortar Foto do Parceiro (1:1)" : "Recortar Foto / Logo da Marca (1:1)")
            : (isAffiliate ? "Recortar Capa do Parceiro (21:9)" : "Recortar Capa Panorâmica da Marca (21:9)")
        }
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
