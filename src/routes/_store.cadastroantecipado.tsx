import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getLaunchLandingSettings } from "@/services/launch.functions";
import { EnterpriseLandingView } from "@/components/landing/enterprise-landing-view";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * /cadastroantecipado — Landing Page de Captacao de Membros Fundadores
 *
 * Rota isolada para a LP institucional dark-mode (Circuito 2027).
 * Removida da Home (/) para dar lugar a Vitrine canonica do Waesy.
 */
export const Route = createFileRoute("/_store/cadastroantecipado")({
  head: () => ({
    meta: [
      {
        title: "Circuito Internacional Waesy 2027 | Seja um Membro Fundador",
      },
      {
        name: "description",
        content:
          "Garanta sua vaga como Membro Fundador no Circuito Internacional Waesy Chapeco e Sao Miguel do Oeste. Shows nacionais e internacionais, feira de tecnologia, workshops e sorteio de viagens durante todo o ano de 2027.",
      },
      {
        name: "robots",
        content: "index, follow",
      },
    ],
  }),
  loader: async () => {
    try {
      const settings = await getLaunchLandingSettings();
      return { settings: settings || null };
    } catch (err: any) {
      console.error("[loader:_store.cadastroantecipado] Erro ao carregar configurações:", err);
      return { settings: null };
    }
  },
  errorComponent: CadastroAntecipadoErrorComponent,
  component: CadastroAntecipadoPage,
});

function CadastroAntecipadoErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <AlertCircle className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Instabilidade ao carregar página de lançamento</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
        {error?.message || "Não foi possível carregar as configurações do Circuito Waesy 2027 no momento."}
      </p>
      <Button
        type="button"
        onClick={reset}
        className="rounded-lg font-bold text-xs h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary"
      >
        Tentar Novamente
      </Button>
    </div>
  );
}

function CadastroAntecipadoPage() {
  const { settings } = Route.useLoaderData() as any;
  return <EnterpriseLandingView initialSettings={settings} />;
}
