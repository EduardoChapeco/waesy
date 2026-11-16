import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Globe, Layers } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/state/states";
import {
  adminDeleteLandingSectionFn,
  adminListVerticalLandingsFn,
  adminReorderLandingSectionsFn,
  adminSaveVerticalLandingFn,
  adminUpsertLandingSectionFn,
  getPublicVerticalLandingFn,
} from "@/services/vertical-landings.functions";
import { resolveSubsystemLandingPath } from "@/lib/vertical-subsystems";
import type { VerticalLandingPageDTO } from "@/lib/vertical-landing-types";
import { AdminLandingHeroForm } from "@/components/admin/landing-cms/admin-landing-hero-form";
import { AdminLandingSectionsEditor } from "@/components/admin/landing-cms/admin-landing-sections-editor";
import { AdminLandingModulesPlansEditor } from "@/components/admin/landing-cms/admin-landing-modules-plans-editor";

const SearchSchema = z.object({ slug: z.string().optional() });

export const Route = createFileRoute("/admin-master/landings")({
  validateSearch: (search: Record<string, unknown>) => SearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Landing Pages Verticais | Admin Master" }] }),
  loader: async () => {
    try {
      const landings = await adminListVerticalLandingsFn();
      return { landings: landings || [], loadError: null as string | null };
    } catch (err: unknown) {
      return {
        landings: [],
        loadError: err instanceof Error ? err.message : "Erro ao carregar editor de landings.",
      };
    }
  },
  component: AdminMasterLandingsPage,
});

function AdminMasterLandingsPage() {
  const { landings: initialLandings, loadError } = Route.useLoaderData() as {
    landings: VerticalLandingPageDTO[];
    loadError: string | null;
  };
  const search = Route.useSearch();
  const router = useRouter();
  const [landings, setLandings] = useState<VerticalLandingPageDTO[]>(initialLandings);
  const initialSlug =
    search.slug && initialLandings.some((l) => l.slug === search.slug)
      ? search.slug
      : initialLandings[0]?.slug || "waesy";
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [isSaving, setIsSaving] = useState(false);

  if (loadError || landings.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState
          title="Editor de Landings Indisponível"
          description={loadError || "Nenhuma landing encontrada."}
          onRetry={() => router.invalidate()}
        />
      </div>
    );
  }

  const activeDraft = landings.find((l) => l.slug === selectedSlug) || landings[0];

  const patchActiveDraft = (patch: Partial<VerticalLandingPageDTO>) => {
    setLandings((prev) => prev.map((item) => (item.slug === activeDraft.slug ? { ...item, ...patch } : item)));
  };

  const refreshActiveSlug = async (slug: string) => {
    const fresh = await getPublicVerticalLandingFn({
      data: { slug, includeInactiveSections: true },
    });
    setLandings((prev) => prev.map((item) => (item.slug === slug ? fresh : item)));
  };

  const handleSaveLanding = async () => {
    setIsSaving(true);
    try {
      const saved = await adminSaveVerticalLandingFn({ data: activeDraft });
      setLandings((prev) => prev.map((item) => (item.slug === saved.slug ? saved : item)));
      toast.success(`Landing "${saved.display_name}" salva.`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar landing.");
    } finally {
      setIsSaving(false);
    }
  };

  const previewHref = resolveSubsystemLandingPath({ id: activeDraft.slug });

  return (
    <div className="space-y-6 pb-20">
      <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Landing Pages e Mídia CMS</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Edite seções, faça upload de fotos/vídeos e controle os pacotes de cada sistema nichado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={activeDraft.slug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-64 h-11 min-h-11 text-xs">
              <Globe className="size-4 mr-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {landings.map((lp) => (
                <SelectItem key={lp.slug} value={lp.slug} className="text-xs">
                  {lp.display_name} ({lp.slug})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold gap-2">
            <a href={previewHref} target="_blank" rel="noopener noreferrer">
              <span>Abrir Página</span>
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="inline-flex h-11 min-h-11 bg-muted/60 p-1 rounded-xl border border-border/60">
          <TabsTrigger value="hero" className="h-9 px-4 text-xs font-semibold rounded-lg gap-2">
            <Layers className="size-3.5" />
            <span>Hero &amp; Mídia</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="h-9 px-4 text-xs font-semibold rounded-lg">
            Seções ({activeDraft.sections.length})
          </TabsTrigger>
          <TabsTrigger value="modules" className="h-9 px-4 text-xs font-semibold rounded-lg">
            Módulos &amp; Planos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-0">
          <AdminLandingHeroForm
            draft={activeDraft}
            onChange={patchActiveDraft}
            onSave={handleSaveLanding}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="sections" className="mt-0">
          <AdminLandingSectionsEditor
            landingSlug={activeDraft.slug}
            sections={activeDraft.sections}
            onSaveSection={async (sec) => {
              await adminUpsertLandingSectionFn({ data: { ...sec, landing_slug: activeDraft.slug } });
              await refreshActiveSlug(activeDraft.slug);
              toast.success("Seção salva.");
            }}
            onDeleteSection={async (id) => {
              await adminDeleteLandingSectionFn({ data: { id } });
              await refreshActiveSlug(activeDraft.slug);
              toast.success("Seção removida.");
            }}
            onReorderSections={async (orderedIds) => {
              await adminReorderLandingSectionsFn({ data: { orderedIds } });
              await refreshActiveSlug(activeDraft.slug);
            }}
          />
        </TabsContent>

        <TabsContent value="modules" className="mt-0">
          <AdminLandingModulesPlansEditor
            draft={activeDraft}
            onChange={patchActiveDraft}
            onSave={handleSaveLanding}
            isSaving={isSaving}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
