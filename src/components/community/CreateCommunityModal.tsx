import * as React from "react";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Sparkles,
  ImagePlus,
  Loader2,
  Check,
  Shield,
  Layers,
  Palette,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { uploadPostMedia } from "@/services/storage.functions";
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

  // Auto-gera slug baseado no título se slug estiver vazio
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
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadPostMedia({ data: formData });
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
    mutationFn: () =>
      createCommunity({
        data: {
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim(),
          community_type: communityType,
          cover_mode: coverMode,
          cover_gradient_preset: gradientPreset,
          cover_image_url: coverMode === "image" ? coverImageUrl || null : null,
          privacy,
        },
      }),
    onSuccess: (newComm) => {
      toast.success(`Comunidade "${newComm.title}" criada com sucesso!`);
      qc.invalidateQueries({ queryKey: ["communities-list"] });
      onCreated?.(newComm.slug);
      onClose();
      router.navigate({ to: `/_store/c/${newComm.slug}` as any });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao criar comunidade.");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-5 sm:p-6 bg-card text-foreground border border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span>Criar Nova Comunidade</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crie seu espaço estilo Threads com capa editável, feed nativo e ferramentas por nicho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Título & Identificador @slug */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Nome da Comunidade</Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Design Threads, Classificados da Cidade..."
                className="h-11 min-h-11 rounded-xl mt-1 text-sm font-medium"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Link Canônico (@slug)</Label>
              <div className="relative flex items-center mt-1">
                <span className="absolute left-3.5 text-xs font-mono text-muted-foreground">
                  /c/@
                </span>
                <Input
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="design-threads"
                  className="h-11 min-h-11 pl-12 rounded-xl text-xs font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição / Bio</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte o propósito da comunidade, tópicos permitidos..."
                rows={2}
                className="rounded-xl mt-1 text-xs"
              />
            </div>
          </div>

          {/* Tipo de Comunidade */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Tipo de Comunidade</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(COMMUNITY_TYPE_LABELS) as CommunityType[]).map((typeKey) => {
                const isSelected = communityType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setCommunityType(typeKey)}
                    className={`h-11 min-h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                        : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {COMMUNITY_TYPE_LABELS[typeKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estilo da Capa: Gradiente ou Imagem */}
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Palette className="size-4 text-primary" />
                <span>Estilo da Capa Threads</span>
              </Label>
              <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setCoverMode("gradient")}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    coverMode === "gradient"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Gradiente Mesh
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode("image")}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                    coverMode === "image"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Foto Personalizada
                </button>
              </div>
            </div>

            {/* Presets de Gradiente */}
            {coverMode === "gradient" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {Object.values(COMMUNITY_GRADIENT_PRESETS).map((preset) => {
                  const isSelected = gradientPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setGradientPreset(preset.id)}
                      className={`h-12 rounded-xl p-2 bg-gradient-to-r ${preset.gradientClass} relative flex items-center justify-center shadow-xs transition-transform hover:scale-[1.02] cursor-pointer ${
                        isSelected ? "ring-2 ring-foreground scale-[1.02]" : "opacity-85"
                      }`}
                    >
                      <span className="text-[11px] font-bold text-white drop-shadow-xs">
                        {preset.label.split(" ")[0]}
                      </span>
                      {isSelected && (
                        <Check className="absolute right-2 size-4 text-white drop-shadow-xs" />
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
                  className="w-full h-14 rounded-xl border border-dashed border-border/80 hover:bg-muted/40 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <ImagePlus className="size-4 text-primary" />
                  )}
                  <span>
                    {coverImageUrl ? "Trocar imagem de capa" : "Fazer upload de imagem de capa"}
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

          {/* ─── Botão de Confirmação Final (Piso 44px) ───────────────── */}
          <div className="pt-2">
            <Button
              type="button"
              disabled={createMutation.isPending || !title.trim() || !slug.trim()}
              onClick={() => createMutation.mutate()}
              className="w-full h-11 min-h-11 rounded-xl font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="size-4 mr-1.5" />
              )}
              <span>Criar Comunidade</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
