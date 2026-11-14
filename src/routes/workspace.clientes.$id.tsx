import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { User, Save, MapPin, ShieldCheck, FileText, Mail, Phone, AlertTriangle, Gift, HeartPulse, Calendar, CreditCard, History, Tag, TrendingUp, Plane, Users2, Smartphone, ExternalLink, Copy, Award, Luggage, QrCode, CheckCircle2, ChevronRight, Share2, Compass, Armchair, Utensils, Receipt, Megaphone, Lock, Plus, Trash2, Printer, Check, MoreHorizontal } from "lucide-react";
import { CommercialBudgetPadSheet } from "@/components/documents/CommercialBudgetPadSheet";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/state/states";
import { getCustomer360, updateCustomer, updateCustomerCrm, addCustomerClinicalRecord, grantCustomerStoreCredit, saveTravelerPreferences } from "@/services/crm.functions";
import { DocumentsPanel } from "@/components/crm/DocumentsPanel";
import { formatMoney } from "@/lib/money";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { Customer360PrintableDossier } from "@/components/dossier/customer-360-printable-dossier";
import { recordLeadOrCustomerConsent, revokeConsentAction } from "@/services/legal-telemetry.functions";
import { CANONICAL_LEGAL_POLICIES, type LegalPolicyType, type ConsentRecordItem } from "@/types/legal-consent";

