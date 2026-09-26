import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, Users, Heart, MessageCircle, Eye, ArrowUpRight, Sliders, ArrowLeft, Calendar, Image as ImageIcon, Film, Layers, FileText, Plus, Share2, ShieldCheck, ChevronRight, Activity, ShoppingBag, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
 getMemberAnalyticsInsights,
 type MemberAnalyticsDTO,
} from "@/services/social.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/conta/metricas")({
 head: () => ({ meta: [{ title: "Métricas | Waesy" }] }),
 loader: async (): Promise<{ analytics: MemberAnalyticsDTO | null }> => {
 try {
 const analytics = await getMemberAnalyticsInsights({ data: {} });
 return { analytics };
 } catch {
 return { analytics: null };
 }
 },
 component: MemberMetricsPage,
});

function MemberMetricsPage() {
 const { analytics } = ((Route.useLoaderData?.() as any) || {});
 const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d">("30d");

 if (!analytics) {
 return (
 <div className="w-full max-w-4xl mx-auto py-16 text-center space-y-4">
 <Activity className="size-10 text-muted-foreground mx-auto" />
 <h2 className="text-xl font-bold">Nenhum dado disponível</h2>
 <p className="text-xs text-muted-foreground">
 Faça login para visualizar as estatísticas reais do seu perfil.
 </p>
 </div>
 );
 }

 const { profile, overview, formatDistribution, topPosts, recentFollowers } = analytics;

 const totalContentCount =
 formatDistribution.text +
 formatDistribution.photo +
 formatDistribution.video +
 formatDistribution.gallery +
 formatDistribution.zine;

 return (
 <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
 {/* ── Top Header com Identidade e Voltar ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
 <div className="flex items-center gap-3">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="size-11 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
          aria-label="Voltar para Perfil"
        >
          <Link to="/membro/$id" params={{ id: profile.username || profile.id }}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>

 <Avatar className="size-9 rounded-xl border border-border/60">
 <AvatarImage src={profile.avatar_url || ""} />
 <AvatarFallback className="rounded-xl font-bold bg-primary/10 text-primary text-xs">
 {profile.full_name?.slice(0, 2).toUpperCase() || "ME"}
 </AvatarFallback>
 </Avatar>

 <div className="flex items-center gap-2">
 <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
 Métricas
 </h1>
 <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-mono">
 OFICIAL
 </Badge>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 asChild
 size="sm"
 variant="outline"
 className="rounded-xl font-semibold text-xs h-9 gap-1.5"
 >
 <Link to="/membro/$id" params={{ id: profile.username || profile.id }}>
 <Eye className="size-3.5" />
 <span>Ver Meu Perfil Público</span>
 </Link>
 </Button>

 <Button
 asChild
 size="sm"
 className="rounded-xl font-bold text-xs h-9 bg-primary text-primary-foreground gap-1.5"
 >
 <Link to="/mural">
 <Plus className="size-3.5" />
 <span>Criar Publicação</span>
 </Link>
 </Button>
 </div>
 </div>

 {/* ── 1. Visão Geral dos Principais KPIs (Estilo Instagram Professional Dashboard) ── */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 {/* Contas Alcançadas */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold">Alcance Total</span>
 <div className="size-7 rounded-xl bg-info/10 text-info flex items-center justify-center">
 <Eye className="size-3.5" />
 </div>
 </div>
 <p className="text-2xl font-black text-foreground tracking-tight">
 {overview.estimatedReach.toLocaleString("pt-BR")}
 </p>
 <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
 <TrendingUp className="size-3" />
 <span>Impressões e visitas ativas</span>
 </div>
 </div>

 {/* Taxa de Engajamento */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold">Taxa de Engajamento</span>
 <div className="size-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <TrendingUp className="size-3.5" />
 </div>
 </div>
 <p className="text-2xl font-black text-foreground tracking-tight">
 {overview.engagementRate}%
 </p>
 <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
 <span>{overview.totalLikes + overview.totalComments} interações totais</span>
 </div>
 </div>

 {/* Reações e Curtidas Reais */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold">Curtidas Reais</span>
 <div className="size-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
 <Heart className="size-3.5 fill-rose-500/20" />
 </div>
 </div>
 <p className="text-2xl font-black text-foreground tracking-tight">
 {overview.totalLikes.toLocaleString("pt-BR")}
 </p>
 <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
 <span>+{overview.totalComments} comentários no total</span>
 </div>
 </div>

 {/* Comunidade / Seguidores */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1.5">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold">Seguidores</span>
 <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <Users className="size-3.5" />
 </div>
 </div>
 <p className="text-2xl font-black text-foreground tracking-tight">
 {overview.followersCount.toLocaleString("pt-BR")}
 </p>
 <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
 <span>+{overview.followersGained30d} novos nos últimos 30d</span>
 </div>
 </div>
 </div>

 {/* ── 2. Crescimento e Comunidade ── */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Card de Crescimento de Seguidores */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Users className="size-4 text-primary" />
 <span>Crescimento da Audiência</span>
 </h3>
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl text-[10px] font-bold">
 <button
 onClick={() => setSelectedPeriod("7d")}
 className={cn(
 "px-2 py-1 rounded-lg transition-all cursor-pointer",
 selectedPeriod === "7d" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
 )}
 >
 7 Dias
 </button>
 <button
 onClick={() => setSelectedPeriod("30d")}
 className={cn(
 "px-2 py-1 rounded-lg transition-all cursor-pointer",
 selectedPeriod === "30d" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
 )}
 >
 30 Dias
 </button>
 </div>
 </div>

 <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-center space-y-1">
 <p className="text-3xl font-black text-foreground tracking-tight">
 +{selectedPeriod === "7d" ? overview.followersGained7d : overview.followersGained30d}
 </p>
 <p className="text-xs text-muted-foreground">
 Novos seguidores reais conquistados no período
 </p>
 </div>

 {/* Lista de Seguidores Recentes */}
 <div className="space-y-2">
 <span className="text-xs font-bold text-muted-foreground">Seguidores Recentes</span>
 {recentFollowers.length === 0 ? (
 <p className="text-xs text-muted-foreground italic py-2">
 Nenhum novo seguidor recente registrado.
 </p>
 ) : (
 <div className="space-y-2">
 {recentFollowers.map((f: any) => (
 <Link
 key={f.id}
 to="/membro/$id"
 params={{ id: f.username || f.id }}
 className="flex items-center justify-between p-2 rounded-2xl bg-muted/20 hover:bg-muted/50 transition-colors"
 >
 <div className="flex items-center gap-2.5">
 <Avatar className="size-8 rounded-xl">
 <AvatarImage src={f.avatar_url || ""} />
 <AvatarFallback className="rounded-xl text-[10px] font-bold">
 {f.full_name.slice(0, 2).toUpperCase()}
 </AvatarFallback>
 </Avatar>
 <div className="text-xs">
 <p className="font-bold text-foreground truncate max-w-[140px]">
 {f.full_name}
 </p>
 <p className="text-muted-foreground text-[10px]">
 @{f.username || "membro"}
 </p>
 </div>
 </div>
 <ChevronRight className="size-3.5 text-muted-foreground" />
 </Link>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Card de Distribuição de Formatos de Conteúdo */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Layers className="size-4 text-primary" />
 <span>Formatos de Conteúdo</span>
 </h3>
 <span className="text-xs font-mono text-muted-foreground font-bold">
 {totalContentCount} publicações
 </span>
 </div>

 <div className="space-y-3 pt-1">
 {/* Fotos */}
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="flex items-center gap-1.5 text-muted-foreground">
 <ImageIcon className="size-3.5 text-info" /> Fotos Individuais
 </span>
 <span className="font-bold">{formatDistribution.photo}</span>
 </div>
 <div className="h-2 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full bg-info rounded-full transition-all"
 style={{
 width: `${totalContentCount > 0 ? (formatDistribution.photo / totalContentCount) * 100 : 0}%`,
 }}
 />
 </div>
 </div>

 {/* Galerias / Carrosséis */}
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="flex items-center gap-1.5 text-muted-foreground">
 <Layers className="size-3.5 text-primary" /> Carrosséis & Galerias
 </span>
 <span className="font-bold">{formatDistribution.gallery}</span>
 </div>
 <div className="h-2 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full bg-primary rounded-full transition-all"
 style={{
 width: `${totalContentCount > 0 ? (formatDistribution.gallery / totalContentCount) * 100 : 0}%`,
 }}
 />
 </div>
 </div>

 {/* Vídeos */}
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="flex items-center gap-1.5 text-muted-foreground">
 <Film className="size-3.5 text-rose-500" /> Vídeos & Moments
 </span>
 <span className="font-bold">{formatDistribution.video}</span>
 </div>
 <div className="h-2 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full bg-rose-500 rounded-full transition-all"
 style={{
 width: `${totalContentCount > 0 ? (formatDistribution.video / totalContentCount) * 100 : 0}%`,
 }}
 />
 </div>
 </div>

 {/* Zines Editoriais */}
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="flex items-center gap-1.5 text-muted-foreground">
 <Sliders className="size-3.5 text-amber-500" /> Zines & Notícias
 </span>
 <span className="font-bold">{formatDistribution.zine}</span>
 </div>
 <div className="h-2 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full bg-amber-500 rounded-full transition-all"
 style={{
 width: `${totalContentCount > 0 ? (formatDistribution.zine / totalContentCount) * 100 : 0}%`,
 }}
 />
 </div>
 </div>

 {/* Texto Puro */}
 <div className="space-y-1">
 <div className="flex items-center justify-between text-xs">
 <span className="flex items-center gap-1.5 text-muted-foreground">
 <FileText className="size-3.5 text-slate-500" /> Textos & Debates
 </span>
 <span className="font-bold">{formatDistribution.text}</span>
 </div>
 <div className="h-2 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full bg-slate-500 rounded-full transition-all"
 style={{
 width: `${totalContentCount > 0 ? (formatDistribution.text / totalContentCount) * 100 : 0}%`,
 }}
 />
 </div>
 </div>
 </div>
 </div>

 {/* Card de Dicas de Otimização & Crescimento */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs flex flex-col justify-between">
 <div className="space-y-3">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Sliders className="size-4 text-primary" />
 <span>Dicas de Engajamento</span>
 </h3>
 <div className="space-y-2.5 text-xs text-muted-foreground">
 <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
 <p className="font-bold text-foreground">💡 Poste com Mídias e Galerias</p>
 <p className="text-[11px]">
 Publicações com carrosséis e fotos de alta qualidade têm 4x mais retenção.
 </p>
 </div>
 <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-1">
 <p className="font-bold text-foreground">📍 Marque Sua Localização</p>
 <p className="text-[11px]">
 Posts geolocalizados aparecem automaticamente no Mapa Social da Cidade.
 </p>
 </div>
 </div>
 </div>

 <Button asChild className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground">
 <Link to="/mural">
 <Plus className="size-4 mr-1.5" /> Publicar Agora
 </Link>
 </Button>
 </div>
 </div>

 {/* ── 3. Principais Conteúdos por Engajamento (Top Posts) ── */}
 <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-foreground flex items-center gap-2">
 <TrendingUp className="size-4 text-primary" />
 <span>Seus Posts com Maior Engajamento</span>
 </h3>
 <p className="text-xs text-muted-foreground">
 Ranqueados automaticamente pelo volume real de curtidas e comentários no banco.
 </p>
 </div>
 </div>

 {topPosts.length === 0 ? (
 <div className="py-10 text-center space-y-3 bg-muted/10 rounded-2xl border border-border/40">
 <p className="text-xs text-muted-foreground">Você ainda não possui publicações ativas no mural.</p>
 <Button asChild size="sm" className="rounded-xl font-bold text-xs">
 <Link to="/mural">Criar Primeira Publicação</Link>
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {topPosts.map((post: any, idx: number) => (
 <div
 key={post.id}
 className="group relative p-3.5 rounded-2xl bg-muted/20 border border-border/50 hover:border-primary/40 transition-all flex flex-col justify-between gap-3"
 >
 <div className="flex gap-3">
 {post.media_url ? (
 <img
 src={post.media_url}
 alt="Miniatura do post"
 className="size-16 rounded-xl object-cover shrink-0 border border-border/40"
 />
 ) : (
 <div className="size-16 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">
 <FileText className="size-6 text-primary/40" />
 </div>
 )}

 <div className="space-y-1 flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
 <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5">
 #{idx + 1} TOP
 </Badge>
 <span className="text-[10px] text-muted-foreground font-mono">
 {new Date(post.created_at).toLocaleDateString("pt-BR")}
 </span>
 </div>
 <p className="text-xs text-foreground line-clamp-2 font-medium">
 {post.content_text}
 </p>
 </div>
 </div>

 <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
 <div className="flex items-center gap-3">
 <span className="flex items-center gap-1 text-rose-500 font-bold text-xs">
 <Heart className="size-3.5 fill-rose-500/20" /> {post.likes_count}
 </span>
 <span className="flex items-center gap-1 text-info font-bold text-xs">
 <MessageCircle className="size-3.5" /> {post.comments_count}
 </span>
 </div>

 <Link
 to="/mural"
 className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
 >
 <span>Ver no Mural</span>
 <ArrowUpRight className="size-3" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
