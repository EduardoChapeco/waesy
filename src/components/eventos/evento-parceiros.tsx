import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Award, ExternalLink, Globe, Layers, Handshake } from "lucide-react";
import { toast } from "sonner";
import { listEventPartners, upsertEventPartner, deleteEventPartner } from "@/services/events.functions";

interface EventoParceirosProps {
  eventId: string;
}

const NIVEIS_PARCERIA = [
  { value: "diamante", label: "Cota Master / Diamante", badge: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  { value: "ouro", label: "Cota Ouro", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "prata", label: "Cota Prata", badge: "bg-slate-500/15 text-slate-600 border-slate-500/30" },
  { value: "bronze", label: "Cota Bronze", badge: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  { value: "apoio", label: "Apoio Institucional", badge: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
];

export function EventoParceiros({ eventId }: EventoParceirosProps) {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("patrocinador");
  const [nivel, setNivel] = useState("ouro");
  const [siteUrl, setSiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const loadPartners = async () => {
    try {
      setLoading(true);
      const res = await listEventPartners({ data: { eventId } });
      setPartners(res || []);
    } catch (e: any) {
      toast.error("Erro ao carregar parceiros: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadPartners();
  }, [eventId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    startTransition(async () => {
      try {
        await upsertEventPartner({
          data: {
            eventId,
            nome: nome.trim(),
            tipo,
            nivel,
            siteUrl: siteUrl.trim() || null,
            logoUrl: logoUrl.trim() || null,
            ordem: partners.length,
          },
        });
        toast.success("Patrocinador/Parceiro vinculado com sucesso!");
        setNome("");
        setSiteUrl("");
        setLogoUrl("");
        setIsOpen(false);
        loadPartners();
      } catch (err: any) {
        toast.error("Erro ao salvar parceiro: " + err.message);
      }
    });
  };

  const handleDelete = async (partnerId: string) => {
    if (!confirm("Excluir este parceiro do evento?")) return;
    try {
      await deleteEventPartner({ data: { partnerId } });
      toast.success("Parceiro removido.");
      loadPartners();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando patrocinadores e apoiadores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Patrocinadores</h3>
            <Badge variant="outline" className="text-xs">
              {partners.length} {partners.length === 1 ? "parceiro ativo" : "parceiros ativos"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão de marcas patrocinadoras, cotas master, exposição em telões e materiais gráficos.
          </p>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-4 rounded-lg text-xs font-bold gap-2">
              <Plus className="size-4" />
              <span>Novo Patrocinador</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Cadastrar Patrocinador / Apoiador</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Informe os dados da marca e a cota de patrocínio negociada.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Nome da Empresa / Marca *</Label>
                <Input
                  required
                  placeholder="Ex: Cervejaria Heineken / Banco Sicoob"
                  className="h-11 rounded-lg text-xs"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Tipo de Parceria</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patrocinador" className="text-xs">Patrocinador Oficial</SelectItem>
                      <SelectItem value="apoio" className="text-xs">Apoiador Institucional</SelectItem>
                      <SelectItem value="realizacao" className="text-xs">Co-Realizador</SelectItem>
                      <SelectItem value="midia" className="text-xs">Media Partner (Rádio/TV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Cota / Nível</Label>
                  <Select value={nivel} onValueChange={setNivel}>
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEIS_PARCERIA.map((n) => (
                        <SelectItem key={n.value} value={n.value} className="text-xs">
                          {n.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Website Oficial</Label>
                <Input
                  placeholder="https://empresa.com.br"
                  className="h-11 rounded-lg text-xs"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">URL da Logo (Vetor ou PNG)</Label>
                <Input
                  placeholder="https://..."
                  className="h-11 rounded-lg text-xs"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 rounded-lg text-xs font-bold mt-4">
                {isPending ? "Cadastrando..." : "Salvar Patrocinador"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {partners.length === 0 ? (
        <Card className="rounded-lg border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Handshake className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhum parceiro cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre as marcas parceiras para gerar relatórios de exposição e contrapartidas.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {partners.map((p) => {
            const nivelObj = NIVEIS_PARCERIA.find((n) => n.value === p.nivel) || NIVEIS_PARCERIA[2];
            return (
              <Card
                key={p.id}
                className="rounded-lg border border-border/80 bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-muted/60 flex items-center justify-center font-bold text-xs text-foreground">
                        {p.logo_url ? (
                          <img src={p.logo_url} alt={p.nome} className="size-6 object-contain rounded" />
                        ) : (
                          <Award className="size-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{p.nome}</h4>
                        <span className="text-xs text-muted-foreground capitalize">{p.tipo}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      className="size-11 sm:size-9 text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Excluir parceiro"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div>
                    <Badge className={`text-xs font-bold border ${nivelObj.badge}`}>
                      {nivelObj.label}
                    </Badge>
                  </div>
                </div>

                {p.site_url && (
                  <div className="pt-2 border-t border-border/50">
                    <a
                      href={p.site_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="size-3" />
                      <span className="truncate">{p.site_url.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
