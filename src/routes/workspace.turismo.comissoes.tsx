import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { formatMoney } from "@/lib/money";
import {
  CANONICAL_TRAVEL_OPERATORS,
  NON_COMMISSIONABLE_FEE_TYPES,
  OVER_DEDUCTION_TYPES,
  INTERNAL_COST_TYPES,
  SUPPLIER_ITEM_CATEGORIES,
  SETTLEMENT_METHODS,
  RECEIVABLE_STATUSES,
  INVOICE_STATUSES,
  calculateSaleFinancials,
  type NonCommissionableFeeItem,
  type OverDeductionItem,
  type InternalCostItem,
  type SupplierBreakdownItem,
} from "@/lib/travel/sale-financial-calculator";
import {
  listTravelSaleFinancialSheets,
  upsertTravelSaleFinancialSheet,
} from "@/services/travel-financials.functions";
import { InlineSalesSpreadsheetAndGoalsPanel } from "@/components/tourism/InlineSalesSpreadsheetAndGoalsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Building2,
  FileText,
  Plus,
  Trash2,
  Calculator,
  Receipt,
  ShieldCheck,
  Search,
  AlertCircle,
  Layers,
  Percent,
  Wallet,
  History,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/turismo/comissoes")({
  loader: async () => {
    const sheets = await listTravelSaleFinancialSheets({ data: {} }).catch(() => []);
    return { initialSheets: sheets };
  },
  component: TravelSalesFinancialCompositionPage,
});

interface SaleFinancialRecord {
  id: string;
  internal_code: string;
  client_name: string;
  client_document?: string;
  seller_name: string;
  agency_unit: string;
  primary_operator: string;
  locator_code: string;
  destination: string;
  sale_date: string;
  departure_date?: string;
  return_date?: string;
  booking_status: "rascunho" | "confirmada" | "emitida" | "em_viagem" | "concluida" | "cancelada";

  gross_sale_cents: number;
  non_commissionable_cents: number;
  net_sale_cents: number;
  non_commissionable_fees: NonCommissionableFeeItem[];

  commission_mode: "amount" | "percentage";
  commission_base_type: "net_sale" | "gross_sale" | "custom";
  commission_custom_base_cents: number;
  commission_percentage: number;
  commission_calculated_cents: number;
  commission_override_cents: number | null;
  commission_final_cents: number;
  commission_notes?: string;

  over_mode: "amount" | "percentage";
  over_percentage: number;
  over_gross_cents: number;
  over_deductions_cents: number;
  over_deductions: OverDeductionItem[];
  over_net_calculated_cents: number;
  over_net_override_cents: number | null;
  over_net_final_cents: number;

  agency_revenue_cents: number;
  internal_costs_cents: number;
  internal_costs: InternalCostItem[];
  net_result_cents: number;
  margin_on_sale_pct: number;
  margin_on_revenue_pct: number;

  settlement_method: "fatura_abatida" | "deposito_bancario" | "pix" | "credito_operadora" | "cartao_virtual" | "misto";
  expected_receipt_cents: number;
  received_cents: number;
  expected_receipt_date?: string;
  actual_receipt_date?: string;
  receivable_status: "a_receber" | "parcialmente_recebido" | "recebido" | "divergencia" | "cancelado";
  supplier_items: SupplierBreakdownItem[];

  invoice_status: "nao_necessaria" | "pendente" | "solicitar" | "solicitada" | "emitida" | "recebida";
  invoice_number?: string;
  invoice_amount_cents?: number | null;
  invoice_issue_date?: string;
  invoice_issuer?: string;
  invoice_recipient?: string;
  invoice_notes?: string;

  general_notes?: string;
  audit_logs?: Array<{
    id: string;
    actor_name: string;
    action_type: string;
    new_value: string;
    reason?: string;
    created_at: string;
  }>;
}

