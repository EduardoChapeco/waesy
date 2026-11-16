import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploader } from "@/components/ui/media-uploader";
import { AdminLandingPlansFaqEditor } from "./admin-landing-plans-faq-editor";
import type {
  VerticalIsolatedModuleDTO,
  VerticalLandingPageDTO,
} from "@/lib/vertical-landing-types";

export interface AdminLandingModulesPlansEditorProps {
  draft: VerticalLandingPageDTO;
  onChange: (patch: Partial<VerticalLandingPageDTO>) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function AdminLandingModulesPlansEditor({
  draft,
  onChange,
  onSave,
  isSaving,
}: AdminLandingModulesPlansEditorProps) {
  const modules = draft.isolated_modules || [];

  const updateModule = (idx: number, patch: Partial<VerticalIsolatedModuleDTO>) => {
    onChange({
      isolated_modules: modules.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    });
  };

  return (
    <div className="space-y-6">
      {/* Módulos Exclusivos da Vertical */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Módulos Isolados ({modules.length})</h2>
            <p className="text-xs text-muted-foreground">Apenas os módulos exibidos nesta landing e nicho.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onChange({
                  isolated_modules: [
                    ...modules,
                    {
                      id: `mod-${Date.now()}`,
                      title: "Novo Módulo",
                      category: "Operação",
                      description: "Descrição do módulo do nicho.",
                      highlights: ["Recurso integrado"],
                      imageUrl: null,
                    },
                  ],
                })
              }
              className="h-11 min-h-11 px-4 text-xs font-semibold gap-2"
            >
              <Plus className="size-4" />
              <span>Novo Módulo</span>
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={onSave}
              disabled={isSaving}
              className="h-11 min-h-11 px-5 text-xs font-semibold gap-2"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Save className="size-4" />
              )}
              <span>Salvar Tudo</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {modules.map((mod, idx) => (
            <div key={mod.id} className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Título do módulo"
                  value={mod.title}
                  onChange={(e) => updateModule(idx, { title: e.target.value })}
                  className="h-11"
                />
                <Input
                  placeholder="Categoria"
                  value={mod.category}
                  onChange={(e) => updateModule(idx, { category: e.target.value })}
                  className="h-11"
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Destaques separados por vírgula"
                    value={mod.highlights.join(", ")}
                    onChange={(e) =>
                      updateModule(idx, {
                        highlights: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="h-11"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ isolated_modules: modules.filter((_, i) => i !== idx) })}
                    aria-label="Remover módulo"
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <Textarea
                rows={2}
                placeholder="Descrição do módulo"
                value={mod.description}
                onChange={(e) => updateModule(idx, { description: e.target.value })}
              />
              <div className="space-y-1">
                <Label className="text-2xs font-semibold text-muted-foreground">Print / Imagem do Módulo (Opcional)</Label>
                <MediaUploader
                  accept="image"
                  maxFiles={1}
                  bucket="cms-media"
                  folder={`landings/${draft.slug}/modules`}
                  aspect={16 / 9}
                  value={mod.imageUrl || []}
                  onChange={(urls) => updateModule(idx, { imageUrl: urls[0] || null })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AdminLandingPlansFaqEditor draft={draft} onChange={onChange} />
    </div>
  );
}
