import React, { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Copy,
  Check,
  FileSignature,
  DollarSign,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit3,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { dispatchDocumentViaStoreWhatsApp } from "@/services/whatsapp-messaging.functions";
import { settleCommercialInvoicePayment } from "@/services/financial-settlement.functions";
import { formatMoney } from "@/lib/money";
import {
  getNextInvoiceSequence,
  getStoreCommercialPaymentConfig,
  createCommercialInvoice,
  convertInvoiceToContract,
  type CommercialInvoiceDTO,
  type CommercialInvoiceItemSchema,
  type StoreCommercialPaymentConfig,
} from "@/services/commercial-invoices.functions";
import { BudgetCorporateClean } from "./templates/BudgetCorporateClean";
import type { CommercialDocumentData, CommercialBudgetItem } from "./types";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";
import { useNavigate } from "@tanstack/react-router";

interface CommercialBudgetPadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomerId?: string;
  initialLeadId?: string;
  initialClientData?: {
    name?: string;
    companyName?: string;
    cpfOrCnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
    cityState?: string;
  };
  initialItems?: Array<{
    title: string;
    sku?: string;
    unit?: string;
    quantity: number;
    unitPriceCents: number;
    discountCents?: number;
  }>;
}

interface PadItem {
  id: string;
  title: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPriceStr: string;
  discountStr: string;
}

