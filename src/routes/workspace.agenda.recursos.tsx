import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, Settings2, Users, Trash2, CheckCircle2, Clock, Calendar, Plus, X } from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { listResources, saveResource, deleteResource } from "@/services/booking.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/state/states";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/agenda/recursos")({
  head: () => ({ meta: [{ title: "Gestão de Recursos | Workspace Waesy" }] }),
  component: AdminResourcesPage,
});

const DAYS = [
  { id: 0, label: "Domingo" },
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
];

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

function AdminResourcesPage() {
  const queryClient = useQueryClient();
  const { data: resourcesRes, isLoading } = useQuery({
    queryKey: ["admin-booking-resources"],
    queryFn: () => listResources(),
  });

  const resources = resourcesRes?.data || [];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState<"person" | "room" | "equipment">("person");
  const [capacity, setCapacity] = useState(1);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([
    { day_of_week: 1, start_time: "08:00", end_time: "18:00" },
    { day_of_week: 2, start_time: "08:00", end_time: "18:00" },
    { day_of_week: 3, start_time: "08:00", end_time: "18:00" },
    { day_of_week: 4, start_time: "08:00", end_time: "18:00" },
    { day_of_week: 5, start_time: "08:00", end_time: "18:00" },
  ]);

  const openNewResourceModal = () => {
    setSelectedId(null);
    setName("");
    setResourceType("person");
    setCapacity(1);
    setStatus("active");
    setAvailabilities([
      { day_of_week: 1, start_time: "08:00", end_time: "18:00" },
      { day_of_week: 2, start_time: "08:00", end_time: "18:00" },
      { day_of_week: 3, start_time: "08:00", end_time: "18:00" },
      { day_of_week: 4, start_time: "08:00", end_time: "18:00" },
      { day_of_week: 5, start_time: "08:00", end_time: "18:00" },
    ]);
    setIsModalOpen(true);
  };

  const openEditResourceModal = (res: any) => {
    setSelectedId(res.id);
    setName(res.name || "");
    setResourceType(res.resource_type || "person");
    setCapacity(res.capacity || 1);
    setStatus(res.status || "active");
    const rawAvail = res.booking_resource_availabilities || [];
    if (rawAvail.length > 0) {
      setAvailabilities(
        rawAvail.map((a: any) => ({
          day_of_week: a.day_of_week,
          start_time: a.start_time.slice(0, 5),
          end_time: a.end_time.slice(0, 5),
        }))
      );
    } else {
      setAvailabilities([]);
    }
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("O nome do recurso é obrigatório.");
      return saveResource({
        data: {
          id: selectedId || undefined,
          name: name.trim(),
          resource_type: resourceType,
          capacity: Number(capacity) || 1,
          status,
          availabilities,
        },
      });
    },
    onSuccess: () => {
      toast.success(selectedId ? "Recurso atualizado com sucesso!" : "Recurso criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-booking-resources"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar recurso.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteResource({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Recurso excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-booking-resources"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir recurso.");
    },
  });

  const toggleDayAvailability = (day: number) => {
    const exists = availabilities.find((a) => a.day_of_week === day);
    if (exists) {
      setAvailabilities(availabilities.filter((a) => a.day_of_week !== day));
    } else {
      setAvailabilities([...availabilities, { day_of_week: day, start_time: "08:00", end_time: "18:00" }].sort((a, b) => a.day_of_week - b.day_of_week));
    }
  };

  const updateDayTimes = (day: number, field: "start_time" | "end_time", value: string) => {
    setAvailabilities(
      availabilities.map((a) => {
        if (a.day_of_week === day) {
          return { ...a, [field]: value };
        }
        return a;
      })
    );
  };

  const applyPreset = (preset: "weekdays" | "allweek") => {
    if (preset === "weekdays") {
      setAvailabilities([
        { day_of_week: 1, start_time: "08:00", end_time: "18:00" },
        { day_of_week: 2, start_time: "08:00", end_time: "18:00" },
        { day_of_week: 3, start_time: "08:00", end_time: "18:00" },
        { day_of_week: 4, start_time: "08:00", end_time: "18:00" },
        { day_of_week: 5, start_time: "08:00", end_time: "18:00" },
      ]);
    } else {
      setAvailabilities(
        DAYS.map((d) => ({
          day_of_week: d.id,
          start_time: "08:00",
          end_time: "18:00",
        }))
      );
    }
  };

  const getDayName = (day: number) => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[day];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda & Agendamentos"
        title="Recursos"
        actions={
          <Button onClick={openNewResourceModal} className="rounded-xl font-bold text-xs gap-2">
            <UserPlus className="size-4" />
            Novo Recurso
          </Button>
        }
      />

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
          Carregando recursos...
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          title="Nenhum Recurso Cadastrado"
          action={
            <Button onClick={openNewResourceModal} className="rounded-xl font-bold text-xs">
              Cadastrar Primeiro Recurso
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {resources.map((res: any) => (
            <div
              key={res.id}
              className="flex flex-col h-full relative group p-6 bg-card hover:border-primary/50 transition-colors rounded-2xl border border-border shadow-xs"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg leading-tight text-foreground">{res.name}</h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    {res.resource_type === "person"
                      ? "Profissional"
                      : res.resource_type === "room"
                      ? "Sala / Espaço"
                      : "Equipamento"}
                  </p>
                </div>
                <Badge variant={res.status === "active" ? "default" : "secondary"} className="rounded-lg text-[10px]">
                  {res.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-4 text-primary" />
                  <span>
                    Capacidade: <strong className="text-foreground">{res.capacity}</strong> atendimento(s) simultâneo(s)
                  </span>
                </div>
              </div>

              <div className="mt-auto border-t border-border/50 pt-4">
                <h4 className="text-xs font-bold text-muted-foreground mb-2">
                  Grade de Atendimento
                </h4>

                {res.booking_resource_availabilities?.length > 0 ? (
                  <div className="space-y-1.5">
                    {res.booking_resource_availabilities.map((avail: any) => (
                      <div
                        key={avail.id}
                        className="flex justify-between items-center text-xs p-2 rounded-xl bg-muted/40 font-mono"
                      >
                        <span className="font-semibold text-foreground font-sans">{getDayName(avail.day_of_week)}</span>
                        <span className="text-muted-foreground">
                          {avail.start_time.slice(0, 5)} - {avail.end_time.slice(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Grade livre / sem restrição.</p>
                )}
              </div>

              {/* Botão de Edição Rápida */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => openEditResourceModal(res)}
                  className="size-8 rounded-xl cursor-pointer shadow-xs"
                  title="Editar Recurso"
                >
                  <Settings2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dialog de Criação / Edição de Recurso ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent size="lg" className="rounded-2xl max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedId ? "Editar Recurso da Agenda" : "Novo Recurso da Agenda"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="resource-name" className="text-xs font-semibold">
                Nome do Recurso / Profissional *
              </Label>
              <Input
                id="resource-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Dr. Roberto, Sala 02, Cadeira 01..."
                className="rounded-xl text-xs"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Recurso</Label>
                <Select
                  value={resourceType}
                  onValueChange={(val: any) => setResourceType(val)}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="person">Profissional / Atendente</SelectItem>
                    <SelectItem value="room">Sala / Espaço Físico</SelectItem>
                    <SelectItem value="equipment">Equipamento / Máquina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Capacidade Simultânea</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={capacity}
                  onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={status}
                  onValueChange={(val: any) => setStatus(val)}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active">Ativo na Agenda</SelectItem>
                    <SelectItem value="inactive">Inativo / Oculto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuração da Grade de Horários */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Grade Semanal de Atendimento</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Marque os dias e defina os horários em que este recurso pode receber agendamentos.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("weekdays")}
                    className="text-[10px] h-7 rounded-lg px-2"
                  >
                    Seg-Sex
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("allweek")}
                    className="text-[10px] h-7 rounded-lg px-2"
                  >
                    Todos
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {DAYS.map((d) => {
                  const slot = availabilities.find((a) => a.day_of_week === d.id);
                  const isChecked = !!slot;

                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs"
                    >
                      <label className="flex items-center gap-2 font-medium cursor-pointer select-none min-w-[130px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDayAvailability(d.id)}
                          className="size-4 rounded accent-primary cursor-pointer"
                        />
                        <span className={isChecked ? "text-foreground font-bold" : "text-muted-foreground"}>
                          {d.label}
                        </span>
                      </label>

                      {isChecked ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => updateDayTimes(d.id, "start_time", e.target.value)}
                            className="h-8 w-24 text-xs font-mono rounded-lg"
                          />
                          <span className="text-muted-foreground text-[10px]">até</span>
                          <Input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => updateDayTimes(d.id, "end_time", e.target.value)}
                            className="h-8 w-24 text-xs font-mono rounded-lg"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic pr-2">Indisponível</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between border-t border-border/60 pt-4">
            {selectedId ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Deseja realmente remover este recurso da agenda?")) {
                    deleteMutation.mutate(selectedId);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="rounded-xl text-xs gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Excluir Recurso
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-xl text-xs font-bold px-4"
              >
                {saveMutation.isPending ? "Salvando..." : selectedId ? "Salvar Alterações" : "Criar Recurso"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

