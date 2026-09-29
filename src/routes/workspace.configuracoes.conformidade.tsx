import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Building2, CheckCircle2, Clock, AlertTriangle, FileText, Phone, Mail, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getStoreMarketplaceCompliance, submitMarketplaceCompliance } from "@/services/marketplace-compliance.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/workspace/configuracoes/conformidade")({
  head: () => ({ meta: [{ title: "Conformidade & Marketplace Oficial | Workspace Waesy" }] }),
  component: WorkspaceConformidadePage,
});

export function WorkspaceConformidadePage() {
  const queryClient = useQueryClient();

  const { data: complianceData, isLoading } = useQuery({
    queryKey: ["store-marketplace-compliance"],
    queryFn: () => getStoreMarketplaceCompliance(),
  });

  const compliance = complianceData?.compliance;

  const [legalName, setLegalName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [sacPhone, setSacPhone] = useState("");
  const [sacEmail, setSacEmail] = useState("");
  const [returnPolicyUrl, setReturnPolicyUrl] = useState("");
  const [fiscalNotes, setFiscalNotes] = useState("");

  useEffect(() => {
    if (compliance) {
      setLegalName(compliance.legal_name || "");
      setCnpj(compliance.cnpj || "");
      setStateRegistration(compliance.state_registration || "");
      setSacPhone(compliance.sac_phone || "");
      setSacEmail(compliance.sac_email || "");
      setReturnPolicyUrl(compliance.return_policy_url || "");
      setFiscalNotes(compliance.fiscal_notes || "");
    }
  }, [compliance]);

  const submitMutation = useMutation({
    mutationFn: submitMarketplaceCompliance,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["store-marketplace-compliance"] });
      toast.success(res.message);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao submeter dados de conformidade.");
    },
  });

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
    let formatted = raw;
    if (raw.length > 12) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    } else if (raw.length > 8) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
    } else if (raw.length > 5) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
    } else if (raw.length > 2) {
      formatted = raw.replace(/^(\d{2})(\d+)/, "$1.$2");
    }
    setCnpj(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim()) {
      toast.error("Informe a Razão Social da empresa.");
      return;
    }
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      toast.error("O CNPJ deve conter exatamente 14 dígitos válidos.");
      return;
    }
    if (!sacPhone.trim() || !sacEmail.trim()) {
      toast.error("Informe o telefone e o e-mail de SAC homologados.");
      return;
    }

    submitMutation.mutate({
      data: {
        legalName: legalName.trim(),
        cnpj: cleanCnpj,
        stateRegistration: stateRegistration.trim() || undefined,
        sacPhone: sacPhone.trim(),
        sacEmail: sacEmail.trim(),
        returnPolicyUrl: returnPolicyUrl.trim() || undefined,
        fiscalNotes: fiscalNotes.trim() || undefined,
      },
    });
  };

  const isApproved = compliance?.status === "APPROVED";
  const isPending = compliance?.status === "PENDING";
  const isSuspended = compliance?.status === "SUSPENDED";

  return (
    <div className="w-full max-w-5xl mx-auto px-0 sm:px-4 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-muted text-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Conformidade do Marketplace Oficial
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Homologação fiscal e selo de garantia de procedência para lojas oficiais verificadas.
          </p>
        </div>

        {compliance && (
          <div>
            {isApproved && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1.5 text-xs font-mono py-1 px-3">
                <CheckCircle2 className="size-3.5" />
                Loja Verificada no Marketplace
              </Badge>
            )}
            {isPending && (
              <Badge variant="secondary" className="gap-1.5 text-xs font-mono py-1 px-3">
                <Clock className="size-3.5" />
                Homologação em Análise
              </Badge>
            )}
            {isSuspended && (
              <Badge variant="destructive" className="gap-1.5 text-xs font-mono py-1 px-3">
                <AlertTriangle className="size-3.5" />
                Conformidade Suspensa
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse rounded-2xl border border-border/60 bg-card">
          Carregando status cadastral e dados fiscais da loja...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Regulatórias */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Segregação de Segurança
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O Waesy divide a experiência comercial em dois mundos transparentes:
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                <li>
                  <strong className="text-foreground">Classificados Locais:</strong> Ofertas livres de pessoas físicas ou microempreendedores sem emissão fiscal obrigatória.
                </li>
                <li>
                  <strong className="text-foreground">Marketplace Verificado:</strong> Empresas registradas com CNPJ ativo, SAC comprovado e garantia contratual de entrega.
                </li>
              </ul>
              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                A validação do CNPJ é executada via algoritmo normativo oficial (Módulo 11 da Receita Federal).
              </div>
            </div>
          </div>

          {/* Formulário Cadastral */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-border/60 bg-card shadow-2xs space-y-5">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-foreground">
                  Dados da Empresa Titular
                </h2>
                <p className="text-xs text-muted-foreground">
                  Preencha os dados oficiais constantes no Cartão CNPJ da Receita Federal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="legalName" className="text-xs font-semibold">Razão Social *</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Ex: Comercial de Alimentos Waesy Ltda"
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cnpj" className="text-xs font-semibold">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="h-10 text-xs font-mono rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="stateRegistration" className="text-xs font-semibold">Inscrição Estadual (Opcional)</Label>
                  <Input
                    id="stateRegistration"
                    value={stateRegistration}
                    onChange={(e) => setStateRegistration(e.target.value)}
                    placeholder="Isento ou número oficial"
                    className="h-10 text-xs font-mono rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sacPhone" className="text-xs font-semibold">Telefone de Atendimento / SAC *</Label>
                  <Input
                    id="sacPhone"
                    value={sacPhone}
                    onChange={(e) => setSacPhone(e.target.value)}
                    placeholder="(49) 99999-9999"
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sacEmail" className="text-xs font-semibold">E-mail de SAC Oficial *</Label>
                  <Input
                    id="sacEmail"
                    type="email"
                    value={sacEmail}
                    onChange={(e) => setSacEmail(e.target.value)}
                    placeholder="suporte@sualoja.com.br"
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="returnPolicyUrl" className="text-xs font-semibold">Link da Política de Trocas e Reembolso (Opcional)</Label>
                  <Input
                    id="returnPolicyUrl"
                    value={returnPolicyUrl}
                    onChange={(e) => setReturnPolicyUrl(e.target.value)}
                    placeholder="https://sualoja.com.br/politica-trocas"
                    className="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="fiscalNotes" className="text-xs font-semibold">Observações Fiscais Adicionais (Opcional)</Label>
                  <Textarea
                    id="fiscalNotes"
                    value={fiscalNotes}
                    onChange={(e) => setFiscalNotes(e.target.value)}
                    placeholder="Ex: Empresa optante pelo Simples Nacional; emissão de NFC-e via contingência autorizada."
                    rows={3}
                    className="text-xs rounded-xl bg-background resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Ao salvar, os dados serão submetidos para conferência da auditoria.
                </p>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="h-11 px-6 rounded-xl text-xs font-bold gap-2"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Validando e Salvando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>{compliance ? "Atualizar Conformidade" : "Submeter para Homologação"}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