export function CommercialBudgetPadSheet({
  open,
  onOpenChange,
  initialCustomerId,
  initialLeadId,
  initialClientData,
  initialItems,
}: CommercialBudgetPadSheetProps) {
  const navigate = useNavigate();

  // Modo: "edit" (Bloco de Notas / Talonário) ou "preview" (Folha de Papel A4 Oficial)
  const [activeView, setActiveView] = useState<"edit" | "preview">("edit");

  // Código Sequencial
  const [invoiceCode, setInvoiceCode] = useState<string>("#ORC-2026-0001");
  const [docType, setDocType] = useState<"budget" | "invoice" | "receipt" | "work_order">("budget");
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Dados do Cliente
  const [clientName, setClientName] = useState(initialClientData?.name || "");
  const [clientCompany, setClientCompany] = useState(initialClientData?.companyName || "");
  const [clientDoc, setClientDoc] = useState(initialClientData?.cpfOrCnpj || "");
  const [clientPhone, setClientPhone] = useState(initialClientData?.phone || "");
  const [clientEmail, setClientEmail] = useState(initialClientData?.email || "");
  const [clientAddress, setClientAddress] = useState(initialClientData?.address || "");
  const [clientCityState, setClientCityState] = useState(initialClientData?.cityState || "");

  // Itens do Bloco
  const [items, setItems] = useState<PadItem[]>([
    {
      id: "item-1",
      title: "",
      sku: "",
      unit: "un",
      quantity: 1,
      unitPriceStr: "0,00",
      discountStr: "0,00",
    },
  ]);

  // Fechamento Financeiro & Formas Configuradas pela Loja (SSOT)
  const [storePaymentConfig, setStorePaymentConfig] = useState<StoreCommercialPaymentConfig | null>(null);
  const [globalDiscountStr, setGlobalDiscountStr] = useState("0,00");
  const [shippingStr, setShippingStr] = useState("0,00");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [paymentMethodLabel, setPaymentMethodLabel] = useState<string>("PIX Instantâneo");
  const [installments, setInstallments] = useState(1);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [validDays, setValidDays] = useState(10);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<CommercialInvoiceDTO | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Carregar Configurações de Pagamento e Sequência Contínua ao Abrir
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoadingCode(true);

    // 1. Sequência Contínua
    getNextInvoiceSequence({ data: { documentType: docType } })
      .then((res) => {
        if (isMounted && res?.nextCode) {
          setInvoiceCode(res.nextCode);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingCode(false);
      });

    // 2. Configurações Reais de Pagamento da Loja (SSOT)
    getStoreCommercialPaymentConfig({})
      .then((cfg) => {
        if (isMounted && cfg) {
          setStorePaymentConfig(cfg);
          if (cfg.availableMethods && cfg.availableMethods.length > 0) {
            const defaultMethod = cfg.availableMethods[0];
            setPaymentMethod(defaultMethod.id);
            setPaymentMethodLabel(defaultMethod.label);
            if (defaultMethod.discountPercentage && defaultMethod.discountPercentage > 0) {
              // Informa o lojista sobre o desconto configurado da loja
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [open, docType]);

  // Hidratar Itens Iniciais se Fornecidos
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(
        initialItems.map((it, idx) => ({
          id: `item-${idx + 1}`,
          title: it.title,
          sku: it.sku || "",
          unit: it.unit || "un",
          quantity: it.quantity || 1,
          unitPriceStr: (it.unitPriceCents / 100).toFixed(2).replace(".", ","),
          discountStr: ((it.discountCents || 0) / 100).toFixed(2).replace(".", ","),
        })),
      );
    }
  }, [initialItems]);

  // Cálculos Financeiros em Centavos
  const parseCurrency = (val: string): number => {
    const clean = val.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const calculatedItems = useMemo(() => {
    return items.map((it) => {
      const unitCents = parseCurrency(it.unitPriceStr);
      const discountCents = parseCurrency(it.discountStr);
      const subtotalCents = unitCents * it.quantity;
      const totalCents = Math.max(0, subtotalCents - discountCents);
      return {
        ...it,
        unitCents,
        discountCents,
        totalCents,
      };
    });
  }, [items]);

  const subtotalCents = useMemo(() => {
    return calculatedItems.reduce((acc, it) => acc + it.totalCents, 0);
  }, [calculatedItems]);

  const globalDiscountCents = useMemo(() => parseCurrency(globalDiscountStr), [globalDiscountStr]);
  const shippingCents = useMemo(() => parseCurrency(shippingStr), [shippingStr]);

  const totalCents = useMemo(() => {
    return Math.max(0, subtotalCents - globalDiscountCents + shippingCents);
  }, [subtotalCents, globalDiscountCents, shippingCents]);

  const selectedMethodObj = useMemo(() => {
    return storePaymentConfig?.availableMethods.find((m) => m.id === paymentMethod) || null;
  }, [storePaymentConfig, paymentMethod]);

  const installmentValueCents = useMemo(() => {
    if (installments <= 1) return totalCents;
    return Math.round(totalCents / installments);
  }, [totalCents, installments]);

  // Manipulação de Linhas do Bloco
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        title: "",
        sku: "",
        unit: "un",
        quantity: 1,
        unitPriceStr: "0,00",
        discountStr: "0,00",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.info("O orçamento precisa de pelo menos um item.");
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PadItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Salvar Orçamento no Banco
  const handleSaveInvoice = async () => {
    if (!clientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    const validItems = calculatedItems.filter((it) => it.title.trim().length > 0);
    if (validItems.length === 0) {
      toast.error("Adicione a descrição de pelo menos um item ao bloco.");
      return;
    }

    setIsSaving(true);
    try {
      const validUntilDate = new Date();
      validUntilDate.setDate(validUntilDate.getDate() + validDays);

      const payload = {
        customerId: initialCustomerId || null,
        leadId: initialLeadId || null,
        documentType: docType,
        customer: {
          name: clientName.trim(),
          companyName: clientCompany.trim(),
          cpfOrCnpj: clientDoc.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          address: clientAddress.trim(),
          cityState: clientCityState.trim(),
        },
        items: validItems.map((it) => ({
          title: it.title.trim(),
          sku: it.sku.trim(),
          unit: it.unit,
          quantity: it.quantity,
          unitPriceCents: it.unitCents,
          discountCents: it.discountCents,
          totalPriceCents: it.totalCents,
        })),
        subtotalCents,
        discountCents: globalDiscountCents,
        shippingCents,
        totalCents,
        paymentTerms: {
          method: paymentMethod,
          methodLabel: paymentMethodLabel,
          installmentsCount: installments,
          installmentValueCents,
          notes: paymentNotes.trim(),
          pixKey: storePaymentConfig?.pixKey || "",
          paymentInstructions: storePaymentConfig?.paymentInstructions || "",
          discountPercentage: selectedMethodObj?.discountPercentage || 0,
        },
        notes: notes.trim(),
        validUntil: validUntilDate.toISOString().split("T")[0],
      };

      const res = await createCommercialInvoice({ data: payload });
      if (res?.invoice) {
        setSavedInvoice(res.invoice);
        toast.success(`Orçamento ${res.invoice.invoice_code} salvo com sucesso!`);
      }
    } catch (err: any) {
      toast.error(`Falha ao salvar: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Converter Orçamento em Contrato Digital
  const handleConfirmConvertContract = async () => {
    if (!savedInvoice?.id) {
      toast.info("Salve o orçamento antes de convertê-lo em contrato.");
      await handleSaveInvoice();
      return;
    }

    setIsConverting(true);
    try {
      const res = await convertInvoiceToContract({
        data: {
          invoiceId: savedInvoice.id,
          templateId: selectedTemplateId,
        },
      });

      if (res?.contractId) {
        toast.success(`Contrato gerado com sucesso a partir de ${res.invoiceCode}!`);
        setContractModalOpen(false);
        onOpenChange(false);
        navigate({ to: "/workspace/contratos/$id/editor", params: { id: res.contractId } });
      }
    } catch (err: any) {
      toast.error(`Falha ao converter contrato: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Copiar Link Público
  const handleCopyLink = () => {
    if (!savedInvoice?.public_token) {
      toast.info("Salve o orçamento para gerar o link público compartilhável.");
      return;
    }
    const url = `${window.location.origin}/_store/fatura/${savedInvoice.public_token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Link público do orçamento copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Enviar por WhatsApp
  const handleSendWhatsApp = () => {
    const phone = clientPhone.replace(/\D/g, "");
    if (!phone) {
      toast.error("Informe o telefone ou WhatsApp do cliente.");
      return;
    }

    const url = savedInvoice?.public_token
      ? `${window.location.origin}/_store/fatura/${savedInvoice.public_token}`
      : "";

    const msg = `Olá ${clientName.trim()}! Segue seu orçamento ${invoiceCode} no valor total de ${formatMoney(totalCents)}.\n${url ? `Acesse os detalhes e aceite em: ${url}` : ""}`;

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Document Data para o Preview em Papel A4
  const previewDocumentData: CommercialDocumentData = useMemo(() => {
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validDays);

    return {
      id: savedInvoice?.id || "preview-id",
      code: invoiceCode,
      title: `Orçamento Comercial · ${invoiceCode}`,
      category: "budget",
      status: "draft",
      issueDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
      validUntilDate: new Intl.DateTimeFormat("pt-BR").format(validUntilDate),
      issuer: savedInvoice?.issuer_snapshot || {
        companyName: "Minha Empresa Parceira",
        cnpjOrCpf: "00.000.000/0001-00",
        address: "Av. Brasil, Centro",
        cityState: "São Miguel do Oeste - SC",
        phoneOrWhatsapp: "(49) 99999-0000",
        email: "contato@waesy.com",
        pixKey: storePaymentConfig?.pixKey || "",
      },
      client: {
        name: clientName || "Nome do Cliente",
        companyName: clientCompany || undefined,
        cnpjOrCpf: clientDoc || "000.000.000-00",
        address: clientAddress || "Endereço do cliente",
        cityState: clientCityState || "Cidade - UF",
        email: clientEmail || "cliente@email.com",
        phone: clientPhone || "(00) 00000-0000",
      },
      items: calculatedItems.map((it) => ({
        id: it.id,
        sku: it.sku,
        title: it.title || "Item sem descrição",
        quantity: it.quantity,
        unitPriceCents: it.unitCents,
        totalPriceCents: it.totalCents,
      })),
      subtotalCents,
      discountCents: globalDiscountCents,
      totalCents,
      paymentTerms: {
        method: paymentMethod,
        methodLabel: paymentMethodLabel,
        installmentsCount: installments,
        installmentValueCents,
        notes: paymentNotes || `${installments}x de ${formatMoney(installmentValueCents)}`,
        pixKey: storePaymentConfig?.pixKey || "",
        paymentInstructions: storePaymentConfig?.paymentInstructions || "",
      },
      legalNotes: notes || "Proposta sujeita a disponibilidade e alteração sem aviso prévio.",
    };
  }, [
    savedInvoice,
    invoiceCode,
    validDays,
    clientName,
    clientCompany,
    clientDoc,
    clientAddress,
    clientCityState,
    clientEmail,
    clientPhone,
    calculatedItems,
    subtotalCents,
    globalDiscountCents,
    totalCents,
    paymentMethod,
    paymentMethodLabel,
    storePaymentConfig,
    installments,
    installmentValueCents,
    paymentNotes,
    notes,
  ]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col h-full bg-background">
          {/* Header Superior com Alternador de Visualização */}
          <SheetHeader className="p-4 sm:p-6 border-b border-border bg-card shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs px-2 py-1 border-primary/30 text-primary">
                    {isLoadingCode ? "Carregando..." : invoiceCode}
                  </Badge>
                  <Select
                    value={docType}
                    onValueChange={(val: any) => setDocType(val)}
                  >
                    <SelectTrigger className="h-11 min-h-11 text-xs w-36 border-dashed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Orçamento</SelectItem>
                      <SelectItem value="invoice">Fatura</SelectItem>
                      <SelectItem value="receipt">Recibo</SelectItem>
                      <SelectItem value="work_order">Ordem de Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  Bloco de Orçamento & Fatura Comercial
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Preencha os itens no bloco tipo papel, calcule totais em tempo real e integre a contratos com 1 clique.
                </SheetDescription>
              </div>

              {/* Botões de Alternância: Modo Bloco vs Modo Fatura A4 */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-muted p-1 rounded-lg">
                <Button
                  type="button"
                  variant={activeView === "edit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("edit")}
                  className="h-11 min-h-11 text-xs font-medium px-4"
                >
                  <Edit3 className="size-4 mr-2" />
                  Bloco de Notas
                </Button>
                <Button
                  type="button"
                  variant={activeView === "preview" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView("preview")}
                  className="h-11 min-h-11 text-xs font-medium px-4"
                >
                  <Eye className="size-4 mr-2" />
                  Fatura de Papel A4
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Conteúdo Rolável Principal */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeView === "preview" ? (
              // ── MODO 1: PRÉVIA DA FOLHA DE PAPEL A4 ──
              <div className="bg-muted/30 p-4 rounded-lg flex flex-col items-center">
                <div className="w-full flex justify-end gap-2 mb-4 print:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 min-h-11 px-4 text-xs font-bold"
                    onClick={() => window.print()}
                  >
                    <Printer className="size-4 mr-2" />
                    Imprimir A4
                  </Button>
                </div>
                <BudgetCorporateClean data={previewDocumentData} />
              </div>
            ) : (
              // ── MODO 2: EDIÇÃO INTERATIVA NO BLOCO DE PEDIDOS ──
              <div className="space-y-6">
                {/* 1. Bloco de Dados do Cliente */}
                <div className="border border-border/70 rounded-lg p-4 bg-card/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <User className="size-4 text-primary" />
                    <span>Dados do Cliente / Destinatário</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Nome / Razão Social *</Label>
                      <Input
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: João da Silva ou Silva Construtora"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CPF ou CNPJ</Label>
                      <Input
                        value={clientDoc}
                        onChange={(e) => setClientDoc(e.target.value)}
                        placeholder="000.000.000-00"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone / WhatsApp</Label>
                      <Input
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(49) 99999-0000"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cidade / UF</Label>
                      <Input
                        value={clientCityState}
                        onChange={(e) => setClientCityState(e.target.value)}
                        placeholder="Chapecó - SC"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Grade de Itens do Bloco de Orçamento */}
                <div className="border border-border/70 rounded-lg overflow-hidden bg-card space-y-0">
                  <div className="flex items-center justify-between p-3 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <FileText className="size-4 text-primary" />
                      <span>Itens do Bloco Comercial</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="h-11 min-h-11 px-4 text-xs font-bold"
                    >
                      <Plus className="size-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {/* design-lint-ignore DL-30 reason:"Tabela horizontal do bloco de orcamento responsiva" expiry:"2030-01-01" */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/20 text-muted-foreground border-b border-border/70">
                        <tr>
                          <th className="py-3 px-3 text-left font-semibold">Descrição do Item / Produto / Serviço *</th>
                          <th className="py-3 px-2 text-center font-semibold w-24">Unidade</th>
                          <th className="py-3 px-2 text-center font-semibold w-20">Qtd</th>
                          <th className="py-3 px-2 text-right font-semibold w-28">Preço Unit. (R$)</th>
                          <th className="py-3 px-2 text-right font-semibold w-24">Desc. (R$)</th>
                          <th className="py-3 px-3 text-right font-semibold w-28">Total (R$)</th>
                          <th className="py-3 px-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {items.map((it, idx) => {
                          const calc = calculatedItems[idx];
                          return (
                            <tr key={it.id} className="hover:bg-muted/10 transition-colors">
                              <td className="p-2">
                                <Input
                                  value={it.title}
                                  onChange={(e) => handleUpdateItem(idx, "title", e.target.value)}
                                  placeholder="Digite o serviço, bem ou produto..."
                                  className="h-11 min-h-11 text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Select
                                  value={it.unit}
                                  onValueChange={(val) => handleUpdateItem(idx, "unit", val)}
                                >
                                  <SelectTrigger className="h-11 min-h-11 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="un">un</SelectItem>
                                    <SelectItem value="hr">hr</SelectItem>
                                    <SelectItem value="m²">m²</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="diária">diária</SelectItem>
                                    <SelectItem value="pacote">pct</SelectItem>
                                    <SelectItem value="serviço">serv</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={it.quantity}
                                  onChange={(e) => handleUpdateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                  className="h-11 min-h-11 text-xs text-center"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  value={it.unitPriceStr}
                                  onChange={(e) => handleUpdateItem(idx, "unitPriceStr", e.target.value)}
                                  placeholder="0,00"
                                  className="h-11 min-h-11 text-xs text-right font-mono"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  value={it.discountStr}
                                  onChange={(e) => handleUpdateItem(idx, "discountStr", e.target.value)}
                                  placeholder="0,00"
                                  className="h-11 min-h-11 text-xs text-right font-mono"
                                />
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-foreground">
                                {formatMoney(calc?.totalCents || 0)}
                              </td>
                              <td className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="size-11 min-size-11 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Fechamento Comercial & Condições de Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Condições de Pagamento */}
                  <div className="border border-border/70 rounded-lg p-4 bg-card/60 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Condições de Pagamento
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Forma de Pagamento</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={(val: any) => {
                            setPaymentMethod(val);
                            const found = storePaymentConfig?.availableMethods.find((m) => m.id === val);
                            if (found) {
                              setPaymentMethodLabel(found.label);
                              // Aplica desconto configurado no Pix ou na forma caso exista
                              if (found.discountPercentage && found.discountPercentage > 0) {
                                const calculatedDisc = Math.round((subtotalCents * found.discountPercentage) / 100);
                                setGlobalDiscountStr((calculatedDisc / 100).toFixed(2).replace(".", ","));
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 min-h-11 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {storePaymentConfig?.availableMethods && storePaymentConfig.availableMethods.length > 0 ? (
                              storePaymentConfig.availableMethods.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="pix">PIX Instantâneo</SelectItem>
                                <SelectItem value="boleto">Boleto Bancário</SelectItem>
                                <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                                <SelectItem value="carne">Carnê / Crediário</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro em Espécie</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Parcelas</Label>
                        <Select
                          value={String(installments)}
                          onValueChange={(val) => setInstallments(parseInt(val))}
                        >
                          <SelectTrigger className="h-11 min-h-11 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(
                              { length: storePaymentConfig?.maxInstallments || 12 },
                              (_, i) => i + 1,
                            ).map((n) => {
                              const isInterestFree = n <= (storePaymentConfig?.interestFreeInstallments || 1);
                              return (
                                <SelectItem key={n} value={String(n)}>
                                  {n === 1
                                    ? "1x (À Vista)"
                                    : `${n}x de ${formatMoney(Math.round(totalCents / n))}${isInterestFree ? " (sem juros)" : ""}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Validade da Proposta</Label>
                      <Select
                        value={String(validDays)}
                        onValueChange={(val) => setValidDays(parseInt(val))}
                      >
                        <SelectTrigger className="h-11 min-h-11 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 dias corridos</SelectItem>
                          <SelectItem value="10">10 dias corridos</SelectItem>
                          <SelectItem value="15">15 dias corridos</SelectItem>
                          <SelectItem value="30">30 dias corridos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Observações / Termos Especiais</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Prazo de entrega de 5 dias úteis. Garantia legal de 90 dias."
                        className="text-xs resize-none h-20"
                      />
                    </div>

                    {/* Informações Reais de Pagamento da Loja (SSOT) */}
                    {storePaymentConfig?.pixKey && (
                      <div className="p-3 rounded-lg bg-card border border-border/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">Chave Pix Cadastrada:</span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {storePaymentConfig.pixKeyType.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="font-mono text-primary font-semibold select-all break-all">
                          {storePaymentConfig.pixKey}
                        </p>
                        {storePaymentConfig.paymentInstructions && (
                          <p className="text-muted-foreground pt-1 italic text-xs">
                            {storePaymentConfig.paymentInstructions}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resumo Financeiro do Talonário */}
                  <div className="border border-border/70 rounded-lg p-4 bg-muted/20 space-y-3 flex flex-col justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Resumo Financeiro
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal dos Itens:</span>
                        <span className="font-mono font-medium">{formatMoney(subtotalCents)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Desconto Global:</span>
                        <div className="w-32">
                          <Input
                            value={globalDiscountStr}
                            onChange={(e) => setGlobalDiscountStr(e.target.value)}
                            placeholder="0,00"
                            className="h-11 min-h-11 text-xs text-right font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Frete / Deslocamento:</span>
                        <div className="w-32">
                          <Input
                            value={shippingStr}
                            onChange={(e) => setShippingStr(e.target.value)}
                            placeholder="0,00"
                            className="h-11 min-h-11 text-xs text-right font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-baseline justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Total Líquido
                        </span>
                        {installments > 1 && (
                          <span className="text-2xs text-muted-foreground">
                            {installments}x de {formatMoney(installmentValueCents)}
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black font-mono text-primary">
                        {formatMoney(totalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé Fixo com Ações Canônicas (Altura 44px / Piso WCAG) */}
          <SheetFooter className="p-4 border-t border-border bg-card shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-11 min-h-11 px-4 text-xs font-medium"
              >
                {copiedLink ? <Check className="size-4 mr-2 text-emerald-600" /> : <Copy className="size-4 mr-2" />}
                Copiar Link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenWhatsAppMenu}
                className="h-11 min-h-11 px-4 text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                <WhatsappLogo className="size-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContractModalOpen(true)}
                className="h-11 min-h-11 px-4 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
              >
                <FileSignature className="size-4 mr-2" />
                Gerar Contrato Digital
              </Button>

              <Button
                type="button"
                onClick={handleSaveInvoice}
                disabled={isSaving}
                className="h-11 min-h-11 px-5 text-xs font-bold"
              >
                {isSaving ? <Loader2 className="size-4 mr-2 animate-spin motion-reduce:animate-none" /> : <Check className="size-4 mr-2" />}
                Salvar Orçamento
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      
      {/* ── DIÁLOGO DE LIQUIDAÇÃO FINANCEIRA & SPLIT DE COMISSÃO ── */}
      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
              <DollarSign className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Liquidar Fatura & Divisão Financeira</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirme o recebimento do valor bruto, informe o custo líquido de repasse ao fornecedor/operadora e defina o split de comissão do consultor. O valor entrará imediatamente no Caixa Geral da empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Valor Bruto Recebido</Label>
                <div className="h-11 min-h-11 px-3 bg-muted rounded-lg flex items-center font-mono font-bold text-foreground text-xs">
                  {formatMoney(totalCents)}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                <Select
                  value={settlementMethod}
                  onValueChange={(val: any) => setSettlementMethod(val)}
                >
                  <SelectTrigger className="h-11 min-h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX Instantâneo</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="bank_slip">Boleto Bancário</SelectItem>
                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="cash">Dinheiro em Espécie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Custo Fornecedor / Operadora (R$)</Label>
                <Input
                  value={operatorCostStr}
                  onChange={(e) => setOperatorCostStr(e.target.value)}
                  placeholder="0,00"
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">% Comissão do Consultor</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={consultantCommissionPercent}
                  onChange={(e) => setConsultantCommissionPercent(Number(e.target.value) || 0)}
                  className="h-11 min-h-11 text-xs font-mono"
                />
              </div>
            </div>

            {/* Quadro Resumo do Split */}
            <div className="p-4 rounded-lg bg-muted/40 border border-border/70 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Margem Bruta da Agência:</span>
                <span className="font-mono font-bold text-foreground">{formatMoney(agencyMarginCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Comissão do Consultor ({consultantCommissionPercent}%):</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatMoney(consultantCommissionCents)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-baseline">
                <span className="font-bold text-foreground">Retenção Líquida Agência:</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMoney(agencyNetRetentionCents)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettleModalOpen(false)}
              disabled={isSettling}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSettlement}
              disabled={isSettling}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2"
            >
              {isSettling ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  Liquidando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Confirmar e Injetar no Caixa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  
      {/* ── DIÁLOGO DE SELEÇÃO DE MINUTA JURÍDICA PARA GERAR CONTRATO ── */}
      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
              <FileSignature className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Converter Orçamento em Contrato Digital
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione a minuta jurídica. O sistema irá autopreencher 100% dos dados (cliente, itens, valores e prazos) e abrir o contrato pronto para selagem e assinatura digital.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Minuta Jurídica Canônica</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADVANCED_CONTRACT_TEMPLATES.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>
                      {tmpl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border border-border/70 text-xs space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Cliente:</span>
                <span className="font-semibold text-foreground">{clientName || "Não informado"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Itens Discriminados:</span>
                <span className="font-semibold text-foreground">{calculatedItems.length} item(ns)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Valor Total Contratado:</span>
                <span className="font-bold text-primary font-mono">{formatMoney(totalCents)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setContractModalOpen(false)}
              className="h-11 min-h-11 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmConvertContract}
              disabled={isConverting}
              className="h-11 min-h-11 text-xs font-bold"
            >
              {isConverting ? (
                <Loader2 className="size-4 mr-2 animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Gerar e Abrir Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
