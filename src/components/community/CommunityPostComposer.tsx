// motion-reduce: safe
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
  Highlighter,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Palette,
  Sparkles,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [contentText, setContentText] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [activeMarkerColor, setActiveMarkerColor] = useState("yellow");

  const applyFormatting = (prefix: string, suffix: string, defaultPlaceholder = "texto") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = contentText.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const nextContent = contentText.substring(0, start) + replacement + contentText.substring(end);
    setContentText(nextContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  const applyHighlight = (color: string) => {
    setActiveMarkerColor(color);
    applyFormatting(`==${color}:`, `==`, "destaque");
    setIsColorPickerOpen(false);
  };

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
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
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
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
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
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
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
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
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

          {/* ─── Barra de Formatação Minimalista com Marca-Texto & Markdown (Piso 44px) ─── */}
          <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Botão Marca-Texto com Paleta Flutuante */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  className="h-11 min-h-11 min-w-11 px-2 rounded-lg flex items-center justify-center hover:bg-muted/60 text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Marca-texto com cor selecionável"
                  aria-label="Marca-texto colorido"
                >
                  <Highlighter className="size-4 text-amber-500" />
                </button>

                {isColorPickerOpen && (
                  <div className="absolute left-0 top-12 z-50 p-2 rounded-xl bg-popover text-popover-foreground border border-border shadow-md flex items-center gap-1 animate-in fade-in-50 zoom-in-95">
                    {[
                      { id: "yellow", name: "Amarelo", bg: "bg-amber-300" },
                      { id: "cyan", name: "Ciano", bg: "bg-cyan-300" },
                      { id: "pink", name: "Rosa", bg: "bg-pink-300" },
                      { id: "green", name: "Verde", bg: "bg-emerald-300" },
                      { id: "purple", name: "Roxo", bg: "bg-purple-300" },
                      { id: "orange", name: "Laranja", bg: "bg-orange-300" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => applyHighlight(c.id)}
                        className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title={`Destacar em ${c.name}`}
                        aria-label={`Destacar em ${c.name}`}
                      >
                        <span className={`size-6 rounded-full ${c.bg} border border-black/20`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Negrito (*texto*) */}
              <button
                type="button"
                onClick={() => applyFormatting("*", "*", "negrito")}
                className="h-11 min-h-11 min-w-11 px-2 rounded-lg flex items-center justify-center hover:bg-muted/60 text-foreground transition-colors cursor-pointer font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Negrito (*texto*)"
                aria-label="Negrito"
              >
                <Bold className="size-4" />
              </button>

              {/* Itálico (_texto_) */}
              <button
                type="button"
                onClick={() => applyFormatting("_", "_", "itálico")}
                className="h-11 min-h-11 min-w-11 px-2 rounded-lg flex items-center justify-center hover:bg-muted/60 text-foreground transition-colors cursor-pointer italic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Itálico (_texto_)"
                aria-label="Itálico"
              >
                <Italic className="size-4" />
              </button>

              {/* Tachado (~texto~) */}
              <button
                type="button"
                onClick={() => applyFormatting("~", "~", "tachado")}
                className="h-11 min-h-11 min-w-11 px-2 rounded-lg flex items-center justify-center hover:bg-muted/60 text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Tachado (~texto~)"
                aria-label="Tachado"
              >
                <Strikethrough className="size-4" />
              </button>

              {/* Código (`código`) */}
              <button
                type="button"
                onClick={() => applyFormatting("`", "`", "código")}
                className="h-11 min-h-11 min-w-11 px-2 rounded-lg flex items-center justify-center hover:bg-muted/60 text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Código (`mono`)"
                aria-label="Código monoespaçado"
              >
                <Code className="size-4" />
              </button>
            </div>

            {/* Badge Dinâmico de Tipo de Post */}
            <div className="shrink-0 pr-1">
              {mediaUrls.length === 0 ? (
                <span className="text-2xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Tópico
                </span>
              ) : mediaUrls.length === 1 ? (
                <span className="text-2xs font-semibold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  1 Imagem
                </span>
              ) : (
                <span className="text-2xs font-semibold px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {mediaUrls.length} Imagens (Carrossel)
                </span>
              )}
            </div>
          </div>

          {/* Área de Texto Principal */}
          <Textarea
            ref={textareaRef}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="No que você está pensando? Selecione palavras e use os botões acima ou digite ==amarelo:texto==, *negrito*, _itálico_..."
            rows={4}
            className="w-full resize-none rounded-2xl text-xs sm:text-sm p-4 focus-visible:ring-2 focus-visible:ring-primary"
          />

          {/* Pré-visualização de Mídias Anexadas */}
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-border/60">
                  <img src={url} alt="Mídia anexada" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-background/70 text-primary-foreground flex items-center justify-center hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                className="h-11 min-h-11 px-4 rounded-xl border border-border/60 hover:bg-muted/50 flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              <span>Publicar</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
