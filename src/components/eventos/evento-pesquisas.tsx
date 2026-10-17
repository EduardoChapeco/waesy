import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardList, BarChart3, MapPin, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listEventSurveys,
  upsertEventSurvey,
  getSurveyAnalytics,
} from "@/services/events.functions";

interface EventoPesquisasProps {
  eventId: string;
}

export function EventoPesquisas({ eventId }: EventoPesquisasProps) {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal Criação
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState<any>("attendees");
  const [requireGeofence, setRequireGeofence] = useState(false);
  const [radiusMeters] = useState(500);
  const [startsAt] = useState("");
  const [endsAt] = useState("");

  // Perguntas dinâmicas (schema-forms compatible)
  const [questions, setQuestions] = useState<
    Array<{ id: string; label: string; type: "select" | "text" | "number"; options: string[] }>
  >([
    {
      id: "q1",
      label: "Como você avalia a organização geral do evento?",
      type: "select",
      options: ["Excelente", "Boa", "Regular", "Ruim"],
    },
    {
      id: "q2",
      label: "O que você achou dos bares e praça de alimentação?",
      type: "select",
      options: ["Muito satisfeito", "Satisfeito", "Poderia melhorar"],
    },
  ]);

  // Analytics View
  const [selectedSurveyAnalytics, setSelectedSurveyAnalytics] = useState<any | null>(null);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const res = await listEventSurveys({ data: { eventId } });
      setSurveys(res || []);
    } catch (err: any) {
      toast.error("Erro ao carregar pesquisas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadSurveys();
    }
  }, [eventId]);

  const handleAddQuestion = () => {
    const nextId = `q${questions.length + 1}`;
    setQuestions([
      ...questions,
      {
        id: nextId,
        label: "",
        type: "select",
        options: ["Excelente", "Bom", "Regular", "Insatisfatório"],
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título da pesquisa.");
      return;
    }

    startTransition(async () => {
      try {
        const formSchema = {
          id: `survey-${Date.now()}`,
          version: 1,
          niche: "eventos",
          title,
          description,
          fields: questions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            required: true,
            options: q.type === "select" ? q.options.map((o) => ({ label: o, value: o })) : undefined,
          })),
        };

        await upsertEventSurvey({
          data: {
            eventId,
            title: title.trim(),
            description: description.trim() || undefined,
            targetAudience,
            formSchema,
            startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
            endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
            requireGeofence,
            geoRadiusMeters: requireGeofence ? radiusMeters : undefined,
            isActive: true,
          },
        });

        toast.success("Pesquisa inteligente criada com sucesso!");
        setIsNewOpen(false);
        setTitle("");
        setDescription("");
        loadSurveys();
      } catch (err: any) {
        toast.error("Erro ao criar pesquisa: " + err.message);
      }
    });
  };

  const handleViewAnalytics = async (survey: any) => {
    try {
      const res = await getSurveyAnalytics({ data: { surveyId: survey.id } });
      setSelectedSurveyAnalytics({ survey, data: res });
    } catch (err: any) {
      toast.error("Erro ao carregar dados da pesquisa: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin motion-reduce:animate-none" />
        <span>Carregando pesquisas do evento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Módulo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              Pesquisas & Formulários Inteligentes
            </h3>
            <Badge variant="outline" className="text-xs">
              {surveys.length} {surveys.length === 1 ? "pesquisa ativa" : "pesquisas ativas"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Colete feedback do público, patrocinadores e fornecedores com agendamento temporal e validação por geolocalização.
          </p>
        </div>

        <Sheet open={isNewOpen} onOpenChange={setIsNewOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
              <Plus className="size-4" />
              <span>Nova Pesquisa</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-lg p-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Criar Pesquisa no Evento</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Reutiliza o motor declarativo schema-forms para coletar opiniões no aplicativo mobile.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreateSurvey} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Título da Pesquisa *</Label>
                <Input
                  required
                  placeholder="Ex: Pesquisa de Satisfação Geral"
                  className="h-11 min-h-11 rounded-lg text-xs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Descrição ou Orientações</Label>
                <Textarea
                  placeholder="Ex: Sua opinião nos ajuda a melhorar a experiência para as próximas edições."
                  className="rounded-lg text-xs resize-none"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Público-Alvo</Label>
                <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v)}>
                  <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendees" className="text-xs">Participantes / Público Geral</SelectItem>
                    <SelectItem value="sponsors" className="text-xs">Patrocinadores & Marcas</SelectItem>
                    <SelectItem value="vendors" className="text-xs">Parceiros de Alimentação & Lojas</SelectItem>
                    <SelectItem value="staff" className="text-xs">Equipe de Produção & Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Perguntas Dinâmicas */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Perguntas da Pesquisa ({questions.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddQuestion}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-4" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Pergunta #{idx + 1}</span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="size-11 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={`Remover pergunta ${idx + 1}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                      <Input
                        required
                        placeholder="Digite a pergunta..."
                        className="h-11 min-h-11 rounded-lg text-xs bg-card"
                        value={q.label}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[idx].label = e.target.value;
                          setQuestions(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Geofence e Agendamento */}
              <div className="p-4 rounded-lg border border-border/70 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Exigir Presença no Local</span>
                    <span className="text-xs text-muted-foreground block">Valida geofencing de presença no evento</span>
                  </div>
                  <Switch
                    checked={requireGeofence}
                    onCheckedChange={setRequireGeofence}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 min-h-11 rounded-lg text-xs font-bold mt-4 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer">
                {isPending ? "Criando Pesquisa..." : "Publicar Pesquisa"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Grid de Pesquisas */}
      {surveys.length === 0 ? (
        <Card className="rounded-lg border border-dashed border-border/80 p-8 text-center bg-card/40">
          <ClipboardList className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhuma pesquisa criada para este evento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie formulários para avaliar a experiência do público e gerar relatórios de pós-evento para patrocinadores.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((s) => {
            const respCount = s.responses_count || (s.responses?.[0]?.count ?? 0);
            return (
              <Card
                key={s.id}
                className="rounded-lg border border-border/80 bg-card p-4 space-y-3 hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <ClipboardList className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground break-words">{s.title}</h4>
                        <span className="text-xs text-muted-foreground capitalize">
                          {s.target_audience === "attendees"
                            ? "Público Geral"
                            : s.target_audience === "sponsors"
                            ? "Patrocinadores"
                            : s.target_audience === "vendors"
                            ? "Alimentação & Bares"
                            : "Staff"}
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={
                        s.is_active
                          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold"
                          : "bg-muted text-muted-foreground text-xs"
                      }
                    >
                      {s.is_active ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>

                  {s.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {s.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                      {respCount} {respCount === 1 ? "resposta" : "respostas"}
                    </Badge>
                    {s.require_geofence && (
                      <Badge variant="outline" className="text-xs gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10">
                        <MapPin className="size-3" />
                        Geofenced
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewAnalytics(s)}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <BarChart3 className="size-4 text-primary" />
                    <span>Ver Métricas & Respostas</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal / Sheet de Analytics */}
      {selectedSurveyAnalytics && (
        <Sheet open={Boolean(selectedSurveyAnalytics)} onOpenChange={() => setSelectedSurveyAnalytics(null)}>
          <SheetContent side="right" className="w-full sm:max-w-xl p-6 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">
                Métricas: {selectedSurveyAnalytics.survey.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Consolidação de respostas em tempo real.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block">Total de Respostas</span>
                  <span className="text-lg font-black text-foreground">
                    {selectedSurveyAnalytics.data.totalResponses}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block">Presença Verificada</span>
                  <span className="text-lg font-black text-emerald-600">
                    {selectedSurveyAnalytics.data.verifiedLocationCount}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Detalhamento por Pergunta
                </h4>

                {Object.entries(selectedSurveyAnalytics.data.fieldSummaries || {}).map(([key, counts]: any) => (
                  <div key={key} className="p-4 rounded-lg border border-border/60 bg-card space-y-2">
                    <span className="text-xs font-bold text-foreground block">
                      Pergunta ({key})
                    </span>
                    <div className="space-y-2">
                      {Object.entries(counts).map(([option, count]: any) => (
                        <div key={option} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{option}</span>
                          <span className="font-bold font-mono text-foreground">{count} votos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
