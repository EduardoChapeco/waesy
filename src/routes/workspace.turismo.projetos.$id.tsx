import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plane,
  Hotel,
  Car,
  Briefcase,
  Plus,
  ArrowLeft,
  Users,
  CheckSquare,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/state/loading";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { formatMoney } from "@/lib/money";
import {
  getTravelProjectDetail,
  saveProjectTimelineItem,
} from "@/services/corporate-travel.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/turismo/projetos/$id")({
  head: () => ({ meta: [{ title: "Projeto de Viagem · Timeline & Logística | Workspace" }] }),
  loader: async ({ params }) => {
    try {
      const data = await getTravelProjectDetail({ data: { projectId: params.id } });
      return { projectData: data };
    } catch (err) {
      console.warn("[loader:workspace.turismo.projetos.$id] Erro:", err);
      return { projectData: null };
    }
  },
  component: TravelProjectDetailPage,
});

export default function TravelProjectDetailPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData?.() as { projectData: any } | undefined;
  const initialData = loaderData?.projectData;

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["travel-project-detail", id],
    queryFn: () => getTravelProjectDetail({ data: { projectId: id } }),
    initialData,
  });

  const project = data?.project;
  const trips = data?.trips || [];
  const tasks = data?.tasks || [];
  const timeline = data?.timeline || [];

  // Modal de Novo Item na Timeline
  const [modalOpen, setModalOpen] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemCategory, setItemCategory] = useState<
    "flight" | "hotel" | "car" | "meeting" | "meal" | "task" | "note" | "transfer" | "activity"
  >("meeting");
  const [itemTimeStart, setItemTimeStart] = useState("");
  const [itemTimeEnd, setItemTimeEnd] = useState("");
  const [itemPlaceName, setItemPlaceName] = useState("");
  const [itemPlaceAddress, setItemPlaceAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = async () => {
    if (!itemTitle.trim() || !itemTimeStart) {
      toast.error("Informe título e horário de início.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await saveProjectTimelineItem({
        data: {
          projectId: id,
          title: itemTitle.trim(),
          category: itemCategory,
          timeStart: itemTimeStart,
          timeEnd: itemTimeEnd || null,
          placeName: itemPlaceName.trim() || null,
          placeAddress: itemPlaceAddress.trim() || null,
        },
      });
      if (res.conflictWarning) {
        toast.warning(res.conflictWarning);
      } else {
        toast.success("Item adicionado ao cronograma!");
      }
      setModalOpen(false);
      setItemTitle("");
      setItemTimeStart("");
      refetch();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !project) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <WorkspaceCanonicalToolbar title="Projeto de Viagem" />
        <div className="p-6">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground">
        <WorkspaceCanonicalToolbar title="Projeto de Viagem" />
        <div className="p-8 max-w-md mx-auto text-center space-y-4 my-auto">
          <p className="text-xs text-muted-foreground">Projeto de viagem não encontrado.</p>
          <Button asChild className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer">
            <Link to="/workspace/turismo/viagens">Voltar às Viagens</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <WorkspaceCanonicalToolbar title={`Projeto: ${project.name}`}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono">
            {project.project_code || "PRJ"}
          </Badge>
          <Button
            onClick={() => setModalOpen(true)}
            className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Adicionar Compromisso</span>
          </Button>
        </div>
      </WorkspaceCanonicalToolbar>

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Sumário do Projeto */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Período Previsto</span>
            <p className="text-sm font-bold text-foreground">
              {project.start_date || "A definir"} a {project.end_date || "A definir"}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Orçamento Aprovado</span>
            <p className="text-sm font-bold text-foreground">{formatMoney(project.budget_cents)}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Comprometido em Viagens</span>
            <p className="text-sm font-bold text-foreground">{formatMoney(project.committed_cents)}</p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">Viagens Vinculadas</span>
            <p className="text-sm font-bold text-foreground">{trips.length} trecho(s)</p>
          </div>
        </div>

        {/* Layout Split: Timeline Viva (Centro) + Mapa e Tarefas (Lateral) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Timeline Viva com Detecção de Conflitos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>Cronograma Vivo do Projeto ({timeline.length} Itens)</span>
              </h2>
            </div>

            {timeline.length === 0 ? (
              <div className="p-8 rounded-lg border border-border bg-card text-center text-xs text-muted-foreground space-y-2">
                <p>Nenhum compromisso ou segmento agendado na timeline.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Adicionar Primeiro Evento
                </Button>
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-border">
                {timeline.map((item: any, idx: number) => {
                  const Icon =
                    item.category === "flight"
                      ? Plane
                      : item.category === "hotel"
                      ? Hotel
                      : item.category === "car"
                      ? Car
                      : Briefcase;

                  return (
                    <div key={item.id} className="relative flex items-start gap-4 pl-2">
                      <div className="size-8 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center shrink-0 z-10">
                        <Icon className="size-4" />
                      </div>

                      <div className="flex-1 p-4 rounded-lg border border-border bg-card space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground text-sm">{item.title}</span>
                          <span className="font-mono text-primary font-bold">
                            {new Date(item.time_start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {item.place_name && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" />
                            <span>{item.place_name} {item.place_address ? `· ${item.place_address}` : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna 3: Tarefas e Mapa de Compromissos */}
          <div className="space-y-6">
            {/* Bloco de Tarefas do Projeto */}
            <div className="p-5 rounded-lg border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                  <CheckSquare className="size-4 text-primary" />
                  <span>Tarefas do Projeto</span>
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {tasks.filter((t: any) => t.status === "done").length}/{tasks.length}
                </Badge>
              </div>

              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa cadastrada.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{task.title}</span>
                      <Badge variant="outline" className="text-xs">{task.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloco do Mapa de Localizações Reais */}
            <div className="p-5 rounded-lg border border-border bg-card space-y-3">
              <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                <Compass className="size-4 text-primary" />
                <span>Locais do Roteiro</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Georreferenciamento de aeroportos, hotéis e sedes de clientes para cálculo de deslocamentos.
              </p>
              <div className="space-y-2 text-xs">
                {timeline.filter((t: any) => t.place_name).map((t: any) => (
                  <div key={t.id} className="p-3 rounded-lg bg-muted/30 border border-border flex items-start gap-2">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="font-bold text-foreground">{t.place_name}</p>
                      {t.place_address && <p className="text-muted-foreground text-xs">{t.place_address}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Item na Timeline */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Novo Item no Cronograma</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1 size-11 min-h-11 min-w-11 rounded-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label htmlFor="item-title">Título do Compromisso</Label>
                <Input
                  id="item-title"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Ex: Auditoria Unidade Chapecó"
                  className="h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="item-cat">Categoria</Label>
                <select
                  id="item-cat"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value as any)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs"
                >
                  <option value="meeting">Reunião / Trabalho</option>
                  <option value="flight">Voo / Deslocamento Aéreo</option>
                  <option value="hotel">Check-in / Hospedagem</option>
                  <option value="car">Retirada de Veículo</option>
                  <option value="meal">Almoço / Jantar de Negócios</option>
                  <option value="transfer">Traslado Terrestre</option>
                  <option value="activity">Visita Técnica</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="item-start">Início (Data/Hora)</Label>
                  <Input
                    id="item-start"
                    type="datetime-local"
                    value={itemTimeStart}
                    onChange={(e) => setItemTimeStart(e.target.value)}
                    className="h-11 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-end">Término (Opcional)</Label>
                  <Input
                    id="item-end"
                    type="datetime-local"
                    value={itemTimeEnd}
                    onChange={(e) => setItemTimeEnd(e.target.value)}
                    className="h-11 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="item-place">Local / Estabelecimento</Label>
                <Input
                  id="item-place"
                  value={itemPlaceName}
                  onChange={(e) => setItemPlaceName(e.target.value)}
                  placeholder="Ex: Filial Sul - ACME"
                  className="h-11 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="item-addr">Endereço Completo</Label>
                <Input
                  id="item-addr"
                  value={itemPlaceAddress}
                  onChange={(e) => setItemPlaceAddress(e.target.value)}
                  placeholder="Ex: Av. Getúlio Vargas, 1000 - Centro, Chapecó/SC"
                  className="h-11 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleAddItem}
                className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {isSubmitting ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
