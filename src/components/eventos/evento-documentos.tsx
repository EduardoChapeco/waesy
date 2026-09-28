import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, Calendar, Download, AlertTriangle, CheckCircle2, ShieldAlert, Layers } from "lucide-react";
import { toast } from "sonner";
import { listEventDocuments, upsertEventDocument, deleteEventDocument } from "@/services/events.functions";

interface EventoDocumentosProps {
  eventId: string;
}

const TIPOS_DOC = [
  { value: "alvara", label: "Alvará da Prefeitura", icon: FileText, color: "text-amber-500" },
  { value: "avcb", label: "AVCB / Bombeiros", icon: ShieldAlert, color: "text-rose-500" },
  { value: "policia", label: "Autorização Polícia Militar / Civil", icon: FileText, color: "text-blue-500" },
  { value: "ecad", label: "Licença Direitos Autorais (ECAD)", icon: FileText, color: "text-purple-500" },
  { value: "contrato", label: "Contrato de Locação do Espaço", icon: FileText, color: "text-emerald-500" },
  { value: "seguro", label: "Apólice de Seguro de Responsabilidade Civil", icon: FileText, color: "text-sky-500" },
  { value: "outro", label: "Outro Documento Legal", icon: FileText, color: "text-muted-foreground" },
];

export function EventoDocumentos({ eventId }: EventoDocumentosProps) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("alvara");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const loadDocs = async () => {
    try {
      setLoading(true);
      const res = await listEventDocuments({ data: { eventId } });
      setDocs(res || []);
    } catch (e: any) {
      toast.error("Erro ao carregar documentos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadDocs();
  }, [eventId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !arquivoUrl.trim()) {
      toast.error("Preencha o título e o link do arquivo.");
      return;
    }

    startTransition(async () => {
      try {
        await upsertEventDocument({
          data: {
            eventId,
            titulo: titulo.trim(),
            tipo,
            arquivoUrl: arquivoUrl.trim(),
            dataValidade: dataValidade || null,
            observacoes: observacoes.trim() || null,
          },
        });
        toast.success("Documento protocolado com sucesso!");
        setTitulo("");
        setArquivoUrl("");
        setDataValidade("");
        setObservacoes("");
        setIsOpen(false);
        loadDocs();
      } catch (err: any) {
        toast.error("Erro ao salvar documento: " + err.message);
      }
    });
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Excluir este documento legal do evento?")) return;
    try {
      await deleteEventDocument({ data: { documentId } });
      toast.success("Documento excluído.");
      loadDocs();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando alvarás e documentos legais...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Compliance, Alvarás</h3>
            <Badge variant="outline" className="text-xs">
              {docs.length} {docs.length === 1 ? "documento anexado" : "documentos anexados"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central de controle regulatório: AVCB dos Bombeiros, alvará da prefeitura, ECAD e seguros.
          </p>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="h-11 px-4 rounded-xl text-xs font-bold gap-2">
              <Plus className="size-4" />
              <span>Anexar Documento</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
            <SheetHeader>
              <SheetTitle className="text-lg font-bold">Protocolar Documento / Alvará</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Mantenha a conformidade jurídica e fiscal do evento em dia.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Documento</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-11 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOC.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Título / Número do Protocolo *</Label>
                <Input
                  required
                  placeholder="Ex: AVCB nº 83921/2026 - Aprovado"
                  className="h-11 rounded-xl text-xs"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Link do Arquivo / PDF Digitalizado *</Label>
                <Input
                  required
                  placeholder="https://... ou caminho do arquivo"
                  className="h-11 rounded-xl text-xs"
                  value={arquivoUrl}
                  onChange={(e) => setArquivoUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data de Validade / Vencimento</Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl text-xs"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Observações / Condicionantes</Label>
                <Textarea
                  rows={3}
                  placeholder="Exigências técnicas para vistoria final..."
                  className="rounded-xl text-xs"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 rounded-xl text-xs font-bold mt-4">
                {isPending ? "Salvando..." : "Salvar Documento"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {docs.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
          <FileText className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhum documento protocolado</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Anexe os laudos técnicos, bombeiros e contratos para prevenir embargos.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {docs.map((d) => {
            const tipoInfo = TIPOS_DOC.find((t) => t.value === d.tipo) || TIPOS_DOC[0];
            const isVencido = d.data_validade && new Date(d.data_validade) < new Date();

            return (
              <Card
                key={d.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-xl bg-muted/60 flex items-center justify-center font-bold text-xs">
                        <FileText className={`size-4 ${tipoInfo.color}`} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground leading-snug">{d.titulo}</h4>
                        <span className="text-[10px] text-muted-foreground">{tipoInfo.label}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      title="Excluir documento"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {d.observacoes && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {d.observacoes}
                    </p>
                  )}

                  {d.data_validade && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {isVencido ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          Vencido em {new Date(d.data_validade).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          Válido até {new Date(d.data_validade).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50">
                  <a
                    href={d.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <Download className="size-3" />
                    <span>Visualizar Arquivo Anexo</span>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
