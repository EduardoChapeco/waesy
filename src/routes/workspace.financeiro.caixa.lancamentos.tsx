import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Wallet,
  ArrowLeft,
  Download,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { getActiveRegister, addRegisterEntry } from "@/services/cash.functions";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/financeiro/caixa/lancamentos")({
  head: () => ({ meta: [{ title: "Lançamentos de Caixa | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const register = await getActiveRegister().catch(() => null);
      return { register: register || null };
    } catch (err) {
      console.error("[loader:workspace.financeiro.caixa.lancamentos] Unhandled loader error:", err);
      return { register: null };
    }
  },
  component: CaixaLancamentosPage,
});

function translateMethod(method: string) {
  const map: Record<string, string> = {
    cash: "Dinheiro",
    pix: "Pix",
    credit: "Crédito",
    debit: "Débito",
    other: "Outro",
  };
  return map[method] || method;
}

function renderChannelBadge(source?: string) {
  switch (source) {
    case "mercadolivre":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-medium">Mercado Livre</Badge>;
    case "ifood":
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px] font-medium">iFood</Badge>;
    case "shopee":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-[10px] font-medium">Shopee</Badge>;
    case "amazon":
      return <Badge variant="outline" className="bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border-neutral-500/30 text-[10px] font-medium">Amazon</Badge>;
    case "classifieds":
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-medium">Classificados</Badge>;
    default:
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] font-medium">Loja Física / PDV</Badge>;
  }
}

const COMMON_PRESETS = [
  { label: "Sangria de Segurança", type: "out", desc: "Sangria de segurança para cofre", method: "cash" },
  { label: "Pagamento Motoboy", type: "out", desc: "Diária de entrega / motoboy", method: "cash" },
  { label: "Suprimento de Troco", type: "in", desc: "Suprimento para troco em notas/moedas", method: "cash" },
  { label: "Despesa Café/Limpeza", type: "out", desc: "Compra rápida de suprimentos da loja", method: "cash" },
];

