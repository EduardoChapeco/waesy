import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
 ShieldAlert,
 ArrowRight,
 Plane,
 Users,
 Bus,
 Calendar,
 Layers,
 Store,
 ClipboardList,
 ShoppingBag,
 ExternalLink,
 ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getNicheSemantics } from "@/lib/niche-semantics";

interface NicheOperationalGuardProps {
  targetNiche?: string;
  requiredNiches?: string[];
  toolTitle?: string;
  toolDescription?: string;
  store?: any;
  children: ReactNode;
}

export function NicheOperationalGuard({
  targetNiche,
  requiredNiches,
  toolTitle = "Módulo Especializado",
  toolDescription = "Esta ferramenta foi customizada para nichos operacionais específicos.",
  store,
  children,
}: NicheOperationalGuardProps) {
  const [dismissed, setDismissed] = useState(false);
  const semantics = getNicheSemantics(store);

  const effectiveNiches = requiredNiches && requiredNiches.length > 0
    ? requiredNiches
    : targetNiche ? [targetNiche] : [];

  // Se o nicho da loja for o mesmo do alvo ou nenhum nicho específico exigido, libera o acesso direto
  if (effectiveNiches.length === 0 || effectiveNiches.includes(semantics.nicheId) || dismissed) {
    if (dismissed && effectiveNiches.length > 0 && !effectiveNiches.includes(semantics.nicheId)) {
      return (
        <div className="space-y-4">
          <div className="p-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 shrink-0" />
              <span>
                Você está visualizando uma ferramenta projetada para o segmento{" "}
                <strong>{effectiveNiches.join(", ")}</strong>.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(false)}
              className="h-7 text-xs px-2 hover:bg-amber-500/20"
            >
              Reativar proteção
            </Button>
          </div>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

 // Gera sugestões de ferramentas adequadas para o nicho real da loja
 const getSuggestions = () => {
 if (semantics.nicheId === "tourism") {
 return [
 {
 title: "Central de Cotações & Leads",
 desc: "Gerencie solicitações de pacotes, orçamentos e roteiros de viagens",
 path: "/workspace/turismo/cotacoes",
 icon: Plane,
 },
 {
 title: "Grupos & Excursões",
 desc: "Lista de passageiros, guias, pontos de embarque e reservas",
 path: "/workspace/turismo/grupos",
 icon: Users,
 },
 {
 title: "Frota & Assentos (2D)",
 desc: "Mapa visual de assentos em ônibus, vans e transfers",
 path: "/workspace/turismo/frota",
 icon: Bus,
 },
 ];
 }

 if (semantics.nicheId === "services") {
 return [
 {
 title: "Grade de Agendamentos",
 desc: "Horários marcados, encaixes e escala de profissionais",
 path: "/workspace/agenda",
 icon: Calendar,
 },
 {
 title: "Catálogo de Serviços",
 desc: "Tabela de preços, duração e opções de atendimento",
 path: "/workspace/agenda/servicos",
 icon: Layers,
 },
 {
 title: "Frente de Caixa (PDV)",
 desc: "Fechamento rápido de serviços e comandas individuais",
 path: "/workspace/pdv",
 icon: Store,
 },
 ];
 }

 // Default: Varejo / Comércio Geral
 return [
 {
 title: "Frente de Caixa (PDV Direto)",
 desc: "Ponto de venda rápido para balcão, código de barras e emissão",
 path: "/workspace/pdv",
 icon: Store,
 },
 {
 title: "Gestor de Pedidos (Kanban)",
 desc: "Separação, conferência de produtos e expedição de compras",
 path: "/workspace/pedidos/gestor",
 icon: ClipboardList,
 },
 {
 title: "Histórico de Vendas",
 desc: "Relatório completo de pedidos recebidos pelo site ou balcão",
 path: "/workspace/pedidos",
 icon: ShoppingBag,
 },
 ];
 };

 const suggestions = getSuggestions();
 const targetLabel =
 targetNiche === "gastronomy" ? "Gastronomia & Restaurantes" : targetNiche;

 return (
 <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-in fade-in duration-200">
 <Card className="p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs space-y-6">
 <div className="space-y-2 text-left">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary uppercase">
 Orientação de Nicho • {semantics.name}
 </Badge>
 </div>
 <h2 className="text-xl font-bold tracking-tight text-foreground">
 {toolTitle}
 </h2>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {toolDescription} Sua empresa (<strong>{store?.name || "sua conta"}</strong>) está
 operando no segmento de <strong>{semantics.name}</strong>.
 </p>
 </div>

 <div className="space-y-3 pt-2">
 <span className="text-xs font-bold text-foreground block">
 Ferramentas recomendadas para o seu negócio:
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {suggestions.map((item, idx) => {
 const Icon = item.icon;
 return (
 <Link
 key={idx}
 to={item.path as any}
 className="p-4 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all flex flex-col justify-between group space-y-3"
 >
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
 <Icon className="size-4" />
 </div>
 <div>
 <h3 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
 <span>{item.title}</span>
 <ChevronRight className="size-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
 </h3>
 <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
 {item.desc}
 </p>
 </div>
 </Link>
 );
 })}
 </div>
 </div>

 <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
 <span>
 Precisa operar com {targetLabel}?
 </span>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => setDismissed(true)}
 className="text-xs font-semibold hover:text-foreground h-9 px-3 rounded-xl cursor-pointer"
 >
 Acessar esta ferramenta mesmo assim
 </Button>
 </div>
 </Card>
 </div>
 );
}