export const Route = createFileRoute("/workspace/clientes/$id")({
  head: () => ({ meta: [{ title: "Ficha do Cliente | Workspace" }] }),
  loader: async ({ params }) => {
    try {
      return await getCustomer360({ data: { customerId: params.id } });
    } catch (err) {
      console.error("[loader:workspace.clientes.$id] Unhandled loader error:", err);
      return null as any;
    }
  },
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const data = Route.useLoaderData() as any;
  const { id } = Route.useParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("timeline");
  const [isBudgetPadOpen, setIsBudgetPadOpen] = useState(false);

  // CRM State
  const [notes, setNotes] = useState(data?.crm?.notes || "");
  const [tags, setTags] = useState(data?.crm?.tags ? data.crm.tags.join(", ") : "");
  const [isSavingCrm, setIsSavingCrm] = useState(false);

  // Modal de Concessão de Crédito
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [isSavingCredit, setIsSavingCredit] = useState(false);
  const [isExportingDossier, setIsExportingDossier] = useState(false);

  // Governança LGPD & Consentimentos Forenses
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isPhysicalConsentModalOpen, setIsPhysicalConsentModalOpen] = useState(false);
  const [physicalPolicyType, setPhysicalPolicyType] = useState<LegalPolicyType>("privacy_policy");
  const [physicalProofUrl, setPhysicalProofUrl] = useState("");
  const [physicalOperatorName, setPhysicalOperatorName] = useState("");
  const [isRegisteringPhysical, setIsRegisteringPhysical] = useState(false);

  const handleRegisterPhysicalConsent = async () => {
    if (!physicalOperatorName.trim()) {
      toast.error("Informe o nome do consultor/operador responsável.");
      return;
    }
    setIsRegisteringPhysical(true);
    try {
      const canonical = CANONICAL_LEGAL_POLICIES[physicalPolicyType];
      await recordLeadOrCustomerConsent({
        data: {
          customerId: id,
          storeId: data?.profile?.store_id || "default",
          policyType: physicalPolicyType,
          policyTitle: canonical.title,
          policyVersion: canonical.defaultVersion,
          policyContent: canonical.defaultContent,
          method: "physical_document",
          operatorName: physicalOperatorName.trim(),
          physicalProofUrl: physicalProofUrl.trim() || undefined,
        },
      });
      toast.success("Consentimento presencial registrado com telemetria probatória.");
      setIsPhysicalConsentModalOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar termo presencial.");
    } finally {
      setIsRegisteringPhysical(false);
    }
  };

  const handleRevokeConsent = async (policyType: string) => {
    try {
      await revokeConsentAction({
        data: {
          customerId: id,
          policyType,
          reason: "Revogação solicitada pelo titular (Art. 18 da LGPD)",
        },
      });
      toast.success("Consentimento revogado conforme Art. 18 da LGPD.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao revogar consentimento.");
    }
  };

  const handleExportDossierPdf = async () => {
    setIsExportingDossier(true);
    try {
      const cleanName = (data?.profile?.name || "cliente").replace(/\s+/g, "_");
      await exportElementAsPdf("customer-360-dossier", `Dossie_360_${cleanName}.pdf`);
      toast.success("Dossiê 360° em PDF baixado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar Dossiê 360° em PDF.");
    } finally {
      setIsExportingDossier(false);
    }
  };

  // Modal de Prontuário / Anamnese (Padrão Belasis 360°)
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);
  const [serviceTitle, setServiceTitle] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [emergencyContact, setEmergencyContact] = useState(data?.profile?.emergencyContactPhone || data?.profile?.emergencyContactName || "");
  const [preferredProfessional, setPreferredProfessional] = useState("");
  const [isSavingClinical, setIsSavingClinical] = useState(false);

  // Modal de Preferências do Viajante & Anamnese
  const [isTravelerModalOpen, setIsTravelerModalOpen] = useState(false);
  const [seatPref, setSeatPref] = useState(data?.travelerPreferences?.seat_preference || "window");
  const [mealPref, setMealPref] = useState(data?.travelerPreferences?.meal_preference || "standard");
  const [passportNum, setPassportNum] = useState(data?.travelerPreferences?.passport?.number || "");
  const [passportCountry, setPassportCountry] = useState(data?.travelerPreferences?.passport?.issuingCountry || "Brasil");
  const [passportExpiry, setPassportExpiry] = useState(data?.travelerPreferences?.passport?.expiryDate || "");
  const [airlineMiles, setAirlineMiles] = useState(
    (data?.travelerPreferences?.frequent_flyer_programs || []).map((f: any) => `${f.airline}: ${f.accountNumber}`).join(", ")
  );
  const [visasInput, setVisasInput] = useState(
    (data?.travelerPreferences?.visas || []).map((v: any) => `${v.country} (${v.visaType})`).join(", ")
  );
  const [dietaryAllergies, setDietaryAllergies] = useState(
    data?.travelerPreferences?.special_assistance?.dietaryAllergies || ""
  );
  const [isPcd, setIsPcd] = useState(Boolean(data?.travelerPreferences?.special_assistance?.pcd));
  const [isWheelchair, setIsWheelchair] = useState(Boolean(data?.travelerPreferences?.special_assistance?.wheelchair));
  const [isSavingTraveler, setIsSavingTraveler] = useState(false);

  // ── Guard defensivo: loader pode retornar null em falha ─────────────────────
  if (!data?.profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <User className="size-10 text-muted-foreground" />
        <h2 className="font-bold text-lg text-foreground">Cliente não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Este registro pode ter sido removido ou você não tem permissão para visualizá-lo.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.history.back() : router.navigate({ to: "/workspace/crm" }))}
          className="cursor-pointer"
        >
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  const handleSharePortalLink = () => {
    const leadToken = data.commercialLeads?.[0]?.id || id;
    const url = `${window.location.origin}/m/lead/${leadToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link da Central do Passageiro copiado!");
    if (data.profile.phone) {
      const clean = data.profile.phone.replace(/\D/g, "");
      const msg = encodeURIComponent(`Olá ${data.profile.name}! Acesse sua Central do Passageiro para preencher seus acompanhantes e preferências de viagem: ${url}`);
      window.open(`https://wa.me/55${clean}?text=${msg}`, "_blank");
    }
  };

  const handleSaveTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTraveler(true);
    try {
      const frequentFlyerPrograms = airlineMiles
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => {
          const [airline, accountNumber] = p.split(":").map((s: string) => s.trim());
          return { airline: airline || "Cia", program: "Fidelidade", accountNumber: accountNumber || airline };
        });

      const visas = visasInput
        .split(",")
        .map((v: string) => v.trim())
        .filter(Boolean)
        .map((v: string) => ({ country: v, visaType: "Turismo" }));

      await saveTravelerPreferences({
        data: {
          customerId: id,
          seatPreference: seatPref,
          mealPreference: mealPref,
          passport: passportNum ? {
            number: passportNum.trim(),
            issuingCountry: passportCountry.trim(),
            expiryDate: passportExpiry || null,
          } : null,
          frequentFlyerPrograms,
          visas,
          specialAssistance: {
            pcd: isPcd,
            wheelchair: isWheelchair,
            dietaryAllergies: dietaryAllergies || null,
          },
        },
      });
      toast.success("Preferências do passageiro atualizadas com sucesso!");
      setIsTravelerModalOpen(false);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar preferências.");
    } finally {
      setIsSavingTraveler(false);
    }
  };

  const handleSaveCrm = async () => {
    setIsSavingCrm(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
      await updateCustomerCrm({ data: { customerId: id, notes: notes || null, tags: tagsArray } });
      toast.success("Ficha do cliente atualizada com sucesso!");
      router.invalidate();
    } catch {
      toast.error("Erro ao atualizar ficha do cliente.");
    } finally {
      setIsSavingCrm(false);
    }
  };

  const handleGrantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(creditAmount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Informe um valor de crédito válido.");
      return;
    }
    setIsSavingCredit(true);
    try {
      await grantCustomerStoreCredit({
        data: {
          customerId: id,
          amountCents: Math.round(amountVal * 100),
          description: creditDescription.trim() || "Crédito / Troca / Bonificação",
        },
      });
      toast.success("Crédito concedido com sucesso!");
      setIsCreditModalOpen(false);
      setCreditAmount("");
      setCreditDescription("");
      router.invalidate();
    } catch {
      toast.error("Erro ao conceder crédito.");
    } finally {
      setIsSavingCredit(false);
    }
  };

  const handleSaveClinical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle.trim() || !clinicalNotes.trim()) {
      toast.error("Informe o procedimento e as anotações do atendimento.");
      return;
    }
    setIsSavingClinical(true);
    try {
      await addCustomerClinicalRecord({
        data: {
          customerId: id,
          serviceTitle: serviceTitle.trim(),
          notes: clinicalNotes.trim(),
          allergies: allergies.trim() || null,
          medicalHistory: medicalHistory.trim() || null,
          emergencyContact: emergencyContact.trim() || null,
          preferredProfessional: preferredProfessional.trim() || null,
        },
      });
      toast.success("Prontuário/Anamnese registrado com sucesso!");
      setIsClinicalModalOpen(false);
      setServiceTitle("");
      setClinicalNotes("");
      setAllergies("");
      setMedicalHistory("");
      setPreferredProfessional("");
      router.invalidate();
    } catch {
      toast.error("Erro ao salvar prontuário.");
    } finally {
      setIsSavingClinical(false);
    }
  };

  // Agrega todos os pax de leads vinculados + co-viajantes de viagens confirmadas
  const allPax: any[] = [];
  (data.commercialLeads || []).forEach((lead: any) => {
    if (Array.isArray(lead.pax_list)) {
      lead.pax_list.forEach((pax: any) =>
        allPax.push({ ...pax, _leadTitle: lead.title || lead.destination || "Oportunidade Comercial" })
      );
    }
  });
  (data.coTravelers || []).forEach((coPx: any) => {
    const alreadyInList = allPax.some(
      (p) => p.full_name?.toLowerCase() === coPx.full_name?.toLowerCase()
    );
    if (!alreadyInList) {
      allPax.push({
        full_name: coPx.full_name,
        document: coPx.document,
        birth_date: coPx.birth_date,
        phone: coPx.phone,
        relationship: coPx.is_lead_passenger ? "Titular da Viagem" : "Co-Viajante",
        _leadTitle: `Viagem: ${coPx.trip_title || "Confirmada"}`,
      });
    }
  });

  const isCustomerBlocked = data.profile.status === "blocked";
  const handleToggleBlockCustomer = async () => {
    const nextStatus = isCustomerBlocked ? "active" : "blocked";
    try {
      await updateCustomer({ data: { id: data.profile.id, status: nextStatus } });
      toast.success(nextStatus === "blocked" ? "Cliente bloqueado na carteira!" : "Cliente desbloqueado com sucesso!");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar status do cliente.");
    }
  };

  return (
    <div className="w-full px-0 sm:px-0 space-y-6 pb-12 overflow-x-hidden">
      {/* ── Header ── */}
      <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
        title={data.profile.name}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2 font-bold text-xs min-h-11"
            >
              <Link
                to="/workspace/turismo/cotacoes"
                search={{
                  leadName: data.profile.name,
                  leadPhone: data.profile.phone || undefined,
                  leadEmail: data.profile.email || undefined,
                  clientId: data.profile.id,
                } as any}
              >
                <Plane className="size-3.5 text-primary" />
                Nova Cotação
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSharePortalLink}
              title="Compartilhar Central do Passageiro"
              className="gap-2 font-bold text-xs min-h-11 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Smartphone className="size-3.5" />
              Central do Passageiro
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBudgetPadOpen(true)}
              className="gap-2 font-bold text-xs min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Receipt className="size-3.5 text-primary" />
              Novo Orçamento
            </Button>

            {/* Menu Suspenso de Ações Secundárias */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 font-bold text-xs min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreHorizontal className="size-4" />
                  <span>Mais Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuItem
                  onClick={() => setIsTravelerModalOpen(true)}
                  className="gap-2 text-xs font-semibold py-2 cursor-pointer"
                >
                  <Luggage className="size-4 text-primary" />
                  Preferências de Viagem
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportDossierPdf}
                  disabled={isExportingDossier}
                  className="gap-2 text-xs font-semibold py-2 cursor-pointer"
                >
                  <FileText className="size-4 text-primary" />
                  {isExportingDossier ? "Gerando..." : "Exportar Dossiê"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsCreditModalOpen(true)}
                  className="gap-2 text-xs font-semibold py-2 cursor-pointer"
                >
                  <Gift className="size-4" />
                  Conceder Crédito
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link da Ficha do Cliente copiado!");
                  }}
                  className="gap-2 text-xs font-semibold py-2 cursor-pointer"
                >
                  <Copy className="size-4" />
                  Copiar Link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsClinicalModalOpen(true)}
                  className="gap-2 text-xs font-semibold py-2 cursor-pointer"
                >
                  <HeartPulse className="size-4" />
                  Atendimento Clínico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleToggleBlockCustomer}
                  className={cn(
                    "gap-2 text-xs font-semibold py-2 cursor-pointer",
                    isCustomerBlocked ? "text-emerald-600 focus:text-emerald-600" : "text-destructive focus:text-destructive"
                  )}
                >
                  <AlertTriangle className="size-4" />
                  {isCustomerBlocked ? "Desbloquear Cliente" : "Bloquear Cliente"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <div className="waesy-offscreen-render">
        <Customer360PrintableDossier
          customer={{
            id: data?.profile?.id || id,
            fullName: data?.profile?.name || "Cliente",
            taxId: data?.profile?.taxId,
            email: data?.profile?.email,
            phone: data?.profile?.phone,
            city: data?.profile?.city,
            state: data?.profile?.state,
            birthDate: data?.profile?.birthDate,
            avatarUrl: data?.profile?.avatarUrl,
            isConsentLgpd: data?.profile?.isConsentLgpd,
            createdAt: data?.profile?.createdAt,
          }}
          metrics={{
            ltvCents: data?.kpis?.ltvCents,
            ordersCount: data?.kpis?.ordersCount,
            pendingDebtCents: data?.kpis?.pendingDebtCents,
          }}
          history={(data?.timeline || []).map((t: any) => ({
            id: t.id || String(Math.random()),
            date: t.date || "Recente",
            title: t.title || "Atendimento",
            type: t.type || "Geral",
            amountCents: t.amountCents,
            status: t.status || "Concluído",
          }))}
          storeName="Waesy CRM"
        />
      </div>

      {/* ── Alerta Interno / Status de Bloqueio ── */}
      {(isCustomerBlocked || (data.crm?.notes && data.crm.notes.trim().length > 0)) && (
        <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${isCustomerBlocked ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-warning/10 border-warning/30 text-foreground"}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`size-4 shrink-0 mt-1 ${isCustomerBlocked ? "text-destructive" : "text-warning-strong"}`} />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider block">
                {isCustomerBlocked ? "Cliente Bloqueado para Novas Transações" : "Sinalização Interna da Agência"}
              </span>
              {data.crm?.notes && <p className="text-muted-foreground leading-relaxed">{data.crm.notes}</p>}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveTab("crm")}
            className="h-11 min-h-11 px-3 text-xs font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Editar Sinalização
          </Button>
        </div>
      )}

      {/* ── 1. Topo da Ficha: Perfil & KPIs 360° ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Card de Identificação */}
        <div className="md:col-span-4 bg-card rounded-lg border border-border/60 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground overflow-hidden font-bold text-lg shrink-0">
              {data.profile.avatarUrl ? (
                <img src={data.profile.avatarUrl} alt={data.profile.name} className="size-full object-cover" />
              ) : (
                <User className="size-7" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-bold text-foreground truncate">{data.profile.name}</h2>
              {data.profile.taxId ? (
                <span className="text-xs font-mono text-muted-foreground block">
                  CPF/CNPJ: {data.profile.taxId}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Documento não informado</span>
              )}
              {data.profile.isConsentLgpd && (
                <Badge variant="outline" className="text-xs text-emerald-600 gap-1 border-emerald-500/30">
                  <ShieldCheck className="size-3" /> LGPD Consentido
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
            {data.profile.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{data.profile.email}</span>
              </div>
            )}
            {data.profile.phone && (
              <div className="flex items-center gap-2 text-muted-foreground font-mono">
                <Phone className="size-3.5 shrink-0" />
                <span>{data.profile.phone}</span>
              </div>
            )}
            {data.profile.birthDate && (
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 shrink-0 text-warning-strong" />
                  <span>Aniversário: {new Date(data.profile.birthDate).toLocaleDateString("pt-BR")}</span>
                </div>
                {data.profile.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean = data.profile.phone.replace(/\D/g, "");
                      const msg = encodeURIComponent(`Olá ${data.profile.name}! Passando para desejar um feliz aniversário e muitas viagens incríveis! Preparamos um mimo especial para sua próxima reserva conosco.`);
                      window.open(`https://wa.me/55${clean}?text=${msg}`, "_blank");
                    }}
                    className="h-11 min-h-11 px-2 text-xs font-bold text-emerald-600 hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Parabenizar
                  </button>
                )}
              </div>
            )}
            {data.profile.emergencyContactName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <HeartPulse className="size-3.5 shrink-0" />
                <span>
                  Emergência: {data.profile.emergencyContactName} ({data.profile.emergencyContactPhone})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Grid de KPIs 360° */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">LTV Total</span>
            <div className="text-lg sm:text-xl font-black text-foreground">{formatMoney(data.totalLtvCents || 0)}</div>
            <span className="text-xs text-muted-foreground font-mono">{data.totalOrdersCount || 0} compras</span>
          </div>
          <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
            <div className="text-lg sm:text-xl font-black text-foreground">{formatMoney(data.averageTicketCents || 0)}</div>
            <span className="text-xs text-muted-foreground">Por compra</span>
          </div>
          <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Créditos</span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(data.totalCreditCents || 0)}
            </div>
            <span className="text-xs text-muted-foreground">Disponível</span>
          </div>
          <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recência</span>
            <div className="text-lg sm:text-xl font-black text-foreground">{data.daysSinceLastOrder || 0}d</div>
            <span className="text-xs text-muted-foreground">
              {(data.daysSinceLastOrder || 0) > 60 ? "️ Risco Churn" : "Ativo"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Abas de Detalhamento 360° ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex items-center justify-start h-11 w-full gap-2 mb-6 p-1 bg-muted/50 rounded-lg overflow-x-auto no-scrollbar whitespace-nowrap">
          <TabsTrigger value="timeline" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <History className="size-3.5" />
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="viagens" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <Plane className="size-3.5 text-primary" />
            <span>Viagens & Propostas ({(data.confirmedTrips?.length || 0) + (data.commercialLeads?.length || 0) + (data.proposals?.length || 0) + (data.contracts?.length || 0)})</span>
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <Compass className="size-3.5 text-sky-500" />
            <span>Preferências</span>
          </TabsTrigger>
          <TabsTrigger value="passes" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <QrCode className="size-3.5 text-primary" />
            <span>Passes Digitais ({data.walletPasses?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="acompanhantes" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <Users2 className="size-3.5 text-violet-500" />
            <span>Acompanhantes ({allPax.length})</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <FileText className="size-3.5 text-primary" />
            <span>Documentos ({data.documents?.length || 0})</span>
            {data.documents?.some((d: any) => d.expiryStatus === "expired") && (
              <span className="size-2 rounded-full bg-rose-500 animate-pulse motion-reduce:animate-none" />
            )}
          </TabsTrigger>
          <TabsTrigger value="addresses" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <MapPin className="size-3.5" />
            <span>Endereços ({data.addresses?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <Gift className="size-3.5" />
            <span>Créditos</span>
          </TabsTrigger>
          <TabsTrigger value="clinical" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <HeartPulse className="size-3.5 text-rose-500" />
            <span>Prontuário ({data.clinicalRecords?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <Tag className="size-3.5" />
            <span>Notas e Tags</span>
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="text-xs font-semibold gap-2 shrink-0 px-3 py-2 rounded-lg min-h-9 whitespace-nowrap cursor-pointer">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Termos & LGPD ({(data.consentRecords || []).length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Aba 1: Timeline Unificada ── */}
        <TabsContent value="timeline" className="space-y-4">
          {(data.timeline || []).length === 0 ? (
            <EmptyState
              title="Nenhuma interação registrada ainda"
              description="Quando o cliente realizar pedidos, cotações ou ingressos, a timeline será preenchida automaticamente."
            />
          ) : (
            <div className="space-y-3">
              {(data.timeline || []).map((event: any) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg bg-card border border-border/60 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {event.type === "order" ? (
                        <CreditCard className="size-5 text-primary" />
                      ) : event.type === "trip" ? (
                        <Luggage className="size-5 text-sky-500" />
                      ) : event.type === "proposal" ? (
                        <FileText className="size-5 text-primary" />
                      ) : event.type === "contract" ? (
                        <ShieldCheck className="size-5 text-emerald-500" />
                      ) : event.type === "commercial_invoice" ? (
                        <Receipt className="size-5 text-sky-500" />
                      ) : event.type === "quote" ? (
                        <Plane className="size-5 text-warning-strong" />
                      ) : event.type === "commercial_lead" ? (
                        <TrendingUp className="size-5 text-emerald-500" />
                      ) : event.type === "ad_touchpoint" ? (
                        <Megaphone className="size-5 text-primary" />
                      ) : (
                        <Calendar className="size-5 text-violet-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {new Date(event.timestamp).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 2: Viagens Confirmadas & Propostas Comerciais ── */}
        <TabsContent value="viagens" className="space-y-4">
          {(data.confirmedTrips?.length || 0) === 0 && (data.commercialLeads || []).length === 0 && (data.proposals || []).length === 0 && (data.contracts || []).length === 0 ? (
            <EmptyState
              title="Nenhuma proposta ou viagem vinculada"
              description="Viagens operacionais confirmadas e oportunidades comerciais vinculadas a este cliente aparecerão aqui."
            />
          ) : (
            <div className="space-y-5">

              {/* Faturas e Orçamentos do Bloco Comercial */}
              {(data.commercialInvoices || []).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Receipt className="size-3.5 text-primary" />
                      Faturas e Orçamentos Comerciais ({data.commercialInvoices.length})
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBudgetPadOpen(true)}
                      className="h-11 min-h-11 px-3 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Receipt className="size-3.5 text-primary" />
                      <span>Emitir no Bloco</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.commercialInvoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="p-4 rounded-lg bg-card border border-border/60 hover:border-border transition-colors flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                              <Receipt className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate">
                                {inv.document_type === "budget" ? "Orçamento" : "Fatura"} {inv.invoice_code}
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono">
                                Emitido em {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                          <Badge variant={inv.status === "paid" ? "default" : "outline"} className="text-xs uppercase font-bold shrink-0">
                            {inv.status}
                          </Badge>
                        </div>

                        <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-xs">
                          <span className="text-muted-foreground text-xs">Valor Total</span>
                          <span className="font-mono font-bold text-foreground">
                            {formatMoney(inv.total_cents || 0)}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          {inv.public_token && (
                            <Button asChild variant="ghost" className="text-xs gap-1 h-11 min-h-11 font-semibold">
                              <a href={`/fatura/${inv.public_token}`} target="_blank" rel="noopener noreferrer">
                                <span>Ver Fatura A4</span>
                                <ExternalLink className="size-3" />
                              </a>
                            </Button>
                          )}
                          {inv.contract_id && (
                            <Button asChild variant="outline" className="text-xs gap-2 h-11 min-h-11 font-semibold">
                              <Link to="/workspace/contratos">
                                <span>Ver Contrato</span>
                                <ChevronRight className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viagens Confirmadas em Operação */}
              {(data.confirmedTrips?.length || 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Luggage className="size-3.5 text-primary" />
                    Viagens Confirmadas ({data.confirmedTrips.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.confirmedTrips.map((trip: any) => (
                      <div
                        key={trip.id}
                        className="p-4 rounded-lg bg-card border border-border/60 hover:border-border transition-colors flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Plane className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate">
                                {trip.title || trip.destination_city || "Roteiro de Viagem"}
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono">
                                #{trip.trip_number || trip.id.slice(0, 8)} • {trip.destination_city}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs uppercase font-bold shrink-0">
                            {trip.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-lg">
                          <div>
                            <span className="text-muted-foreground block text-xs">Período</span>
                            <span className="font-semibold text-foreground">
                              {trip.travel_start_date ? new Date(trip.travel_start_date).toLocaleDateString("pt-BR") : "A definir"}
                              {trip.travel_end_date ? ` até ${new Date(trip.travel_end_date).toLocaleDateString("pt-BR")}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs">Passageiros</span>
                            <span className="font-semibold text-foreground">
                              {(trip.adults_count || 1) + (trip.children_count || 0)} pax
                            </span>
                          </div>
                          {trip.total_cents > 0 && (
                            <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                              <span className="text-muted-foreground text-xs">Investimento Total</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatMoney(trip.total_cents)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              const tripPortalUrl = `${window.location.origin}/viajante/viagem/${trip.id}`;
                              navigator.clipboard.writeText(tripPortalUrl);
                              toast.success("Link do Portal da Viagem copiado para enviar ao passageiro!");
                            }}
                            className="text-xs gap-1 h-11 min-h-11 font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Share2 className="size-3.5" />
                            <span>Copiar Portal da Viagem</span>
                          </Button>
                          <Button asChild variant="outline" className="text-xs gap-2 h-11 min-h-11 font-semibold focus-visible:ring-2 focus-visible:ring-ring">
                            <Link to="/workspace/turismo/viagens/$id" params={{ id: trip.id }}>
                              <span>Abrir Roteiro Completo</span>
                              <ChevronRight className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Propostas Comerciais Digitais */}
              {(data.proposals || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pt-2">
                    <FileText className="size-3.5 text-primary" />
                    Propostas Comerciais Digitais ({data.proposals.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.proposals.map((prop: any) => {
                      const totalCents = prop.pricing?.total_price_cents || prop.pricing?.total_cents || 0;
                      return (
                        <div
                          key={prop.id}
                          className="p-4 rounded-lg bg-card border border-border/60 hover:border-border transition-colors flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText className="size-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-foreground truncate">
                                  {prop.title || prop.destination_city || "Proposta Comercial"}
                                </h4>
                                <p className="text-xs text-muted-foreground font-mono">
                                  Destino: {prop.destination_city || "Personalizado"}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs uppercase font-bold shrink-0">
                              {prop.status}
                            </Badge>
                          </div>

                          {totalCents > 0 && (
                            <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-xs">
                              <span className="text-muted-foreground text-xs">Total da Proposta</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatMoney(totalCents)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1">
                            {prop.public_token && (
                              <Button asChild variant="ghost" className="text-xs gap-1 h-11 min-h-11 font-semibold">
                                <a href={`/proposta/${prop.public_token}`} target="_blank" rel="noopener noreferrer">
                                  <span>Visualizar</span>
                                  <ExternalLink className="size-3" />
                                </a>
                              </Button>
                            )}
                            <Button asChild variant="outline" className="text-xs gap-2 h-11 min-h-11 font-semibold">
                              <Link to="/workspace/turismo/propostas/$id" params={{ id: prop.id }}>
                                <span>Gerenciar</span>
                                <ChevronRight className="size-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contratos Digitais */}
              {(data.contracts || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pt-2">
                    <ShieldCheck className="size-3.5 text-emerald-500" />
                    Contratos Digitais Emitidos ({data.contracts.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.contracts.map((contract: any) => {
                      const totalCents = contract.metadata?.total_value_cents || 0;
                      return (
                        <div
                          key={contract.id}
                          className="p-4 rounded-lg bg-card border border-border/60 hover:border-border transition-colors flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShieldCheck className="size-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-foreground truncate">
                                  {contract.title || "Contrato de Serviços"}
                                </h4>
                                <p className="text-xs text-muted-foreground font-mono">
                                  Cód: {contract.verification_code || contract.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                            <Badge variant={contract.status === "signed" ? "default" : "outline"} className="text-xs uppercase font-bold shrink-0">
                              {contract.status === "signed" ? "Assinado" : contract.status}
                            </Badge>
                          </div>

                          {totalCents > 0 && (
                            <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-xs">
                              <span className="text-muted-foreground text-xs">Valor Contratual</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatMoney(totalCents)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1">
                            {contract.verification_code && (
                              <Button asChild variant="ghost" className="text-xs gap-1 h-11 min-h-11 font-semibold">
                                <a href={`/contrato/${contract.verification_code}`} target="_blank" rel="noopener noreferrer">
                                  <span>Via Digital</span>
                                  <ExternalLink className="size-3" />
                                </a>
                              </Button>
                            )}
                            <Button asChild variant="outline" className="text-xs gap-2 h-11 min-h-11 font-semibold">
                              <Link to="/workspace/turismo/contratos">
                                <span>Painel</span>
                                <ChevronRight className="size-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Propostas e Oportunidades do CRM Comercial */}
              {(data.commercialLeads || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 pt-2">
                    <TrendingUp className="size-3.5 text-emerald-500" />
                    Propostas & Oportunidades no Funil ({data.commercialLeads.length})
                  </h3>
                  <div className="space-y-2">
                    {data.commercialLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        className="p-4 rounded-lg bg-card border border-border/60 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Plane className="size-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">
                              {lead.title || lead.full_name || "Oportunidade"}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                {lead.status}
                              </Badge>
                              {lead.estimated_value_cents > 0 && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {formatMoney(lead.estimated_value_cents)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Aba: Preferências & Anamnese do Viajante ── */}
        <TabsContent value="preferencias" className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-sm font-bold text-foreground">Ficha de Preferências do Viajante</h3>
              <p className="text-xs text-muted-foreground">Assentos, refeições, milhagem e assistência especial para emissão ágil.</p>
            </div>
            <Button onClick={() => setIsTravelerModalOpen(true)} variant="outline" className="text-xs gap-2 h-11 min-h-11 font-semibold">
              <Compass className="size-3.5 text-primary" />
              Editar Preferências
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Voo & Cabine */}
            <div className="bg-card rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Armchair className="size-4 text-sky-500" />
                <span>Assento e Cabine</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Preferência:</span>
                  <Badge variant="secondary" className="text-xs">
                    {seatPref === "window" ? "Janela" : seatPref === "aisle" ? "Corredor" : seatPref === "front" ? "Frente / Emergência" : "Sem preferência"}
                  </Badge>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Refeição a Bordo:</span>
                  <span className="font-semibold text-foreground">{mealPref || "Padrão da Companhia"}</span>
                </div>
              </div>
            </div>

            {/* 2. Documentos Internacionais */}
            <div className="bg-card rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <FileText className="size-4 text-primary" />
                <span>Passaporte e Vistos</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Passaporte:</span>
                  <span className="font-mono font-bold text-foreground">
                    {passportNum ? `${passportNum} (${passportCountry})` : "Não cadastrado"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Validade:</span>
                  <span className="text-foreground">
                    {passportExpiry ? new Date(passportExpiry).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Vistos:</span>
                  <span className="text-foreground truncate max-w-38">
                    {visasInput || "Nenhum informado"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Programas de Fidelidade */}
            <div className="bg-card rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Award className="size-4 text-warning-strong" />
                <span>Programas e Milhas</span>
              </div>
              <div className="space-y-2 text-xs">
                {airlineMiles ? (
                  <div className="p-3 rounded-lg bg-muted/40 font-mono text-xs space-y-1">
                    {airlineMiles.split(",").map((m: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{m.trim()}</span>
                        <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">Nenhum cartão ou número de milhagem cadastrado.</p>
                )}
              </div>
            </div>

            {/* 4. Acessibilidade & Saúde em Viagem */}
            <div className="bg-card rounded-lg border border-border/60 p-4 space-y-3 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <HeartPulse className="size-4 text-rose-500" />
                <span>Acessibilidade, PCD e Cuidados Especiais</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={isPcd ? "destructive" : "outline"} className="text-xs">
                  {isPcd ? "Passageiro PCD Declarado" : "Não PCD"}
                </Badge>
                <Badge variant={isWheelchair ? "destructive" : "outline"} className="text-xs">
                  {isWheelchair ? "Requer Cadeira de Rodas (WCHR)" : "Locomoção Normal"}
                </Badge>
                {dietaryAllergies && (
                  <Badge variant="secondary" className="text-xs">
                    Restrição Alimentar: {dietaryAllergies}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Aba: Documentos Digitais ── */}
        <TabsContent value="passes" className="space-y-4">
          {(data.walletPasses?.length || 0) === 0 ? (
            <div className="bg-card rounded-lg border border-border/60 p-8 text-center space-y-3">
              <div className="size-12 rounded-lg bg-muted mx-auto flex items-center justify-center">
                <QrCode className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Nenhum documento digital ativo</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Cartões de embarque, vouchers de hotel, cartões de fidelidade e ingressos com QR Code aparecem aqui para consulta e embarque do passageiro.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.walletPasses.map((pass: any) => (
                <div
                  key={pass.id}
                  className="rounded-lg border border-border/60 bg-card p-5 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs uppercase font-bold">
                      {pass.pass_type || "Cartão Digital"}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      {pass.status || "Ativo"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{pass.title || "Passe Digital"}</h4>
                    <p className="text-xs text-muted-foreground">{pass.description || "Documento Digital"}</p>
                  </div>
                  <div className="p-3 bg-card border border-border/40 rounded-lg flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-bold text-foreground truncate max-w-30">{pass.serial_number || pass.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    Criado em {new Date(pass.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 3: Família / Acompanhantes (Pax dos Leads) ── */}
        <TabsContent value="acompanhantes" className="space-y-4">
          {allPax.length === 0 ? (
            <EmptyState
              title="Nenhum acompanhante cadastrado"
              description="Os passageiros e familiares informados nas oportunidades de viagem aparecem aqui para gestão centralizada."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allPax.map((pax: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg bg-card border border-border/60 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users2 className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{pax.full_name}</h4>
                      <Badge variant="secondary" className="text-xs uppercase px-2">
                        {pax.relationship || "Outro"}
                      </Badge>
                    </div>
                  </div>
                  {(pax.document || pax.birth_date || pax.phone) && (
                    <div className="space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-2">
                      {pax.birth_date && (
                        <p>Nasc: {new Date(pax.birth_date).toLocaleDateString("pt-BR")}</p>
                      )}
                      {pax.document && <p className="font-mono">Doc: {pax.document}</p>}
                      {pax.phone && <p>Tel: {pax.phone}</p>}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground/60 block">Via: {pax._leadTitle}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 4: Documentos com alerta de vencimento ── */}
        <TabsContent value="documents" className="space-y-4">
          <DocumentsPanel customerId={id} documents={data.documents || []} onRefresh={() => router.invalidate()} />
        </TabsContent>

        {/* ── Aba 5: Endereços Múltiplos ── */}
        <TabsContent value="addresses" className="space-y-4">
          {(data.addresses || []).length === 0 ? (
            <EmptyState
              title="Nenhum endereço cadastrado"
              description="Os endereços salvos pelo cliente no checkout ou no perfil aparecerão aqui."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(data.addresses || []).map((addr: any) => (
                <div key={addr.id} className="p-4 rounded-lg bg-card border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      {addr.street}{addr.number ? `, ${addr.number}` : ""}
                    </span>
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-xs">Principal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(" • ")}
                  </p>
                  {addr.zipcode && (
                    <span className="text-xs font-mono text-muted-foreground block">CEP: {addr.zipcode}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 6: Créditos & Gift Cards ── */}
        <TabsContent value="credits" className="space-y-4">
          {(data.credits || []).length === 0 ? (
            <EmptyState
              title="Nenhum saldo ou crédito concedido"
              description="Conceda créditos em loja para devoluções, trocas, cashback ou premiações de fidelidade."
            />
          ) : (
            <div className="space-y-3">
              {(data.credits || []).map((cr: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-card border border-border/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="size-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {cr.description || "Crédito em Loja"}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Concedido em {new Date(cr.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {formatMoney(cr.amount_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 7: Prontuários Clínicos / Anamnese (Padrão Belasis 360°) ── */}
        <TabsContent value="clinical" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HeartPulse className="size-4 text-foreground" />
                <h3 className="text-sm font-bold text-foreground">Prontuário e Anamnese</h3>
                <Badge variant="outline" className="text-2xs font-bold bg-muted text-foreground border-border">
                  Saúde
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Histórico de atendimentos, restrições médicas, profissional preferido e contato de emergência.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsClinicalModalOpen(true)}
              className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
              <span>Novo Prontuário</span>
            </Button>
          </div>

          {(data.profile?.emergencyContactPhone || data.profile?.emergencyContactName) && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-warning-strong" />
                <span className="font-semibold text-warning-strong">Contato de Emergência:</span>
                <span className="text-foreground font-mono font-bold">
                  {data.profile.emergencyContactName ? `${data.profile.emergencyContactName} - ` : ""}
                  {data.profile.emergencyContactPhone}
                </span>
              </div>
              <Badge variant="outline" className="text-3xs font-bold uppercase tracking-wider">
                Prioritário
              </Badge>
            </div>
          )}

          {(data.clinicalRecords || []).length === 0 ? (
            <EmptyState
              title="Nenhum atendimento ou anamnese registrado"
              description="Para salões, clínicas e terapeutas: registre procedimentos, alergias, laudos e histórico clínico."
              action={
                <Button
                  type="button"
                  onClick={() => setIsClinicalModalOpen(true)}
                  className="h-11 min-h-11 rounded-lg font-bold text-xs gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4" />
                  Cadastrar Primeira Anamnese
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {(data.clinicalRecords || []).map((rec: any) => (
                <div key={rec.id} className="p-5 rounded-lg bg-card border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="size-4 text-primary" />
                      <h4 className="font-bold text-sm text-foreground">{rec.service_title}</h4>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(rec.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{rec.notes}</p>

                  {rec.medical_history && (
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1">
                      <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Histórico Médico / Comorbidades
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">{rec.medical_history}</p>
                    </div>
                  )}

                  {rec.allergies && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span>Alergias / Contraindicações: {rec.allergies}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/40 text-xs text-muted-foreground">
                    {rec.professional_name && (
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-primary" />
                        <span>Atendido por: <strong className="text-foreground">{rec.professional_name}</strong></span>
                      </span>
                    )}
                    {rec.preferred_professional && (
                      <span className="flex items-center gap-1">
                        <Award className="size-3 text-warning-strong" />
                        <span>Profissional de Preferência: <strong className="text-foreground">{rec.preferred_professional}</strong></span>
                      </span>
                    )}
                    {rec.emergency_contact && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3 text-muted-foreground" />
                        <span>Emergência: <strong className="text-foreground font-mono">{rec.emergency_contact}</strong></span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 8: Notas & Tags de Segmentação ── */}
        <TabsContent value="crm" className="space-y-4">
          <div className="bg-card rounded-lg border border-border/60 p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Tags de Segmentação (separadas por vírgula)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ex: VIP, Atacado, Pontual, Prefere WhatsApp"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observações Internas Confidenciais</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações privadas sobre preferências, restrições e histórico do cliente..."
                rows={5}
                className="text-xs"
              />
            </div>
            <Button onClick={handleSaveCrm} disabled={isSavingCrm} className="gap-2 font-bold text-xs min-h-11">
              <Save className="size-3.5" />
              {isSavingCrm ? "Salvando..." : "Salvar Ficha"}
            </Button>
          </div>
        </TabsContent>

        {/* ── Aba 11: Governança de Consentimentos & LGPD (Telemetria Militar) ── */}
        <TabsContent value="lgpd" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Governança de Consentimentos & Telemetria LGPD
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Marco Civil da Internet (Lei 12.965/2014) e LGPD (Lei 13.709/2018). Registros imutáveis com assinatura SHA-256 e rastreabilidade forense.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPhysicalConsentModalOpen(true)}
              className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer shrink-0"
            >
              <Plus className="size-3.5 text-primary" />
              <span>Registrar Aceite Presencial</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(["privacy_policy", "quotation_policy", "sensitive_data_policy", "cancellation_policy", "terms_of_service"] as LegalPolicyType[]).map((pKey) => {
              const canonical = CANONICAL_LEGAL_POLICIES[pKey];
              const record = (data.consentRecords || []).find((c: any) => c.policy_type === pKey);
              const isAccepted = record?.status === "accepted";
              const isRevoked = record?.status === "revoked";

              return (
                <div
                  key={pKey}
                  className="p-4 rounded-xl border border-border/60 bg-card space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-foreground block">
                          {canonical.title}
                        </span>
                        <span className="text-2xs font-mono text-muted-foreground block">
                          Base: {canonical.legalBasis}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isAccepted
                            ? "bg-muted text-foreground font-bold border-border/60 text-2xs"
                            : isRevoked
                            ? "bg-destructive/10 text-destructive border-destructive/20 text-2xs"
                            : "bg-muted/40 text-muted-foreground border-border/40 text-2xs"
                        }
                      >
                        {isAccepted ? "Aceito com Telemetria" : isRevoked ? "Revogado" : "Pendente"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {canonical.shortDescription}
                    </p>

                    {isAccepted && record?.proof && (
                      <div className="p-3 rounded-lg bg-muted text-2xs font-mono text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Certidão:</span>
                          <span className="font-bold text-foreground truncate max-w-48">
                            {record.proof.certificate_code}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Data:</span>
                          <span className="text-foreground">
                            {new Date(record.proof.accepted_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Método:</span>
                          <span className="text-foreground uppercase">
                            {record.proof.method}
                          </span>
                        </div>
                      </div>
                    )}

                    {isRevoked && (
                      <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-2xs font-medium">
                        Revogado em {new Date(record.revoked_at).toLocaleDateString("pt-BR")}: {record.revocation_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    {isAccepted ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCertificate(record.proof);
                            setIsCertModalOpen(true);
                          }}
                          className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 flex-1 border-border/60 hover:bg-muted cursor-pointer"
                        >
                          <Lock className="size-3.5 text-primary" />
                          <span>Ver Certidão Forense</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeConsent(pKey)}
                          className="h-11 min-h-11 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Revogar Consentimento (LGPD Art. 18)"
                        >
                          Revogar
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPhysicalPolicyType(pKey);
                          setIsPhysicalConsentModalOpen(true);
                        }}
                        className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 w-full border-border/60 hover:bg-muted cursor-pointer"
                      >
                        <Plus className="size-3.5 text-primary" />
                        <span>Registrar Aceite</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Sheet: Conceder Crédito ── */}
      <Sheet open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col justify-between overflow-y-auto overscroll-contain">
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle>Conceder Crédito em Loja</SheetTitle>
              <SheetDescription>
                Adicione saldo na carteira do cliente para compras futuras, trocas ou bonificação.
              </SheetDescription>
            </SheetHeader>
            <form id="grant-credit-form" onSubmit={handleGrantCredit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs">Valor do Crédito (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Ex: 50,00"
                  className="text-xs font-mono font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Motivo / Descrição</Label>
                <Input
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="Ex: Devolução Pedido PED-1234 / Bônus Aniversário"
                  className="text-xs"
                />
              </div>
            </form>
          </div>
          <SheetFooter className="pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => setIsCreditModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" form="grant-credit-form" disabled={isSavingCredit} className="text-xs font-bold">
              {isSavingCredit ? "Concedendo..." : "Conceder Crédito"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Novo Atendimento / Anamnese (Padrão Belasis 360°) ── */}
      <Sheet open={isClinicalModalOpen} onOpenChange={setIsClinicalModalOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl flex flex-col justify-between overflow-y-auto"
        >
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <HeartPulse className="size-5 text-primary" />
                <span>Registro de Atendimento e Anamnese</span>
              </SheetTitle>
              <SheetDescription>
                Dossiê clínico 360° para saúde, estética, odontologia, terapias e bem-estar.
              </SheetDescription>
            </SheetHeader>
            <form id="clinical-form" onSubmit={handleSaveClinical} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Procedimento / Serviço Realizado *</Label>
                <Input
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="Ex: Limpeza de Pele Profunda, Harmonização, Corte com Química"
                  className="min-h-11 h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Profissional de Preferência / Especialista</Label>
                  <Input
                    value={preferredProfessional}
                    onChange={(e) => setPreferredProfessional(e.target.value)}
                    placeholder="Ex: Dra. Juliana Costa, Dr. Marcelo"
                    className="min-h-11 h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Contato de Emergência (Nome / Telefone)</Label>
                  <Input
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Ex: Maria (Mãe) - (11) 98765-4321"
                    className="min-h-11 h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Histórico Médico / Comorbidades / Cirurgias</Label>
                <Textarea
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Ex: Hipertensão controlada, implante dentário em 2024, uso contínuo de anticoagulante..."
                  rows={3}
                  className="text-xs focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-3.5" />
                  <span>Alergias e Contraindicações Críticas</span>
                </Label>
                <Input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Ex: Alergia a Dipirona, Latex, Anestésico com vasoconstritor"
                  className="min-h-11 h-11 text-xs text-destructive border-destructive/40 focus-visible:ring-2 focus-visible:ring-destructive"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Observações da Sessão e Conduta Clínica *</Label>
                <Textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Descreva detalhadamente o procedimento executado, lote de insumos utilizados, evolução e orientações pós-atendimento..."
                  rows={4}
                  className="text-xs focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
            </form>
          </div>
          <SheetFooter className="pt-4 border-t border-border/40 flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClinicalModalOpen(false)}
              className="min-h-11 h-11 px-4 text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="clinical-form"
              disabled={isSavingClinical}
              className="min-h-11 h-11 px-5 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSavingClinical ? "Salvando..." : "Salvar Prontuário"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Preferências & Anamnese do Viajante ── */}
      <Sheet open={isTravelerModalOpen} onOpenChange={setIsTravelerModalOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col justify-between overflow-y-auto overscroll-contain"
        >
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Compass className="size-5 text-primary" />
                Preferências de Viagem e Anamnese
              </SheetTitle>
              <SheetDescription>
                Configure os detalhes operacionais de voo, alimentação, passaportes e programas de fidelidade para emissões rápidas e personalizadas.
              </SheetDescription>
            </SheetHeader>

            <form id="traveler-pref-form" onSubmit={handleSaveTraveler} className="space-y-6 py-2">
              {/* Seção 1: Assento e Alimentação */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Armchair className="size-3.5 text-sky-500" />
                  Assento e Refeições a Bordo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Assento Preferido</Label>
                    <select
                      value={seatPref}
                      onChange={(e) => setSeatPref(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="window">Janela (Window)</option>
                      <option value="aisle">Corredor (Aisle)</option>
                      <option value="middle">Meio (Middle)</option>
                      <option value="front">Frente / Saída de Emergência</option>
                      <option value="any">Sem preferência</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Refeição Especial / Dieta</Label>
                    <Input
                      value={mealPref}
                      onChange={(e) => setMealPref(e.target.value)}
                      placeholder="Ex: Vegetariana (VGML), Kosher, Sem Glúten"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Documentos Internacionais */}
              <div className="space-y-3 border-t border-border/40 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="size-3.5 text-primary" />
                  Documentos de Viagem Internacional
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Número do Passaporte</Label>
                    <Input
                      value={passportNum}
                      onChange={(e) => setPassportNum(e.target.value)}
                      placeholder="Ex: YA123456"
                      className="text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">País Emissor</Label>
                    <Input
                      value={passportCountry}
                      onChange={(e) => setPassportCountry(e.target.value)}
                      placeholder="Ex: Brasil / ITA"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Data de Validade</Label>
                    <Input
                      type="date"
                      value={passportExpiry}
                      onChange={(e) => setPassportExpiry(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Vistos Vigentes (separados por vírgula)</Label>
                  <Input
                    value={visasInput}
                    onChange={(e) => setVisasInput(e.target.value)}
                    placeholder="Ex: EUA B1/B2, Canadá eTA, Austrália eVisitor"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Seção 3: Programas de Milhagem */}
              <div className="space-y-3 border-t border-border/40 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Award className="size-3.5 text-warning-strong" />
                  Programas de Fidelidade e Milhas
                </h4>
                <div className="space-y-2">
                  <Label className="text-xs">Contas de Milhagem (formato: Cia: Número, separadas por vírgula)</Label>
                  <Input
                    value={airlineMiles}
                    onChange={(e) => setAirlineMiles(e.target.value)}
                    placeholder="Ex: LATAM Pass: 12345678, Smiles: 987654321, TAP Miles: 554433"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Seção 4: Acessibilidade e Restrições de Saúde */}
              <div className="space-y-3 border-t border-border/40 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <HeartPulse className="size-3.5 text-rose-500" />
                  Acessibilidade e Cuidados de Saúde
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={isPcd}
                      onChange={(e) => setIsPcd(e.target.checked)}
                      className="size-4 rounded text-primary focus:ring-primary/20"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Passageiro PCD</span>
                      <span className="text-muted-foreground text-xs">Requer prioridade de embarque e atendimento</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={isWheelchair}
                      onChange={(e) => setIsWheelchair(e.target.checked)}
                      className="size-4 rounded text-primary focus:ring-primary/20"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Cadeira de Rodas (WCHR)</span>
                      <span className="text-muted-foreground text-xs">Solicitar assistência no aeroporto / transfer</span>
                    </div>
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Alergias Alimentares / Restrições Médicas Severas</Label>
                  <Input
                    value={dietaryAllergies}
                    onChange={(e) => setDietaryAllergies(e.target.value)}
                    placeholder="Ex: Alergia severa a amendoim, frutos do mar, intolerância a lactose"
                    className="text-xs text-destructive"
                  />
                </div>
              </div>
            </form>
          </div>

          <SheetFooter className="pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => setIsTravelerModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              type="submit"
              form="traveler-pref-form"
              disabled={isSavingTraveler}
              className="text-xs font-bold min-h-10 px-6 min-h-11 sm:min-h-0"
            >
              {isSavingTraveler ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CommercialBudgetPadSheet
        open={isBudgetPadOpen}
        onOpenChange={(open) => {
          setIsBudgetPadOpen(open);
          if (!open) router.invalidate();
        }}
        initialCustomerId={id}
        initialClientData={{
          name: data.profile.name,
          cpfOrCnpj: data.profile.taxId || "",
          phone: data.profile.phone || "",
          email: data.profile.email || "",
          address: data.profile.addressLine || "",
          cityState: data.profile.city && data.profile.state ? `${data.profile.city} - ${data.profile.state}` : "",
        }}
      />

      {/* Modal: Certidão Militar Probatória de Consentimento Forense */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border/60 text-foreground">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <DialogTitle className="text-base font-bold">
                Certidão Militar Probatória de Consentimento
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Registro probatório imutável emitido sob o Marco Civil da Internet e LGPD.
            </DialogDescription>
          </DialogHeader>

          {selectedCertificate && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted font-mono space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Código de Autenticidade:</span>
                  <span className="font-bold text-foreground select-all">
                    {selectedCertificate.certificate_code}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Data/Hora (UTC):</span>
                  <span className="text-foreground">
                    {new Date(selectedCertificate.accepted_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Método de Captura:</span>
                  <span className="text-foreground uppercase">
                    {selectedCertificate.method}
                  </span>
                </div>
                {selectedCertificate.operator_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Operador Responsável:</span>
                    <span className="text-foreground font-semibold">
                      {selectedCertificate.operator_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1 font-mono text-2xs">
                <Label className="text-xs font-semibold font-sans">Assinatura SHA-256 Inviolável</Label>
                <div className="p-2 rounded bg-muted/60 text-muted-foreground break-all select-all">
                  {selectedCertificate.sha256_hash}
                </div>
              </div>

              <div className="space-y-1 font-mono text-2xs">
                <Label className="text-xs font-semibold font-sans">Telemetria de Rede & Dispositivo</Label>
                <div className="p-2 rounded bg-muted/60 text-muted-foreground space-y-1">
                  <div>IP: {selectedCertificate.ip_address}</div>
                  <div>User-Agent: {selectedCertificate.user_agent}</div>
                  {selectedCertificate.geolocation && (
                    <div>
                      Localização: {selectedCertificate.geolocation.city || "N/D"} / {selectedCertificate.geolocation.state || "N/D"} ({selectedCertificate.geolocation.country || "BR"})
                    </div>
                  )}
                </div>
              </div>

              {selectedCertificate.physical_proof_url && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedCertificate.physical_proof_url, "_blank")}
                    className="w-full text-xs font-semibold gap-2 border-border/60 min-h-11"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>Ver Documento / Termo Assinado Anexo</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedCertificate, null, 2));
                toast.success("Payload probatório copiado para a área de transferência.");
              }}
              className="text-xs font-semibold border-border/60 min-h-11"
            >
              <Copy className="size-3.5 mr-1" />
              Copiar Prova JSON
            </Button>
            <Button
              type="button"
              onClick={() => setIsCertModalOpen(false)}
              className="text-xs font-bold min-h-11"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Consentimento Presencial / Físico */}
      <Dialog open={isPhysicalConsentModalOpen} onOpenChange={setIsPhysicalConsentModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/60 text-foreground">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <DialogTitle className="text-base font-bold">
                Registrar Aceite Físico ou Presencial
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Lance a conformidade de termos assinados no balcão da agência ou digitalizados em papel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Política / Termo Aplicável</Label>
              <select
                value={physicalPolicyType}
                onChange={(e) => setPhysicalPolicyType(e.target.value as LegalPolicyType)}
                className="w-full h-11 px-3 rounded-lg border border-border/60 bg-muted/30 text-xs font-medium cursor-pointer"
              >
                {Object.keys(CANONICAL_LEGAL_POLICIES).map((k) => (
                  <option key={k} value={k}>
                    {CANONICAL_LEGAL_POLICIES[k as LegalPolicyType].title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Consultor / Operador Testemunha</Label>
              <Input
                value={physicalOperatorName}
                onChange={(e) => setPhysicalOperatorName(e.target.value)}
                placeholder="Ex: Consultor Carlos Silva"
                className="text-xs h-11"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">URL / Link do Documento Escaneado (Opcional)</Label>
              <Input
                value={physicalProofUrl}
                onChange={(e) => setPhysicalProofUrl(e.target.value)}
                placeholder="https://... termo_assinado.pdf"
                className="text-xs h-11"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted text-2xs text-muted-foreground">
              O sistema registrará seu usuário logado e carimbo de tempo inviolável vinculados a este aceite.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPhysicalConsentModalOpen(false)}
              className="text-xs min-h-11"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRegisterPhysicalConsent}
              disabled={isRegisteringPhysical}
              className="text-xs font-bold min-h-11"
            >
              {isRegisteringPhysical ? "Registrando..." : "Confirmar Aceite Presencial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
