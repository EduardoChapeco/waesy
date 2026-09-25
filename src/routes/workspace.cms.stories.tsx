import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
 Plus,
 Trash2,
 Edit3,
 Image as ImageIcon,
 Link as LinkIcon,
 Video,
 ShoppingBag,
 Eye,
 Clock,
 CheckCircle,
 XCircle,
 Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/state/states";
import { ImageUpload } from "@/components/ui/image-upload";
import { listAdminStories, upsertStory, deleteStory } from "@/services/cms.functions";
import { createStory } from "@/services/stories.functions";
import { listStoreCollabs, respondToStoryCollab, type StoryCollabDTO } from "@/services/creators.functions";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/workspace/cms/stories")({
 head: () => ({ meta: [{ title: "Stories & Collabs (CMS) | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [storiesRes, collabsRes] = await Promise.all([
 listAdminStories().catch(() => []),
 listStoreCollabs().catch(() => []),
 ]);
 return {
 stories: storiesRes || [],
 collabs: collabsRes || [],
 };
   } catch (err) {
     console.error("[loader:workspace.cms.stories] Unhandled loader error:", err);
     return { stories: null, collabs: null };
   }
 },
 component: CmsStoriesPage,
});

function CmsStoriesPage() {
 const router = useRouter();
 const { stories, collabs } = Route.useLoaderData() as {
 stories: any[];
 collabs: StoryCollabDTO[];
 };

 const [activeTab, setActiveTab] = useState("stories");
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [collabActionId, setCollabActionId] = useState<string | null>(null);

 const [formData, setFormData] = useState({
 id: undefined as string | undefined,
 media_url: "",
 link_url: "",
 link_cta: "Acessar Oferta",
 duration_seconds: 15,
 niche: "geral",
 status: "active" as "active" | "inactive" | "archived",
 sort_order: 0,
 });

 const handleOpenNew = () => {
 setFormData({
 id: undefined,
 media_url: "",
 link_url: "",
 link_cta: "Acessar Oferta",
 duration_seconds: 15,
 niche: "geral",
 status: "active",
 sort_order: stories.length,
 });
 setIsModalOpen(true);
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.media_url) {
 toast.error("A URL da mídia é obrigatória");
 return;
 }

 setIsSubmitting(true);
 try {
 if (formData.id) {
 await upsertStory({
 data: {
 id: formData.id,
 media_url: formData.media_url,
 link_url: formData.link_url || null,
 status: formData.status,
 sort_order: Number(formData.sort_order),
 },
 });
 } else {
 await createStory({
 data: {
 mediaUrl: formData.media_url,
 linkUrl: formData.link_url || undefined,
 linkCta: formData.link_cta || undefined,
 durationSeconds: Number(formData.duration_seconds),
 niche: formData.niche,
 hashtags: [],
 },
 });
 }

 toast.success("Story publicado com sucesso!");
 setIsModalOpen(false);
 router.invalidate();
 } catch (error: any) {
 toast.error(error.message || "Erro ao salvar story");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 try {
 await deleteStory({ data: { id } });
 toast.success("Story excluído com sucesso");
 router.invalidate();
 } catch (error: any) {
 toast.error(error.message || "Erro ao excluir story");
 }
 };

 const handleCollabAction = async (collabId: string, action: "approve" | "reject") => {
 setCollabActionId(collabId);
 try {
 await respondToStoryCollab({
 data: { collabId, action },
 });
 toast.success(action === "approve" ? "Co-publicação aprovada e exibida na vitrine!" : "Co-publicação rejeitada.");
 router.invalidate();
 } catch (error: any) {
 toast.error(error.message || "Erro ao processar co-publicação.");
 } finally {
 setCollabActionId(null);
 }
 };

 return (
 <div className="p-6 max-w-6xl mx-auto space-y-6">
 <PageHeader
 eyebrow="CMS"
 title="Stories"
 actions={
 <Button onClick={handleOpenNew} className="rounded-xl font-bold gap-2">
 <Plus className="size-4" />
 <span>Novo Story</span>
 </Button>
 }
 />

 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <TabsList className="bg-muted/50 p-1 rounded-xl">
 <TabsTrigger value="stories" className="rounded-lg font-bold text-xs gap-2">
 <Video className="size-4" />
 <span>Stories Ativos ({stories.length})</span>
 </TabsTrigger>
 <TabsTrigger value="collabs" className="rounded-lg font-bold text-xs gap-2">
 <Share2 className="size-4 text-purple-500" />
 <span>Co-Publicações & Influencers ({collabs.length})</span>
 </TabsTrigger>
 </TabsList>

 <TabsContent value="stories" className="space-y-4">
 {stories.length === 0 ? (
 <EmptyState
 title="Nenhum story ativo"
 description="Publique vídeos ou fotos de até 60s com links para seus produtos e alcance clientes no topo da vitrine."
 action={
 <Button onClick={handleOpenNew} className="rounded-xl font-bold gap-2">
 <Plus className="size-4" />
 <span>Publicar Primeiro Story</span>
 </Button>
 }
 />
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {stories.map((story: any) => {
 const isVid =
 story.media_url?.includes(".mp4") ||
 story.media_url?.includes(".webm") ||
 story.media_url?.includes(".mov");

 return (
 <Card key={story.id} className="overflow-hidden group border-border/70 rounded-2xl bg-card">
 <div className="relative aspect-[9/16] bg-zinc-950 flex items-center justify-center overflow-hidden">
 {isVid ? (
 <video
 src={story.media_url}
 className="size-full object-cover"
 muted
 playsInline
 />
 ) : (
 <img
 src={story.media_url}
 alt="Story"
 className="size-full object-cover"
 />
 )}

 <div className="absolute top-2.5 left-2.5">
 <Badge
 variant={story.status === "active" ? "default" : "secondary"}
 className="text-[10px] font-bold"
 >
 {story.status === "active" ? "Ativo" : "Inativo"}
 </Badge>
 </div>

 <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-white text-[10px] font-mono">
 <Clock className="size-3" />
 <span>{story.duration_seconds || 15}s</span>
 </div>
 </div>

 <CardContent className="p-3.5 space-y-2">
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span className="font-semibold text-foreground truncate max-w-[140px]">
 {story.niche || "Geral"}
 </span>
 <span>Ordem: {story.sort_order}</span>
 </div>

 {story.link_url && (
 <div className="flex items-center gap-1.5 text-xs text-primary font-medium truncate">
 <LinkIcon className="size-3 shrink-0" />
 <span className="truncate">{story.link_url}</span>
 </div>
 )}

 <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-border/50">
 <CrudActionsMenu
 entityName="Story"
 onDelete={() => handleDelete(story.id)}
 deleteConfirmTitle={`Excluir story "${story.title || "sem título"}"?`}
 deleteConfirmDescription="Esta ação removerá permanentemente o story e a mídia publicada da vitrine."
 />
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </TabsContent>

 <TabsContent value="collabs" className="space-y-4">
 {collabs.length === 0 ? (
 <Card className="rounded-2xl border-border/70">
 <CardContent className="p-8 text-center space-y-3">
 <div className="size-14 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
 <Share2 className="size-7" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground">
 Co-Publicações com Influenciadores Regionais
 </h3>
 <p className="text-xs text-muted-foreground max-w-md mx-auto">
 Quando criadores parceiros e embaixadores marcarem sua empresa nos stories autorizando o compartilhamento, eles aparecerão aqui para sua aprovação em 1 clique.
 </p>
 </div>
 </CardContent>
 </Card>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {collabs.map((collab) => (
 <Card key={collab.id} className="rounded-2xl border-border/70 overflow-hidden bg-card">
 <CardContent className="p-4 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-9 rounded-full overflow-hidden bg-muted border border-border">
 {collab.creator?.avatar_url ? (
 <img src={collab.creator.avatar_url} alt="" className="size-full object-cover" />
 ) : (
 <div className="size-full flex items-center justify-center font-bold text-xs bg-purple-100 text-purple-700">
 {collab.creator?.name.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>
 <div>
 <span className="text-xs font-bold block text-foreground leading-tight">
 {collab.creator?.name}
 </span>
 <span className="text-[11px] font-mono text-muted-foreground">
 @{collab.creator?.handle}
 </span>
 </div>
 </div>

 <Badge
 variant={collab.status === "approved" ? "default" : collab.status === "rejected" ? "destructive" : "outline"}
 className="text-[10px] font-bold"
 >
 {collab.status === "approved" ? "Aprovado" : collab.status === "rejected" ? "Rejeitado" : "Pendente"}
 </Badge>
 </div>

 {collab.story && (
 <div className="aspect-[9/16] rounded-xl overflow-hidden bg-zinc-950 max-h-[220px]">
 <img src={collab.story.media_url} alt="" className="size-full object-cover" />
 </div>
 )}

 {collab.status === "pending" && (
 <div className="flex items-center gap-2 pt-2 border-t border-border/50">
 <Button
 size="sm"
 disabled={collabActionId === collab.id}
 onClick={() => handleCollabAction(collab.id, "approve")}
 className="flex-1 rounded-xl text-xs font-bold gap-1.5"
 >
 <CheckCircle className="size-3.5" />
 <span>Aprovar Story</span>
 </Button>
 <Button
 size="sm"
 variant="outline"
 disabled={collabActionId === collab.id}
 onClick={() => handleCollabAction(collab.id, "reject")}
 className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10"
 >
 <XCircle className="size-3.5" />
 <span>Rejeitar</span>
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </TabsContent>
 </Tabs>

 {/* Modal de Criação / Edição de Story */}
 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
 <DialogContent className="sm:max-w-md rounded-2xl">
 <form onSubmit={handleSave} className="space-y-4">
 <DialogHeader>
 <DialogTitle>{formData.id ? "Editar Story" : "Publicar Novo Story"}</DialogTitle>
 <DialogDescription>
 Informe o link da foto ou vídeo (formato vertical 9:16) para exibição na vitrine.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-3.5 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Mídia do Story (Vertical 9:16)</Label>
 <ImageUpload
 value={formData.media_url}
 onChange={(url) => setFormData({ ...formData, media_url: url })}
 aspect={9 / 16}
 bucket="cms-media"
 helperText="Upload ou recorte de foto vertical 9:16"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label htmlFor="niche">Nicho da Vitrine</Label>
 <Select
 value={formData.niche}
 onValueChange={(val) => setFormData({ ...formData, niche: val })}
 >
 <SelectTrigger id="niche" className="rounded-xl">
 <SelectValue placeholder="Selecione o nicho" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="geral">Geral (Todas as Vitrines)</SelectItem>
 <SelectItem value="gastronomia">Gastronomia & Delivery</SelectItem>
 <SelectItem value="mercado">Supermercado & Feira</SelectItem>
 <SelectItem value="moda">Moda & Vestuário</SelectItem>
 <SelectItem value="turismo">Turismo & Lazer</SelectItem>
 <SelectItem value="servicos">Serviços & Beleza</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="duration">Duração (Segundos)</Label>
 <Input
 id="duration"
 type="number"
 min={5}
 max={300}
 value={formData.duration_seconds}
 onChange={(e) =>
 setFormData({ ...formData, duration_seconds: Number(e.target.value) })
 }
 className="rounded-xl font-mono"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="link_url">Link de Redirecionamento (Opcional)</Label>
 <Input
 id="link_url"
 placeholder="https://..."
 value={formData.link_url}
 onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
 className="rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="link_cta">Texto do Botão CTA</Label>
 <Input
 id="link_cta"
 placeholder="Ex: Ver Produto, Pedir no WhatsApp"
 value={formData.link_cta}
 onChange={(e) => setFormData({ ...formData, link_cta: e.target.value })}
 className="rounded-xl"
 />
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsModalOpen(false)}
 className="rounded-xl"
 >
 Cancelar
 </Button>
 <Button type="submit" disabled={isSubmitting} className="rounded-xl font-bold">
 {isSubmitting ? "Publicando..." : "Publicar Story"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