function CaixaLancamentosPage() {
  const { register } = (Route.useLoaderData() as any) || {};
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all");

  const [form, setForm] = useState({
    amountCents: undefined as number | undefined,
    method: "cash" as "cash" | "credit" | "debit" | "pix" | "other",
    description: "",
    type: "in" as "in" | "out",
  });

  // ── KPIS DO TURNO ATUAL ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!register) return { initialCents: 0, inCents: 0, outCents: 0, currentCents: 0, count: 0 };

    let inCents = 0;
    let outCents = 0;

    (register.recentEntries || []).forEach((e: any) => {
      if (e.amount_cents >= 0) {
        inCents += e.amount_cents;
      } else {
        outCents += Math.abs(e.amount_cents);
      }
    });

    const initialCents = register.initial_balance_cents || 0;
    const currentCents = register.currentBalanceCents !== undefined
      ? register.currentBalanceCents
      : initialCents + inCents - outCents;

    return {
      initialCents,
      inCents,
      outCents,
      currentCents,
      count: register.recentEntries?.length || 0,
    };
  }, [register]);

  // ── FILTROS E BUSCA ──────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!register?.recentEntries) return [];

    return register.recentEntries.filter((e: any) => {
      if (typeFilter === "in" && e.amount_cents < 0) return false;
      if (typeFilter === "out" && e.amount_cents >= 0) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const desc = (e.description || e.notes || "").toLowerCase();
        const method = translateMethod(e.method).toLowerCase();
        return desc.includes(term) || method.includes(term);
      }

      return true;
    });
  }, [register, typeFilter, searchTerm]);

  if (!register) {
    return (
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          <Link to="/workspace/financeiro/caixa" className="hover:underline font-semibold">
            Voltar ao Caixa
          </Link>
        </div>
        <PageHeader title="Lançamentos do Caixa" />
        <EmptyState
          title="Nenhum caixa aberto"
          description="Abra um turno no PDV ou no Painel do Caixa para começar a registrar sangrias e suprimentos."
        />
      </div>
    );
  }

  // ── EXPORTAR CSV ─────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    try {
      const headers = ["Data e Hora", "Tipo", "Descricao", "Canal", "Metodo", "Valor (BRL)", "Taxa Canal (BRL)", "Liquido (BRL)"];
      const rows = filteredEntries.map((entry: any) => {
        const isOut = entry.amount_cents < 0;
        const tipo = isOut ? "Saida" : "Entrada";
        const desc = `"${(entry.description || entry.notes || "").replace(/"/g, '""')}"`;
        const canal = entry.channel_source || "PDV";
        const metodo = translateMethod(entry.method);
        const valor = (entry.amount_cents / 100).toFixed(2);
        const taxa = ((entry.marketplace_fee_cents || 0) / 100).toFixed(2);
        const liquido = ((entry.net_payout_cents || (entry.amount_cents - (entry.marketplace_fee_cents || 0))) / 100).toFixed(2);

        return [formatDateTime(entry.created_at), tipo, desc, canal, metodo, valor, taxa, liquido].join(";");
      });

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `extrato_caixa_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Extrato exportado em CSV com sucesso!");
    } catch {
      toast.error("Erro ao gerar arquivo CSV.");
    }
  };

  // ── SUBMIT LANÇAMENTO MANUAL ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = form.amountCents || 0;
    if (cents <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setIsSaving(true);
    try {
      const finalCents = form.type === "out" ? -Math.abs(cents) : Math.abs(cents);
      await addRegisterEntry({
        data: {
          registerId: register.id,
          amountCents: finalCents,
          method: form.method,
          description: form.description || (form.type === "out" ? "Sangria de caixa" : "Suprimento de caixa"),
        },
      });

      if (form.type === "in") {
        playCashRegisterSound();
        toast.success("Suprimento de caixa registrado!");
      } else {
        playWarningAlert();
        toast.info("Sangria de caixa registrada!");
      }

      setOpen(false);
      setForm({
        amountCents: undefined,
        method: "cash",
        description: "",
        type: "in",
      });
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lançamento");
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setForm((f) => ({
      ...f,
      type: preset.type as "in" | "out",
      description: preset.desc,
      method: preset.method as any,
    }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        <Link to="/workspace/financeiro/caixa" className="hover:underline font-semibold">
          Voltar ao Painel do Caixa
        </Link>
      </div>

      <PageHeader
        eyebrow="Financeiro"
        title="Lançamentos & Movimentações do Caixa"
        description="Extrato analítico de vendas, retiradas (sangrias) e aportes de troco (suprimentos) no turno atual."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Exportar CSV</span>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="sm" className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                  <span>Novo Lançamento</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="rounded-l-2xl">
                <SheetHeader>
                  <SheetTitle className="text-base font-bold">Registrar Movimentação Manual</SheetTitle>
                </SheetHeader>

                {/* Presets Rápidos */}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Atalhos Rápidos de Operação
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COMMON_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="text-left p-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        <span className={p.type === "in" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {p.type === "in" ? "(+) " : "(-) "}
                        </span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="entry-type" className="text-xs font-bold">Tipo</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm((f) => ({ ...f, type: v as "in" | "out" }))}
                      >
                        <SelectTrigger id="entry-type" className="rounded-xl text-xs h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="in">Entrada / Suprimento (+)</SelectItem>
                          <SelectItem value="out">Saída / Sangria (-)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="entry-method" className="text-xs font-bold">Forma</Label>
                      <Select
                        value={form.method}
                        onValueChange={(v) => setForm((f) => ({ ...f, method: v as typeof form.method }))}
                      >
                        <SelectTrigger id="entry-method" className="rounded-xl text-xs h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="cash">Dinheiro em Espécie</SelectItem>
                          <SelectItem value="pix">Pix Instantâneo</SelectItem>
                          <SelectItem value="credit">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit">Cartão de Débito</SelectItem>
                          <SelectItem value="other">Outro Meio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="entry-amount" className="text-xs font-bold">Valor (R$)</Label>
                    <CurrencyField
                      id="entry-amount"
                      placeholder="0,00"
                      value={form.amountCents}
                      onChange={(val) => setForm((f) => ({ ...f, amountCents: val }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="entry-desc" className="text-xs font-bold">Descrição / Motivo</Label>
                    <Input
                      id="entry-desc"
                      placeholder="Ex: Retirada para motoboy, troco..."
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="rounded-xl text-xs h-10"
                      required
                      minLength={3}
                    />
                  </div>

                  <SheetFooter className="mt-8">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className={`w-full rounded-xl text-xs font-bold h-10 ${
                        form.type === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                      }`}
                    >
                      {isSaving ? "Salvando..." : form.type === "in" ? "Confirmar Suprimento (+)" : "Confirmar Sangria (-)"}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      {/* ── KPIS DO TURNO ATUAL ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="size-3.5 text-foreground" />
            Fundo de Abertura
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {formatMoney(kpis.initialCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Troco inicial da gaveta
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft className="size-3.5 text-emerald-600" />
            Entradas no Turno (+)
          </span>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            +{formatMoney(kpis.inCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Vendas e suprimentos
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5 text-rose-600" />
            Saídas no Turno (-)
          </span>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            -{formatMoney(kpis.outCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Sangrias e despesas operacionais
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            Saldo Atual Estimado
          </span>
          <div className="text-2xl font-mono font-bold text-primary">
            {formatMoney(kpis.currentCents)}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Disponível em caixa agora
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE & FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição ou método..."
            className="pl-10 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "all"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({register.recentEntries?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("in")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "in"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entradas (+)
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("out")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              typeFilter === "out"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Saídas (-)
          </button>
        </div>
      </div>

      {/* ── TABELA DE LANÇAMENTOS DO TURNO ── */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento no filtro"
          description="Nenhuma movimentação corresponde aos critérios de pesquisa selecionados."
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                  <TableHead className="text-xs font-bold">Descrição / Detalhe</TableHead>
                  <TableHead className="text-xs font-bold">Canal</TableHead>
                  <TableHead className="text-xs font-bold">Forma</TableHead>
                  <TableHead className="text-right text-xs font-bold font-mono">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry: any) => (
                  <TableRow key={entry.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      <div>{entry.description || entry.notes}</div>
                      {entry.marketplace_fee_cents > 0 && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Taxa canal: -{formatMoney(entry.marketplace_fee_cents)} • Líquido: {formatMoney(entry.net_payout_cents || (entry.amount_cents - entry.marketplace_fee_cents))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderChannelBadge(entry.channel_source || entry.channel)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-medium">
                        {translateMethod(entry.method)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs font-bold ${
                        entry.amount_cents >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {entry.amount_cents >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(entry.amount_cents))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
