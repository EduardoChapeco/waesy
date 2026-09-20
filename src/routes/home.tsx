import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getLaunchLandingSettings } from "@/services/launch.functions";
import { LaunchHomeView } from "@/components/landing/launch-home-view";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Circuito Internacional Waesy 2027 | Seja um Membro Fundador" },
      {
        name: "description",
        content:
          "Garanta sua vaga como Membro Fundador no Circuito Internacional Waesy Chapecó e São Miguel do Oeste. Shows nacionais e internacionais, feira de tecnologia, workshops e sorteio de viagens durante todo o ano de 2027.",
      },
    ],
  }),
  loader: async () => {
    try {
      const settings = await getLaunchLandingSettings();
      return { settings };
    } catch {
      return { settings: null };
    }
  },
  component: HomePage,
});

export default function HomePage() {
  const { settings } = Route.useLoaderData() as any;
  return <LaunchHomeView initialSettings={settings} />;
}
