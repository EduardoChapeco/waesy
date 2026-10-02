import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Mic2, Clock, MapPin, Layers, Music } from "lucide-react";
import { toast } from "sonner";
import { listEventLineup, upsertEventLineup, deleteEventLineup } from "@/services/events.functions";

interface EventoLineupProps {
  eventId: string;
}

export function EventoLineup({ eventId }: EventoLineupProps) {
  const [lineup, setLineup] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [nomeArtista, setNomeArtista] = useState("");
  const [palco, setPalco] = useState("Palco Principal");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [bio, setBio] = useState("");

  const loadLineup = async () => {
    try {
      setLoading(true);
      const res = await listEventLineup({ data: { eventId } });
      setLineup(res || []);
    } catch (e: any) {
      toast.error("Erro ao carregar lineup: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadLineup();
  }, [eventId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeArtista.trim()) return;

    startTransition(async () => {
      try {
        await upsertEventLineup({
          data: {
            eventId,
            nomeArtista: nomeArtista.trim(),
            palco: palco.trim() || "Palco Principal",
            horarioInicio: horarioInicio || null,
            horarioFim: horarioFim || null,
            bio: bio.trim() || null,
            ordem: lineup.length,
          },
        });
        toast.success("Atração cadastrada no cronograma!");
        setNomeArtista("");
        setBio("");
        setIsOpen(false);
        loadLineup();
      } catch (err: any) {
        toast.error("Erro ao salvar atração: " + err.message);
      }
    });
  };

  const handleDelete = async (lineupId: string) => {
    if (!confirm("Excluir esta atração do lineup?")) return;
    try {
      await deleteEventLineup({ data: { lineupId } });
      toast.success("Atração excluída.");
      loadLineup();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando lineup e cronograma de shows...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Lineup</h3>
            <Badge variant="outline" className="text-xs">
              {lineup.length} {lineup.length === 1 ? "atração confirmada" : "atrações confirmadas"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cronograma oficial de shows, palcos, horários de passagem de som e apresentações.
          </p>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-4 rounded-lg text-xs font-bold gap-2">
              <Plus className="size-4" />
              <span>Nova Atração</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Cadastrar Atração / Show</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Informe os detalhes do artista e o horário de palco.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Nome do Artista / Banda *</Label>
                <Input
                  required
                  placeholder="Ex: Alok / Banda Titãs"
                  className="h-11 rounded-lg text-xs"
                  value={nomeArtista}
                  onChange={(e) => setNomeArtista(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Palco / Espaço</Label>
                <Input
                  placeholder="Ex: Palco Principal / Tenda Eletrônica"
                  className="h-11 rounded-lg text-xs"
                  value={palco}
                  onChange={(e) => setPalco(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Horário de Início</Label>
                  <Input
                    type="datetime-local"
                    className="h-11 rounded-lg text-xs"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Horário de Término</Label>
                  <Input
                    type="datetime-local"
                    className="h-11 rounded-lg text-xs"
                    value={horarioFim}
                    onChange={(e) => setHorarioFim(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Bio e Release</Label>
                <Textarea
                  rows={3}
                  placeholder="Gênero musical, sucessos e informações do rider técnico..."
                  className="rounded-lg text-xs"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 rounded-lg text-xs font-bold mt-4">
                {isPending ? "Cadastrando..." : "Confirmar no Lineup"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {lineup.length === 0 ? (
        <Card className="rounded-lg border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Music className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhuma atração cadastrada</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cadastre os artistas para publicar a programação na vitrine pública do evento.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lineup.map((art, idx) => (
            <Card
              key={art.id}
              className="rounded-lg border border-border/80 bg-card p-4 shadow-xs flex items-center justify-between hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  <Mic2 className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">{art.nome_artista}</h4>
                    <Badge variant="secondary" className="text-[10px]">
                      {art.palco}
                    </Badge>
                  </div>
                  {art.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {art.bio}
                    </p>
                  )}
                  {(art.horario_inicio || art.horario_fim) && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                      <Clock className="size-3" />
                      <span>
                        {art.horario_inicio ? new Date(art.horario_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                        {" até "}
                        {art.horario_fim ? new Date(art.horario_fim).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(art.id)}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                title="Excluir atração"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
