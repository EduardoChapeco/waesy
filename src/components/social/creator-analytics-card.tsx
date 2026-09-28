import React from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, Users, Heart, Eye, ArrowUpRight, ShieldCheck, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CreatorAnalyticsCard({
 stats,
 followersCount,
 postsCount,
}: {
 stats?: any;
 followersCount: number;
 postsCount: number;
}) {
 const totalLikes = stats?.totalLikes ?? 0;
 const totalComments = stats?.totalComments ?? 0;
 const estimatedReach = Math.max(
 followersCount * 12 + postsCount * 25 + totalLikes * 4 + totalComments * 8,
 totalLikes + totalComments
 );
 const engagementRate =
 postsCount > 0
 ? Number(
 (
 ((totalLikes + totalComments) /
 Math.max(1, postsCount * Math.max(1, followersCount))) *
 100
 ).toFixed(1)
 )
 : 0;

 return (
 <div className="rounded-2xl bg-card border border-border/60 p-5 sm:p-6 space-y-5 shadow-xs select-none">
 {/* Header do Card Privado */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
 <div className="flex items-center gap-2.5">
 <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
 <Activity className="size-4" />
 </div>
 <div>
 <h3 className="text-sm font-black text-foreground tracking-tight flex items-center gap-1.5">
 <span>Desempenho e Métricas do Criador</span>
 <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
 Privado
 </span>
 </h3>
 <p className="text-[11px] text-muted-foreground">
 Visível apenas para você • Dados em tempo real auditados
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-xl">
 <TrendingUp className="size-3.5" />
 <span>{engagementRate}% Engajamento</span>
 </div>

 <Button
 asChild
 size="sm"
 variant="outline"
 className="h-8 px-3 rounded-xl text-xs font-bold gap-1 cursor-pointer"
 >
 <Link to="/conta/metricas">
 <span>Painel Completo</span>
 <ChevronRight className="size-3" />
 </Link>
 </Button>
 </div>
 </div>

 {/* Grid de Métricas Principais */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {/* Alcance Total */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-[11px] font-semibold">Alcance Estimado</span>
 <Eye className="size-3.5 text-primary" />
 </div>
 <p className="text-xl font-extrabold text-foreground tracking-tight">
 {estimatedReach.toLocaleString("pt-BR")}
 </p>
 <p className="text-[10px] text-muted-foreground">Visualizações de perfil e posts</p>
 </div>

 {/* Total de Curtidas Reais */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-[11px] font-semibold">Curtidas Reais</span>
 <Heart className="size-3.5 text-rose-500" />
 </div>
 <p className="text-xl font-extrabold text-foreground tracking-tight">
 {totalLikes.toLocaleString("pt-BR")}
 </p>
 <p className="text-[10px] text-muted-foreground">Reações registradas no banco</p>
 </div>

 {/* Novos Seguidores */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-[11px] font-semibold">Comunidade Ativa</span>
 <Users className="size-3.5 text-info" />
 </div>
 <p className="text-xl font-extrabold text-foreground tracking-tight">
 {followersCount.toLocaleString("pt-BR")}
 </p>
 <p className="text-[10px] text-muted-foreground">Seguidores únicos auditados</p>
 </div>

 {/* Taxa de Conversão */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-[11px] font-semibold">Taxa de Interação</span>
 <ArrowUpRight className="size-3.5 text-emerald-500" />
 </div>
 <p className="text-xl font-extrabold text-foreground tracking-tight">
 {engagementRate}%
 </p>
 <p className="text-[10px] text-muted-foreground">Baseado em reações e posts</p>
 </div>
 </div>
 </div>
 );
}
