import React from "react";
import { BentoBlockData } from "../types";
import { ShieldCheck, Zap, Globe, Layers, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface BentoAsymmetricGridProps {
  data: BentoBlockData;
  className?: string;
}

export const BentoAsymmetricGrid: React.FC<BentoAsymmetricGridProps> = ({ data, className = "" }) => {
  return (
    <section className={`w-full bg-muted/20 py-20 lg:py-28 border-b border-border/40 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Cabeçalho da Seção */}
        {(data.sectionTitle || data.sectionSubtitle) && (
          <div className="max-w-2xl mx-auto text-center mb-16">
            {data.sectionTitle && (
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-4 [text-wrap:balance]">
                {data.sectionTitle}
              </h2>
            )}
            {data.sectionSubtitle && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {data.sectionSubtitle}
              </p>
            )}
          </div>
        )}

        {/* Grade Bento 3 Colunas com Layout Assimétrico */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Célula 1: Destaque Dominante (2 Colunas, Linha 1) */}
          <div className="md:col-span-2 bg-card border border-border/80 rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:border-border transition-colors">
            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                <Zap className="size-3.5" />
                <span>Alta Performance</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-3">
                Processamento Instantâneo de Pedidos & PDV
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-lg">
                Sincronização em milissegundos entre o terminal de caixa, catálogo online e notificações de clientes no WhatsApp sem intermediários.
              </p>
            </div>

            {/* Simulação Visual Técnica de Transação (Anti-AI Clean) */}
            <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/40 font-mono">
                <span>FEED DE OPERAÇÃO EM TEMPO REAL</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-1">
                <span className="font-semibold text-foreground">Pedido #9842 — Balcão & Retirada</span>
                <span className="font-mono font-bold text-foreground">R$ 142,50</span>
              </div>
              <div className="flex items-center justify-between text-sm py-1 text-muted-foreground">
                <span className="text-xs">Pix QRCode liquidado instantaneamente</span>
                <span className="text-xs text-emerald-600 font-medium">Aprovado (0,18s)</span>
              </div>
            </div>
          </div>

          {/* Célula 2: Métrica de Impacto (1 Coluna, Linha 1) */}
          <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-xs hover:border-border transition-colors text-center md:text-left">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground block mb-2">
                VELOCIDADE MÉDIA
              </span>
              <div className="text-5xl sm:text-6xl font-black tracking-tight text-foreground font-mono my-2">
                0,2s
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                Tempo de resposta medido em borda (Cloudflare Pages Edge & Supabase Postgres).
              </p>
            </div>

            {/* Sparkline Visual */}
            <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between text-xs font-medium text-emerald-600">
              <span>99.98% SLA de Uptime</span>
              <ArrowUpRight className="size-4" />
            </div>
          </div>

          {/* Célula 3: Omnichannel Integrado (1 Coluna, Linha 2) */}
          <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-xs hover:border-border transition-colors">
            <div>
              <div className="size-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center mb-6">
                <Globe className="size-6 text-foreground" />
              </div>
              <h4 className="text-xl font-bold text-foreground tracking-tight mb-2">
                Canais Unificados
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                Um único estoque alimenta a vitrine web, o catálogo no WhatsApp e o PDV físico.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="px-3 py-1 font-medium text-xs">WhatsApp</Badge>
              <Badge variant="outline" className="px-3 py-1 font-medium text-xs">PDV Balcão</Badge>
              <Badge variant="outline" className="px-3 py-1 font-medium text-xs">Loja Digital</Badge>
            </div>
          </div>

          {/* Célula 4: Segurança & Isolamento Multi-Tenant (2 Colunas, Linha 2) */}
          <div className="md:col-span-2 bg-card border border-border/80 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs hover:border-border transition-colors">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                <ShieldCheck className="size-4" />
                <span>Isolamento Multi-Tenant RLS</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-2">
                Governança e Blindagem de Dados Bancários
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Cada loja possui partição criptográfica independente com políticas Deny-by-Default em nível de banco de dados (PostgreSQL RLS).
              </p>
            </div>

            <div className="shrink-0 bg-muted/50 border border-border/80 rounded-2xl px-6 py-4 flex items-center gap-3">
              <Layers className="size-6 text-primary" />
              <div className="text-left font-mono">
                <span className="text-[10px] uppercase text-muted-foreground block">POLÍTICA RLS</span>
                <span className="text-xs font-bold text-foreground">store_id = current_jwt()</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
