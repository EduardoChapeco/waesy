import * as React from "react";
import { useState } from "react";
import {
  Building2,
  Users,
  Plus,
  Edit3,
  Briefcase,
  Layers,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { type StoreDepartmentItemDTO } from "@/services/hr.functions";
import { upsertChatDepartment } from "@/services/whatsapp-channel-instances.functions";

export interface DepartmentManagerPanelProps {
  departments: StoreDepartmentItemDTO[];
  onRefresh: () => void | Promise<void>;
  storeId?: string;
}

export function DepartmentManagerPanel({
  departments,
  onRefresh,
  storeId,
}: DepartmentManagerPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDept, setEditingDept] = useState<StoreDepartmentItemDTO | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const handleOpenCreate = () => {
    setEditingDept(null);
    setName("");
    setSlug("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: StoreDepartmentItemDTO) => {
    setEditingDept(dept);
    setName(dept.name);
    setSlug(dept.slug);
    setDescription(dept.description || "");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Informe o nome do setor/departamento.");
      return;
    }

    const calculatedSlug =
      slug.trim() ||
      trimmedName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 32);

    setIsSaving(true);
    try {
      await upsertChatDepartment({
        data: {
          id: editingDept?.id,
          storeId,
          name: trimmedName,
          slug: calculatedSlug,
          description: description.trim() || undefined,
        },
      });

      toast.success(editingDept ? "Setor atualizado com sucesso!" : "Setor criado com sucesso!");
      setIsModalOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar setor corporativo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header da Seção de Setores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
              Setores & Departamentos Horizontais
            </h3>
            <Badge variant="secondary" className="text-2xs font-mono font-bold">
              {departments.length}
            </Badge>
          </div>
          <p className="text-2xs text-muted-foreground">
            Estrutura organizacional, centros de custo e distribuição de equipes nas operações da empresa.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreate}
          className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shrink-0"
        >
          <Plus className="size-4" />
          <span>Novo Setor</span>
        </Button>
      </div>

      {/* Grade de Setores */}
      {departments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Briefcase className="size-4" />
                    </span>
                    <h4 className="font-bold text-sm text-foreground truncate">{dept.name}</h4>
                  </div>
                  <Badge variant="outline" className="text-3xs font-mono font-semibold">
                    {dept.slug}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {dept.description || "Setor corporativo para alocação de colaboradores e lideranças."}
                </p>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-2xs">
                <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                  <Users className="size-3.5 text-primary" />
                  <span>
                    {dept.employee_count} {dept.employee_count === 1 ? "colaborador" : "colaboradores"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(dept)}
                  className="h-11 min-h-11 sm:h-8 sm:min-h-8 px-2 text-xs font-medium gap-1 text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <Edit3 className="size-3.5" />
                  <span>Editar</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2 bg-muted/5">
          <Building2 className="size-8 text-muted-foreground/50 mx-auto" />
          <p className="text-xs font-semibold text-foreground">
            Nenhum setor corporativo cadastrado ainda.
          </p>
          <p className="text-2xs text-muted-foreground max-w-sm mx-auto">
            Cadastre os departamentos horizontais da empresa (Comercial, Atendimento, Financeiro, Operações, RH) para organizar as equipes.
          </p>
        </div>
      )}

      {/* Modal de Criação / Edição de Setor */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>{editingDept ? "Editar Setor Corporativo" : "Criar Novo Setor"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure o departamento para alocação de funcionários e rotas de atendimento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-2xs font-semibold text-muted-foreground">Nome do Setor</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Comercial, Atendimento ao Cliente, Financeiro..."
                className="h-11 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-semibold text-muted-foreground">Código / Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Ex: comercial, atendimento, financeiro..."
                className="h-11 text-xs rounded-lg font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-2xs font-semibold text-muted-foreground">Descrição / Atribuições</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Responsável pelo fechamento de contratos, prospecção e pós-venda..."
                className="text-xs rounded-lg"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setIsModalOpen(false)}
              className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSaving ? "Salvando..." : editingDept ? "Salvar Alterações" : "Criar Setor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
