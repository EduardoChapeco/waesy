import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { createPost, type PostType } from "@/services/social.functions";
import { getProfile, getUserSession } from "@/services/auth.functions";
import { Newspaper, ImageIcon, Star, Store, Tag, CheckCircle2, Send, Loader2, Radio, Layers } from "lucide-react";

export const Route = createFileRoute("/workspace/mural/novo")({
  head: () => ({ meta: [{ title: "Nova Publicação no Mural | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [profile, session] = await Promise.all([
        getProfile().catch(() => null),
        getUserSession().catch(() => null),
      ]);
      return { profile, session };
    } catch {
      return { profile: null, session: null };
    }
  },
  component: WorkspaceNewMuralPostPage,
});

function WorkspaceNewMuralPostPage() {
  const { profile, session } = (Route.useLoaderData() as any) || {};
  const router = useRouter();

  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("simple");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSource, setNewsSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMedia = (url: string) => {
    if (url && !mediaUrls.includes(url)) {
      setMediaUrls([...mediaUrls, url]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaUrls.length === 0) {
      toast.error("Escreva algo ou adicione uma foto para publicar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const templateData: Record<string, any> = {};
      if (postType === "news") {
        templateData.news_title = newsTitle.trim();
        templateData.news_source = newsSource.trim() || session?.store?.name || "Comunicação Oficial";
      }

      await createPost({
        data: {
          content_text: content.trim(),
          media_urls: mediaUrls,
          post_type: postType as any,
          template_data: Object.keys(templateData).length > 0 ? templateData : undefined,
        } as any,
      });

      toast.success("Publicação enviada para o Mural Comunitário!");
      router.navigate({ to: "/mural" as any });
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar no Mural.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-24 font-sans text-foreground">
      {/* ── 1. Topo & Voltar ── */}
      <NativeBackButton fallbackHref="/workspace" />

      <PageHeader
        eyebrow="Comunidade & Marketing"
        title="Publicar no Mural Comunitário"
      />

      {/* ── 2. Card de Composição Clean ── */}
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6 space-y-5 shadow-xs">
        {/* Tipo de Publicação */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Formato da Publicação</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: "simple", label: "Atualização Geral", icon: Store },
              { id: "news", label: "Notícia / Comunicado", icon: Newspaper },
              { id: "grid", label: "Galeria de Fotos", icon: ImageIcon },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = postType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPostType(t.id as any)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-primary text-foreground font-bold shadow-xs"
                      : "bg-background border-border/50 text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Icon className={`size-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campos Específicos de Notícia */}
        {postType === "news" && (
          <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Manchete / Título da Notícia</Label>
              <Input
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="Ex: Novo cardápio de inverno já disponível..."
                className="h-9 text-xs rounded-xl bg-background"
                required={postType === "news"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Fonte / Autoridade</Label>
              <Input
                value={newsSource}
                onChange={(e) => setNewsSource(e.target.value)}
                placeholder="Ex: Assessoria de Imprensa, Loja Oficial..."
                className="h-9 text-xs rounded-xl bg-background"
              />
            </div>
          </div>
        )}

        {/* Conteúdo / Mensagem */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Mensagem da Publicação</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Compartilhe novidades, eventos, novos pratos ou avisos com os clientes da cidade..."
            className="rounded-xl text-xs min-h-28 resize-none bg-background"
            required
          />
        </div>

        {/* Mídias / Fotos */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Fotos e Mídia</Label>
          <ImageUpload
            value=""
            onChange={(url) => url && handleAddMedia(url)}
            bucket="social"
            aspectPreset="square"
          />

          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                  <img src={url} alt={`Mídia ${idx + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Aparece imediatamente no feed público da cidade.
          </span>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span>Publicar no Mural</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
