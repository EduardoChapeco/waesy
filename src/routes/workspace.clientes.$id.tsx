import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  User, Save, MapPin, ShieldCheck, FileText, Mail, Phone,
  AlertTriangle, Gift, HeartPulse, Calendar, CreditCard, History,
  Tag, TrendingUp, Plane, Users2, Smartphone, ExternalLink, Copy,
  Award, Luggage, QrCode, CheckCircle2, ChevronRight, Share2,
  Compass, Armchair, Utensils,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/state/states";
import {
  getCustomer360,
  updateCustomerCrm,
  addCustomerClinicalRecord,
  grantCustomerStoreCredit,
  saveTravelerPreferences,
} from "@/services/crm.functions";
import { DocumentsPanel } from "@/components/crm/DocumentsPanel";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/clientes/$id")({
  head: () => ({ meta: [{ title: "Ficha 360° do Cliente | Workspace" }] }),
  loader: async ({ params }) => {
    try {
      return await getCustomer360({ data: { customerId: params.id } });
    } catch (err) {
      console.error("[loader:workspace.clientes.$id] Unhandled loader error:", err);
      return {} as any;
    }
  },
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const data = Route.useLoaderData() as any;
  const { id } = Route.useParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("timeline");

  // CRM State
  const [notes, setNotes] = useState(data?.crm?.notes || "");
  const [tags, setTags] = useState(data?.crm?.tags ? data.crm.tags.join(", ") : "");
  const [isSavingCrm, setIsSavingCrm] = useState(false);

  // Modal de Concessão de Crédito
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [isSavingCredit, setIsSavingCredit] = useState(false);

  // Modal de Prontuário / Anamnese
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);
  const [serviceTitle, setServiceTitle] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [allergies, setAllergies] = useState("");
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
        <Button variant="outline" size="sm" onClick={() => router.history.back()}>
          Voltar
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
        },
      });
      toast.success("Prontuário/Anamnese registrado com sucesso!");
      setIsClinicalModalOpen(false);
      setServiceTitle("");
      setClinicalNotes("");
      setAllergies("");
      router.invalidate();
    } catch {
      toast.error("Erro ao salvar prontuário.");
    } finally {
      setIsSavingClinical(false);
    }
  };

  // Agrega todos os pax de todos os leads vinculados
  const allPax: any[] = [];
  (data.commercialLeads || []).forEach((lead: any) => {
    if (Array.isArray(lead.pax_list)) {
      lead.pax_list.forEach((pax: any) =>
        allPax.push({ ...pax, _leadTitle: lead.title || "Oportunidade" })
      );
    }
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-12 overflow-x-hidden">
      {/* ── Header ── */}
      <PageHeader
        title={data.profile.name}
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold text-xs min-h-[44px]"
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
              title="Compartilhar link da Central do Passageiro para preenchimento de preferências e acompanhantes"
              className="gap-1.5 font-bold text-xs min-h-[44px] text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Smartphone className="size-3.5" />
              Central do Passageiro
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTravelerModalOpen(true)}
              className="gap-1.5 font-bold text-xs min-h-[44px] cursor-pointer"
            >
              <Luggage className="size-3.5 text-primary" />
              Preferências de Viagem
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreditModalOpen(true)}
              className="gap-1.5 font-bold text-xs min-h-[44px]"
            >
              <Gift className="size-3.5" />
              Conceder Crédito
            </Button>
            <Button
              size="sm"
              onClick={() => setIsClinicalModalOpen(true)}
              className="gap-1.5 font-bold text-xs min-h-[44px]"
            >
              <HeartPulse className="size-3.5" />
              Novo Atendimento
            </Button>
          </div>
        }
      />

      {/* ── 1. Topo da Ficha: Perfil & KPIs 360° ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Card de Identificação */}
        <div className="md:col-span-4 bg-card rounded-2xl border border-border/60 p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground overflow-hidden font-bold text-lg shrink-0">
              {data.profile.avatarUrl ? (
                <img src={data.profile.avatarUrl} alt={data.profile.name} className="size-full object-cover" />
              ) : (
                <User className="size-7" />
              )}
            </div>
            <div className="min-w-0 space-y-0.5">
              <h2 className="text-base font-bold text-foreground truncate">{data.profile.name}</h2>
              {data.profile.taxId ? (
                <span className="text-xs font-mono text-muted-foreground block">
                  CPF/CNPJ: {data.profile.taxId}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Documento não informado</span>
              )}
              {data.profile.isConsentLgpd && (
                <Badge variant="outline" className="text-[10px] text-emerald-600 gap-1 border-emerald-500/30">
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
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" />
                <span>Aniversário: {new Date(data.profile.birthDate).toLocaleDateString("pt-BR")}</span>
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
          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">LTV Total</span>
            <div className="text-lg sm:text-xl font-black text-foreground">{formatMoney(data.totalLtvCents || 0)}</div>
            <span className="text-[10px] text-muted-foreground font-mono">{data.totalOrdersCount || 0} compras</span>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ticket Médio</span>
            <div className="text-lg sm:text-xl font-black text-foreground">{formatMoney(data.averageTicketCents || 0)}</div>
            <span className="text-[10px] text-muted-foreground">Por compra</span>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Créditos</span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatMoney(data.totalCreditCents || 0)}
            </div>
            <span className="text-[10px] text-muted-foreground">Disponível</span>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Recência</span>
            <div className="text-lg sm:text-xl font-black text-foreground">{data.daysSinceLastOrder || 0}d</div>
            <span className="text-[10px] text-muted-foreground">
              {(data.daysSinceLastOrder || 0) > 60 ? "⚠️ Risco Churn" : "Ativo"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Abas de Detalhamento 360° ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex items-center justify-start h-11 w-full gap-1.5 mb-6 p-1 bg-muted/50 rounded-2xl overflow-x-auto no-scrollbar whitespace-nowrap">
          <TabsTrigger value="timeline" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <History className="size-3.5" />
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="viagens" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <Plane className="size-3.5 text-primary" />
            <span>Viagens ({(data.confirmedTrips?.length || 0) + (data.commercialLeads?.length || 0)})</span>
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <Compass className="size-3.5 text-sky-500" />
            <span>Preferências</span>
          </TabsTrigger>
          <TabsTrigger value="passes" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <QrCode className="size-3.5 text-primary" />
            <span>Documentos Digitais ({data.walletPasses?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="acompanhantes" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <Users2 className="size-3.5 text-violet-500" />
            <span>Família / Pax ({allPax.length})</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <FileText className="size-3.5 text-primary" />
            <span>Docs ({data.documents?.length || 0})</span>
            {data.documents?.some((d: any) => d.expiryStatus === "expired") && (
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="addresses" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <MapPin className="size-3.5" />
            <span>Endereços ({data.addresses?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <Gift className="size-3.5" />
            <span>Créditos</span>
          </TabsTrigger>
          <TabsTrigger value="clinical" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <HeartPulse className="size-3.5 text-rose-500" />
            <span>Prontuário ({data.clinicalRecords?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="text-xs font-semibold gap-1.5 shrink-0 px-3 py-1.5 rounded-xl min-h-[36px] whitespace-nowrap cursor-pointer">
            <Tag className="size-3.5" />
            <span>Notas & Tags</span>
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
                  className="p-4 rounded-2xl bg-card border border-border/60 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      {event.type === "order" ? (
                        <CreditCard className="size-5 text-primary" />
                      ) : event.type === "trip" ? (
                        <Luggage className="size-5 text-sky-500" />
                      ) : event.type === "quote" ? (
                        <Plane className="size-5 text-amber-500" />
                      ) : event.type === "commercial_lead" ? (
                        <TrendingUp className="size-5 text-emerald-500" />
                      ) : (
                        <Calendar className="size-5 text-violet-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">
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
          {(data.confirmedTrips?.length || 0) === 0 && (data.commercialLeads || []).length === 0 ? (
            <EmptyState
              title="Nenhuma proposta ou viagem vinculada"
              description="Viagens operacionais confirmadas e oportunidades comerciais vinculadas a este cliente aparecerão aqui."
            />
          ) : (
            <div className="space-y-5">
              {/* Viagens Confirmadas em Operação */}
              {(data.confirmedTrips?.length || 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Luggage className="size-3.5 text-primary" />
                    Viagens Confirmadas ({data.confirmedTrips.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.confirmedTrips.map((trip: any) => (
                      <div
                        key={trip.id}
                        className="p-4 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Plane className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate">
                                {trip.title || trip.destination_city || "Roteiro de Viagem"}
                              </h4>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                #{trip.trip_number || trip.id.slice(0, 8)} • {trip.destination_city}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0">
                            {trip.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/30 p-2.5 rounded-xl">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Período</span>
                            <span className="font-semibold text-foreground">
                              {trip.travel_start_date ? new Date(trip.travel_start_date).toLocaleDateString("pt-BR") : "A definir"}
                              {trip.travel_end_date ? ` até ${new Date(trip.travel_end_date).toLocaleDateString("pt-BR")}` : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Passageiros</span>
                            <span className="font-semibold text-foreground">
                              {(trip.adults_count || 1) + (trip.children_count || 0)} pax
                            </span>
                          </div>
                          {trip.total_cents > 0 && (
                            <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                              <span className="text-muted-foreground text-[10px]">Investimento Total</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatMoney(trip.total_cents)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 h-8 font-semibold">
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

              {/* Propostas e Oportunidades do CRM Comercial */}
              {(data.commercialLeads || []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pt-2">
                    <TrendingUp className="size-3.5 text-emerald-500" />
                    Propostas & Oportunidades no Funil ({data.commercialLeads.length})
                  </h3>
                  <div className="space-y-2">
                    {data.commercialLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        className="p-4 rounded-2xl bg-card border border-border/60 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Plane className="size-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate">
                              {lead.title || lead.full_name || "Oportunidade"}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {lead.status}
                              </Badge>
                              {lead.estimated_value_cents > 0 && (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {formatMoney(lead.estimated_value_cents)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono shrink-0">
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
            <Button
              onClick={() => setIsTravelerModalOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 min-h-[36px] font-semibold"
            >
              <Compass className="size-3.5 text-primary" />
              Editar Preferências
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Voo & Cabine */}
            <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Armchair className="size-4 text-sky-500" />
                <span>Assento & Cabine</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Preferência:</span>
                  <Badge variant="secondary" className="text-[11px]">
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
            <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <FileText className="size-4 text-primary" />
                <span>Passaporte & Vistos</span>
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
                  <span className="text-foreground truncate max-w-[150px]">
                    {visasInput || "Nenhum informado"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Programas de Fidelidade */}
            <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <Award className="size-4 text-amber-500" />
                <span>Programas & Milhas</span>
              </div>
              <div className="space-y-2 text-xs">
                {airlineMiles ? (
                  <div className="p-2.5 rounded-xl bg-muted/40 font-mono text-[11px] space-y-1">
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
            <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-3 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <HeartPulse className="size-4 text-rose-500" />
                <span>Acessibilidade, PCD & Cuidados Especiais</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant={isPcd ? "destructive" : "outline"} className="text-xs">
                  {isPcd ? "♿ Passageiro PCD Declarado" : "Não PCD"}
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
            <div className="bg-card rounded-2xl border border-border/60 p-8 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-muted mx-auto flex items-center justify-center">
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
                  className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/30 p-5 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                      {pass.pass_type || "Cartão Digital"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {pass.status || "Ativo"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{pass.title || "Passe Digital"}</h4>
                    <p className="text-xs text-muted-foreground">{pass.description || "Documento Digital"}</p>
                  </div>
                  <div className="p-3 bg-card/80 border border-border/40 rounded-xl flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-bold text-foreground truncate max-w-[120px]">{pass.serial_number || pass.id.slice(0, 8)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">
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
                <div key={idx} className="p-4 rounded-2xl bg-card border border-border/60 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Users2 className="size-4 text-violet-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{pax.full_name}</h4>
                      <Badge variant="secondary" className="text-[10px] uppercase px-1.5">
                        {pax.relationship || "Outro"}
                      </Badge>
                    </div>
                  </div>
                  {(pax.document || pax.birth_date || pax.phone) && (
                    <div className="space-y-0.5 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                      {pax.birth_date && (
                        <p>Nasc: {new Date(pax.birth_date).toLocaleDateString("pt-BR")}</p>
                      )}
                      {pax.document && <p className="font-mono">Doc: {pax.document}</p>}
                      {pax.phone && <p>Tel: {pax.phone}</p>}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground/60 block">Via: {pax._leadTitle}</span>
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
                <div key={addr.id} className="p-4 rounded-2xl bg-card border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" />
                      {addr.street}{addr.number ? `, ${addr.number}` : ""}
                    </span>
                    {addr.is_default && (
                      <Badge variant="secondary" className="text-[10px]">Principal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[addr.neighborhood, addr.city, addr.state].filter(Boolean).join(" • ")}
                  </p>
                  {addr.zipcode && (
                    <span className="text-[11px] font-mono text-muted-foreground block">CEP: {addr.zipcode}</span>
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
                  className="p-4 rounded-2xl bg-card border border-border/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Gift className="size-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {cr.description || "Crédito em Loja"}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
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

        {/* ── Aba 7: Prontuários Clínicos / Anamnese ── */}
        <TabsContent value="clinical" className="space-y-4">
          {(data.clinicalRecords || []).length === 0 ? (
            <EmptyState
              title="Nenhum atendimento ou anamnese registrado"
              description="Para salões, clínicas e terapeutas: registre procedimentos, alergias, laudos e histórico clínico."
            />
          ) : (
            <div className="space-y-3">
              {(data.clinicalRecords || []).map((rec: any) => (
                <div key={rec.id} className="p-5 rounded-2xl bg-card border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="size-4 text-rose-500" />
                      <h4 className="font-bold text-sm text-foreground">{rec.service_title}</h4>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(rec.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{rec.notes}</p>
                  {rec.allergies && (
                    <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="size-3.5" />
                      <span>Alergias / Contraindicações: {rec.allergies}</span>
                    </div>
                  )}
                  {rec.professional_name && (
                    <span className="text-[11px] text-muted-foreground block">
                      Atendido por: {rec.professional_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 8: Notas & Tags de Segmentação ── */}
        <TabsContent value="crm" className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tags de Segmentação (separadas por vírgula)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ex: VIP, Atacado, Pontual, Prefere WhatsApp"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações Internas Confidenciais</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações privadas sobre preferências, restrições e histórico do cliente..."
                rows={5}
                className="text-xs"
              />
            </div>
            <Button onClick={handleSaveCrm} disabled={isSavingCrm} className="gap-1.5 font-bold text-xs min-h-[44px]">
              <Save className="size-3.5" />
              {isSavingCrm ? "Salvando..." : "Salvar Ficha"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Sheet: Conceder Crédito ── */}
      <Sheet open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl lg:max-w-[70vw] flex flex-col justify-between overflow-y-auto">
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle>Conceder Crédito em Loja</SheetTitle>
              <SheetDescription>
                Adicione saldo na carteira do cliente para compras futuras, trocas ou bonificação.
              </SheetDescription>
            </SheetHeader>
            <form id="grant-credit-form" onSubmit={handleGrantCredit} className="space-y-4 py-2">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Motivo / Descrição</Label>
                <Input
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="Ex: Devolução Pedido #1234 / Bônus Aniversário"
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

      {/* ── Sheet: Novo Atendimento / Anamnese ── */}
      <Sheet open={isClinicalModalOpen} onOpenChange={setIsClinicalModalOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col justify-between overflow-y-auto"
        >
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle>Registro de Atendimento & Anamnese</SheetTitle>
              <SheetDescription>
                Histórico clínico para profissionais de saúde, estética, beleza e bem-estar.
              </SheetDescription>
            </SheetHeader>
            <form id="clinical-form" onSubmit={handleSaveClinical} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Procedimento / Serviço Realizado</Label>
                <Input
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="Ex: Limpeza de Pele Profunda, Corte com Química"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alergias / Restrições (se houver)</Label>
                <Input
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Ex: Alergia a iodo, pele sensível, pressão alta"
                  className="text-xs text-destructive"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observações do Atendimento & Evolução</Label>
                <Textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Descreva o procedimento realizado, produtos aplicados e recomendações..."
                  rows={4}
                  className="text-xs"
                  required
                />
              </div>
            </form>
          </div>
          <SheetFooter className="pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => setIsClinicalModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button type="submit" form="clinical-form" disabled={isSavingClinical} className="text-xs font-bold">
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
          className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col justify-between overflow-y-auto"
        >
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Compass className="size-5 text-primary" />
                Preferências de Viagem & Anamnese
              </SheetTitle>
              <SheetDescription>
                Configure os detalhes operacionais de voo, alimentação, passaportes e programas de fidelidade para emissões rápidas e personalizadas.
              </SheetDescription>
            </SheetHeader>

            <form id="traveler-pref-form" onSubmit={handleSaveTraveler} className="space-y-6 py-2">
              {/* Seção 1: Assento e Alimentação */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Armchair className="size-3.5 text-sky-500" />
                  Assento & Refeições a Bordo
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Assento Preferido</Label>
                    <select
                      value={seatPref}
                      onChange={(e) => setSeatPref(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="window">Janela (Window)</option>
                      <option value="aisle">Corredor (Aisle)</option>
                      <option value="middle">Meio (Middle)</option>
                      <option value="front">Frente / Saída de Emergência</option>
                      <option value="any">Sem preferência</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" />
                  Documentos de Viagem Internacional
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Número do Passaporte</Label>
                    <Input
                      value={passportNum}
                      onChange={(e) => setPassportNum(e.target.value)}
                      placeholder="Ex: YA123456"
                      className="text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">País Emissor</Label>
                    <Input
                      value={passportCountry}
                      onChange={(e) => setPassportCountry(e.target.value)}
                      placeholder="Ex: Brasil / ITA"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de Validade</Label>
                    <Input
                      type="date"
                      value={passportExpiry}
                      onChange={(e) => setPassportExpiry(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="size-3.5 text-amber-500" />
                  Programas de Fidelidade & Milhas
                </h4>
                <div className="space-y-1.5">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <HeartPulse className="size-3.5 text-rose-500" />
                  Acessibilidade & Cuidados de Saúde
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={isPcd}
                      onChange={(e) => setIsPcd(e.target.checked)}
                      className="size-4 rounded text-primary focus:ring-primary/20"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Passageiro PCD</span>
                      <span className="text-muted-foreground text-[11px]">Requer prioridade de embarque e atendimento</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={isWheelchair}
                      onChange={(e) => setIsWheelchair(e.target.checked)}
                      className="size-4 rounded text-primary focus:ring-primary/20"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">Cadeira de Rodas (WCHR)</span>
                      <span className="text-muted-foreground text-[11px]">Solicitar assistência no aeroporto / transfer</span>
                    </div>
                  </label>
                </div>

                <div className="space-y-1.5">
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
              className="text-xs font-bold min-h-[40px] px-6"
            >
              {isSavingTraveler ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
