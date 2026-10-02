import { useState, useEffect, useCallback } from "react";
import { FileText, Download, Eye, Search, BookOpen, Shield, Settings, Calendar, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { listCompanyDocuments, acknowledgeCompanyDocumentRead, type CompanyDocumentDTO } from "@/services/hr.functions";

interface EmployeeDocumentsPanelProps {
  storeId?: string;
  employeeId?: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  all: { label: "Todos", icon: FileText, color: "text-foreground" },
  politica: { label: "Políticas", icon: Shield, color: "text-primary" },
  manual: { label: "Manuais", icon: BookOpen, color: "text-blue-500" },
  procedimento: { label: "Procedimentos", icon: Settings, color: "text-amber-500" },
  formulario: { label: "Formulários", icon: FileText, color: "text-emerald-500" },
};

export function EmployeeDocumentsPanel({
  storeId,
  employeeId,
}: EmployeeDocumentsPanelProps) {
  const [documents, setDocuments] = useState<CompanyDocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [readingDocId, setReadingDocId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await listCompanyDocuments({
        data: {
          storeId: storeId ? storeId : undefined,
          category:
            selectedCategory !== "all"
              ? (selectedCategory as any)
              : undefined,
        },
      });
      setDocuments(data);
    } catch (err) {
      console.warn("Erro ao listar documentos:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedCategory]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const handleAcknowledge = async (doc: CompanyDocumentDTO) => {
    if (!employeeId) {
      toast.info("Documento aberto.");
      if (doc.file_url) window.open(doc.file_url, "_blank");
      return;
    }

    setReadingDocId(doc.id);
    try {
      await acknowledgeCompanyDocumentRead({
        data: { documentId: doc.id, employeeId },
      });
      toast.success("Leitura confirmada com sucesso!");
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, has_read: true } : d)),
      );
      if (doc.file_url) window.open(doc.file_url, "_blank");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao confirmar.";
      toast.error(msg);
    } finally {
      setReadingDocId(null);
    }
  };

  const filtered = documents.filter((doc) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      (doc.description && doc.description.toLowerCase().includes(q))
    );
  });

  const requiredCount = documents.filter(
    (d) => d.is_required_reading && !d.has_read,
  ).length;

  return (
    <div className="space-y-6">
      {/* Required Docs Alert */}
      {requiredCount > 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">
                Documentos Obrigatórios Pendentes
              </p>
              <p className="text-muted-foreground">
                Você possui {requiredCount} documento(s) com confirmação de leitura pendente.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedCategory("all")}
            className="rounded-lg h-8 px-3 text-xs border-amber-500/30 text-amber-700 dark:text-amber-300 shrink-0"
          >
            Visualizar Pendentes
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou assunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 min-h-11 text-xs rounded-lg bg-background"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-muted/60 p-1 rounded-lg border border-border/70 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = selectedCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "min-h-9 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer",
                  active
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-3.5", cfg.color)} />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-lg bg-card border border-border/60 text-center space-y-2">
          <FileText className="size-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum documento encontrado
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não há manuais ou políticas registradas nesta categoria no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((doc) => {
            const cfg = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.all;
            const Icon = cfg.icon;

            return (
              <div
                key={doc.id}
                className="p-5 rounded-lg bg-card border border-border/70 hover:border-primary/40 transition-all space-y-3 flex flex-col justify-between shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted/60">
                        <Icon className={cn("size-4", cfg.color)} />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono uppercase"
                      >
                        {cfg.label}
                      </Badge>
                    </div>

                    {doc.is_required_reading && (
                      <Badge
                        variant={doc.has_read ? "outline" : "destructive"}
                        className={cn(
                          "text-[10px] font-semibold gap-1",
                          doc.has_read
                            ? "text-emerald-600 border-emerald-500/30"
                            : "",
                        )}
                      >
                        {doc.has_read ? (
                          <>
                            <CheckCircle2 className="size-3" /> Lido
                          </>
                        ) : (
                          "Obrigatório"
                        )}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    v{doc.version} • {formatDate(doc.created_at)}
                  </span>

                  <Button
                    size="sm"
                    variant={doc.has_read ? "outline" : "default"}
                    onClick={() => void handleAcknowledge(doc)}
                    disabled={readingDocId === doc.id}
                    className="rounded-lg h-8 px-3 text-xs gap-2 cursor-pointer"
                  >
                    {readingDocId === doc.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="size-3.5" />
                        {doc.has_read ? "Acessar" : "Ler & Confirmar"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
