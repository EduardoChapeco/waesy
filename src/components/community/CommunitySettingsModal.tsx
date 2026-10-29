// motion-reduce: safe
import * as React from "react";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  ImagePlus,
  Loader2,
  Check,
  Save,
  Palette,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  COMMUNITY_GRADIENT_PRESETS,
  COMMUNITY_TYPE_LABELS,
  type Community,
  type CommunityType,
  type CommunityGradientPreset,
  type CommunityCoverMode,
} from "@/types/community";
import { updateCommunity } from "@/services/community.functions";
import { uploadPostMedia } from "@/services/storage.functions";
import { toast } from "sonner";

export interface CommunitySettingsModalProps {
  community: Community;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function CommunitySettingsModal({
  community,
  isOpen,
  onClose,
  onUpdated,
}: CommunitySettingsModalProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(community.title);
  const [description, setDescription] = useState(community.description || "");
  const [communityType, setCommunityType] = useState<CommunityType>(community.community_type);
  const [coverMode, setCoverMode] = useState<CommunityCoverMode>(community.cover_mode || "gradient");
  const [gradientPreset, setGradientPreset] = useState<CommunityGradientPreset>(
    community.cover_gradient_preset as CommunityGradientPreset || "blue-lime"
  );
  const [coverImageUrl, setCoverImageUrl] = useState(community.cover_image_url || "");
  const [isUploading, setIsUploading] = useState(false);

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

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCommunity({
        data: {
          communityId: community.id,
          updates: {
            title: title.trim(),
            description: description.trim(),
            community_type: communityType,
            cover_mode: coverMode,
            cover_gradient_preset: gradientPreset,
            cover_image_url: coverMode === "image" ? coverImageUrl || null : null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Configurações da comunidade atualizadas!");
      qc.invalidateQueries({ queryKey: ["community-detail", community.slug] });
      onUpdated?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar comunidade.");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl rounded-3xl p-5 sm:p-6 bg-card text-foreground border border-border/60 max-h-(--spacing-screen-90,90vh) overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            <span>Gerenciar Comunidade /c/@{community.slug}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold">Nome da Comunidade</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 min-h-11 rounded-xl mt-1 text-sm font-medium"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Descrição / Bio</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl mt-1 text-xs"
            />
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
                    className={`h-11 min-h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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

          {/* Seletor de Capa */}
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <span>Capa Panorâmica Integrada</span>
              </Label>
              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setCoverMode("gradient")}
                  className={`h-7 px-2 rounded-md text-2xs font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
                  className={`h-7 px-2 rounded-md text-2xs font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    coverMode === "image"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Foto Personalizada
                </button>
              </div>
            </div>

            {/* Presets */}
            {coverMode === "gradient" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {Object.values(COMMUNITY_GRADIENT_PRESETS).map((preset) => {
                  const isSelected = gradientPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setGradientPreset(preset.id)}
                      className={`h-12 rounded-xl p-2 bg-muted relative flex items-center justify-center shadow-xs transition-transform hover:scale-102 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected ? "ring-2 ring-foreground scale-102" : "opacity-85"
                      }`}
                    >
                      <span className="text-2xs font-bold text-primary-foreground drop-shadow-xs">
                        {preset.label.split(" ")[0]}
                      </span>
                      {isSelected && (
                        <Check className="absolute right-2 size-4 text-primary-foreground drop-shadow-xs" />
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
                  className="w-full h-14 rounded-xl border border-dashed border-border/80 hover:bg-muted/40 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

          <div className="pt-2">
            <Button
              type="button"
              disabled={updateMutation.isPending || !title.trim()}
              onClick={() => updateMutation.mutate()}
              className="w-full h-11 min-h-11 rounded-xl font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Save className="size-4 mr-2" />
              )}
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
