import * as React from "react";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ImagePlus,
  X,
  Loader2,
  Tag,
  Newspaper,
  Calendar,
  Briefcase,
  Video,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCommunityPost } from "@/services/community.functions";
import { uploadPostMedia } from "@/services/storage.functions";
import { type CommunityType } from "@/types/community";
import { toast } from "sonner";

export interface CommunityPostComposerProps {
  communityId: string;
  communityType: CommunityType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CommunityPostComposer({
  communityId,
  communityType,
  isOpen,
  onClose,
  onSuccess,
}: CommunityPostComposerProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contentText, setContentText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Campos específicos por template
  const [saleTitle, setSaleTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleCondition, setSaleCondition] = useState<"new" | "used" | "refurbished">("used");
  const [saleWhatsApp, setSaleWhatsApp] = useState("");

  const [newsTitle, setNewsTitle] = useState("");
  const [newsSource, setNewsSource] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobModel, setJobModel] = useState<"Presencial" | "Remoto" | "Híbrido">("Presencial");

  // Determina o post_type de acordo com o tipo da comunidade
  const resolvedPostType =
    communityType === "sales"
      ? "sale"
      : communityType === "news"
      ? "news"
      : communityType === "videos"
      ? "video"
      : communityType === "events"
      ? "event"
      : communityType === "jobs"
      ? "job"
      : "simple";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaUrls.length + files.length > 10) {
      toast.error("O limite máximo é de 10 mídias por publicação.");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadPostMedia({ data: formData });
        if (res?.url) {
          uploaded.push(res.url);
        }
      }
      setMediaUrls((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} mídia(s) anexada(s).`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao fazer upload da mídia.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const postMutation = useMutation({
    mutationFn: async () => {
      const attributes: Record<string, any> = {};

      if (resolvedPostType === "sale") {
        const cleanPrice = parseFloat(salePrice.replace(/\D/g, "")) || 0;
        attributes.title = saleTitle.trim();
        attributes.price_cents = cleanPrice;
        attributes.condition = saleCondition;
        attributes.contact_whatsapp = saleWhatsApp.trim();
      } else if (resolvedPostType === "news") {
        attributes.title = newsTitle.trim();
        attributes.source = newsSource.trim() || "Comunidade";
      } else if (resolvedPostType === "event") {
        attributes.title = eventTitle.trim();
        attributes.event_date = eventDate.trim();
        attributes.location = eventLocation.trim();
      } else if (resolvedPostType === "job") {
        attributes.title = jobTitle.trim();
        attributes.company = jobCompany.trim();
        attributes.work_model = jobModel;
      }

      return createCommunityPost({
        data: {
          communityId,
          content_text: contentText.trim() || null,
          media_urls: mediaUrls,
          post_type: resolvedPostType as any,
          post_attributes: attributes,
        },
      });
    },
    onSuccess: () => {
      toast.success("Publicação compartilhada na comunidade!");
      qc.invalidateQueries({ queryKey: ["community-feed", communityId] });
      setContentText("");
      setMediaUrls([]);
      setSaleTitle("");
      setSalePrice("");
      setNewsTitle("");
      setEventTitle("");
      setJobTitle("");
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao publicar. Verifique os dados.");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-5 sm:p-6 bg-card text-foreground border border-border/60">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Nova Publicação na Comunidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ─── Campos Específicos por Tipo de Comunidade ────────────── */}
          {resolvedPostType === "sale" && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Tag className="size-4" />
                <span>Dados do Item à Venda</span>
              </div>
              <Input
                value={saleTitle}
                onChange={(e) => setSaleTitle(e.target.value)}
                placeholder="Título do produto / desapego"
                className="h-11 min-h-11 rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Preço em R$ (ex: 250)"
                  className="h-11 min-h-11 rounded-xl"
                />
                <select
                  value={saleCondition}
                  onChange={(e) => setSaleCondition(e.target.value as any)}
                  className="h-11 min-h-11 px-3 rounded-xl bg-background border border-input text-xs font-medium"
                >
                  <option value="used">Usado</option>
                  <option value="new">Novo na Caixa</option>
                  <option value="refurbished">Seminovo</option>
                </select>
              </div>
              <Input
                value={saleWhatsApp}
                onChange={(e) => setSaleWhatsApp(e.target.value)}
                placeholder="WhatsApp para contato com DDD"
                className="h-11 min-h-11 rounded-xl"
              />
            </div>
          )}

          {resolvedPostType === "news" && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Newspaper className="size-4" />
                <span>Dados da Matéria / Notícia</span>
              </div>
              <Input
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="Manchete da notícia"
                className="h-11 min-h-11 rounded-xl"
              />
              <Input
                value={newsSource}
                onChange={(e) => setNewsSource(e.target.value)}
                placeholder="Veículo / Fonte de apuração"
                className="h-11 min-h-11 rounded-xl"
              />
            </div>
          )}

          {resolvedPostType === "event" && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Calendar className="size-4" />
                <span>Dados do Encontro / Evento</span>
              </div>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Nome do evento"
                className="h-11 min-h-11 rounded-xl"
              />
              <Input
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="Data e horário (ex: Sábado, 15:00)"
                className="h-11 min-h-11 rounded-xl"
              />
              <Input
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Local / Endereço"
                className="h-11 min-h-11 rounded-xl"
              />
            </div>
          )}

          {resolvedPostType === "job" && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Briefcase className="size-4" />
                <span>Dados da Oportunidade</span>
              </div>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Cargo / Título da vaga"
                className="h-11 min-h-11 rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                  placeholder="Nome da empresa"
                  className="h-11 min-h-11 rounded-xl"
                />
                <select
                  value={jobModel}
                  onChange={(e) => setJobModel(e.target.value as any)}
                  className="h-11 min-h-11 px-3 rounded-xl bg-background border border-input text-xs font-medium"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Remoto">Remoto</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>
            </div>
          )}

          {/* Área de Texto Principal */}
          <Textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="No que você está pensando? Use ==destaque== para marcar texto..."
            rows={4}
            className="w-full resize-none rounded-2xl text-xs sm:text-sm p-3.5"
          />

          {/* Pré-visualização de Mídias Anexadas */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-border/60">
                  <img src={url} alt="Mídia anexada" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ─── Rodapé de Ações do Composer (Piso 44px) ─────────────── */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading || mediaUrls.length >= 10}
                onClick={() => fileInputRef.current?.click()}
                className="h-11 min-h-11 px-4 rounded-xl border border-border/60 hover:bg-muted/50 flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <ImagePlus className="size-4 text-primary" />
                )}
                <span>Fotos / Vídeos</span>
              </button>
            </div>

            <Button
              type="button"
              disabled={postMutation.isPending || (!contentText.trim() && mediaUrls.length === 0)}
              onClick={() => postMutation.mutate()}
              className="h-11 min-h-11 px-6 rounded-xl font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {postMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Send className="size-4 mr-1.5" />
              )}
              <span>Publicar</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
