import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getLaunchLandingSettings } from "@/services/launch.functions";
import { EnterpriseLandingView } from "@/components/landing/enterprise-landing-view";

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
    } catch {
      return { settings: null };
    }
  },
  component: CadastroAntecipadoPage,
});

function CadastroAntecipadoPage() {
  const { settings } = Route.useLoaderData() as any;
  return <EnterpriseLandingView initialSettings={settings} />;
}
