import * as React from "react";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tag,
  ShoppingBag,
  Newspaper,
  Play,
  Calendar,
  MapPin,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { RichPostContent } from "@/components/community/rich-post-content";

export interface CommunityPostTemplateProps {
  post: {
    id: string;
    post_type: string;
    content_text: string | null;
    media_urls: string[];
    post_attributes: Record<string, any>;
  };
  onActionClick?: (action: string) => void;
}

/**
 * Renderizador de Post de Venda & Desapego (Classificados P2P)
 */
export function SalePostTemplate({ post, onActionClick }: CommunityPostTemplateProps) {
  const attrs = post.post_attributes || {};
  const priceCents = typeof attrs.price_cents === "number" ? attrs.price_cents : null;
  const condition = attrs.condition || "used";
  const itemTitle = attrs.title || "";
  const contactWhatsApp = attrs.contact_whatsapp || "";

  const conditionLabels: Record<string, string> = {
    new: "Novo na Caixa",
    used: "Usado",
    refurbished: "Seminovo / Revisado",
  };

  const handleWhatsApp = () => {
    if (!contactWhatsApp) return;
    const cleanPhone = contactWhatsApp.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Vi seu anúncio "${itemTitle || "no Waesy"}" e tenho interesse.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Banner de Preço e Condição */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
        <div className="space-y-1">
          {itemTitle && (
            <h4 className="text-sm font-bold text-foreground leading-tight">
              {itemTitle}
            </h4>
          )}
          <div className="flex items-center gap-2">
            {priceCents !== null && (
              <span className="text-base sm:text-lg font-extrabold text-primary">
                {formatMoney(priceCents)}
              </span>
            )}
            <Badge variant="outline" className="text-2xs font-semibold rounded-md border-border/80">
              <Tag className="size-3 mr-1 text-primary" />
              <span>{conditionLabels[condition] || "Item à Venda"}</span>
            </Badge>
          </div>
        </div>

        {contactWhatsApp && (
          <Button
            type="button"
            onClick={handleWhatsApp}
            className="h-11 min-h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-primary-foreground font-bold text-xs shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <MessageCircle className="size-4 mr-2" />
            <span>Negociar</span>
          </Button>
        )}
      </div>

      {/* Descrição textual */}
      {post.content_text && (
        <div className="text-xs sm:text-sm text-foreground whitespace-pre-line break-words leading-relaxed">
          <RichPostContent content={post.content_text} isExpanded />
        </div>
      )}
    </div>
  );
}

/**
 * Renderizador de Post de Notícia Comunitária / Editorial
 */
export function NewsPostTemplate({ post }: CommunityPostTemplateProps) {
  const attrs = post.post_attributes || {};
  const headline = attrs.title || "";
  const source = attrs.source || "Redação Local";
  const category = attrs.category || "Geral";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-2xs font-bold uppercase rounded-md tracking-wider">
          <Newspaper className="size-3 mr-1 text-primary" />
          <span>{category}</span>
        </Badge>
        <span className="text-xs text-muted-foreground font-medium">Fonte: {source}</span>
      </div>

      {headline && (
        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
          {headline}
        </h3>
      )}

      {post.content_text && (
        <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line break-words leading-relaxed border-l-2 border-primary/40 pl-3">
          <RichPostContent content={post.content_text} isExpanded />
        </div>
      )}
    </div>
  );
}

/**
 * Renderizador de Post de Vídeo / Mídia Visual
 */
export function VideoPostTemplate({ post }: CommunityPostTemplateProps) {
  const mediaUrl = post.media_urls?.[0];
  const isDirectVideo = mediaUrl && (mediaUrl.endsWith(".mp4") || mediaUrl.includes("video"));

  return (
    <div className="space-y-3">
      {post.content_text && (
        <div className="text-xs sm:text-sm text-foreground whitespace-pre-line break-words leading-relaxed">
          <RichPostContent content={post.content_text} isExpanded />
        </div>
      )}

      {mediaUrl && (
        <div className="relative w-full rounded-2xl overflow-hidden bg-background aspect-video flex items-center justify-center">
          {isDirectVideo ? (
            <video
              src={mediaUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Mídia da publicação"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Renderizador de Post de Evento / Encontro Presencial
 */
export function EventPostTemplate({ post }: CommunityPostTemplateProps) {
  const attrs = post.post_attributes || {};
  const title = attrs.title || "Encontro da Comunidade";
  const dateStr = attrs.event_date || "Data a confirmar";
  const location = attrs.location || "Local a definir";
  const isFree = attrs.is_free !== false;

  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-primary font-bold">
            <Calendar className="size-4" />
            <span>{dateStr}</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-foreground">
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <Badge variant={isFree ? "secondary" : "default"} className="text-xs font-bold rounded-lg shrink-0">
          {isFree ? "Gratuito" : "Com Ingresso"}
        </Badge>
      </div>

      {post.content_text && (
        <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line break-words leading-relaxed">
          {post.content_text}
        </p>
      )}
    </div>
  );
}

/**
 * Renderizador de Post de Vaga de Emprego / Oportunidade
 */
export function JobPostTemplate({ post }: CommunityPostTemplateProps) {
  const attrs = post.post_attributes || {};
  const roleTitle = attrs.title || attrs.role || "Vaga de Trabalho";
  const company = attrs.company || "Empresa Local";
  const workModel = attrs.work_model || "Presencial";
  const salaryRange = attrs.salary_range || "";

  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <Briefcase className="size-3.5 text-primary" />
            <span>{company}</span>
            <span>•</span>
            <span>{workModel}</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-foreground">
            {roleTitle}
          </h4>
          {salaryRange && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Faixa: {salaryRange}
            </p>
          )}
        </div>
      </div>

      {post.content_text && (
        <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line break-words leading-relaxed">
          {post.content_text}
        </p>
      )}
    </div>
  );
}
