import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BidirectionalMediaUploader } from "@/components/ui/bidirectional-media-uploader";
import { MediaUploader } from "@/components/ui/media-uploader";
import type {
  VerticalLandingSectionDTO,
  VerticalLandingSectionLayout,
  VerticalLandingSectionType,
} from "@/lib/vertical-landing-types";

export interface AdminLandingSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingSlug: string;
  editingSection: VerticalLandingSectionDTO | null;
  defaultSortOrder: number;
  isPersistentUuid: boolean;
  onSave: (payload: Omit<VerticalLandingSectionDTO, "id" | "landing_slug"> & { id?: string }) => Promise<void>;
}

export function AdminLandingSectionDialog({
  open,
  onOpenChange,
  landingSlug,
  editingSection,
  defaultSortOrder,
  isPersistentUuid,
  onSave,
}: AdminLandingSectionDialogProps) {
  const [saving, setSaving] = useState(false);
  const [sectionType, setSectionType] = useState<VerticalLandingSectionType>("feature_split");
  const [layoutVariant, setLayoutVariant] = useState<VerticalLandingSectionLayout>("split_right");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badgeTag, setBadgeTag] = useState("");
  const [body, setBody] = useState("");
  const [mediaDesktopUrl, setMediaDesktopUrl] = useState<string | null>(null);
  const [mediaMobileUrl, setMediaMobileUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<Array<{ title: string; description?: string; badge?: string }>>([]);

  useEffect(() => {
    if (!open) return;
    if (editingSection) {
      setSectionType(editingSection.section_type);
      setLayoutVariant(editingSection.layout_variant);
      setTitle(editingSection.title);
      setSubtitle(editingSection.subtitle || "");
      setBadgeTag(editingSection.badge_tag || "");
      setBody(editingSection.body || "");
      setMediaDesktopUrl(editingSection.media_desktop_url || null);
      setMediaMobileUrl(editingSection.media_mobile_url || null);
      setVideoUrl(editingSection.video_url || null);
      setCtaLabel(editingSection.cta_label || "");
      setCtaHref(editingSection.cta_href || "");
      setIsActive(editingSection.is_active);
      setItems(editingSection.items_json || []);
    } else {
      setSectionType("feature_split");
      setLayoutVariant("split_right");
      setTitle("");
      setSubtitle("");
      setBadgeTag("");
      setBody("");
      setMediaDesktopUrl(null);
      setMediaMobileUrl(null);
      setVideoUrl(null);
      setCtaLabel("");
      setCtaHref("");
      setIsActive(true);
      setItems([{ title: "Diferencial 1", description: "Detalhe do recurso" }]);
    }
  }, [open, editingSection]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editingSection && isPersistentUuid ? editingSection.id : undefined,
        section_type: sectionType,
        layout_variant: layoutVariant,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        badge_tag: badgeTag.trim() || null,
        body: body.trim() || null,
        media_desktop_url: mediaDesktopUrl,
        media_mobile_url: mediaMobileUrl,
        video_url: videoUrl,
        cta_label: ctaLabel.trim() || null,
        cta_href: ctaHref.trim() || null,
        items_json: items.filter((i) => i.title.trim().length > 0),
        sort_order: editingSection?.sort_order ?? defaultSortOrder,
        is_active: isActive,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-dvh overflow-y-auto pt-safe-modal pb-safe">
        <DialogHeader>
          <DialogTitle>{editingSection ? "Editar Seção da Landing" : "Nova Seção da Landing"}</DialogTitle>
          <DialogDescription>Configure textos, layout visual, lista de destaques e upload de mídia.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tipo</Label>
              <Select value={sectionType} onValueChange={(v) => setSectionType(v as VerticalLandingSectionType)}>
                <SelectTrigger className="h-11 min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature_split">Destaque com Mídia</SelectItem>
                  <SelectItem value="workflow_steps">Passos do Fluxo</SelectItem>
                  <SelectItem value="media_showcase">Vitrine Visual / Prints</SelectItem>
                  <SelectItem value="video_demo">Demonstração em Vídeo</SelectItem>
                  <SelectItem value="cta_banner">Chamada de Conversão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Layout</Label>
              <Select value={layoutVariant} onValueChange={(v) => setLayoutVariant(v as VerticalLandingSectionLayout)}>
                <SelectTrigger className="h-11 min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="split_right">Texto Esquerda + Mídia Direita</SelectItem>
                  <SelectItem value="split_left">Mídia Esquerda + Texto Direita</SelectItem>
                  <SelectItem value="grid_3">Grade 3 Colunas</SelectItem>
                  <SelectItem value="grid_2">Grade 2 Colunas</SelectItem>
                  <SelectItem value="bento">Bento Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 min-h-11" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Selo (Opcional)</Label>
              <Input value={badgeTag} onChange={(e) => setBadgeTag(e.target.value)} className="h-11 min-h-11" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold">Subtítulo</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-11 min-h-11" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs font-semibold">Texto Completo</Label>
              <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">CTA (Opcional)</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Começar Agora" className="h-11 min-h-11" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Link CTA (Opcional)</Label>
              <Input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/painel" className="h-11 min-h-11" />
            </div>
          </div>

          <BidirectionalMediaUploader
            label="Imagem da Seção (Desktop e Mobile)"
            bucket="cms-media"
            folder={`landings/${landingSlug}/sections`}
            desktopUrl={mediaDesktopUrl}
            mobileUrl={mediaMobileUrl}
            desktopAspect={16 / 9}
            mobileAspect={4 / 3}
            onDesktopChange={(u) => setMediaDesktopUrl(u || null)}
            onMobileChange={(u) => setMediaMobileUrl(u || null)}
          />

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Vídeo da Seção (Opcional)</Label>
            <MediaUploader
              accept="video"
              maxFiles={1}
              bucket="cms-media"
              folder={`landings/${landingSlug}/sections-video`}
              enableCrop={false}
              value={videoUrl || []}
              onChange={(urls) => setVideoUrl(urls[0] || null)}
            />
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Itens da Seção ({items.length})</Label>
              <Button type="button" variant="outline" onClick={() => setItems((prev) => [...prev, { title: "", description: "" }])} className="h-11 min-h-11 px-3 text-xs gap-1">
                <Plus className="size-3.5" />
                <span>Novo Item</span>
              </Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <Input placeholder="Título" value={it.title} onChange={(e) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))} className="h-11 sm:col-span-5" />
                <Input placeholder="Descrição" value={it.description || ""} onChange={(e) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} className="h-11 sm:col-span-6" />
                <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} aria-label="Remover item" className="size-11 min-h-11 min-w-11 rounded-lg border border-border text-destructive hover:bg-destructive/10 flex items-center justify-center sm:col-span-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-xs font-semibold">Exibir seção publicamente</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 min-h-11">Cancelar</Button>
          <Button type="button" variant="default" onClick={handleSubmit} disabled={saving} className="h-11 min-h-11 gap-2">
            {saving && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
            <span>Salvar Seção</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
