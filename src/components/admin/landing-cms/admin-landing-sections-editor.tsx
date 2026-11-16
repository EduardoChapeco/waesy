import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { AdminLandingSectionDialog } from "./admin-landing-section-dialog";
import type { VerticalLandingSectionDTO } from "@/lib/vertical-landing-types";

export interface AdminLandingSectionsEditorProps {
  landingSlug: string;
  sections: VerticalLandingSectionDTO[];
  onSaveSection: (payload: Omit<VerticalLandingSectionDTO, "id" | "landing_slug"> & { id?: string }) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  onReorderSections: (orderedIds: string[]) => Promise<void>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminLandingSectionsEditor({
  landingSlug,
  sections,
  onSaveSection,
  onDeleteSection,
  onReorderSections,
}: AdminLandingSectionsEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<VerticalLandingSectionDTO | null>(null);

  const openNew = () => {
    setEditingSection(null);
    setDialogOpen(true);
  };

  const openEdit = (sec: VerticalLandingSectionDTO) => {
    setEditingSection(sec);
    setDialogOpen(true);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const persistant = sections.filter((s) => UUID_REGEX.test(s.id));
    if (persistant.length !== sections.length) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= persistant.length) return;
    const copy = [...persistant];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    await onReorderSections(copy.map((s) => s.id));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Seções Modulares ({sections.length})</h2>
          <p className="text-xs text-muted-foreground">
            Adicione seções ilimitadas com upload de imagem, vídeo, passos e listas de benefícios.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={openNew} className="h-11 min-h-11 px-4 text-xs font-semibold gap-2">
          <Plus className="size-4" />
          <span>Adicionar Seção</span>
        </Button>
      </div>

      {sections.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Nenhuma seção customizada ainda"
          description="Clique em Adicionar Seção para criar blocos visuais com fotos e vídeos."
        />
      ) : (
        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div key={sec.id} className="rounded-xl border border-border/80 bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{sec.title}</span>
                  <Badge variant="secondary" className="text-2xs font-mono">{sec.layout_variant}</Badge>
                  {!sec.is_active && <Badge variant="outline" className="text-2xs font-mono">Oculta</Badge>}
                </div>
                {sec.subtitle && <p className="text-xs text-muted-foreground">{sec.subtitle}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || !UUID_REGEX.test(sec.id)}
                  aria-label="Mover para cima"
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === sections.length - 1 || !UUID_REGEX.test(sec.id)}
                  aria-label="Mover para baixo"
                  className="size-11 min-h-11 min-w-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowDown className="size-4" />
                </button>
                <Button type="button" variant="outline" onClick={() => openEdit(sec)} className="h-11 min-h-11 px-3 text-xs gap-1">
                  <Pencil className="size-3.5" />
                  <span>Editar</span>
                </Button>
                {UUID_REGEX.test(sec.id) && (
                  <button
                    type="button"
                    onClick={() => onDeleteSection(sec.id)}
                    aria-label="Remover seção"
                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border text-destructive hover:bg-destructive/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminLandingSectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        landingSlug={landingSlug}
        editingSection={editingSection}
        defaultSortOrder={(sections.length + 1) * 10}
        isPersistentUuid={Boolean(editingSection && UUID_REGEX.test(editingSection.id))}
        onSave={onSaveSection}
      />
    </div>
  );
}