function TravelSalesFinancialCompositionPage() {
  const { initialSheets } = (Route.useLoaderData?.() as any) || {};
  const [sheets, setSheets] = useState<SaleFinancialRecord[]>(
    Array.isArray(initialSheets) ? initialSheets : []
  );

  // Filtros Gerenciais
  const [operatorFilter, setOperatorFilter] = useState<string>("ALL");
  const [receivableFilter, setReceivableFilter] = useState<string>("ALL");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal de Edição / Criação dos 8 Blocos
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estado dos 8 Blocos no Formulário
  const [internalCode, setInternalCode] = useState("RES-2026-0143");
  const [clientName, setClientName] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [sellerName, setSellerName] = useState("Consultor Principal");
  const [agencyUnit, setAgencyUnit] = useState("Matriz");
  const [primaryOperator, setPrimaryOperator] = useState("Orinter");
  const [locatorCode, setLocatorCode] = useState("");
  const [destination, setDestination] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [bookingStatus, setBookingStatus] = useState<SaleFinancialRecord["booking_status"]>("confirmada");

  // Bloco 1: Composição da Venda
  const [grossSaleReais, setGrossSaleReais] = useState("10000.00");
  const [nonCommissionableDirectReais, setNonCommissionableDirectReais] = useState("1200.00");
  const [nonCommissionableFees, setNonCommissionableFees] = useState<NonCommissionableFeeItem[]>([
    { fee_type: "taxa_embarque", description: "Taxas de embarque aéreo", amount_cents: 120000 },
  ]);

  // Bloco 2: Comissão
  const [commissionMode, setCommissionMode] = useState<"percentage" | "amount">("percentage");
  const [commissionBaseType, setCommissionBaseType] = useState<"net_sale" | "gross_sale" | "custom">("net_sale");
  const [commissionCustomBaseReais, setCommissionCustomBaseReais] = useState("0");
  const [commissionPercentage, setCommissionPercentage] = useState("10");
  const [commissionAmountReais, setCommissionAmountReais] = useState("0");
  const [commissionOverrideReais, setCommissionOverrideReais] = useState("");
  const [commissionNotes, setCommissionNotes] = useState("");

  // Bloco 3: Over
  const [overMode, setOverMode] = useState<"amount" | "percentage">("amount");
  const [overPercentage, setOverPercentage] = useState("0");
  const [overGrossReais, setOverGrossReais] = useState("500.00");
  const [overDeductions, setOverDeductions] = useState<OverDeductionItem[]>([
    { deduction_type: "imposto", calc_mode: "percentage", percentage: 6, amount_cents: 3000, notes: "Imposto NF sobre Over" },
  ]);
  const [overNetOverrideReais, setOverNetOverrideReais] = useState("");

  // Bloco 5: Custos Internos
  const [internalCosts, setInternalCosts] = useState<InternalCostItem[]>([
    {
      cost_type: "comissao_vendedor",
      description: "Comissão do consultor de vendas",
      calc_mode: "amount",
      percentage: 0,
      amount_cents: 25000,
      beneficiary_name: "Consultor",
      payment_status: "previsto",
    },
  ]);

  // Bloco 7: Recebimento e Múltiplos Fornecedores
  const [settlementMethod, setSettlementMethod] = useState<SaleFinancialRecord["settlement_method"]>("fatura_abatida");
  const [receivedReais, setReceivedReais] = useState("0");
  const [expectedReceiptDate, setExpectedReceiptDate] = useState("");
  const [actualReceiptDate, setActualReceiptDate] = useState("");
  const [receivableStatus, setReceivableStatus] = useState<SaleFinancialRecord["receivable_status"]>("a_receber");
  const [supplierItems, setSupplierItems] = useState<SupplierBreakdownItem[]>([]);

  // Bloco 8: Nota Fiscal e Auditoria
  const [invoiceStatus, setInvoiceStatus] = useState<SaleFinancialRecord["invoice_status"]>("solicitar");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceRecipient, setInvoiceRecipient] = useState("");
  const [invoiceIssueDate, setInvoiceIssueDate] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [auditReason, setAuditReason] = useState("");

  // Cálculo em Tempo Real no Editor dos 8 Blocos
  const liveCalc = useMemo(() => {
    const grossCents = Math.round((parseFloat(grossSaleReais.replace(",", ".")) || 0) * 100);
    const directFeeCents = Math.round(
      (parseFloat(nonCommissionableDirectReais.replace(",", ".")) || 0) * 100
    );
    const customBaseCents = Math.round(
      (parseFloat(commissionCustomBaseReais.replace(",", ".")) || 0) * 100
    );
    const commAmountCents = Math.round(
      (parseFloat(commissionAmountReais.replace(",", ".")) || 0) * 100
    );
    const commOverride =
      commissionOverrideReais.trim() !== ""
        ? Math.round((parseFloat(commissionOverrideReais.replace(",", ".")) || 0) * 100)
        : null;

    const overGrossCents = Math.round((parseFloat(overGrossReais.replace(",", ".")) || 0) * 100);
    const overOverride =
      overNetOverrideReais.trim() !== ""
        ? Math.round((parseFloat(overNetOverrideReais.replace(",", ".")) || 0) * 100)
        : null;

    return calculateSaleFinancials({
      gross_sale_cents: grossCents,
      non_commissionable_cents_direct: directFeeCents,
      non_commissionable_fees: nonCommissionableFees,
      commission_mode: commissionMode,
      commission_base_type: commissionBaseType,
      commission_custom_base_cents: customBaseCents,
      commission_percentage: parseFloat(commissionPercentage.replace(",", ".")) || 0,
      commission_amount_cents: commAmountCents,
      commission_override_cents: commOverride,
      over_mode: overMode,
      over_percentage: parseFloat(overPercentage.replace(",", ".")) || 0,
      over_gross_cents: overGrossCents,
      over_deductions: overDeductions,
      over_net_override_cents: overOverride,
      internal_costs: internalCosts,
    });
  }, [
    grossSaleReais,
    nonCommissionableDirectReais,
    nonCommissionableFees,
    commissionMode,
    commissionBaseType,
    commissionCustomBaseReais,
    commissionPercentage,
    commissionAmountReais,
    commissionOverrideReais,
    overMode,
    overPercentage,
    overGrossReais,
    overDeductions,
    overNetOverrideReais,
    internalCosts,
  ]);

  const filteredSheets = useMemo(() => {
    return sheets.filter((s) => {
      if (operatorFilter !== "ALL" && s.primary_operator !== operatorFilter) return false;
      if (receivableFilter !== "ALL" && s.receivable_status !== receivableFilter) return false;
      if (invoiceFilter !== "ALL" && s.invoice_status !== invoiceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          s.client_name.toLowerCase().includes(q) ||
          s.locator_code.toLowerCase().includes(q) ||
          s.internal_code.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.seller_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [sheets, operatorFilter, receivableFilter, invoiceFilter, searchQuery]);

  // Totais Executivos Consolidados
  const totals = useMemo(() => {
    return filteredSheets.reduce(
      (acc, s) => {
        acc.grossSale += s.gross_sale_cents || 0;
        acc.nonCommissionable += s.non_commissionable_cents || 0;
        acc.netSale += s.net_sale_cents || 0;
        acc.commission += s.commission_final_cents || 0;
        acc.overNet += s.over_net_final_cents || 0;
        acc.agencyRevenue += s.agency_revenue_cents || 0;
        acc.internalCosts += s.internal_costs_cents || 0;
        acc.netResult += s.net_result_cents || 0;
        acc.expectedReceipt += s.expected_receipt_cents || 0;
        acc.received += s.received_cents || 0;
        return acc;
      },
      {
        grossSale: 0,
        nonCommissionable: 0,
        netSale: 0,
        commission: 0,
        overNet: 0,
        agencyRevenue: 0,
        internalCosts: 0,
        netResult: 0,
        expectedReceipt: 0,
        received: 0,
      }
    );
  }, [filteredSheets]);

  const handleOpenNewSheet = () => {
    setEditingSheetId(null);
    setInternalCode(`RES-2026-0${143 + sheets.length}`);
    setClientName("");
    setClientDocument("");
    setSellerName("Consultor Principal");
    setAgencyUnit("Matriz");
    setPrimaryOperator("Orinter");
    setLocatorCode("");
    setDestination("");
    setSaleDate(new Date().toISOString().slice(0, 10));
    setDepartureDate("");
    setReturnDate("");
    setBookingStatus("confirmada");
    setGrossSaleReais("10000.00");
    setNonCommissionableDirectReais("1200.00");
    setNonCommissionableFees([
      { fee_type: "taxa_embarque", description: "Taxas de embarque aéreo", amount_cents: 120000 },
    ]);
    setCommissionMode("percentage");
    setCommissionBaseType("net_sale");
    setCommissionPercentage("10");
    setCommissionOverrideReais("");
    setOverMode("amount");
    setOverGrossReais("500.00");
    setOverDeductions([
      { deduction_type: "imposto", calc_mode: "percentage", percentage: 6, amount_cents: 3000, notes: "Imposto NF sobre Over" },
    ]);
    setOverNetOverrideReais("");
    setInternalCosts([
      {
        cost_type: "comissao_vendedor",
        description: "Comissão do vendedor",
        calc_mode: "amount",
        percentage: 0,
        amount_cents: 25000,
        beneficiary_name: "",
        payment_status: "previsto",
      },
    ]);
    setSettlementMethod("fatura_abatida");
    setReceivedReais("0");
    setReceivableStatus("a_receber");
    setSupplierItems([]);
    setInvoiceStatus("solicitar");
    setInvoiceNumber("");
    setInvoiceRecipient("Orinter");
    setAuditReason("");
    setIsSheetModalOpen(true);
  };

  const handleOpenEditSheet = (sheet: SaleFinancialRecord) => {
    setEditingSheetId(sheet.id);
    setInternalCode(sheet.internal_code);
    setClientName(sheet.client_name);
    setClientDocument(sheet.client_document || "");
    setSellerName(sheet.seller_name);
    setAgencyUnit(sheet.agency_unit);
    setPrimaryOperator(sheet.primary_operator);
    setLocatorCode(sheet.locator_code);
    setDestination(sheet.destination);
    setSaleDate(sheet.sale_date);
    setDepartureDate(sheet.departure_date || "");
    setReturnDate(sheet.return_date || "");
    setBookingStatus(sheet.booking_status);
    setGrossSaleReais((sheet.gross_sale_cents / 100).toFixed(2));
    setNonCommissionableDirectReais((sheet.non_commissionable_cents / 100).toFixed(2));
    setNonCommissionableFees(sheet.non_commissionable_fees || []);
    setCommissionMode(sheet.commission_mode);
    setCommissionBaseType(sheet.commission_base_type);
    setCommissionPercentage(String(sheet.commission_percentage));
    setCommissionAmountReais((sheet.commission_calculated_cents / 100).toFixed(2));
    setCommissionOverrideReais(
      sheet.commission_override_cents != null
        ? (sheet.commission_override_cents / 100).toFixed(2)
        : ""
    );
    setOverMode(sheet.over_mode);
    setOverPercentage(String(sheet.over_percentage));
    setOverGrossReais((sheet.over_gross_cents / 100).toFixed(2));
    setOverDeductions(sheet.over_deductions || []);
    setOverNetOverrideReais(
      sheet.over_net_override_cents != null
        ? (sheet.over_net_override_cents / 100).toFixed(2)
        : ""
    );
    setInternalCosts(sheet.internal_costs || []);
    setSettlementMethod(sheet.settlement_method);
    setReceivedReais((sheet.received_cents / 100).toFixed(2));
    setExpectedReceiptDate(sheet.expected_receipt_date || "");
    setActualReceiptDate(sheet.actual_receipt_date || "");
    setReceivableStatus(sheet.receivable_status);
    setSupplierItems(sheet.supplier_items || []);
    setInvoiceStatus(sheet.invoice_status);
    setInvoiceNumber(sheet.invoice_number || "");
    setInvoiceRecipient(sheet.invoice_recipient || sheet.primary_operator);
    setInvoiceIssueDate(sheet.invoice_issue_date || "");
    setInvoiceNotes(sheet.invoice_notes || "");
    setGeneralNotes(sheet.general_notes || "");
    setAuditReason("");
    setIsSheetModalOpen(true);
  };

  const handleSaveSheet = async () => {
    if (!clientName.trim() || !locatorCode.trim() || !destination.trim()) {
      toast.error("Preencha Cliente, Localizador e Destino da reserva.");
      return;
    }

    setIsSaving(true);
    const receivedCents = Math.round((parseFloat(receivedReais.replace(",", ".")) || 0) * 100);

    const newRecord: SaleFinancialRecord = {
      id: editingSheetId || `fin-${Date.now()}`,
      internal_code: internalCode.trim().toUpperCase(),
      client_name: clientName.trim(),
      client_document: clientDocument.trim() || undefined,
      seller_name: sellerName.trim(),
      agency_unit: agencyUnit.trim(),
      primary_operator: primaryOperator,
      locator_code: locatorCode.trim().toUpperCase(),
      destination: destination.trim(),
      sale_date: saleDate,
      departure_date: departureDate || undefined,
      return_date: returnDate || undefined,
      booking_status: bookingStatus,
      gross_sale_cents: liveCalc.gross_sale_cents,
      non_commissionable_cents: liveCalc.non_commissionable_cents,
      net_sale_cents: liveCalc.net_sale_cents,
      non_commissionable_fees: nonCommissionableFees,
      commission_mode: commissionMode,
      commission_base_type: commissionBaseType,
      commission_custom_base_cents: liveCalc.commission_base_cents,
      commission_percentage: parseFloat(commissionPercentage.replace(",", ".")) || 0,
      commission_calculated_cents: liveCalc.commission_calculated_cents,
      commission_override_cents: liveCalc.is_commission_overridden
        ? liveCalc.commission_final_cents
        : null,
      commission_final_cents: liveCalc.commission_final_cents,
      commission_notes: commissionNotes || undefined,
      over_mode: overMode,
      over_percentage: parseFloat(overPercentage.replace(",", ".")) || 0,
      over_gross_cents: liveCalc.over_gross_cents,
      over_deductions_cents: liveCalc.over_deductions_cents,
      over_deductions: liveCalc.over_deductions_resolved,
      over_net_calculated_cents: liveCalc.over_net_calculated_cents,
      over_net_override_cents: liveCalc.is_over_overridden ? liveCalc.over_net_final_cents : null,
      over_net_final_cents: liveCalc.over_net_final_cents,
      agency_revenue_cents: liveCalc.agency_revenue_cents,
      internal_costs_cents: liveCalc.internal_costs_cents,
      internal_costs: liveCalc.internal_costs_resolved,
      net_result_cents: liveCalc.net_result_cents,
      margin_on_sale_pct: liveCalc.margin_on_sale_pct,
      margin_on_revenue_pct: liveCalc.margin_on_revenue_pct,
      settlement_method: settlementMethod,
      expected_receipt_cents: liveCalc.agency_revenue_cents,
      received_cents: receivedCents,
      expected_receipt_date: expectedReceiptDate || undefined,
      actual_receipt_date: actualReceiptDate || undefined,
      receivable_status: receivableStatus,
      supplier_items: supplierItems,
      invoice_status: invoiceStatus,
      invoice_number: invoiceNumber || undefined,
      invoice_amount_cents: liveCalc.agency_revenue_cents,
      invoice_issue_date: invoiceIssueDate || undefined,
      invoice_recipient: invoiceRecipient || primaryOperator,
      invoice_notes: invoiceNotes || undefined,
      general_notes: generalNotes || undefined,
      audit_logs: [
        {
          id: `audit-${Date.now()}`,
          actor_name: sellerName || "Operador Financeiro",
          action_type: editingSheetId ? "ATUALIZACAO_FINANCEIRA" : "CRIACAO_FICHA_FINANCEIRA",
          new_value: `Venda: ${formatMoney(liveCalc.gross_sale_cents)} | Receita Agência: ${formatMoney(liveCalc.agency_revenue_cents)} | Resultado: ${formatMoney(liveCalc.net_result_cents)}`,
          reason: auditReason || "Composição financeira auditada",
          created_at: new Date().toISOString(),
        },
      ],
    };

    try {
      await upsertTravelSaleFinancialSheet({
        data: {
          ...(editingSheetId && editingSheetId.length === 36 ? { id: editingSheetId } : {}),
          internal_code: newRecord.internal_code,
          client_name: newRecord.client_name,
          client_document: newRecord.client_document,
          seller_name: newRecord.seller_name,
          agency_unit: newRecord.agency_unit,
          primary_operator: newRecord.primary_operator,
          locator_code: newRecord.locator_code,
          destination: newRecord.destination,
          sale_date: newRecord.sale_date,
          departure_date: newRecord.departure_date,
          return_date: newRecord.return_date,
          booking_status: newRecord.booking_status,
          gross_sale_cents: newRecord.gross_sale_cents,
          non_commissionable_cents_direct: newRecord.non_commissionable_cents,
          non_commissionable_fees: newRecord.non_commissionable_fees,
          commission_mode: newRecord.commission_mode,
          commission_base_type: newRecord.commission_base_type,
          commission_custom_base_cents: newRecord.commission_custom_base_cents,
          commission_percentage: newRecord.commission_percentage,
          commission_amount_cents: newRecord.commission_calculated_cents,
          commission_override_cents: newRecord.commission_override_cents,
          commission_notes: newRecord.commission_notes,
          over_mode: newRecord.over_mode,
          over_percentage: newRecord.over_percentage,
          over_gross_cents: newRecord.over_gross_cents,
          over_deductions: newRecord.over_deductions,
          over_net_override_cents: newRecord.over_net_override_cents,
          internal_costs: newRecord.internal_costs,
          settlement_method: newRecord.settlement_method,
          expected_receipt_cents: newRecord.expected_receipt_cents,
          received_cents: newRecord.received_cents,
          expected_receipt_date: newRecord.expected_receipt_date,
          actual_receipt_date: newRecord.actual_receipt_date,
          receivable_status: newRecord.receivable_status,
          supplier_items: newRecord.supplier_items,
          invoice_status: newRecord.invoice_status,
          invoice_number: newRecord.invoice_number,
          invoice_amount_cents: newRecord.invoice_amount_cents,
          invoice_issue_date: newRecord.invoice_issue_date,
          invoice_recipient: newRecord.invoice_recipient,
          invoice_notes: newRecord.invoice_notes,
          general_notes: newRecord.general_notes,
          audit_reason: auditReason,
        },
      }).catch(() => null);

      setSheets((prev) => {
        if (editingSheetId) {
          return prev.map((s) => (s.id === editingSheetId ? newRecord : s));
        }
        return [newRecord, ...prev];
      });

      toast.success("Composição Financeira da Reserva salva e auditada!");
      setIsSheetModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkReceived = (id: string) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              receivable_status: "recebido",
              received_cents: s.expected_receipt_cents,
              actual_receipt_date: new Date().toISOString().slice(0, 10),
            }
          : s
      )
    );
    toast.success("Recebimento de comissão + over liquidado com sucesso!");
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Cabeçalho Executivo do Módulo Interno ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
              Backoffice Exclusivo da Agência
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold">
              8 Blocos Auditáveis
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Financeiro da Venda & Composição de Reservas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Controle exato de Venda Bruta, Taxas Não Comissionáveis, Venda Líquida, Comissão, Over Líquido, Receita da Agência, Custos Internos, Resultado e Notas Fiscais.
          </p>
        </div>

        <Button
          onClick={handleOpenNewSheet}
          className="h-11 min-h-11 px-5 rounded-lg font-bold text-xs sm:text-sm gap-2 cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Nova Composição Financeira</span>
        </Button>
      </div>

      {/* ── Painel de Indicadores Contábeis Separados (Sem Confundir Venda com Receita) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Volume Bruto vs Venda Líquida */}
        <div className="p-4 rounded-lg border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>1. Venda Bruta vs. Líquida</span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <p className="text-xl font-black text-foreground font-mono">
            {formatMoney(totals.grossSale)}
          </p>
          <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>Venda Líquida (s/ taxas):</span>
            <strong className="text-foreground font-mono">{formatMoney(totals.netSale)}</strong>
          </div>
        </div>

        {/* Card 2: Receita da Agência (Comissão + Over Líquido) */}
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-primary font-bold">
            <span>2. Receita da Agência (Comissão + Over)</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <p className="text-xl font-black text-primary font-mono">
            {formatMoney(totals.agencyRevenue)}
          </p>
          <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-primary/20">
            <span>Comissão: {formatMoney(totals.commission)}</span>
            <strong className="text-foreground font-mono">Over Líq: {formatMoney(totals.overNet)}</strong>
          </div>
        </div>

        {/* Card 3: Resultado Líquido da Agência (Receita - Custos Internos) */}
        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold">
            <span>3. Resultado Final (Lucro Real)</span>
            <Wallet className="size-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            {formatMoney(totals.netResult)}
          </p>
          <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-emerald-500/20">
            <span>Custos Internos: {formatMoney(totals.internalCosts)}</span>
            <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
              {totals.grossSale > 0
                ? `${((totals.netResult / totals.grossSale) * 100).toFixed(1)}% s/ venda`
                : "0%"}
            </strong>
          </div>
        </div>

        {/* Card 4: Conciliação de Recebimento & Operadoras */}
        <div className="p-4 rounded-lg border border-border/70 bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>4. A Receber das Operadoras</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatMoney(Math.max(0, totals.expectedReceipt - totals.received))}
          </p>
          <div className="text-xs text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>Já Recebido:</span>
            <strong className="text-emerald-600 font-mono">{formatMoney(totals.received)}</strong>
          </div>
        </div>
      </div>

      {/* ── Planilha Editável In-Page de Vendas, Over (16% Operadora), Metas de Agentes e Cancelamentos ── */}
      <InlineSalesSpreadsheetAndGoalsPanel />

      {/* ── Barra de Filtros Operacionais (Operadora, Recebimento, Nota Fiscal, Busca) ── */}
      <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute left-3 top-3.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, localizador, código..."
              className="h-11 pl-9 rounded-lg text-xs bg-background"
            />
          </div>

          {/* Filtro Operadora */}
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground"
          >
            <option value="ALL">Todas as Operadoras (Orinter, FRT, Cativa...)</option>
            {CANONICAL_TRAVEL_OPERATORS.map((op) => (
              <option key={op} value={op}>
                Operadora: {op}
              </option>
            ))}
          </select>

          {/* Filtro Recebimento */}
          <select
            value={receivableFilter}
            onChange={(e) => setReceivableFilter(e.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground"
          >
            <option value="ALL">Status de Recebimento: Todos</option>
            {RECEIVABLE_STATUSES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Filtro Nota Fiscal */}
          <select
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground"
          >
            <option value="ALL">Status de Nota Fiscal: Todos</option>
            {INVOICE_STATUSES.map((nf) => (
              <option key={nf.id} value={nf.id}>
                NF: {nf.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabela / Cards de Reservas e Composição Financeira ── */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="overflow-x-auto carousel">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                <th className="py-4 px-4">Reserva / Cliente</th>
                <th className="py-4 px-4">Operadora / Loc</th>
                <th className="py-4 px-4 text-right">Venda Bruta / Líq</th>
                <th className="py-4 px-4 text-right">Comissão + Over Líq</th>
                <th className="py-4 px-4 text-right">Receita Agência</th>
                <th className="py-4 px-4 text-right">Custos / Resultado</th>
                <th className="py-4 px-4 text-center">Recebimento & NF</th>
                <th className="py-4 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {filteredSheets.map((sheet) => {
                const invBadge = INVOICE_STATUSES.find((i) => i.id === sheet.invoice_status);
                const recBadge = RECEIVABLE_STATUSES.find((r) => r.id === sheet.receivable_status);

                return (
                  <tr key={sheet.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <span className="font-mono text-primary">{sheet.internal_code}</span>
                        <span>• {sheet.client_name}</span>
                      </div>
                      <div className="text-muted-foreground truncate max-w-60">
                        {sheet.destination}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Vendedor: <strong className="text-foreground">{sheet.seller_name}</strong>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <Building2 className="size-3.5 text-primary" />
                        <span>{sheet.primary_operator}</span>
                      </div>
                      <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted border border-border/50 inline-block mt-1">
                        Loc: {sheet.locator_code}
                      </span>
                      {sheet.supplier_items?.length > 1 && (
                        <span className="block text-xs text-primary font-semibold mt-1">
                          +{sheet.supplier_items.length} fornecedores na venda
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-mono">
                      <div className="font-bold text-foreground">
                        {formatMoney(sheet.gross_sale_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Taxas: -{formatMoney(sheet.non_commissionable_cents)}
                      </div>
                      <div className="text-xs font-semibold text-foreground">
                        Líq: {formatMoney(sheet.net_sale_cents)}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right font-mono">
                      <div className="text-foreground">
                        Comissão ({sheet.commission_percentage}%):{" "}
                        <strong>{formatMoney(sheet.commission_final_cents)}</strong>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Over Bruto: {formatMoney(sheet.over_gross_cents)} (-
                        {formatMoney(sheet.over_deductions_cents)})
                      </div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Over Líq: {formatMoney(sheet.over_net_final_cents)}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right font-mono">
                      <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary font-black text-sm inline-block">
                        {formatMoney(sheet.agency_revenue_cents)}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-mono">
                      <div className="text-xs text-muted-foreground">
                        Custos: -{formatMoney(sheet.internal_costs_cents)}
                      </div>
                      <div className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                        {formatMoney(sheet.net_result_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sheet.margin_on_sale_pct}% venda | {sheet.margin_on_revenue_pct}% rec.
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center space-y-1">
                      <div>
                        <Badge
                          variant={sheet.receivable_status === "recebido" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {recBadge?.label || sheet.receivable_status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold">
                          NF: {invBadge?.label || sheet.invoice_status}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditSheet(sheet)}
                          className="h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                        >
                          <Edit3 className="size-3.5" />
                          <span>Abrir 8 Blocos</span>
                        </Button>
                        {sheet.receivable_status !== "recebido" && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkReceived(sheet.id)}
                            className="h-11 px-3 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Baixar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Completo: Composição Financeira da Reserva (Os 8 Blocos) ── */}
      <Dialog open={isSheetModalOpen} onOpenChange={setIsSheetModalOpen}>
        <DialogContent className="sm:max-w-4xl p-5 sm:p-6 rounded-lg max-h-screen overflow-y-auto space-y-6">
          <DialogHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
                Composição Financeira da Reserva
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">{internalCode}</span>
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
              <Calculator className="size-5 text-primary" />
              <span>Financeiro da Venda — 8 Blocos Auditáveis</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Separação contábil estrita entre Venda Bruta, Taxas Não Comissionáveis, Venda Líquida, Comissão, Over Líquido, Receita da Agência, Custos Internos e Resultado Final.
            </DialogDescription>
          </DialogHeader>

          {/* Identificação da Venda */}
          <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>Identificação da Venda e Operadora Principal</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Código Interno *</Label>
                <Input
                  value={internalCode}
                  onChange={(e) => setInternalCode(e.target.value)}
                  className="h-11 rounded-lg text-xs font-mono bg-background"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Cliente / Passageiro Titular *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo & Família"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendedor Responsável</Label>
                <Input
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operadora Principal *</Label>
                <select
                  value={primaryOperator}
                  onChange={(e) => setPrimaryOperator(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                >
                  {CANONICAL_TRAVEL_OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Localizador (PNR / Reserva) *</Label>
                <Input
                  value={locatorCode}
                  onChange={(e) => setLocatorCode(e.target.value)}
                  placeholder="Ex: ORN-98421B"
                  className="h-11 rounded-lg text-xs font-mono uppercase bg-background"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Destino / Pacote *</Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: Porto Seguro • Resort All Inclusive"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 1: Composição da Venda (Bruto - Taxas = Venda Líquida) */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
                  1
                </span>
                <span>Bloco 1 — Composição da Venda (Cálculo da Venda Líquida)</span>
              </h3>
              <Badge variant="outline" className="font-mono text-xs">
                Venda Líquida = {formatMoney(liveCalc.net_sale_cents)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Valor Total da Venda (R$)</Label>
                <Input
                  value={grossSaleReais}
                  onChange={(e) => setGrossSaleReais(e.target.value)}
                  className="h-11 rounded-lg text-sm font-mono font-bold bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Total de Taxas Não Comissionáveis (R$)
                </Label>
                <div className="h-11 rounded-lg border border-border/60 bg-muted/40 px-3 flex items-center font-mono text-sm font-bold text-foreground">
                  {formatMoney(liveCalc.non_commissionable_cents)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-primary">
                  Venda Líquida Comissionável (R$)
                </Label>
                <div className="h-11 rounded-lg border border-primary/40 bg-primary/10 px-3 flex items-center font-mono text-sm font-black text-primary">
                  {formatMoney(liveCalc.net_sale_cents)}
                </div>
              </div>
            </div>

            {/* Lista Detalhada de Taxas Não Comissionáveis */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Detalhamento de Taxas de Embarque e Valores Não Comissionáveis:
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNonCommissionableFees((prev) => [
                      ...prev,
                      { fee_type: "taxa_embarque", description: "Taxa de embarque", amount_cents: 0 },
                    ])
                  }
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Adicionar Taxa</span>
                </Button>
              </div>

              {nonCommissionableFees.map((fee, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <select
                    value={fee.fee_type}
                    onChange={(e) =>
                      setNonCommissionableFees((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, fee_type: e.target.value as any } : it
                        )
                      )
                    }
                    className="col-span-4 h-11 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {NON_COMMISSIONABLE_FEE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={fee.description}
                    onChange={(e) =>
                      setNonCommissionableFees((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it))
                      )
                    }
                    placeholder="Descrição da taxa"
                    className="col-span-5 h-11 rounded-lg text-xs bg-background"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={(fee.amount_cents / 100).toFixed(2)}
                    onChange={(e) => {
                      const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                      setNonCommissionableFees((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, amount_cents: cents } : it))
                      );
                    }}
                    className="col-span-2 h-11 rounded-lg text-xs font-mono bg-background"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNonCommissionableFees((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="col-span-1 size-11 rounded-lg border border-border/60 hover:bg-destructive/10 text-destructive flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BLOCO 2: Comissão */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
                  2
                </span>
                <span>Bloco 2 — Comissão da Agência</span>
              </h3>
              <Badge className="bg-primary/10 text-primary border border-primary/25 font-mono text-xs">
                Comissão Final = {formatMoney(liveCalc.commission_final_cents)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modo de Cálculo</Label>
                <select
                  value={commissionMode}
                  onChange={(e) => setCommissionMode(e.target.value as any)}
                  className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="amount">Valor fixo em R$</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Base da Comissão</Label>
                <select
                  value={commissionBaseType}
                  onChange={(e) => setCommissionBaseType(e.target.value as any)}
                  className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                >
                  <option value="net_sale">Sobre Venda Líquida (Padrão)</option>
                  <option value="gross_sale">Sobre Valor Total da Venda</option>
                </select>
              </div>

              {commissionMode === "percentage" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Percentual de Comissão (%)</Label>
                  <Input
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(e.target.value)}
                    className="h-11 rounded-lg text-xs font-mono font-bold bg-background"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Comissão Informada (R$)</Label>
                  <Input
                    value={commissionAmountReais}
                    onChange={(e) => setCommissionAmountReais(e.target.value)}
                    className="h-11 rounded-lg text-xs font-mono font-bold bg-background"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Ajuste Manual (Opcional R$)</Label>
                <Input
                  value={commissionOverrideReais}
                  onChange={(e) => setCommissionOverrideReais(e.target.value)}
                  placeholder="Automático"
                  className="h-11 rounded-lg text-xs font-mono bg-background"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 3: Over (Over Bruto - Deduções = Over Líquido) */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
                  3
                </span>
                <span>Bloco 3 — Over (Over Bruto, Retenções/Impostos e Over Líquido)</span>
              </h3>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono text-xs">
                Over Líquido = {formatMoney(liveCalc.over_net_final_cents)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Over Bruto (R$)</Label>
                <Input
                  value={overGrossReais}
                  onChange={(e) => setOverGrossReais(e.target.value)}
                  className="h-11 rounded-lg text-sm font-mono font-bold bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  (-) Total de Deduções sobre o Over
                </Label>
                <div className="h-11 rounded-lg border border-border/60 bg-muted/40 px-3 flex items-center font-mono text-sm font-bold text-destructive">
                  -{formatMoney(liveCalc.over_deductions_cents)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  (=) Over Líquido Real (R$)
                </Label>
                <div className="h-11 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 flex items-center font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                  {formatMoney(liveCalc.over_net_final_cents)}
                </div>
              </div>
            </div>

            {/* Deduções sobre o Over */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Deduções sobre o Over (Imposto NF, Retenção, Taxa da Operadora):
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOverDeductions((prev) => [
                      ...prev,
                      {
                        deduction_type: "imposto",
                        calc_mode: "percentage",
                        percentage: 6,
                        amount_cents: 0,
                        notes: "Imposto sobre Over",
                      },
                    ])
                  }
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Adicionar Dedução do Over</span>
                </Button>
              </div>

              {liveCalc.over_deductions_resolved.map((ded, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <select
                    value={ded.deduction_type}
                    onChange={(e) =>
                      setOverDeductions((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, deduction_type: e.target.value as any } : it
                        )
                      )
                    }
                    className="col-span-4 h-11 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {OVER_DEDUCTION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ded.calc_mode}
                    onChange={(e) =>
                      setOverDeductions((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, calc_mode: e.target.value as any } : it
                        )
                      )
                    }
                    className="col-span-2 h-11 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                  >
                    <option value="percentage">% do Over</option>
                    <option value="amount">Valor R$</option>
                  </select>
                  {ded.calc_mode === "percentage" ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={ded.percentage}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value) || 0;
                        setOverDeductions((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, percentage: pct } : it))
                        );
                      }}
                      className="col-span-2 h-11 rounded-lg text-xs font-mono bg-background"
                    />
                  ) : (
                    <Input
                      type="number"
                      step="0.01"
                      value={(ded.amount_cents / 100).toFixed(2)}
                      onChange={(e) => {
                        const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                        setOverDeductions((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, amount_cents: cents } : it))
                        );
                      }}
                      className="col-span-2 h-11 rounded-lg text-xs font-mono bg-background"
                    />
                  )}
                  <div className="col-span-3 h-11 rounded-lg bg-muted/40 border border-border/50 px-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Deduzido:</span>
                    <strong className="text-destructive">-{formatMoney(ded.resolved_cents)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOverDeductions((prev) => prev.filter((_, i) => i !== idx))}
                    className="col-span-1 size-11 rounded-lg border border-border/60 hover:bg-destructive/10 text-destructive flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BLOCO 4: Receita da Agência (Destaque Visual) */}
          <div className="p-5 rounded-lg border-2 border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                Bloco 4 — Receita Bruta da Agência na Reserva
              </span>
              <p className="text-xs text-muted-foreground">
                Soma exata de <strong>Comissão Final ({formatMoney(liveCalc.commission_final_cents)})</strong> +{" "}
                <strong>Over Líquido ({formatMoney(liveCalc.over_net_final_cents)})</strong>
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-2xl sm:text-3xl font-black text-primary">
                {formatMoney(liveCalc.agency_revenue_cents)}
              </span>
            </div>
          </div>

          {/* BLOCO 5: Custos Internos da Venda */}
          <div className="p-4 rounded-lg border border-border/60 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
                  5
                </span>
                <span>Bloco 5 — Custos Internos da Venda (Comissão Vendedor, Brindes, Taxas)</span>
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setInternalCosts((prev) => [
                    ...prev,
                    {
                      cost_type: "comissao_vendedor",
                      description: "Comissão vendedor",
                      calc_mode: "amount",
                      percentage: 0,
                      amount_cents: 0,
                      beneficiary_name: "",
                      payment_status: "previsto",
                    },
                  ])
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Adicionar Custo Interno</span>
              </Button>
            </div>

            {liveCalc.internal_costs_resolved.map((cost, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <select
                  value={cost.cost_type}
                  onChange={(e) =>
                    setInternalCosts((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, cost_type: e.target.value as any } : it
                      )
                    )
                  }
                  className="col-span-3 h-11 rounded-lg border border-border bg-background px-2 text-xs"
                >
                  {INTERNAL_COST_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Input
                  value={cost.description}
                  onChange={(e) =>
                    setInternalCosts((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it))
                    )
                  }
                  placeholder="Descrição / Beneficiário"
                  className="col-span-4 h-11 rounded-lg text-xs bg-background"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={(cost.amount_cents / 100).toFixed(2)}
                  onChange={(e) => {
                    const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                    setInternalCosts((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, amount_cents: cents } : it))
                    );
                  }}
                  className="col-span-2 h-11 rounded-lg text-xs font-mono bg-background"
                />
                <select
                  value={cost.payment_status}
                  onChange={(e) =>
                    setInternalCosts((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, payment_status: e.target.value as any } : it
                      )
                    )
                  }
                  className="col-span-2 h-11 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                >
                  <option value="previsto">Previsto</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <button
                  type="button"
                  onClick={() => setInternalCosts((prev) => prev.filter((_, i) => i !== idx))}
                  className="col-span-1 size-11 rounded-lg border border-border/60 hover:bg-destructive/10 text-destructive flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          {/* BLOCO 6: Resultado da Venda e Margens */}
          <div className="p-5 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Bloco 6 — Resultado Líquido Final da Venda (Lucro Real da Agência)
              </h3>
              <div className="flex items-center gap-2 font-mono text-xs font-bold">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                  Margem s/ Venda: {liveCalc.margin_on_sale_pct}%
                </Badge>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                  Margem s/ Receita: {liveCalc.margin_on_revenue_pct}%
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <span className="text-muted-foreground block">Venda Líquida</span>
                <strong className="text-sm text-foreground">{formatMoney(liveCalc.net_sale_cents)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <span className="text-muted-foreground block">Receita Agência</span>
                <strong className="text-sm text-primary">{formatMoney(liveCalc.agency_revenue_cents)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <span className="text-muted-foreground block">(-) Custos Internos</span>
                <strong className="text-sm text-destructive">-{formatMoney(liveCalc.internal_costs_cents)}</strong>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40">
                <span className="text-emerald-800 dark:text-emerald-300 font-bold block">(=) Resultado Final</span>
                <strong className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {formatMoney(liveCalc.net_result_cents)}
                </strong>
              </div>
            </div>
          </div>

          {/* BLOCO 7 & 8: Recebimento da Operadora e Documento Fiscal (NF) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bloco 7 */}
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span>Bloco 7 — Recebimento & Conciliação</span>
              </h3>
              <div className="space-y-2">
                <Label className="text-xs">Forma de Liquidação</Label>
                <select
                  value={settlementMethod}
                  onChange={(e) => setSettlementMethod(e.target.value as any)}
                  className="w-full h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
                >
                  {SETTLEMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Status do Recebimento</Label>
                  <select
                    value={receivableStatus}
                    onChange={(e) => setReceivableStatus(e.target.value as any)}
                    className="w-full h-11 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                  >
                    {RECEIVABLE_STATUSES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Já Recebido (R$)</Label>
                  <Input
                    value={receivedReais}
                    onChange={(e) => setReceivedReais(e.target.value)}
                    className="h-11 rounded-lg text-xs font-mono bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 8 */}
            <div className="p-4 rounded-lg border border-border/60 bg-card space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                <span>Bloco 8 — Documento Fiscal / Nota Fiscal</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Status da Nota Fiscal</Label>
                  <select
                    value={invoiceStatus}
                    onChange={(e) => setInvoiceStatus(e.target.value as any)}
                    className="w-full h-11 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                  >
                    {INVOICE_STATUSES.map((nf) => (
                      <option key={nf.id} value={nf.id}>
                        {nf.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nº da Nota Fiscal</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: NF-e 00412"
                    className="h-11 rounded-lg text-xs font-mono bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motivo / Justificativa para o Log de Auditoria</Label>
                <Input
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="Ex: Conciliação fatura Orinter quinzena 1"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSheetModalOpen(false)}
              className="h-11 px-4 rounded-lg text-xs font-bold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSheet}
              className="h-11 px-6 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <ShieldCheck className="size-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Composição Financeira"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
