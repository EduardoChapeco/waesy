import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/ui/media-uploader";
import { BidirectionalMediaUploader } from "@/components/ui/bidirectional-media-uploader";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";

export interface AdminLandingHeroFormProps {
  draft: VerticalLandingPageDTO;
  onChange: (patch: Partial<VerticalLandingPageDTO>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function AdminLandingHeroForm({
  draft,
  onChange,
  onSave,
  isSaving,
}: AdminLandingHeroFormProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground">Hero, Identidade & Mídia</h2>
          <p className="text-xs text-muted-foreground">
            Edite textos, imagens Desktop/Mobile, vídeo de demonstração e imagem do Login Split.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <Switch
              checked={draft.is_published}
              onCheckedChange={(v) => onChange({ is_published: v })}
            />
            <span>Publicada</span>
          </label>
          <Button
            type="button"
            variant="default"
            onClick={onSave}
            disabled={isSaving}
            className="h-11 min-h-11 px-5 text-xs font-semibold gap-2"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Save className="size-4" />
            )}
            <span>Salvar Hero</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lp-display-name" className="text-xs font-semibold">Nome do Sistema</Label>
          <Input
            id="lp-display-name"
            value={draft.display_name}
            onChange={(e) => onChange({ display_name: e.target.value })}
            className="h-11 min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lp-badge" className="text-xs font-semibold">Selo / Badge Superior</Label>
          <Input
            id="lp-badge"
            value={draft.badge_label || ""}
            onChange={(e) => onChange({ badge_label: e.target.value })}
            placeholder="Vertical Especializada"
            className="h-11 min-h-11"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lp-hero-title" className="text-xs font-semibold">Título Hero (Impacto)</Label>
          <Input
            id="lp-hero-title"
            value={draft.hero_title}
            onChange={(e) => onChange({ hero_title: e.target.value })}
            className="h-11 min-h-11"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="lp-hero-sub" className="text-xs font-semibold">Subtítulo Hero</Label>
          <Textarea
            id="lp-hero-sub"
            rows={3}
            value={draft.hero_subtitle}
            onChange={(e) => onChange({ hero_subtitle: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lp-cta-primary" className="text-xs font-semibold">CTA Primário</Label>
          <Input
            id="lp-cta-primary"
            value={draft.hero_cta_label}
            onChange={(e) => onChange({ hero_cta_label: e.target.value })}
            className="h-11 min-h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lp-cta-secondary" className="text-xs font-semibold">CTA Secundário</Label>
          <Input
            id="lp-cta-secondary"
            value={draft.hero_cta_secondary_label}
            onChange={(e) => onChange({ hero_cta_secondary_label: e.target.value })}
            className="h-11 min-h-11"
          />
        </div>
      </div>

      <BidirectionalMediaUploader
        label="Banner Hero Principal (Desktop + Mobile)"
        description="Envie a imagem principal do topo desta landing page nos formatos calibrados."
        bucket="cms-media"
        folder={`landings/${draft.slug}/hero`}
        desktopUrl={draft.hero_image_desktop_url}
        mobileUrl={draft.hero_image_mobile_url}
        desktopAspect={16 / 10}
        mobileAspect={4 / 3}
        onDesktopChange={(url) => onChange({ hero_image_desktop_url: url || null })}
        onMobileChange={(url) => onChange({ hero_image_mobile_url: url || null })}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Logo do Sistema</Label>
          <MediaUploader
            accept="image"
            maxFiles={1}
            bucket="cms-media"
            folder={`landings/${draft.slug}/logo`}
            aspect={1}
            enableCrop={false}
            value={draft.logo_url || []}
            onChange={(urls) => onChange({ logo_url: urls[0] || null })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Imagem Login Split (Direita Desktop)</Label>
          <MediaUploader
            accept="image"
            maxFiles={1}
            bucket="cms-media"
            folder={`landings/${draft.slug}/login`}
            aspect={4 / 5}
            value={draft.login_split_image_url || []}
            onChange={(urls) => onChange({ login_split_image_url: urls[0] || null })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Vídeo Hero (Opcional MP4/WebM)</Label>
          <MediaUploader
            accept="video"
            maxFiles={1}
            bucket="cms-media"
            folder={`landings/${draft.slug}/video`}
            enableCrop={false}
            value={draft.hero_video_url || []}
            onChange={(urls) => onChange({ hero_video_url: urls[0] || null })}
          />
        </div>
      </div>
    </div>
  );
}
