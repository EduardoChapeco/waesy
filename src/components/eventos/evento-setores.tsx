import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Users, Layers } from "lucide-react";
import { toast } from "sonner";
import { listEventSectors, upsertEventSector, deleteEventSector } from "@/services/events.functions";

interface EventoSetoresProps {
  eventId: string;
}

export function EventoSetores({ eventId }: EventoSetoresProps) {
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [corHex, setCorHex] = useState("#6366f1");
  const [descricao, setDescricao] = useState("");

  const loadSectors = async () => {
    try {
      setLoading(true);
      const res = await listEventSectors({ data: { eventId } });
      setSectors(res || []);
    } catch (e: any) {
      toast.error("Erro ao carregar setores: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadSectors();
  }, [eventId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    startTransition(async () => {
      try {
        await upsertEventSector({
          data: {
            eventId,
            nome: nome.trim(),
            capacidade: capacidade ? parseInt(capacidade) : null,
            corHex,
            descricao: descricao.trim() || null,
            coordenadas: {},
          },
        });
        toast.success("Setor cadastrado com sucesso!");
        setNome("");
        setCapacidade("");
        setDescricao("");
        setIsOpen(false);
        loadSectors();
      } catch (err: any) {
        toast.error("Erro ao salvar setor: " + err.message);
      }
    });
  };

  const handleDelete = async (sectorId: string) => {
    if (!confirm("Excluir este setor do evento?")) return;
    try {
      await deleteEventSector({ data: { sectorId } });
      toast.success("Setor excluído.");
      loadSectors();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando setores e áreas do evento...</span>
      </div>
    );
  }

  const totalCap = sectors.reduce((acc, s) => acc + (s.capacidade || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Setores</h3>
            <Badge variant="outline" className="text-xs">
              Capacidade Total: {totalCap} pessoas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Defina divisões de espaço físico, como Pista Premium, Camarote, Backstage e Área VIP.
          </p>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-4 rounded-lg text-xs font-bold gap-2">
              <Plus className="size-4" />
              <span>Novo Setor</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Cadastrar Setor / Área</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Configure capacidade máxima e identificador visual para a planta.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Nome do Setor *</Label>
                <Input
                  required
                  placeholder="Ex: Camarote Open Bar"
                  className="h-11 rounded-lg text-xs"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Capacidade Máxima</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 500"
                    className="h-11 rounded-lg text-xs font-mono"
                    value={capacidade}
                    onChange={(e) => setCapacidade(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Cor de Identificação</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-11 w-14 p-1 rounded-lg cursor-pointer"
                      value={corHex}
                      onChange={(e) => setCorHex(e.target.value)}
                    />
                    <Input
                      className="h-11 rounded-lg text-xs font-mono flex-1 uppercase"
                      value={corHex}
                      onChange={(e) => setCorHex(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Descrição do Setor</Label>
                <Textarea
                  rows={3}
                  placeholder="Benefícios inclusos, acesso a banheiros exclusivos, etc."
                  className="rounded-lg text-xs"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 rounded-lg text-xs font-bold mt-4">
                {isPending ? "Salvando..." : "Salvar Setor"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {sectors.length === 0 ? (
        <Card className="rounded-lg border border-dashed border-border/80 p-8 text-center bg-card/40">
          <MapPin className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhum setor cadastrado</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cadastre os setores para vincular aos ingressos e dimensionar os lotes.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sectors.map((s) => (
            <Card
              key={s.id}
              className="rounded-lg border border-border/80 bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3.5 rounded-full ring-2 ring-border/50"
                      style={{ backgroundColor: s.cor_hex || "#6366f1" }}
                    />
                    <h4 className="text-xs font-bold text-foreground">{s.nome}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Excluir setor"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {s.descricao && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {s.descricao}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="size-3.5" />
                  Capacidade
                </span>
                <span className="font-mono font-bold text-foreground">
                  {s.capacidade ? `${s.capacidade} pax` : "Livre"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
