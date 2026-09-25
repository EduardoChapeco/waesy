import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, GripVertical, Settings2, Image as ImageIcon, Video, Pencil, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { listAllSystemOnboardingSteps } from "@/services/system-onboarding.functions";

export const Route = createFileRoute("/admin-master/onboarding")({
  head: () => ({ meta: [{ title: "Gestão do Onboarding | Admin Master" }] }),
  loader: async () => {
    try {
      const steps = await listAllSystemOnboardingSteps().catch(() => []);
      return { steps: steps || [] };
    } catch (err) {
      console.error("[loader:admin-master.onboarding] Erro defensivo:", err);
      return { steps: [] };
    }
  },
  component: AdminOnboardingManager,
});

function AdminOnboardingManager() {
  const { steps } = Route.useLoaderData() as any;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0 py-6">
      <PageHeader
        eyebrow="Admin Master / UX"
        title="Motor de Onboarding (Welcome)"
        description="Gerencie os passos explicativos exibidos aos lojistas no primeiro login."
        actions={
          <Button className="rounded-xl font-bold bg-primary text-primary-foreground gap-2">
            <Plus className="size-4" />
            Adicionar Passo
          </Button>
        }
      />

      <Card className="rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl">Passos Ativos</CardTitle>
          <CardDescription>
            A ordem definida aqui reflete exatamente o que o usuário final vai ver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
              <p className="text-muted-foreground text-sm font-medium">Nenhum passo cadastrado ainda.</p>
              <Button variant="outline" className="mt-4 rounded-xl">
                Criar o primeiro passo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Esqueleto para a listagem (SortableList futuramente) */}
              {steps.map((step: any, index: number) => (
                <div key={step.id} className="flex items-center justify-between p-4 bg-card border rounded-2xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <button className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="size-5" />
                    </button>
                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center">
                      {step.media_type === "video" ? <Video className="size-4" /> : <ImageIcon className="size-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{step.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={step.is_active} />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Ativo</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                      <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
