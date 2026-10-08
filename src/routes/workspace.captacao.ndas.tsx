import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, ArrowLeft, ShieldCheck, Calendar, Mail, User, Building, Globe, FileCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/commerce/page-header";
import { ErrorState } from "@/components/state/states";
import { listStoreAllNdaSignatures } from "@/services/classifieds.functions";

export const Route = createFileRoute("/workspace/captacao/ndas")({
  head: () => ({ meta: [{ title: "Auditoria de NDAs Assinados | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const ndas = await listStoreAllNdaSignatures().catch(() => []);
      return { ndas: ndas || [] };
    } catch (err) {
      console.warn("[workspace.captacao.ndas] Loader fallback:", err);
      return { ndas: [] };
    }
  },
  component: WorkspaceCaptacaoNdasPage,
});

function WorkspaceCaptacaoNdasPage() {
  const loaderData = Route.useLoaderData();

  const { data: ndas = loaderData.ndas, isError } = useQuery({
    queryKey: ["workspace", "nda-signatures-all"],
    queryFn: () => listStoreAllNdaSignatures(),
    initialData: loaderData.ndas,
  });

  if (isError && ndas.length === 0) {
    return <ErrorState title="Não foi possível carregar os NDAs" description="O registro de assinaturas está temporariamente indisponível." />;
  }
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── CABEÇALHO & VOLTAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <NativeBackButton fallbackHref="/workspace/captacao" />
          <div className="space-y-1">
            <PageHeader title="Confidencialidade" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Auditoria jurídica de investidores e compradores qualificados que assinaram termo digital de sigilo para ver métricas e DREs restritos.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-mono px-3 py-1 gap-2 self-start sm:self-auto border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="size-3.5" />
          <span>{ndas.length} Termos Válidos (LGPD Compliant)</span>
        </Badge>
      </div>

      {/* ── LISTAGEM DE ASSINATURAS ── */}
      <div className="bg-card rounded-lg border border-border/70 overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="size-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Registro de Assinaturas Digitais
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {ndas.length} assinante{ndas.length === 1 ? "" : "s"}
          </span>
        </div>

        {ndas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Lock className="size-10 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Nenhuma assinatura de NDA registrada ainda</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Assim que investidores acessarem seus anúncios confidenciais e assinarem o termo digital de sigilo, seus registros auditáveis aparecerão aqui.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-lg text-xs font-semibold">
              <Link to="/workspace/captacao">
                <span>Ver Minhas Empresas Listadas</span>
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* ── BIFURCAÇÃO MOBILE: WhatsApp List Edge-to-Edge (<640px) ── */}
            <div className="block sm:hidden divide-y divide-border/40">
              {ndas.map((sig: any) => {
                const dateStr = sig.signedAt
                  ? new Date(sig.signedAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Data não registrada";

                return (
                  <div key={sig.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-sm text-foreground flex items-center gap-2">
                          <User className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">{sig.signerName}</span>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{sig.signerEmail}</span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-bold shrink-0">
                        Assinado
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-foreground bg-muted/30 p-3 rounded-lg min-h-11">
                      <Building className="size-4 text-primary shrink-0" />
                      <span className="truncate font-medium">{sig.classifiedTitle}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="size-3" />
                        {sig.ipAddress}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── BIFURCAÇÃO DESKTOP: Tabela Corporativa Densa (>=640px) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border/40 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-3 px-4 sm:px-5">Investidor / Comprador</th>
                    <th className="py-3 px-4 sm:px-5">Documento (LGPD)</th>
                    <th className="py-3 px-4 sm:px-5">Empresa / Ponto Alvo</th>
                    <th className="py-3 px-4 sm:px-5">Data e Hora</th>
                    <th className="py-3 px-4 sm:px-5">Telemetria IP</th>
                    <th className="py-3 px-4 sm:px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ndas.map((sig: any) => {
                    const dateStr = sig.signedAt
                      ? new Date(sig.signedAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Data não registrada";

                    return (
                      <tr key={sig.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-4 sm:px-5">
                          <div className="space-y-1">
                            <div className="font-bold text-foreground flex items-center gap-2">
                              <User className="size-3 text-muted-foreground" />
                              <span>{sig.signerName}</span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Mail className="size-2.5" />
                              <span>{sig.signerEmail}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-5 font-mono text-muted-foreground">
                          {sig.signerDocumentMasked}
                        </td>

                        <td className="py-4 px-4 sm:px-5">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Building className="size-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-52">{sig.classifiedTitle}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-5 font-mono text-muted-foreground text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" />
                            <span>{dateStr}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-5 font-mono text-muted-foreground text-xs">
                          <div className="flex items-center gap-1">
                            <Globe className="size-3 text-muted-foreground" />
                            <span>{sig.ipAddress}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 sm:px-5 text-right">
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs font-bold">
                            Assinado
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
