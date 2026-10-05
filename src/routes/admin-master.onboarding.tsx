import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, GripVertical, Image as ImageIcon, Video, Pencil, Trash2, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  listAllSystemOnboardingSteps,
  saveSystemOnboardingStep,
  deleteSystemOnboardingStep,
  type SystemOnboardingStep,
} from "@/services/system-onboarding.functions";

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
  const router = useRouter();
  const { steps } = Route.useLoaderData() as { steps: (SystemOnboardingStep & { is_active?: boolean })[] };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStep, setEditingStep] = useState<Partial<SystemOnboardingStep & { is_active?: boolean }> | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [stepOrder, setStepOrder] = useState(0);

  const handleOpenCreate = () => {
    setEditingStep(null);
    setTitle("");
    setDescription("");
    setMediaUrl("");
    setMediaType("image");
    setStepOrder(steps.length + 1);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (step: any) => {
    setEditingStep(step);
    setTitle(step.title || "");
    setDescription(step.description || "");
    setMediaUrl(step.media_url || "");
    setMediaType(step.media_type || "image");
    setStepOrder(step.step_order ?? 0);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do passo é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      await saveSystemOnboardingStep({
        data: {
          id: editingStep?.id,
          title: title.trim(),
          description: description.trim() || null,
          media_url: mediaUrl.trim() || null,
          media_type: mediaType,
          step_order: Number(stepOrder) || 0,
          is_active: editingStep?.is_active ?? true,
        },
      });

      toast.success(editingStep?.id ? "Passo atualizado com sucesso!" : "Novo passo cadastrado!");
      setIsDialogOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar passo de onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (step: any, active: boolean) => {
    try {
      await saveSystemOnboardingStep({
        data: {
          id: step.id,
          title: step.title,
          description: step.description,
          media_url: step.media_url,
          media_type: step.media_type,
          step_order: step.step_order,
          is_active: active,
        },
      });
      toast.success(`Passo ${active ? "ativado" : "desativado"}.`);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar visibilidade.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover este passo do onboarding?")) return;
    try {
      await deleteSystemOnboardingStep({ data: { id } });
      toast.success("Passo removido com sucesso.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover passo.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-0 py-6">
      <PageHeader
        eyebrow="Admin Master / UX"
        title="Motor de Onboarding"
        description="Gerencie os passos explicativos exibidos aos lojistas e novos usuários."
        actions={
          <Button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-lg font-bold bg-primary text-primary-foreground gap-2 h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4" />
            Adicionar Passo
          </Button>
        }
      />

      <Card className="rounded-lg border border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-xl">Passos Ativos</CardTitle>
          <CardDescription>
            A ordem definida aqui reflete a sequência apresentada no primeiro acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-dashed rounded-lg">
              <p className="text-muted-foreground text-sm font-medium">Nenhum passo cadastrado ainda.</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenCreate}
                className="mt-4 rounded-lg h-11 px-4 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                Criar o primeiro passo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step: any) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="text-muted-foreground cursor-grab">
                      <GripVertical className="size-5" />
                    </span>
                    <div className="size-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      {step.media_type === "video" ? <Video className="size-4" /> : <ImageIcon className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm truncate">{step.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-sm">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(step.is_active)}
                        onCheckedChange={(val) => handleToggleActive(step, val)}
                      />
                      <span className="text-xs font-bold uppercase text-muted-foreground">Ativo</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(step)}
                      className="size-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      title="Editar passo"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(step.id)}
                      className="size-11 rounded-lg hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-destructive"
                      title="Excluir passo"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição do Passo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingStep?.id ? "Editar Passo" : "Novo Passo de Onboarding"}</DialogTitle>
              <DialogDescription>
                Configure os detalhes do card explicativo apresentado ao usuário.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="step-title" className="text-xs font-semibold">Título do Passo</Label>
                <Input
                  id="step-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Conecte seu WhatsApp comercial"
                  className="rounded-lg h-11"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="step-desc" className="text-xs font-semibold">Descrição / Orientação</Label>
                <Textarea
                  id="step-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique o benefício e o que o lojista deve fazer neste momento."
                  className="rounded-lg min-h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="step-media-url" className="text-xs font-semibold">URL da Mídia (opcional)</Label>
                  <Input
                    id="step-media-url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://..."
                    className="rounded-lg h-11"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="step-order" className="text-xs font-semibold">Ordem Sequencial</Label>
                  <Input
                    id="step-order"
                    type="number"
                    value={stepOrder}
                    onChange={(e) => setStepOrder(Number(e.target.value))}
                    className="rounded-lg h-11"
                    min={1}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-lg h-11 px-4 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-lg h-11 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
                <span>{editingStep?.id ? "Salvar Alterações" : "Criar Passo"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
