import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Calendar as CalendarIcon,
 Plus,
 Clock,
 ImageIcon,
 Tag,
 Megaphone,
 Layers,
 ChevronLeft,
 ChevronRight,
 Loader2,
 Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogTrigger,
} from "@/components/ui/dialog";
import {
 listScheduledPosts,
 schedulePost,
 reschedulePost,
 type ScheduledPost,
} from "@/services/editorial.functions";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/cms/calendario")({
 head: () => ({ meta: [{ title: "Calendário Editorial & Agendamento | Waesy" }] }),
 loader: async () => {
   try {
 return await listScheduledPosts();
   } catch (err) {
     console.error("[loader:workspace.cms.calendario] Unhandled loader error:", err);
     return null as any;
    }
 },
 component: CalendarioEditorialPage,
});

const TYPE_CONFIG: Record<
 string,
 { label: string; icon: any; colorClass: string; borderClass: string }
> = {
 story: {
 label: "Story / Moment",
 icon: ImageIcon,
 colorClass: "bg-primary/10 text-primary",
 borderClass: "border-primary/30",
 },
 flyer: {
 label: "Flyer de Evento",
 icon: Layers,
 colorClass: "bg-primary/10 text-primary",
 borderClass: "border-primary/30",
 },
 product_drop: {
 label: "Drop de Produto",
 icon: Tag,
 colorClass: "bg-emerald-500/10 text-emerald-600",
 borderClass: "border-emerald-500/30",
 },
 ad_campaign: {
 label: "Anúncio Patrocinado",
 icon: Megaphone,
 colorClass: "bg-info/10 text-info",
 borderClass: "border-info/30",
 },
};

function CalendarioEditorialPage() {
 const initialPosts = Route.useLoaderData();
 const [posts, setPosts] = useState<ScheduledPost[]>(Array.isArray(initialPosts) ? initialPosts : []);
 const [isOpen, setIsOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Form states
 const [title, setTitle] = useState("");
 const [type, setType] = useState<any>("story");
 const [dateStr, setDateStr] = useState(() => {
 const d = new Date();
 d.setDate(d.getDate() + 2);
 return d.toISOString().split("T")[0];
 });
 const [timeStr, setTimeStr] = useState("18:00");

 const handleSchedule = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !dateStr || !timeStr) {
 toast.error("Preencha todos os campos.");
 return;
 }

 setIsSubmitting(true);
 try {
 const scheduledFor = `${dateStr}T${timeStr}:00.000Z`;
 const created = await schedulePost({
 data: {
 title,
 type,
 scheduledFor,
 },
 });

 setPosts(
 [...posts, created as any].sort(
 (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
 ),
 );
 setIsOpen(false);
 setTitle("");
 toast.success("Publicação agendada com sucesso!");
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao agendar publicação.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleMoveDay = async (postId: string, deltaDays: number) => {
 const post = posts.find((p) => p.id === postId);
 if (!post) return;

 const currentD = new Date(post.scheduled_for);
 currentD.setDate(currentD.getDate() + deltaDays);
 const newScheduledFor = currentD.toISOString();

 try {
 await reschedulePost({
 data: {
 postId,
 newScheduledFor,
 },
 });

 setPosts(
 posts
 .map((p) => (p.id === postId ? { ...p, scheduled_for: newScheduledFor } : p))
 .sort(
 (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
 ),
 );
 toast.success(
 deltaDays > 0 ? "Adiantado em 1 dia no calendário." : "Retrocedido 1 dia no calendário.",
 );
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao reagendar.");
 }
 };

 return (
 <div className="space-y-6 max-w-6xl pb-16">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
 <div>
 <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
 <CalendarIcon className="size-5 text-primary" />
 Calendário Editorial & Agendamento
 </h1>
 <p className="text-xs text-muted-foreground">
 Planeje flyers, drops de produtos, stories e lançamentos culturais com antecedência.
 </p>
 </div>

 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogTrigger asChild>
 <Button className="h-11 px-5 rounded-xl font-medium text-xs gap-2 shadow-xs">
 <Plus className="size-4" />
 Agendar Publicação
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md sm:rounded-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto no-scrollbar">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold flex items-center gap-2">
 <CalendarIcon className="size-5 text-primary" />
 Agendar Conteúdo
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Configure a data, horário e tipo de mídia a ser disparada automaticamente.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSchedule} className="space-y-4 pt-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Título ou Chamada *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Teaser do Evento / Foto dos Produtos"
 className="h-11 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Tipo de Publicação</Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
 const Icon = cfg.icon;
 return (
 <button
 key={key}
 type="button"
 onClick={() => setType(key)}
 className={cn(
 "p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all",
 type === key
 ? "border-primary bg-primary/5 ring-1 ring-primary/30"
 : "border-border bg-background hover:bg-muted/40",
 )}
 >
 <Icon className="size-4 shrink-0 text-primary" />
 <span className="truncate">{cfg.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Data de Disparo *</Label>
 <Input
 type="date"
 value={dateStr}
 onChange={(e) => setDateStr(e.target.value)}
 className="h-11 text-xs rounded-xl"
 required
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-semibold">Horário *</Label>
 <Input
 type="time"
 value={timeStr}
 onChange={(e) => setTimeStr(e.target.value)}
 className="h-11 text-xs rounded-xl"
 required
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-11 rounded-xl font-medium text-xs gap-2 mt-2 shadow-xs"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 Agendando...
 </>
 ) : (
 <>
 <CalendarIcon className="size-4" />
 Confirmar Agendamento
 </>
 )}
 </Button>
 </form>
 </DialogContent>
 </Dialog>
 </div>

 {/* Grade de Posts Agendados em Ordem Cronológica */}
 {posts.length === 0 ? (
 <div className="rounded-2xl border border-border/60 bg-card p-8 sm:p-12 text-center space-y-3 shadow-xs">
 <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <CalendarIcon className="size-6" />
 </div>
 <h3 className="text-sm font-bold text-foreground">Nenhuma publicação agendada</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Use o calendário editorial para programar stories, flyers de eventos e novidades de
 catálogo.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {posts.map((post) => {
 const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.story;
 const Icon = config.icon;
 const postDate = new Date(post.scheduled_for);

 return (
 <div
 key={post.id}
 className={cn(
 "rounded-2xl border bg-card p-5 space-y-4 transition-all hover:border-primary/40 shadow-xs",
 config.borderClass,
 )}
 >
 <div className="flex items-start justify-between gap-2">
 <span
 className={cn(
 "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5",
 config.colorClass,
 )}
 >
 <Icon className="size-3.5" />
 {config.label}
 </span>
 <Badge variant="outline" className="text-[11px] rounded-md font-medium px-2 py-0.5 uppercase tracking-wide">
 {post.status === "scheduled" ? "Programado" : post.status}
 </Badge>
 </div>

 <div>
 <h3 className="text-sm font-bold text-foreground leading-snug">{post.title}</h3>
 <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
 <Clock className="size-3.5 text-primary" />
 {formatDate(post.scheduled_for)} às{" "}
 {postDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
 </p>
 </div>

 {/* Ações de Reagendamento Rápido */}
 <div className="flex items-center justify-between pt-2 text-xs">
 <span className="text-[11px] text-muted-foreground">Mover data:</span>
 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleMoveDay(post.id, -1)}
 className="size-9 p-0 rounded-lg"
 title="Voltar 1 dia"
 >
 <ChevronLeft className="size-3.5" />
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleMoveDay(post.id, 1)}
 className="size-9 p-0 rounded-lg"
 title="Avançar 1 dia"
 >
 <ChevronRight className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
