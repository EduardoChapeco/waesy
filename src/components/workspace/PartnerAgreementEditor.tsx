"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Building2, 
  ShieldCheck, 
  Save, 
  Loader2, 
  Info, 
  HelpCircle, 
  Percent, 
  DollarSign, 
  FileText, 
  Check, 
  Scale, 
  Layers, 
  CheckCircle2, 
  PenTool,
  AlertCircle
} from "lucide-react";
import { getPartnerAgreement, savePartnerAgreement } from "@/services/services-erp.functions";
import { DigitalSignatureCanvas } from "@/components/workspace/DigitalSignatureCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PartnerAgreementEditorProps {
  members: any[];
  storeId?: string;
}

export function PartnerAgreementEditor({ members }: PartnerAgreementEditorProps) {
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(members[0]?.id || "");
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  const [form, setForm] = useState({
    is_partner_law: true,
    receives_commission: true,
    is_stockkeeper: false,
    date_filter_mode: "availability" as "competence" | "availability",
    order_status_filter: "finalized" as "all" | "finalized",
    gateway_fee_bearer: "proportional" as "proportional" | "store_100" | "pro_100" | "split_50",
    discount_bearer: "store_100" as "proportional" | "store_100" | "pro_100" | "split_50",
    additional_cost_deduction: true,
    consumed_products_deduction: "pro_commission" as "pro_commission" | "service_net" | "none",
    consumed_products_price_basis: "cost_price" as "none" | "cost_price" | "sale_price" | "pro_special_price",
    admin_fee_active: false,
    admin_fee_percentage: 0,
    admin_fee_base: "net" as "gross" | "net",
    show_gross_value_report: true,
    digital_signature_url: "" as string | null,
    declaration_template: "Conforme disposto na Lei nº 13.352/2016 (Lei do Salão Parceiro), as partes convencionam que as cotas-partes de serviços executados serão repassadas deduzindo-se estritamente os encargos e insumos operacionais pactuados.",
  });

  const { data: agreementData, isLoading } = useQuery({
    queryKey: ["partner-agreement", selectedEmployeeId],
    queryFn: () => getPartnerAgreement({ data: { employeeId: selectedEmployeeId } }),
    enabled: Boolean(selectedEmployeeId),
  });

  useEffect(() => {
    if (agreementData) {
      setForm({
        is_partner_law: agreementData.is_partner_law ?? true,
        receives_commission: agreementData.receives_commission ?? true,
        is_stockkeeper: agreementData.is_stockkeeper ?? false,
        date_filter_mode: agreementData.date_filter_mode || "availability",
        order_status_filter: agreementData.order_status_filter || "finalized",
        gateway_fee_bearer: agreementData.gateway_fee_bearer || "proportional",
        discount_bearer: agreementData.discount_bearer || "store_100",
        additional_cost_deduction: agreementData.additional_cost_deduction ?? true,
        consumed_products_deduction: agreementData.consumed_products_deduction || "pro_commission",
        consumed_products_price_basis: agreementData.consumed_products_price_basis || "cost_price",
        admin_fee_active: agreementData.admin_fee_active ?? false,
        admin_fee_percentage: Number(agreementData.admin_fee_percentage) || 0,
        admin_fee_base: agreementData.admin_fee_base || "net",
        show_gross_value_report: agreementData.show_gross_value_report ?? true,
        digital_signature_url: agreementData.digital_signature_url || null,
        declaration_template: agreementData.declaration_template || form.declaration_template,
      });
    }
  }, [agreementData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await savePartnerAgreement({
        data: {
          employee_id: selectedEmployeeId,
          ...form,
        },
      });
    },
    onSuccess: () => {
      toast.success("Acordo de parceria jurídica atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["partner-agreement", selectedEmployeeId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar contrato de parceria.");
    },
  });

  const selectedMember = members.find((m) => m.id === selectedEmployeeId);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Cabeçalho da Lei do Salão Parceiro */}
        <div className="p-4 sm:p-5 rounded-lg bg-card border border-border/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Scale className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Acordo Jurídico & Segregação de Repasses</span>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                    Lei nº 13.352/2016
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Garante a bitributação zero: os tributos recaem apenas sobre a receita retida do salão, repassando a cota-parte líquida ao profissional.
                </p>
              </div>
            </div>

            {/* Seletor do Colaborador */}
            <div className="min-w-60">
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Profissional / Parceiro</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-11 rounded-lg text-xs font-bold">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.full_name || m.email || "Sem nome"} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            <span>Carregando cláusulas do contrato...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bloco 1: Critérios de Apuração Financeira */}
            <div className="bg-card rounded-lg border border-border/70 p-4 sm:p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span>Critérios de Apuração & Competência</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Modo de Filtro de Datas */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground">Regime de Data do Relatório</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        No modo Disponibilidade, o repasse ocorre somente quando o caixa efetivamente recebe ou quando o recebível do cartão for compensado. No modo Competência, conta a data em que o serviço foi executado.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={form.date_filter_mode}
                    onValueChange={(val: any) => setForm({ ...form, date_filter_mode: val })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="availability" className="text-xs font-medium">
                        Data de Disponibilidade (Liquidação no Caixa)
                      </SelectItem>
                      <SelectItem value="competence" className="text-xs font-medium">
                        Data de Competência (Execução do Atendimento)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status da Comanda */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground">Exigência de Finalização</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Bloqueia o comissionamento de agendamentos ainda em andamento ou comandas abertas.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={form.order_status_filter}
                    onValueChange={(val: any) => setForm({ ...form, order_status_filter: val })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="finalized" className="text-xs font-medium">
                        Apenas Comandas Concluídas e Liquidadas
                      </SelectItem>
                      <SelectItem value="all" className="text-xs font-medium">
                        Todas as Comandas (Inclusive Abertas)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bloco 2: Rateio de Encargos e Descontos */}
            <div className="bg-card rounded-lg border border-border/70 p-4 sm:p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Percent className="size-4 text-primary" />
                <span>Rateio de Taxas de Cartão & Descontos</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quem paga as taxas do gateway */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground">Taxas de Cartão / Gateway</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Define quem assume a tarifa MDR da maquininha ou intermediador de pagamentos online.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={form.gateway_fee_bearer}
                    onValueChange={(val: any) => setForm({ ...form, gateway_fee_bearer: val })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="proportional" className="text-xs font-medium">
                        Proporcional à Fatia de Comissão (%)
                      </SelectItem>
                      <SelectItem value="store_100" className="text-xs font-medium">
                        Estabelecimento Absorve 100%
                      </SelectItem>
                      <SelectItem value="pro_100" className="text-xs font-medium">
                        Profissional Parceiro Paga 100%
                      </SelectItem>
                      <SelectItem value="split_50" className="text-xs font-medium">
                        Dividido Meio a Meio (50% / 50%)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quem absorve os descontos comerciais */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground">Descontos Oferecidos ao Cliente</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Quando um cupom ou abatimento é concedido na recepção, quem arca com a redução.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={form.discount_bearer}
                    onValueChange={(val: any) => setForm({ ...form, discount_bearer: val })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="store_100" className="text-xs font-medium">
                        Estabelecimento Absorve 100%
                      </SelectItem>
                      <SelectItem value="proportional" className="text-xs font-medium">
                        Rateado Proporcionalmente
                      </SelectItem>
                      <SelectItem value="pro_100" className="text-xs font-medium">
                        Profissional Parceiro Absorve 100%
                      </SelectItem>
                      <SelectItem value="split_50" className="text-xs font-medium">
                        Dividido Meio a Meio (50% / 50%)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bloco 3: Insumos, Custos e Produtos Consumidos */}
            <div className="bg-card rounded-lg border border-border/70 p-4 sm:p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span>Dedução de Insumos & Custos Operacionais</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dedução de Insumos */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground">Produtos Consumidos no Procedimento</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        O valor dos produtos usados (ex: tinturas, ampolas, descartáveis) é abatido da comissão do profissional ou do valor bruto do serviço.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={form.consumed_products_deduction}
                    onValueChange={(val: any) => setForm({ ...form, consumed_products_deduction: val })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="pro_commission" className="text-xs font-medium">
                        Descontar da Comissão do Profissional
                      </SelectItem>
                      <SelectItem value="service_net" className="text-xs font-medium">
                        Deduzir da Receita Bruta Antes da Comissão
                      </SelectItem>
                      <SelectItem value="none" className="text-xs font-medium">
                        Não Descontar Insumos
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Base de Preço do Insumo */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold text-foreground">Preço-Base dos Insumos Usados</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Qual tabela de preços do inventário será utilizada para valorar os insumos consumidos.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={form.consumed_products_price_basis}
                    onValueChange={(val: any) => setForm({ ...form, consumed_products_price_basis: val })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="cost_price" className="text-xs font-medium">
                        Preço de Custo Real da Empresa
                      </SelectItem>
                      <SelectItem value="pro_special_price" className="text-xs font-medium">
                        Preço Especial para Parceiros
                      </SelectItem>
                      <SelectItem value="sale_price" className="text-xs font-medium">
                        Preço de Venda do Catálogo
                      </SelectItem>
                      <SelectItem value="none" className="text-xs font-medium">
                        Nenhum (Gratuito)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bloco 4: Assinatura Digital do Termo de Acordo */}
            <div className="bg-card rounded-lg border border-border/70 p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <PenTool className="size-4 text-primary" />
                    <span>Termo de Parceria & Assinatura Digital</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assinatura eletrônica com validade jurídica e carimbo forense (IP/Timestamp).
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSignatureModalOpen(true)}
                  className="h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                >
                  <PenTool className="size-3.5 text-primary" />
                  <span>{form.digital_signature_url ? "Atualizar Assinatura" : "Coletar Assinatura"}</span>
                </Button>
              </div>

              {form.digital_signature_url && (
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded border bg-background flex items-center justify-center overflow-hidden">
                      <img src={form.digital_signature_url} alt="Assinatura" className="max-h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        Termo Assinado Eletronicamente
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Colaborador: {selectedMember?.full_name || "Membro"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold">
                    Válido
                  </Badge>
                </div>
              )}
            </div>

            {/* Botão de Salvar */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !selectedEmployeeId}
                className="h-11 px-6 rounded-lg text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    <span>Gravando Acordo...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>Salvar Acordo do Parceiro</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Modal de Coleta de Assinatura */}
        {signatureModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg max-w-lg w-full p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <PenTool className="size-4 text-primary" />
                  Assinatura do Profissional Parceiro
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSignatureModalOpen(false)}
                  className="size-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <DigitalSignatureCanvas
                onSave={(dataUrl) => {
                  setForm({ ...form, digital_signature_url: dataUrl });
                  setSignatureModalOpen(false);
                  toast.success("Assinatura coletada com sucesso!");
                }}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
