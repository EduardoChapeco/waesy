/**
 * _store.f.$slug.tsx — Rota Pública de Landing Page Mágica de Conversão e Captura de Leads
 * Otimizada 100% para Tráfego Pago (Meta Ads, Google Ads) | Zero Fricção | Padrão Apple HIG
 */

import { createFileRoute } from "@tanstack/react-router";
import { getPublicLeadFormBySlug, LeadFormDTO } from "@/services/lead-forms.functions";
import { LeadFormRenderer } from "@/components/leads/lead-form-renderer";
import { ShieldCheck, Sparkles, Building2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_store/f/$slug")({
  head: ({ loaderData }: { loaderData?: { form: LeadFormDTO | null } }) => ({
    meta: [
      {
        title: loaderData?.form
          ? `${loaderData.form.headline || loaderData.form.title} — ${loaderData.form.store?.name || "Waesy"}`
          : "Formulário de Atendimento — Waesy",
      },
      {
        name: "description",
        content:
          loaderData?.form?.subheadline ||
          loaderData?.form?.description ||
          "Preencha seus dados para receber atendimento rápido e personalizado da nossa equipe.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const form = await getPublicLeadFormBySlug({ data: { slug: params.slug } });
      return { form };
    } catch (err) {
      console.error("[Route /_store/f/$slug] Erro no loader:", err);
      return { form: null };
    }
  },
  component: LeadLandingPage,
});

function LeadLandingPage() {
  const { form } = Route.useLoaderData();

  if (!form) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
          <Building2 className="w-8 h-8 opacity-40" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground mb-2">
          Formulário Indisponível
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
          Esta campanha não está mais ativa ou o link informado está incorreto.
        </p>
        <Button asChild variant="outline" className="rounded-xl h-11 px-6">
          <Link to="/">Voltar ao Início</Link>
        </Button>
      </div>
    );
  }

  const store = form.store;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-6 sm:py-12 px-3 sm:px-6">
      <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
        {/* Topo Limpo: Identidade da Loja / Anunciante (Sem Menus Distrativos) */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            {store?.logo_url || store?.avatar_url ? (
              <img
                src={store.logo_url || store.avatar_url!}
                alt={store.name}
                className="w-10 h-10 rounded-xl object-cover border border-border/60 bg-muted/40"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {(store?.name || "W")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground tracking-tight">
                  {store?.name || "Atendimento Oficial"}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20" />
              </div>
              <span className="text-[11px] text-muted-foreground">Canal de Atendimento Oficial</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>

        {/* Imagem de Capa Opcional */}
        {form.cover_image_url && (
          <div className="w-full aspect-[21/9] sm:aspect-[2.5/1] rounded-2xl overflow-hidden border border-border/50 bg-muted/20 relative shadow-sm">
            <img
              src={form.cover_image_url}
              alt={form.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Headline & Chamada Principal */}
        <div className="space-y-2 text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {form.headline || form.title}
          </h1>
          {(form.subheadline || form.description) && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {form.subheadline || form.description}
            </p>
          )}
        </div>

        {/* Card do Formulário */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-7 shadow-sm">
          <LeadFormRenderer
            form={form}
            fields={form.fields}
            isStandalone={true}
          />
        </div>

        {/* Badges de Confiança e Segurança */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Privacidade e Dados 100% Protegidos</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-muted-foreground">Atendimento Prioritário e Ágil</span>
          </div>
        </div>

        {/* Rodapé Silencioso */}
        <div className="text-center pt-4 pb-8 text-xs text-muted-foreground/70">
          <span>Desenvolvido na Plataforma Waesy • Ecossistema Conectado</span>
        </div>
      </div>
    </div>
  );
}
