import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
 Clock, 
 MapPin, 
 FileText, 
 Send, 
 CheckCircle2, 
 Calendar, 
 CreditCard, 
 Briefcase,
 Download,
 AlertCircle,
 HelpCircle,
 Camera
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  recordTimeClock, 
  listEmployeeTimeEntries, 
  listEmployeePayslips, 
  acknowledgePayslip,
  createEmployeeRequest,
  getMyEmployeeRecord,
} from "@/services/hr.functions";
import { formatDateTime, formatTimeOnly } from "@/lib/datetime";

export const Route = createFileRoute("/_store/conta/colaborador")({
  head: () => ({ meta: [{ title: "Espaço do Colaborador | Waesy Hub" }] }),
  loader: async () => {
    try {
      const employee = await getMyEmployeeRecord().catch(() => null);
      return { employee: employee || null };
    } catch (err) {
      console.error("[loader:_store.conta.colaborador] Unhandled error:", err);
      return { employee: null };
    }
  },
  component: ColaboradorPortalPage,
});

function ColaboradorPortalPage() {
  const data = Route.useLoaderData();
  const employee = data?.employee || null;
  const [activeTab, setActiveTab] = useState("ponto");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [requestType, setRequestType] = useState("salary_advance");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);

  const queryClient = useQueryClient();
  const employeeId = employee?.id;

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["my-time-entries", employeeId],
    queryFn: () => listEmployeeTimeEntries({ data: { employeeId } }),
    enabled: !!employeeId,
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ["my-payslips", employeeId],
    queryFn: () => listEmployeePayslips({ data: { employeeId } }),
    enabled: !!employeeId,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    return () => clearInterval(timer);
  }, []);

  const clockMutation = useMutation({
    mutationFn: (entryType: string) =>
      recordTimeClock({
        data: {
          employeeId,
          entryType: entryType as any,
          source: "mobile_pwa",
          geolocation: geoCoords ? { latitude: geoCoords.lat, longitude: geoCoords.lng } : undefined,
        },
      }),
    onSuccess: (_, entryType) => {
      toast.success(`Batida de ponto (${entryType}) registrada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["my-time-entries"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao registrar ponto.");
    },
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      createEmployeeRequest({
        data: {
          employeeId,
          requestType: requestType as any,
          title: requestTitle,
          description: requestDesc,
          amountCents: requestAmount ? Math.round(parseFloat(requestAmount) * 100) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Solicitação enviada para o gestor com sucesso!");
      setRequestTitle("");
      setRequestDesc("");
      setRequestAmount("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao enviar solicitação.");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (payslipId: string) =>
      acknowledgePayslip({ data: { payslipId } }),
    onSuccess: () => {
      toast.success("Recebimento de holerite confirmado digitalmente!");
      queryClient.invalidateQueries({ queryKey: ["my-payslips"] });
    },
  });

  const storeName = employee?.stores?.name || "Empresa Parceira";
  const employeeName = employee?.full_name || "Colaborador";
  const employeeRole = employee?.job_title || "Membro de Equipe";
  const initials =
    employeeName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "CL";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header Estilo Apple HIG com Blur e Elevação */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md shrink-0">
              {initials}
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">{employeeName}</h1>
              <p className="text-xs text-muted-foreground">{employeeRole} • {storeName}</p>
            </div>
          </div>

          {/* Navegação por Abas com Touch Targets de 44px */}
          <div className="flex gap-1 bg-muted/60 p-1 rounded-2xl border border-border w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("ponto")}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "ponto" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ponto Digital
            </button>
            <button
              onClick={() => setActiveTab("holerites")}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "holerites" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Holerites
            </button>
            <button
              onClick={() => setActiveTab("solicitacoes")}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === "solicitacoes" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vales & Férias
            </button>
          </div>
        </div>
      </div>

      {!employee && (
        <div className="max-w-4xl mx-auto px-0 sm:px-4 md:px-0 pt-4">
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Vínculo em Aberto ou em Homologação</p>
              <p className="text-xs text-muted-foreground">
                Seu perfil ainda não está associado a uma folha de pagamento ativa. Solicite ao gestor da sua empresa para vincular seu perfil na equipe da loja.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl min-h-[44px] sm:min-h-[36px] h-11 sm:h-10 text-xs shrink-0">
              <Link to="/conta">Voltar para Conta</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-0 sm:px-4 md:px-0 pt-4 sm:pt-6 space-y-6">
 {activeTab === "ponto" && (
 <div className="space-y-6">
 {/* Relógio Digital Flutuante */}
 <div className="bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
 <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
 <MapPin className="h-3.5 w-3.5" /> GPS Ativo
 </div>

 <div className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-foreground">
 {currentTime.toLocaleTimeString("pt-BR")}
 </div>
 <p className="text-sm text-muted-foreground mt-2 capitalize">
 {currentTime.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
 </p>

 {/* Grid de Botões de Batida de Ponto com 44px+ touch target */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
 <Button
 onClick={() => clockMutation.mutate("clock_in")}
 disabled={clockMutation.isPending}
 className="min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex flex-col gap-0.5 shadow-lg shadow-emerald-600/20"
 >
 <span>Entrada</span>
 <span className="text-[10px] opacity-80 font-normal">Início da jornada</span>
 </Button>
 <Button
 onClick={() => clockMutation.mutate("lunch_out")}
 disabled={clockMutation.isPending}
 variant="outline"
 className="min-h-[52px] rounded-2xl border-border font-bold flex flex-col gap-0.5"
 >
 <span>Saída Almoço</span>
 <span className="text-[10px] text-muted-foreground font-normal">Pausa refeição</span>
 </Button>
 <Button
 onClick={() => clockMutation.mutate("lunch_in")}
 disabled={clockMutation.isPending}
 variant="outline"
 className="min-h-[52px] rounded-2xl border-border font-bold flex flex-col gap-0.5"
 >
 <span>Volta Almoço</span>
 <span className="text-[10px] text-muted-foreground font-normal">Retorno da pausa</span>
 </Button>
 <Button
 onClick={() => clockMutation.mutate("clock_out")}
 disabled={clockMutation.isPending}
 className="min-h-[52px] rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex flex-col gap-0.5 shadow-lg shadow-rose-600/20"
 >
 <span>Saída</span>
 <span className="text-[10px] opacity-80 font-normal">Fim do expediente</span>
 </Button>
 </div>
 </div>

 {/* Histórico Recente de Marcações */}
 <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
 <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
 <Clock className="h-4 w-4 text-primary" /> Batidas Registradas Hoje
 </h3>
 <div className="space-y-2">
 {timeEntries.length === 0 ? (
 <p className="text-xs text-muted-foreground py-4 text-center">
 Nenhuma marcação registrada hoje até o momento.
 </p>
 ) : (
 timeEntries.slice(0, 5).map((entry: any) => (
 <div key={entry.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
 <div className="flex items-center gap-2.5">
 <CheckCircle2 className="h-4 w-4 text-emerald-500" />
 <span className="text-xs font-semibold capitalize">{entry.entry_type.replace("_", " ")}</span>
 </div>
 <span className="font-mono text-xs text-foreground font-bold">
 {formatTimeOnly(entry.recorded_at)}
 </span>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 )}

 {activeTab === "holerites" && (
 <div className="space-y-4">
 <h3 className="font-bold text-base text-foreground">Meus Holerites & Demonstrativos de Pagamento</h3>
 {payslips.length === 0 ? (
 <div className="bg-card p-12 text-center rounded-2xl border border-border text-muted-foreground text-sm">
 Nenhum holerite emitido até o momento.
 </div>
 ) : (
 payslips.map((slip: any) => (
 <div key={slip.id} className="bg-card p-5 rounded-2xl border border-border flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <FileText className="h-8 w-8 text-primary shrink-0" />
 <div>
 <div className="font-bold text-sm text-foreground">Competência {slip.reference_period}</div>
 <div className="text-xs text-muted-foreground">
 Líquido: {(slip.net_salary_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {slip.status !== "acknowledged" ? (
 <Button
 size="sm"
 onClick={() => acknowledgeMutation.mutate(slip.id)}
 className="rounded-xl min-h-[44px] text-xs font-semibold"
 >
 Assinar Recebimento
 </Button>
 ) : (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs py-1 px-2.5 rounded-lg">
 Assinado Digitalmente
 </Badge>
 )}
 {slip.pdf_document_url && (
 <Button variant="outline" size="sm" asChild className="rounded-xl min-h-[44px] min-w-[44px]">
 <a href={slip.pdf_document_url} target="_blank" rel="noopener noreferrer">
 <Download className="h-4 w-4" />
 </a>
 </Button>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 )}

 {activeTab === "solicitacoes" && (
 <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
 <h3 className="font-bold text-base text-foreground">Solicitar Vale, Adiantamento ou Férias</h3>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Tipo de Pedido</label>
 <select
 value={requestType}
 onChange={(e) => setRequestType(e.target.value)}
 className="w-full h-11 min-h-[44px] rounded-xl bg-background border border-border px-3 text-sm"
 >
 <option value="salary_advance">Adiantamento Salarial / Vale</option>
 <option value="vacation">Agendamento de Férias</option>
 <option value="leave_absence">Atestado Médico / Licença</option>
 <option value="reimbursement">Reembolso de Despesa</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Valor Estimado (R$)</label>
 <Input
 placeholder="0,00"
 value={requestAmount}
 onChange={(e) => setRequestAmount(e.target.value)}
 className="min-h-[44px] rounded-xl"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Título Resumido</label>
 <Input
 placeholder="Ex: Adiantamento para despesa emergencial"
 value={requestTitle}
 onChange={(e) => setRequestTitle(e.target.value)}
 className="min-h-[44px] rounded-xl"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-muted-foreground">Justificativa Detalhada</label>
 <textarea
 placeholder="Descreva a razão do pedido para análise do RH..."
 value={requestDesc}
 onChange={(e) => setRequestDesc(e.target.value)}
 className="w-full min-h-[100px] p-3 rounded-xl bg-background border border-border text-sm"
 />
 </div>

 <Button
 onClick={() => requestMutation.mutate()}
 disabled={!requestTitle.trim() || !requestDesc.trim() || requestMutation.isPending}
 className="w-full min-h-[48px] rounded-2xl font-bold"
 >
 <Send className="h-4 w-4 mr-2" /> Enviar Solicitação ao RH
 </Button>
 </div>
 )}
 </div>
 </div>
 );
}
