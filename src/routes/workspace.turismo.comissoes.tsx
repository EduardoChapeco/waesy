import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  listTravelCommissionAllocations,
  listTravelCommissionRules,
  saveTravelCommissionRule,
  settleTravelCommission,
} from "@/services/travel-commission.functions";

export const Route = createFileRoute("/workspace/turismo/comissoes")({
  head: () => ({ meta: [{ title: "Comissões | Turismo | Waesy" }] }),
  component: TravelCommissionsPage,
});

export default function TravelCommissionsPage() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState("store");
  const [basis, setBasis] = useState("gross");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("5");
  const [fixed, setFixed] = useState("0");
  const [beneficiaryProfileId, setBeneficiaryProfileId] = useState("");
  const [groupTourId, setGroupTourId] = useState("");

  const rulesQuery = useQuery({ queryKey: ["travel-commission-rules"], queryFn: () => listTravelCommissionRules() });
  const allocationsQuery = useQuery({ queryKey: ["travel-commission-allocations"], queryFn: () => listTravelCommissionAllocations({ data: { limit: 100 } }) });

  const saveMutation = useMutation({
    mutationFn: () => saveTravelCommissionRule({
      data: {
        scope: scope as any,
        basis: basis as any,
        name,
        ratePercent: Number(rate.replace(",", ".")) || 0,
        fixedAmountCents: Math.max(0, Math.round(Number(fixed.replace(",", ".")) * 100)),
        beneficiaryProfileId: beneficiaryProfileId || null,
        groupTourId: groupTourId || null,
      },
    }),
    onSuccess: () => {
      toast.success("Regra de comissão salva com snapshot de auditoria.");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["travel-commission-rules"] });
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível salvar a regra."),
  });

  const settleMutation = useMutation({
    mutationFn: (allocationId: string) => settleTravelCommission({ data: { allocationId, reason: "Liquidação aprovada pelo financeiro da agência." } }),
    onSuccess: () => {
      toast.success("Comissão liquidada e certificada no ledger.");
      queryClient.invalidateQueries({ queryKey: ["travel-commission-allocations"] });
    },
    onError: (error: any) => toast.error(error?.message || "Não foi possível liquidar a comissão."),
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Turismo · Financeiro</p><h1 className="mt-1 text-2xl font-black">Motor global de comissões</h1><p className="mt-1 text-sm text-muted-foreground">Precedência: excursão → grupo → colaborador → loja → global. Cada cálculo congela a regra e gera ledger.</p></div>
        <Button variant="outline" onClick={() => { rulesQuery.refetch(); allocationsQuery.refetch(); }}><RefreshCw className="mr-2 size-4" />Atualizar</Button>
      </header>
      <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2"><Plus className="size-4 text-primary" /><h2 className="font-bold">Nova regra versionada</h2></div>
          <div className="space-y-3">
            <div><Label>Escopo</Label><Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="store">Loja</SelectItem><SelectItem value="collaborator">Colaborador</SelectItem><SelectItem value="group">Grupo</SelectItem><SelectItem value="excursion">Excursão</SelectItem></SelectContent></Select></div>
            <div><Label>Nome da regra</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Comissão venda pacote nacional" /></div>
            <div><Label>Base de cálculo</Label><Select value={basis} onValueChange={setBasis}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gross">Valor bruto</SelectItem><SelectItem value="net">Valor líquido operadora</SelectItem><SelectItem value="margin">Margem da agência</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Percentual (%)</Label><Input type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} /></div><div><Label>Fixo (R$)</Label><Input type="number" min="0" step="0.01" value={fixed} onChange={(event) => setFixed(event.target.value)} /></div></div>
            {scope === "collaborator" && <div><Label>ID do colaborador</Label><Input value={beneficiaryProfileId} onChange={(event) => setBeneficiaryProfileId(event.target.value)} placeholder="UUID do perfil" /></div>}
            {(scope === "group" || scope === "excursion") && <div><Label>ID do grupo/excursão</Label><Input value={groupTourId} onChange={(event) => setGroupTourId(event.target.value)} placeholder="UUID do grupo" /></div>}
            <Button className="w-full" disabled={!name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}><ShieldCheck className="mr-2 size-4" />Salvar regra com auditoria</Button>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Regras ativas e precedência</h2><Badge variant="outline">{(rulesQuery.data || []).length} regras</Badge></div><div className="grid gap-2 md:grid-cols-2">{(rulesQuery.data || []).map((rule: any) => <div key={rule.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{rule.name}</span><Badge>{rule.scope}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Base: {rule.basis} · {rule.rate_percent}% {rule.fixed_amount_cents ? `+ R$ ${(rule.fixed_amount_cents / 100).toFixed(2)}` : ""}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">prioridade {rule.priority} · {rule.is_active ? "ativa" : "inativa"}</p></div>)}{!(rulesQuery.data || []).length && <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>}</div></Card>
          <Card className="p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Comissões calculadas</h2><Badge variant="outline">{(allocationsQuery.data || []).length} alocações</Badge></div><div className="space-y-2">{(allocationsQuery.data || []).map((allocation: any) => <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><div className="flex items-center gap-2"><Banknote className="size-4 text-primary" /><span className="font-semibold">R$ {(Number(allocation.commission_amount_cents || 0) / 100).toFixed(2)}</span><Badge variant="outline">{allocation.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{allocation.travel_commission_rules?.name || "Regra"} · base R$ {(Number(allocation.base_cents || 0) / 100).toFixed(2)} · {allocation.basis}</p><p className="font-mono text-[10px] text-muted-foreground">beneficiário {allocation.beneficiary_profile_id}</p></div>{allocation.status !== "paid" && <Button size="sm" variant="outline" disabled={settleMutation.isPending} onClick={() => settleMutation.mutate(allocation.id)}><CheckCircle2 className="mr-2 size-4" />Liquidar</Button>}</div>)}{!(allocationsQuery.data || []).length && <p className="text-sm text-muted-foreground">As comissões calculadas para vendas turísticas aparecerão aqui.</p>}</div></Card>
        </div>
      </div>
    </main>
  );
}
