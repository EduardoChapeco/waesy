// design-lint-ignore DL-12 reason:"Modal de formulario com mapeamento de presets estaticos" expiry:"2027-12-31"
// motion-reduce: safe
import * as React from "react";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Users,
  ImagePlus,
  Loader2,
  Check,
  Palette,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  COMMUNITY_GRADIENT_PRESETS,
  COMMUNITY_TYPE_LABELS,
  type CommunityType,
  type CommunityGradientPreset,
  type CommunityCoverMode,
} from "@/types/community";
import { createCommunity } from "@/services/community.functions";
import { getUserSession } from "@/services/auth.functions";
import { uploadPostMedia } from "@/services/storage.functions";
import { ActionAuthGuardModal } from "@/components/common/action-auth-guard-modal";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { toast } from "sonner";

export interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (slug: string) => void;
}

export function CreateCommunityModal({
  isOpen,
  onClose,
  onCreated,
}: CreateCommunityModalProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { isCompact } = useWindowSizeClass();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [communityType, setCommunityType] = useState<CommunityType>("general");
  const [coverMode, setCoverMode] = useState<CommunityCoverMode>("gradient");
  const [gradientPreset, setGradientPreset] = useState<CommunityGradientPreset>("blue-lime");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [isAuthGuardOpen, setIsAuthGuardOpen] = useState(false);

  // Consulta de sessão em cache
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: () => getUserSession(),
    staleTime: 1000 * 60 * 5,
  });

  const isAuthenticated = Boolean(session?.id);

  // Auto-gera slug baseado no título
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug) {
      const generated = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
        reader.readAsDataURL(file);
      });
      const res = await uploadPostMedia({
        data: {
          fileName: file.name,
          fileType: file.type || "image/jpeg",
          base64Data,
        },
      });
      if (res?.url) {
        setCoverImageUrl(res.url);
        toast.success("Foto de capa carregada!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/^@/, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

      return createCommunity({
        data: {
          title: title.trim(),
          slug: cleanSlug,
          description: description.trim(),
          community_type: communityType,
          cover_mode: coverMode,
          cover_gradient_preset: gradientPreset,
          cover_image_url: coverMode === "image" && coverImageUrl ? coverImageUrl : undefined,
          privacy,
        },
      });
    },
    onSuccess: (newComm) => {
      toast.success(`Comunidade "${newComm.title}" criada!`);
      qc.invalidateQueries({ queryKey: ["communities-list"] });
      onCreated?.(newComm.slug);
      onClose();
      router.navigate({ to: `/_store/c/${newComm.slug}` as any });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao criar comunidade.");
    },
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      setIsAuthGuardOpen(true);
      return;
    }
    createMutation.mutate();
  };

  const formBody = (
    <div className="space-y-4 py-2">
      {/* Título & Identificador @slug */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold">Nome da Comunidade</Label>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ex: Clube de Tecnologia"
            className="h-11 min-h-11 rounded-xl mt-1 text-base sm:text-sm font-medium"
          />
        </div>

        <div>
          <Label className="text-xs font-semibold">Link (@slug)</Label>
          <div className="relative flex items-center mt-1">
            <span className="absolute left-3.5 text-xs font-mono text-muted-foreground select-none pointer-events-none">
              /c/@
            </span>
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="clube-tecnologia"
              className="h-11 min-h-11 pl-12 rounded-xl text-base sm:text-sm font-mono font-medium"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold">Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tópicos e objetivo do espaço"
            rows={2}
            className="rounded-xl mt-1 text-base sm:text-sm"
          />
        </div>
      </div>

      {/* Tipo de Comunidade */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Categoria</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(COMMUNITY_TYPE_LABELS) as CommunityType[]).map((typeKey) => {
            const isSelected = communityType === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setCommunityType(typeKey)}
                className={`h-11 min-h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-foreground/30 bg-muted text-foreground ring-1 ring-foreground/20 font-bold"
                    : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                {COMMUNITY_TYPE_LABELS[typeKey]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Capa */}
      <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/40">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-2">
            <Palette className="size-4 text-muted-foreground" />
            <span>Estilo da Capa</span>
          </Label>
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => setCoverMode("gradient")}
              className={`h-11 min-h-11 px-4 rounded-md text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                coverMode === "gradient"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cores
            </button>
            <button
              type="button"
              onClick={() => setCoverMode("image")}
              className={`h-11 min-h-11 px-4 rounded-md text-xs font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                coverMode === "image"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Imagem
            </button>
          </div>
        </div>

        {coverMode === "gradient" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {Object.values(COMMUNITY_GRADIENT_PRESETS).map((preset) => {
              const isSelected = gradientPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setGradientPreset(preset.id)}
                  className={`h-11 min-h-11 rounded-xl p-2 bg-muted/60 border relative flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "border-foreground/40 bg-muted text-foreground ring-1 ring-foreground/20 font-bold"
                      : "border-border/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {preset.label.split(" ")[0]}
                  </span>
                  {isSelected && (
                    <Check className="absolute right-2 size-4 text-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-11 min-h-11 rounded-xl border border-dashed border-border/80 hover:bg-muted/40 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <ImagePlus className="size-4 text-muted-foreground" />
              )}
              <span>
                {coverImageUrl ? "Trocar imagem de capa" : "Fazer upload de imagem"}
              </span>
            </button>
            {coverImageUrl && (
              <div className="relative rounded-xl overflow-hidden h-20 border border-border/60">
                <img
                  src={coverImageUrl}
                  alt="Pré-visualização da capa"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão de Confirmação Final (Piso 44px) */}
      <div className="pt-2">
        <Button
          type="button"
          disabled={createMutation.isPending || !title.trim() || !slug.trim()}
          onClick={handleSubmit}
          className="w-full h-11 min-h-11 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Plus className="size-4 mr-2" />
          )}
          <span>Criar Comunidade</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isCompact ? (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl border-t bg-card text-foreground px-4 py-5 max-h-screen overflow-y-auto space-y-3 pb-safe"
          >
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <span>Nova Comunidade</span>
              </SheetTitle>
            </SheetHeader>
            {formBody}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="sm:max-w-lg rounded-2xl p-5 sm:p-6 bg-card text-foreground border border-border/60 max-h-screen overflow-y-auto">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <span>Nova Comunidade</span>
              </DialogTitle>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
      )}

      {/* Guard de Autenticação Canônico */}
      <ActionAuthGuardModal
        isOpen={isAuthGuardOpen}
        onOpenChange={setIsAuthGuardOpen}
        title="Identifique-se para criar a comunidade"
        description="Acesse sua conta para criar e gerenciar grupos locais no Waesy."
        actionContext="Criação de Comunidade Pública"
      />
    </>
  );
}
