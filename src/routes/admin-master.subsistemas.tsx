import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Loader2, ShieldCheck, ExternalLink, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminGetEcosystemGovernanceFn,
  adminUpdateEcosystemFlagsFn,
  adminUpdateVerticalSubsystemFn,
} from "@/services/vertical-subsystems.functions";
import { GoDaddyDnsGuideCard } from "@/components/admin/godaddy-dns-guide-card";
import { ErrorState } from "@/components/state/states";
import type { RootExperienceMode, VerticalSubsystemDescriptor } from "@/lib/vertical-subsystems";

export const Route = createFileRoute("/admin-master/subsistemas")({
  head: () => ({ meta: [{ title: "Subsistemas Verticais e DNS | Admin Master" }] }),
  loader: async () => {
    try {
      const config = await adminGetEcosystemGovernanceFn();
      return { config, loadError: null as string | null };
    } catch (err: unknown) {
      return {
        config: null,
        loadError: err instanceof Error ? err.message : "Erro ao carregar subsistemas.",
      };
    }
  },
  component: AdminMasterSubsistemasPage,
});

function AdminMasterSubsistemasPage() {
  const { config, loadError } = Route.useLoaderData() as {
    config: Awaited<ReturnType<typeof adminGetEcosystemGovernanceFn>> | null;
    loadError: string | null;
  };
  const router = useRouter();
  const [subsystems, setSubsystems] = useState<VerticalSubsystemDescriptor[]>(
    config?.subsystems || [],
  );
  const [rootMode, setRootMode] = useState<RootExperienceMode>(
    config?.rootExperienceMode || "landing_vendas",
  );
  const [requireCompanyApproval, setRequireCompanyApproval] = useState(
    Boolean(config?.requireCompanyApproval),
  );
  const [requireUserApproval, setRequireUserApproval] = useState(
    Boolean(config?.requireUserApproval),
  );
  const [savingFlags, setSavingFlags] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  if (loadError || !config) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState
          title="Painel de Subsistemas Indisponível"
          description={loadError || "Não foi possível carregar os dados."}
          onRetry={() => router.invalidate()}
        />
      </div>
    );
  }

  const handleSaveGlobalFlags = async () => {
    setSavingFlags(true);
    try {
      await adminUpdateEcosystemFlagsFn({
        data: { rootExperienceMode: rootMode, requireCompanyApproval, requireUserApproval },
      });
      toast.success("Política global do ecossistema salva.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar política global.");
    } finally {
      setSavingFlags(false);
    }
  };

  const handleUpdateSubsystem = async (
    sub: VerticalSubsystemDescriptor,
    patch: Partial<Pick<VerticalSubsystemDescriptor, "isActive" | "showInHub" | "showOnLanding">>,
  ) => {
    const next = { ...sub, ...patch };
    setSavingId(sub.id);
    setSubsystems((prev) => prev.map((s) => (s.id === sub.id ? next : s)));
    try {
      await adminUpdateVerticalSubsystemFn({
        data: {
          id: next.id,
          name: next.name,
          shortName: next.shortName,
          subdomain: next.subdomain,
          canonicalDomain: next.canonicalDomain,
          targetPath: next.targetPath,
          description: next.description,
          isActive: next.isActive,
          showInHub: next.showInHub,
          showOnLanding: next.showOnLanding,
        },
      });
      toast.success(`Subsistema "${next.name}" atualizado.`);
    } catch (err: any) {
      setSubsystems((prev) => prev.map((s) => (s.id === sub.id ? sub : s)));
      toast.error(err?.message || "Erro ao atualizar subsistema.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Subsistemas Verticais e Domínios</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Controle centralizado dos apps independentes, subdomínios e regras de aprovação global.
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          onClick={handleSaveGlobalFlags}
          disabled={savingFlags}
          className="h-11 min-h-11 px-5 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {savingFlags && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />}
          <span>Salvar Políticas Globais</span>
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <span>Experiência da Raiz (waesy.com.br/)</span>
          </Label>
          <Select value={rootMode} onValueChange={(v) => setRootMode(v as RootExperienceMode)}>
            <SelectTrigger className="h-11 min-h-11 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landing_vendas" className="text-xs">
                Landing Comercial + Aba Waesy Marketplace
              </SelectItem>
              <SelectItem value="marketplace_local" className="text-xs">
                Vitrine Marketplace Direta (Legado)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define o que os visitantes enxergam ao acessar a raiz waesy.com.br.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span>Portões de Aprovação Prévia (Admin Master)</span>
          </Label>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Exigir Aprovação para Empresas</p>
              <p className="text-2xs text-muted-foreground">Oculta módulos operacionais até liberação manual.</p>
            </div>
            <Switch
              checked={requireCompanyApproval}
              onCheckedChange={setRequireCompanyApproval}
              aria-label="Exigir aprovação prévia de empresas"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Exigir Aprovação para Novos Usuários</p>
              <p className="text-2xs text-muted-foreground">Mantém contas recém-criadas como pendentes.</p>
            </div>
            <Switch
              checked={requireUserApproval}
              onCheckedChange={setRequireUserApproval}
              aria-label="Exigir aprovação prévia de usuários"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span>Mapa de Apps Desmembrados ({subsystems.length})</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {subsystems.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{sub.name}</h3>
                    <p className="text-xs font-mono text-primary truncate">{sub.canonicalDomain}</p>
                  </div>
                  <Badge variant={sub.isActive ? "secondary" : "outline"} className="text-2xs font-mono shrink-0">
                    {sub.targetPath}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{sub.description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={sub.isActive}
                      disabled={savingId === sub.id}
                      onCheckedChange={(v) => handleUpdateSubsystem(sub, { isActive: v })}
                    />
                    <span>Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={sub.showInHub}
                      disabled={savingId === sub.id}
                      onCheckedChange={(v) => handleUpdateSubsystem(sub, { showInHub: v })}
                    />
                    <span>Hub</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={sub.showOnLanding}
                      disabled={savingId === sub.id}
                      onCheckedChange={(v) => handleUpdateSubsystem(sub, { showOnLanding: v })}
                    />
                    <span>Landing</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/admin-master/landings?slug=${sub.id}`}
                    className="inline-flex h-11 min-h-11 sm:h-8 sm:min-h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>Editar Landing</span>
                  </a>
                  <a
                    href={sub.targetPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 min-h-11 sm:h-8 sm:min-h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <GoDaddyDnsGuideCard subsystems={subsystems} />
    </div>
  );
}
