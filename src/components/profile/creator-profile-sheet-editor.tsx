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
import { Camera, Image as ImageIcon, User, Star, Globe, Instagram, Share2, ShieldCheck, Check, Loader2, SlidersHorizontal } from "lucide-react";

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

interface CreatorProfileSheetEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<CreatorProfileSheetData> | null;
  isNew?: boolean;
  onSuccess?: (savedData: CreatorProfileSheetData) => void;
}

export function CreatorProfileSheetEditor({
  open,
  onOpenChange,
  initialData,
  isNew = false,
  onSuccess,
}: CreatorProfileSheetEditorProps) {
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
      const type = cropperType;
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(croppedBlob);
      });

      const res = await uploadProfileMediaDirect({
        data: {
          fileName: `creator_${type}_${Date.now()}.png`,
          fileType: "image/png",
          base64Data,
          target: type === "avatar" ? "creator_avatar" : "creator_cover",
        },
      });

      if (type === "avatar") {
        setAvatarUrl(res.publicUrl);
        toast.success("Foto / Logo da marca atualizada com sucesso!");
      } else {
        setCoverUrl(res.publicUrl);
        toast.success("Foto de capa panorâmica atualizada com sucesso!");
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
      toast.error("O nome artístico ou da marca é obrigatório.");
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
          ? `Perfil @${cleanHandle} ativado com sucesso!`
          : `Perfil @${cleanHandle} atualizado com sucesso!`
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
      toast.error(err?.message || "Erro ao salvar perfil de criador.");
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
          <div className="flex items-center gap-2.5">
            <Star className="size-5 text-primary" />
            <span>
              {isNew ? "Ativar Perfil de Criador & Marca" : `Editar Perfil de Criador`}
            </span>
            {handle && (
              <Badge variant="outline" className="font-mono text-xs">
                @{handle}
              </Badge>
            )}
          </div>
        }
        description="Defina sua identidade visual, nicho de atuação e canais para curar vitrines e monetizar."
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving || isUploadingMedia}
              className="h-10 px-5 rounded-xl text-xs font-semibold gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>{isNew ? "Ativar Perfil" : "Salvar Alterações"}</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="p-4 sm:p-6 space-y-6">
          <Tabs defaultValue="dados" className="space-y-6">
            <TabsList className="bg-muted/30 p-1 rounded-xl h-11 flex gap-1 w-full sm:w-auto">
              <TabsTrigger
                value="dados"
                className="flex-1 sm:flex-initial h-9 rounded-lg text-xs font-bold gap-1.5"
              >
                <User className="size-3.5" />
                <span>Identidade e Visual</span>
              </TabsTrigger>
              <TabsTrigger
                value="redes"
                className="flex-1 sm:flex-initial h-9 rounded-lg text-xs font-bold gap-1.5"
              >
                <Share2 className="size-3.5" />
                <span>Redes e Canais</span>
              </TabsTrigger>
              <TabsTrigger
                value="avancado"
                className="flex-1 sm:flex-initial h-9 rounded-lg text-xs font-bold gap-1.5"
              >
                <SlidersHorizontal className="size-3.5" />
                <span>Opções Avançadas</span>
              </TabsTrigger>
            </TabsList>

            {/* ─── TAB 1: IDENTIDADE & VISUAL ─── */}
            <TabsContent value="dados" className="space-y-5 mt-0">
              {/* Card 1: Fotos com Ferramenta de Recorte e Zoom (Padrão _store.conta.perfil.tsx) */}
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
                  <Camera className="size-4 text-primary shrink-0" />
                  <span>1. Fotos de Identidade Visual da Marca</span>
                </div>

                {/* Capa Panorâmica */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Foto de Capa Panorâmica da Marca (Panorâmica 16:9 / 3:1)
                  </Label>
                  <div className="w-full h-28 sm:h-36 rounded-2xl bg-muted/30 overflow-hidden flex items-center justify-center border border-border/40 relative group">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt="Capa da marca"
                        className="size-full object-cover select-none"
                      />
                    ) : (
                      <div className="size-full bg-gradient-to-r from-primary/10 via-muted/40 to-primary/15 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <ImageIcon className="size-4 opacity-50" />
                          Nenhuma capa adicionada (Formato Panorâmico)
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

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute right-3 bottom-3 z-10 shrink-0 rounded-xl text-xs font-bold gap-1.5 bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingMedia}
                    >
                      <Camera className="size-3.5" />
                      <span>{coverUrl ? "Alterar Capa" : "Adicionar Capa"}</span>
                    </Button>
                  </div>
                </div>

                {/* Avatar Circular / Foto da Marca */}
                <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                  <div className="relative">
                    <div className="size-20 rounded-2xl overflow-hidden bg-muted flex items-center justify-center border border-border/50">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
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
                    <Label className="text-xs font-semibold text-foreground">
                      Foto ou Logo da Marca (1:1 Quadrado)
                    </Label>
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-bold gap-1.5 border-border h-9"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingMedia}
                      >
                        <Camera className="size-3.5" />
                        <span>{avatarUrl ? "Trocar Logo/Foto" : "Enviar Foto"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Dados Básicos & Nicho Estruturado */}
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
                  <User className="size-4 text-primary shrink-0" />
                  <span>2. Identificação e Segmento</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
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
                        placeholder="seu_nome_ou_marca"
                        className="h-11 pl-8 rounded-xl text-xs font-mono"
                        required
                        disabled={!isNew && !!initialData?.handle}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nome Artístico / Marca Pública *</Label>
                    <Input
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      placeholder="Como você é reconhecido pelo público"
                      className="h-11 rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Nicho / Categoria via SELECT CANÔNICO */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Nicho Principal de Atuação (Selecione no catálogo) *
                  </Label>
                  <CreatorNicheSelect
                    value={category}
                    onValueChange={(val) => setCategory(val)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Segmenta sua vitrine nas buscas da plataforma e atrai parcerias de lojas do mesmo nicho.
                  </p>
                </div>

                {/* Biografia Comercial */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mini Biografia Comercial</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte resumidamente seu foco, proposta de valor ou estilo de conteúdo..."
                    rows={3}
                    maxLength={500}
                    className="rounded-xl text-xs resize-none"
                  />
                  <div className="text-right text-[10px] text-muted-foreground">
                    {bio.length}/500 caracteres
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── TAB 2: REDES SOCIAIS & CANAIS ─── */}
            <TabsContent value="redes" className="space-y-5 mt-0">
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
                  <Share2 className="size-4 text-primary shrink-0" />
                  <span>Canais Sociais e Pontos de Contato</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Instagram className="size-3.5 text-pink-500" />
                      <span>Instagram</span>
                    </Label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@seu_perfil"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <span className="font-bold text-xs">🎵</span>
                      <span>TikTok</span>
                    </Label>
                    <Input
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@seu_tiktok"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <span className="text-red-500 font-bold text-xs">▶</span>
                      <span>YouTube</span>
                    </Label>
                    <Input
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      placeholder="Canal ou link completo"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold text-xs">💬</span>
                      <span>WhatsApp Comercial</span>
                    </Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(DDD) 99999-9999"
                      className="h-11 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Globe className="size-3.5 text-primary" />
                    <span>Website / Blog / Link Externo</span>
                  </Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://seusite.com.br"
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ─── TAB 3: OPÇÕES AVANÇADAS ─── */}
            <TabsContent value="avancado" className="space-y-5 mt-0">
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <span>Governança e Privacidade da Vitrine</span>
                </div>

                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground">
                        Visibilidade da Vitrine
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Define se sua vitrine aparece no diretório público de criadores e nas buscas da rede.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs font-medium">
                      <Button
                        type="button"
                        size="sm"
                        variant={privacyMode === "public" ? "default" : "ghost"}
                        onClick={() => setPrivacyMode("public")}
                        className="h-8 px-2.5 rounded-md text-xs"
                      >
                        Pública
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={privacyMode === "unlisted" ? "default" : "ghost"}
                        onClick={() => setPrivacyMode("unlisted")}
                        className="h-8 px-2.5 rounded-md text-xs"
                      >
                        Não Listada
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Monetização e Comissões
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Seus links de afiliação e cupons de 10% vinculados ao seu @handle continuam ativos e gerando comissões no CPF titular registrado na sua conta.
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
        aspect={cropperType === "avatar" ? 1 : 3 / 1}
        cropShape={cropperType === "avatar" ? "round" : "rect"}
        lockAspect={true}
        title={cropperType === "avatar" ? "Recortar Foto / Logo da Marca (1:1)" : "Recortar Capa Panorâmica da Marca (3:1)"}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
