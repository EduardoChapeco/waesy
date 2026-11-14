import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Phone,
  Mail,
  ShoppingBag,
  ShieldAlert,
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Plane,
  UserCheck,
  X,
  Receipt,
  Send,
  ArrowRightLeft,
  Clock,
  Save,
  RefreshCw,
  GitBranch,
  Users,
  Radio,
  Bot,
  QrCode,
  CreditCard,
  Camera,
  Copy,
  Plus,
  Trash2,
  Paperclip,
  CheckCircle2,
  Target,
} from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";
import { formatDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import {
  getCustomer360Context,
  assignChatThread,
  updateCustomerFunnelStage,
  updateCustomerProfileFromChat,
  updateThreadAiHandoffMode,
  updateThreadAiAgentConfig,
  updateThreadInternalNotes,
  syncContactProfileFromWhatsApp,
  upsertCustomerTravelDossier,
  deleteCustomerTravelDossier,
  sendClientLinkedEmail,
  createSupportTicketFromChat,
  addSupportTicketStep,
  linkThreadToCrmOpportunity,
  registerCrmCommercialActivity,
  createLinkedCustomerTask,
  toggleCustomerOnboardingStep,
} from "@/services/chat.functions";
import { updateTaskStatus } from "@/services/tasks.functions";
import {
  ONBOARDING_CS_STEPS,
  SAC_FUNCTION_ROLES,
  CustomerIdentityTagPill,
  type OnboardingStepKey,
  type SacFunctionRoleKey,
} from "@/lib/entity-trace-hash";
import { ThreadTagsPicker } from "@/components/chat/ThreadTagsPicker";
import { CommercialBudgetPadSheet } from "@/components/documents/CommercialBudgetPadSheet";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { value: "new", label: "Novo Lead" },
  { value: "contacted", label: "Em Contato" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta / Orçamento" },
  { value: "negotiation", label: "Em Negociação" },
  { value: "won", label: "Fechado (Ganho)" },
  { value: "lost", label: "Perdido" },
] as const;

const AI_AGENT_SPECIALISTS = [
  { id: "general_copilot", label: "Copilot Geral (Recepção & Catálogo)" },
  { id: "tourism_concierge", label: "Concierge Turismo, Voos & ANAC" },
  { id: "commercial_closer", label: "Consultor Comercial & Fechamento" },
  { id: "financial_billing", label: "Financeiro, PIX & Boletos" },
  { id: "sac_triage", label: "Triagem SAC & Pós-Venda" },
] as const;

const FLIGHT_STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  confirmed: { label: "Confirmado", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  scheduled: { label: "Programado", badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  delayed: { label: "Alterado / Atraso", badgeClass: "bg-warning/15 text-warning-strong border-warning/30" },
  cancelled: { label: "Cancelado", badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  reaccommodation: { label: "Em Reacomodação", badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
};

interface Customer360SidebarProps {
  customerId?: string;
  storeId: string;
  threadId?: string;
  guestName?: string;
  guestPhone?: string;
  className?: string;
  niche?: string;
  storeName?: string;
  isGroup?: boolean;
  isChannel?: boolean;
  avatarUrl?: string | null;
  department?: string;
  assignedAgentId?: string | null;
  teamMembers?: Array<{ id: string; full_name: string }>;
  departmentLabels?: Record<string, string>;
  aiAutoReply?: boolean;
  onToggleAiAutoReply?: (checked: boolean) => void;
  onDepartmentChange?: (nextDept: string) => void;
  onAssignedAgentChange?: (nextAgentId: string | null) => void;
  onOpenQuickComposerModal?: (modal: "invoice" | "boleto" | "contract" | "quote" | "image_card") => void;
  onQuickSendMessage?: (text: string) => void;
  onOpenTransfer?: () => void;
  onOpenSchedule?: () => void;
  onProfileSynced?: (payload: {
    avatarUrl?: string | null;
    fullName?: string | null;
    phone?: string | null;
    isGroup?: boolean;
    attribution?: Record<string, any> | null;
  }) => void;
}

export const Customer360Sidebar: React.FC<Customer360SidebarProps> = ({
  customerId,
  storeId,
  threadId,
  guestName,
  guestPhone,
  className,
  niche,
  storeName,
  isGroup = false,
  isChannel = false,
  avatarUrl,
  department = "geral",
  assignedAgentId = null,
  teamMembers = [],
  departmentLabels = { geral: "Geral", vendas: "Vendas", suporte: "Suporte", financeiro: "Financeiro" },
  aiAutoReply = true,
  onToggleAiAutoReply,
  onDepartmentChange,
  onAssignedAgentChange,
  onOpenQuickComposerModal,
  onQuickSendMessage,
  onOpenTransfer,
  onOpenSchedule,
  onProfileSynced,
}) => {
  const isTourism = niche === "tourism" || String(storeName || "").toLowerCase().includes("tour") || String(storeName || "").toLowerCase().includes("viag") || String(storeName || "").toLowerCase().includes("excurs");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isBudgetPadOpen, setIsBudgetPadOpen] = useState(false);
  const [leadTitle, setLeadTitle] = useState("");
  const [leadBudget, setLeadBudget] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [funnelStage, setFunnelStage] = useState<string>("new");
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSyncingWhatsAppProfile, setIsSyncingWhatsAppProfile] = useState(false);
  const [isEditingAttribution, setIsEditingAttribution] = useState(false);
  const [isSavingAttribution, setIsSavingAttribution] = useState(false);
  const [attrPlatform, setAttrPlatform] = useState("");
  const [attrUtmSource, setAttrUtmSource] = useState("");
  const [attrUtmMedium, setAttrUtmMedium] = useState("");
  const [attrCampaign, setAttrCampaign] = useState("");
  const [attrAdId, setAttrAdId] = useState("");
  const [attrHeadline, setAttrHeadline] = useState("");

  const [handoffMode, setHandoffMode] = useState<"ai_triage" | "human_queue" | "human_active">("ai_triage");
  const [selectedAiAgent, setSelectedAiAgent] = useState<string>("general_copilot");

  // Estado Dossiê de Viagem / PNR / Operadora
  const [isAddingDossier, setIsAddingDossier] = useState(false);
  const [editingDossierId, setEditingDossierId] = useState<string | null>(null);
  const [pnrLocator, setPnrLocator] = useState("");
  const [operatorPackageId, setOperatorPackageId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [airlineName, setAirlineName] = useState("");
  const [routeSummary, setRouteSummary] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [flightStatus, setFlightStatus] = useState<"confirmed" | "scheduled" | "delayed" | "cancelled" | "reaccommodation">("confirmed");
  const [isSavingDossier, setIsSavingDossier] = useState(false);

  // Estado E-mail Vinculado ao Cliente / Operadora / Ticket
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailRecipientType, setEmailRecipientType] = useState<"operator" | "airline" | "client" | "support">("operator");
  const [emailRecipientAddress, setEmailRecipientAddress] = useState("");
  const [emailRecipientName, setEmailRecipientName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailPnr, setEmailPnr] = useState("");
  const [emailPkgId, setEmailPkgId] = useState("");
  const [emailTicketId, setEmailTicketId] = useState("");
  const [emailAttachmentUrl, setEmailAttachmentUrl] = useState("");
  const [emailNotifyChat, setEmailNotifyChat] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [newTicketPriority, setNewTicketPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [newTicketRole, setNewTicketRole] = useState<SacFunctionRoleKey>("sac_pepinos");
  const [newTicketEntityCode, setNewTicketEntityCode] = useState("");
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [stepInputByTicket, setStepInputByTicket] = useState<Record<string, string>>({});

  // Estado Tarefas Vinculadas & Onboarding CS (Sheet Rápida)
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("high");
  const [newTaskSector, setNewTaskSector] = useState<SacFunctionRoleKey>("customer_success");
  const [newTaskEntityCode, setNewTaskEntityCode] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [togglingOnboardingKey, setTogglingOnboardingKey] = useState<string | null>(null);
  const [isLinkingOpportunity, setIsLinkingOpportunity] = useState(false);
  const [activityTitle, setActivityTitle] = useState("");
  const [activityType, setActivityType] = useState<"note" | "call" | "whatsapp_followup" | "proposal_sent" | "meeting">("whatsapp_followup");
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  const loadContext = useCallback(() => {
    if (!storeId || (!customerId && !threadId && !guestPhone && !guestName)) return;
    setLoading(true);
    setError(null);
    setAvatarImgFailed(false);
    getCustomer360Context({
      data: {
        customerId: customerId || null,
        storeId,
        threadId: threadId || null,
        guestPhone: guestPhone || null,
        guestName: guestName || null,
      },
    })
      .then((res) => {
        setData(res);
        setInternalNotes(res?.threadContext?.internal_notes || "");
        setFunnelStage(res?.linkedLead?.status || "new");
        setEditName(res?.profile?.full_name || guestName || "");
        setEditPhone(res?.isGroup ? "" : (res?.profile?.phone || guestPhone || ""));
        setEditEmail(res?.isGroup ? "" : (res?.profile?.email || ""));
        setEditCpf(res?.isGroup ? "" : (res?.profile?.document_cpf || ""));
        setEditCity(res?.isGroup ? "" : (res?.profile?.city || ""));
        setEditAvatarUrl(res?.profile?.avatar_url || avatarUrl || "");
        const attr = (res?.attribution || {}) as Record<string, any>;
        setAttrPlatform(String(attr.platform || ""));
        setAttrUtmSource(String(attr.utm_source || attr.source || ""));
        setAttrUtmMedium(String(attr.utm_medium || attr.medium || ""));
        setAttrCampaign(String(attr.campaign || attr.utm_campaign || ""));
        setAttrAdId(String(attr.ad_id || attr.meta_ad_id || ""));
        setAttrHeadline(String(attr.ad_headline || attr.listing_title || ""));
        if (res?.aiAgentConfig?.handoffMode) {
          setHandoffMode(res.aiAgentConfig.handoffMode);
        } else if ((res?.threadContext as any)?.metadata?.handoff_mode) {
          setHandoffMode((res.threadContext as any).metadata.handoff_mode);
        }
        if (res?.aiAgentConfig?.aiAgentId) {
          setSelectedAiAgent(res.aiAgentConfig.aiAgentId);
        } else if (isTourism) {
          setSelectedAiAgent("tourism_concierge");
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar Customer 360:", err);
        setError(err instanceof Error ? err.message : "Não foi possível carregar o perfil do cliente.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [customerId, storeId, threadId, guestPhone, guestName, avatarUrl, isTourism]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const handleSyncWhatsAppProfile = async () => {
    if (!threadId) return;
    setIsSyncingWhatsAppProfile(true);
    setAvatarImgFailed(false);
    try {
      const synced = await syncContactProfileFromWhatsApp({
        data: { threadId, storeId },
      });
      if (synced.avatarUrl || synced.fullName || synced.phone) {
        setData((prev: any) =>
          prev
            ? {
                ...prev,
                isGroup: synced.isGroup ?? prev.isGroup,
                profile: {
                  ...(prev.profile || {}),
                  ...(synced.avatarUrl ? { avatar_url: synced.avatarUrl } : {}),
                  ...(synced.fullName ? { full_name: synced.fullName } : {}),
                  ...(!synced.isGroup && synced.phone ? { phone: synced.phone } : {}),
                },
              }
            : prev,
        );
        if (synced.avatarUrl) setEditAvatarUrl(synced.avatarUrl);
        if (synced.fullName) setEditName(synced.fullName);
        if (!synced.isGroup && synced.phone) setEditPhone(synced.phone);
        if (synced.isGroup) loadContext();
        onProfileSynced?.({
          avatarUrl: synced.avatarUrl,
          fullName: synced.fullName,
          phone: synced.isGroup ? null : (synced.phone || null),
          isGroup: Boolean(synced.isGroup),
        });
        toast.success(synced.avatarUrl ? "Foto e dados do WhatsApp sincronizados!" : "Dados do WhatsApp sincronizados!");
      } else {
        toast.info("Não encontramos foto pública adicional no WhatsApp.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível sincronizar a foto do WhatsApp.");
    } finally {
      setIsSyncingWhatsAppProfile(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!threadId) return;
    setIsSavingNotes(true);
    try {
      await updateThreadInternalNotes({
        data: {
          threadId,
          storeId,
          internalNotes,
        },
      });
      toast.success("Observação da equipe salva.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar observação.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSelectAiSpecialist = async (nextAgentId: string) => {
    setSelectedAiAgent(nextAgentId);
    if (!threadId) return;
    try {
      await updateThreadAiAgentConfig({
        data: {
          threadId,
          storeId,
          aiAgentId: nextAgentId as any,
          handoffMode,
          aiAutoReplyEnabled: aiAutoReply,
        },
      });
      const label = AI_AGENT_SPECIALISTS.find((a) => a.id === nextAgentId)?.label || nextAgentId;
      toast.success(`Agente IA ativo: ${label}`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao selecionar agente de IA.");
    }
  };

  const handleSaveTravelDossier = async () => {
    if (!threadId) return;
    if (!pnrLocator.trim() && !operatorPackageId.trim() && !routeSummary.trim()) {
      toast.error("Informe pelo menos o PNR, ID do Pacote na Operadora ou Trecho.");
      return;
    }
    setIsSavingDossier(true);
    try {
      const res = await upsertCustomerTravelDossier({
        data: {
          threadId,
          storeId,
          dossierId: editingDossierId || undefined,
          pnrLocator: pnrLocator.trim() || null,
          operatorPackageId: operatorPackageId.trim() || null,
          operatorName: operatorName.trim() || null,
          airlineName: airlineName.trim() || null,
          routeSummary: routeSummary.trim() || null,
          departureDate: departureDate.trim() || null,
          flightStatus,
          passengerNames: data?.profile?.full_name || guestName || null,
        },
      });
      setData((prev: any) => (prev ? { ...prev, travelDossiers: res.travelDossiers } : prev));
      setIsAddingDossier(false);
      setEditingDossierId(null);
      setPnrLocator("");
      setOperatorPackageId("");
      setOperatorName("");
      setAirlineName("");
      setRouteSummary("");
      setDepartureDate("");
      toast.success("Localizador / Reserva salvo na ficha do cliente!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar localizador de viagem.");
    } finally {
      setIsSavingDossier(false);
    }
  };

  const handleRemoveTravelDossier = async (dossierId: string) => {
    if (!threadId) return;
    try {
      const res = await deleteCustomerTravelDossier({
        data: { threadId, storeId, dossierId },
      });
      setData((prev: any) => (prev ? { ...prev, travelDossiers: res.travelDossiers } : prev));
      toast.success("Localizador removido.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover localizador.");
    }
  };

  const openOperatorEmailShortcut = (dossier?: any) => {
    const pnr = dossier?.pnr_locator || "";
    const pkg = dossier?.operator_package_id || "";
    const opName = dossier?.operator_name || "Operadora";
    const paxName = data?.profile?.full_name || guestName || "Passageiro";
    setEmailRecipientType("operator");
    setEmailRecipientName(opName);
    setEmailPnr(pnr);
    setEmailPkgId(pkg);
    setEmailSubject(
      `Verificação de Status / Voo${pnr ? ` • PNR ${pnr}` : ""}${pkg ? ` • Pacote #${pkg}` : ""} — ${paxName}`,
    );
    setEmailBody(
      `Olá equipe ${opName},\n\nSolicitamos a gentileza de confirmar o status atualizado da reserva / voo abaixo:\n- Passageiro(a): ${paxName}\n${pnr ? `- Localizador PNR / Cia: ${pnr}\n` : ""}${pkg ? `- ID do Pacote / Reserva na Operadora: ${pkg}\n` : ""}${dossier?.route_summary ? `- Trecho / Roteiro: ${dossier.route_summary}\n` : ""}${dossier?.departure_date ? `- Data de Embarque: ${dossier.departure_date}\n` : ""}\nFavor informar se há qualquer alteração de malha aérea, reacomodação ou pendência operacional.\n\nAtenciosamente,\n${storeName || "Equipe de Atendimento"}`,
    );
    setEmailNotifyChat(false);
    setIsEmailComposerOpen(true);
  };

  const handleDispatchLinkedEmail = async () => {
    if (!threadId) return;
    if (!emailRecipientAddress.trim() || !emailSubject.trim() || !emailBody.trim()) {
      toast.error("Preencha o e-mail de destino, assunto e mensagem.");
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await sendClientLinkedEmail({
        data: {
          threadId,
          storeId,
          customerId: data?.profile?.id || customerId || null,
          recipientEmail: emailRecipientAddress.trim(),
          recipientName: emailRecipientName.trim() || null,
          recipientType: emailRecipientType,
          subject: emailSubject.trim(),
          bodyText: emailBody.trim(),
          pnrLocator: emailPnr.trim() || null,
          operatorPackageId: emailPkgId.trim() || null,
          ticketId: emailTicketId.trim() || null,
          attachmentImageUrl: emailAttachmentUrl.trim() || null,
          notifyInCustomerChat: emailNotifyChat,
        },
      });
      setData((prev: any) => (prev ? { ...prev, linkedEmails: res.linkedEmails } : prev));
      setIsEmailComposerOpen(false);
      setEmailSubject("");
      setEmailBody("");
      setEmailAttachmentUrl("");
      toast.success("E-mail enviado e vinculado ao histórico 360º do cliente!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar e-mail vinculado.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleFunnelStageChange = async (nextStage: string) => {
    setFunnelStage(nextStage);
    setIsUpdatingStage(true);
    try {
      const updatedLead = await updateCustomerFunnelStage({
        data: {
          storeId,
          leadId: data?.linkedLead?.id || null,
          threadId: threadId || null,
          customerId: data?.profile?.id || customerId || null,
          customerName: data?.profile?.full_name || guestName || "Cliente",
          customerPhone: data?.profile?.phone || guestPhone || "",
          stage: nextStage as any,
        },
      });
      setData((prev: any) => {
        if (!prev) return prev;
        const existingOpps = Array.isArray(prev.opportunities) ? prev.opportunities : [];
        const hasOpp = existingOpps.some((op: any) => op.id === updatedLead?.id);
        const nextOpps = updatedLead
          ? hasOpp
            ? existingOpps.map((op: any) => (op.id === updatedLead.id ? updatedLead : op))
            : [updatedLead, ...existingOpps]
          : existingOpps;
        return { ...prev, linkedLead: updatedLead, opportunities: nextOpps };
      });
      toast.success("Etapa do funil atualizada!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar etapa do funil.");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleSelectOpportunity = async (selectedLeadId: string) => {
    if (!threadId) return;
    setIsLinkingOpportunity(true);
    try {
      const targetId = selectedLeadId === "" ? null : selectedLeadId;
      await linkThreadToCrmOpportunity({
        data: {
          threadId,
          leadId: targetId,
        },
      });
      const matchedOpp = targetId
        ? (data?.opportunities || []).find((op: any) => op.id === targetId) || null
        : null;
      setData((prev: any) => (prev ? { ...prev, linkedLead: matchedOpp } : prev));
      if (matchedOpp?.status) {
        setFunnelStage(matchedOpp.status);
      }
      toast.success(targetId ? "Oportunidade vinculada à conversa." : "Conversa desvinculada da oportunidade.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao vincular oportunidade.");
    } finally {
      setIsLinkingOpportunity(false);
    }
  };

  const handleAddCommercialActivity = async () => {
    const activeLeadId = data?.linkedLead?.id;
    if (!activeLeadId) {
      toast.error("Selecione ou crie uma oportunidade antes de registrar uma atividade.");
      return;
    }
    if (!activityTitle.trim()) {
      toast.error("Informe a descrição da atividade comercial.");
      return;
    }
    setIsSavingActivity(true);
    try {
      const res = await registerCrmCommercialActivity({
        data: {
          leadId: activeLeadId,
          threadId: threadId || null,
          activityText: activityTitle.trim(),
          activityType,
        },
      });
      setActivityTitle("");
      setData((prev: any) => {
        if (!prev) return prev;
        const updatedLead = res.lead || prev.linkedLead;
        const nextOpps = (prev.opportunities || []).map((op: any) => (op.id === updatedLead.id ? updatedLead : op));
        return { ...prev, linkedLead: updatedLead, opportunities: nextOpps };
      });
      toast.success("Atividade comercial registrada na oportunidade.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar atividade comercial.");
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleSendOrCopyLink = (messageText: string) => {
    if (onQuickSendMessage) {
      onQuickSendMessage(messageText);
      toast.success("Comprovante/link inserido no chat!");
    } else {
      navigator.clipboard.writeText(messageText);
      toast.success("Link copiado para a área de transferência!");
    }
  };
  const handleSaveCustomerProfile = async () => {
    const resolvedIsGroup = Boolean(isGroup || data?.isGroup);
    if (!editName.trim()) {
      toast.error(resolvedIsGroup ? "Informe o nome do grupo." : "Informe o nome do cliente.");
      return;
    }
    setIsSavingProfile(true);
    setAvatarImgFailed(false);
    try {
      const res = await updateCustomerProfileFromChat({
        data: {
          customerId: resolvedIsGroup ? null : (data?.profile?.id || customerId || null),
          threadId: threadId || null,
          isGroup: resolvedIsGroup,
          fullName: editName.trim(),
          phone: resolvedIsGroup ? null : (editPhone.trim() || null),
          email: resolvedIsGroup ? null : (editEmail.trim() || null),
          documentCpf: resolvedIsGroup ? null : (editCpf.trim() || null),
          city: resolvedIsGroup ? null : (editCity.trim() || null),
          avatarUrl: editAvatarUrl.trim() || null,
        },
      });
      setData((prev: any) =>
        prev
          ? {
              ...prev,
              ...(resolvedIsGroup ? { groupSubject: editName.trim() } : {}),
              profile: {
                ...(prev.profile || {}),
                ...res.profile,
                ...(editAvatarUrl.trim() ? { avatar_url: editAvatarUrl.trim() } : {}),
              },
            }
          : prev,
      );
      onProfileSynced?.({
        avatarUrl: editAvatarUrl.trim() || data?.profile?.avatar_url || null,
        fullName: editName.trim(),
        phone: resolvedIsGroup ? null : (res?.profile?.phone || editPhone.trim() || null),
        isGroup: resolvedIsGroup,
      });
      setIsEditingProfile(false);
      toast.success(resolvedIsGroup ? "Nome e foto do grupo atualizados!" : "Dados do contato atualizados!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar dados.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAttribution = async () => {
    const resolvedIsGroup = Boolean(isGroup || data?.isGroup);
    const currentName = String(data?.profile?.full_name || editName || guestName || (resolvedIsGroup ? "Grupo WhatsApp" : "Contato")).trim();
    setIsSavingAttribution(true);
    try {
      const res = await updateCustomerProfileFromChat({
        data: {
          customerId: resolvedIsGroup ? null : (data?.profile?.id || customerId || null),
          threadId: threadId || null,
          isGroup: resolvedIsGroup,
          fullName: currentName.length >= 2 ? currentName : "Contato WhatsApp",
          attributionUpdate: {
            platform: attrPlatform.trim() || null,
            source: attrUtmSource.trim() || attrPlatform.trim() || null,
            campaign: attrCampaign.trim() || null,
            ad_id: attrAdId.trim() || null,
            ad_headline: attrHeadline.trim() || null,
            utm_source: attrUtmSource.trim() || null,
            utm_medium: attrUtmMedium.trim() || null,
          },
        },
      });
      setData((prev: any) => (prev ? { ...prev, attribution: res.attribution } : prev));
      onProfileSynced?.({ attribution: res.attribution || null });
      setIsEditingAttribution(false);
      toast.success("Origem e atribuição de anúncio atualizadas!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar atribuição.");
    } finally {
      setIsSavingAttribution(false);
    }
  };

  const handleChangeHandoff = async (mode: "ai_triage" | "human_queue" | "human_active") => {
    setHandoffMode(mode);
    if (!threadId) return;
    try {
      await updateThreadAiHandoffMode({
        data: { threadId, handoffMode: mode, aiAutoReplyEnabled: mode === "ai_triage" },
      });
      toast.success(
        mode === "ai_triage"
          ? "IA ativada na recepção desta conversa."
          : mode === "human_queue"
            ? "Conversa na fila humana."
            : "Atendimento assumido pelo humano (IA pausada).",
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alternar modo IA/Humano.");
    }
  };

  const handleCreateDemandTicket = async () => {
    if (!threadId || !newTicketTitle.trim() || !newTicketDesc.trim()) {
      toast.error("Preencha o título e a descrição da demanda.");
      return;
    }
    setIsSavingTicket(true);
    try {
      const activeTrip = data?.trips?.[0] || null;
      const activeDossier = data?.travelDossiers?.[0] || null;
      const activeOrder = data?.orders?.[0] || null;
      const entityCode =
        newTicketEntityCode.trim() ||
        activeTrip?.trip_number ||
        activeDossier?.pnrLocator ||
        (activeOrder ? `PED-${String(activeOrder.id).slice(0, 6).toUpperCase()}` : "");

      const created = await createSupportTicketFromChat({
        data: {
          threadId,
          customerId: data?.profile?.id || customerId || null,
          title: newTicketTitle.trim(),
          description: newTicketDesc.trim(),
          priority: newTicketPriority,
          sacFunctionRole: newTicketRole,
          linkedEntityType: activeTrip || activeDossier ? "trip" : activeOrder ? "order" : "customer",
          linkedEntityId: activeTrip?.id || activeOrder?.id || null,
          linkedEntityCode: entityCode || null,
          customerName: data?.profile?.full_name || guestName || "Cliente",
          customerAvatarUrl: data?.profile?.avatar_url || avatarUrl || null,
          traceHash: data?.customerTraceHash || data?.profile?.trace_hash || null,
        },
      });
      setData((prev: any) => (prev ? { ...prev, tickets: [created, ...(prev.tickets || [])] } : prev));
      setNewTicketTitle("");
      setNewTicketDesc("");
      setNewTicketEntityCode("");
      setIsCreatingTicket(false);
      toast.success("Chamado SAC aberto e sincronizado com o painel de Suporte!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar demanda.");
    } finally {
      setIsSavingTicket(false);
    }
  };

  const handleToggleOnboardingStep = async (stepKey: OnboardingStepKey) => {
    const currentSteps = (data?.onboardingSteps || {}) as Record<string, boolean>;
    const nextCompleted = !currentSteps[stepKey];
    setTogglingOnboardingKey(stepKey);
    setData((prev: any) =>
      prev
        ? {
            ...prev,
            onboardingSteps: { ...(prev.onboardingSteps || {}), [stepKey]: nextCompleted },
          }
        : prev
    );
    try {
      await toggleCustomerOnboardingStep({
        data: {
          storeId,
          threadId: threadId || null,
          tripId: data?.trips?.[0]?.id || null,
          stepKey,
          completed: nextCompleted,
        },
      });
      toast.success(
        nextCompleted
          ? `Etapa "${ONBOARDING_CS_STEPS.find((s) => s.key === stepKey)?.shortLabel}" concluída!`
          : "Etapa reaberta na Planilha Viva CS."
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao sincronizar etapa CS.");
      loadContext();
    } finally {
      setTogglingOnboardingKey(null);
    }
  };

  const handleCreateLinkedTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    setIsSavingTask(true);
    try {
      const activeTrip = data?.trips?.[0] || null;
      const activeDossier = data?.travelDossiers?.[0] || null;
      const activeOrder = data?.orders?.[0] || null;
      const entityCode =
        newTaskEntityCode.trim() ||
        activeTrip?.trip_number ||
        activeDossier?.pnrLocator ||
        (activeOrder ? `PED-${String(activeOrder.id).slice(0, 6).toUpperCase()}` : "");

      const created = await createLinkedCustomerTask({
        data: {
          storeId,
          threadId: threadId || null,
          customerId: data?.profile?.id || customerId || null,
          customerName: data?.profile?.full_name || guestName || "Cliente",
          customerPhone: data?.profile?.phone || guestPhone || null,
          customerAvatarUrl: data?.profile?.avatar_url || avatarUrl || null,
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          assignedSector: newTaskSector,
          entityType: activeTrip || activeDossier ? "trip" : activeOrder ? "order" : "customer",
          entityId: activeTrip?.id || activeOrder?.id || data?.profile?.id || null,
          entityCode: entityCode || null,
          pnrLocator: activeDossier?.pnrLocator || null,
          isMyDay: true,
        },
      });
      setData((prev: any) =>
        prev ? { ...prev, tasks: [created, ...(prev.tasks || [])] } : prev
      );
      setNewTaskTitle("");
      setNewTaskEntityCode("");
      setIsCreatingTask(false);
      toast.success("Tarefa vinculada criada e disponível no módulo Tarefas!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar tarefa vinculada.");
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleToggleLinkedTaskStatus = async (task: any) => {
    const nextStatus = task.status === "done" ? "todo" : "done";
    setData((prev: any) =>
      prev
        ? {
            ...prev,
            tasks: (prev.tasks || []).map((t: any) =>
              t.id === task.id ? { ...t, status: nextStatus } : t
            ),
          }
        : prev
    );
    try {
      await updateTaskStatus({
        data: {
          store_id: storeId,
          task_id: task.id,
          status: nextStatus as any,
        },
      });
      toast.success(nextStatus === "done" ? "Tarefa concluída!" : "Tarefa reaberta.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar tarefa.");
      loadContext();
    }
  };

  const handleAddTicketStep = async (
    ticketId: string,
    customLabel?: string,
    nextStatus?: "open" | "under_review" | "action_required" | "resolved",
  ) => {
    const label = (customLabel || stepInputByTicket[ticketId] || "").trim();
    if (!label) {
      toast.error("Informe a descrição da etapa.");
      return;
    }
    try {
      const res = await addSupportTicketStep({
        data: { ticketId, threadId: threadId || null, stepLabel: label, nextStatus },
      });
      setStepInputByTicket((prev) => ({ ...prev, [ticketId]: "" }));
      setData((prev: any) =>
        prev
          ? {
              ...prev,
              tickets: (prev.tickets || []).map((t: any) =>
                t.id === ticketId ? { ...t, ...res.ticket, steps: res.steps } : t,
              ),
            }
          : prev,
      );
      toast.success(
        nextStatus === "resolved"
          ? "Chamado resolvido e link de avaliação enviado ao cliente!"
          : "Etapa adicionada à linha do tempo do chamado!",
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar etapa.");
    }
  };

  if (!customerId && !threadId && !guestPhone && !guestName) {
    return (
      <div className="p-6 text-center text-muted-foreground text-xs">
        Nenhum contato selecionado.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-primary" />
        <span className="text-xs">Carregando Ficha 360º...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <AlertTriangle className="size-6 text-destructive mx-auto" />
        <p className="text-xs text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={loadContext}
          className="px-3 py-1 rounded-lg border border-border/70 bg-background text-xs font-semibold inline-flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="size-3.5" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  const {
    profile,
    customerTraceHash,
    metrics,
    orders = [],
    tickets = [],
    tasks = [],
    onboardingSteps = {},
    trips = [],
    travelDossiers = [],
    linkedEmails = [],
    credits = [],
    quotes = [],
    contracts = [],
    opportunities = [],
    documents = [],
    invoices = [],
    permissions,
  } = data;

  const resolvedCustomerId = profile?.id || customerId;
  const effectiveTraceHash = customerTraceHash || profile?.trace_hash || "#CLI-SYNC";
  const effectiveIsGroup = Boolean(isGroup || data?.isGroup);
  const groupParticipants: Array<{ jid: string; phone: string | null; name: string | null; admin?: boolean }> =
    Array.isArray(data?.groupParticipants) ? data.groupParticipants : [];
  const attribution = (data?.attribution && typeof data.attribution === "object" ? data.attribution : null) as Record<string, any> | null;
  const pixelConversions: Array<any> = Array.isArray(data?.pixelConversions) ? data.pixelConversions : [];
  const activeOpportunity = data?.linkedLead || null;
  const activeChecklist = Array.isArray(activeOpportunity?.checklist) ? activeOpportunity.checklist : [];
  const effectiveAvatar = !avatarImgFailed ? (profile?.avatar_url || avatarUrl || null) : null;
  const rawEmailStr = String(profile?.email || "").trim();
  const cleanCustomerEmail = !rawEmailStr || rawEmailStr.endsWith("@whatsapp.waesy") ? null : rawEmailStr;
  const safeDisplayPhone = effectiveIsGroup || isChannel ? null : (profile?.phone || guestPhone || null);

  return (
    <div className={cn("space-y-4 p-3 text-xs font-sans", className)}>
      {/* 1. CAPA / FOTO, NOME, TELEFONE E IDENTIDADE DO CONTATO (TOPO ABSOLUTO) */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-base border border-primary/20 overflow-hidden">
              {effectiveAvatar ? (
                <img
                  src={effectiveAvatar}
                  alt={profile?.full_name || guestName || "Contato"}
                  className="size-full object-cover"
                  onError={() => setAvatarImgFailed(true)}
                />
              ) : effectiveIsGroup ? (
                <Users className="size-5 text-primary" />
              ) : isChannel ? (
                <Radio className="size-5 text-emerald-600" />
              ) : (
                String(profile?.full_name || guestName || "C")[0]?.toUpperCase() || "C"
              )}
            </div>
            {threadId && !isChannel && (
              <button
                type="button"
                onClick={handleSyncWhatsAppProfile}
                disabled={isSyncingWhatsAppProfile}
                className="mt-1 w-full min-h-11 sm:min-h-7 px-1 py-1 rounded-md border border-border/70 bg-background hover:bg-muted text-2xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Sincronizar foto e nome direto do WhatsApp"
              >
                <RefreshCw className={cn("size-2.5", isSyncingWhatsAppProfile && "animate-spin motion-reduce:animate-none")} />
                <span>Foto</span>
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <h4 className="font-bold text-foreground truncate text-sm">
                  {profile?.full_name || data?.groupSubject || guestName || (effectiveIsGroup ? "Grupo WhatsApp" : "Contato")}
                </h4>
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-2xs font-bold shrink-0">
                  {effectiveTraceHash}
                </span>
              </div>
              {!isChannel && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile((prev) => !prev)}
                  className="min-h-11 sm:min-h-8 px-2 py-1 rounded-lg border border-border/70 bg-background hover:bg-muted text-2xs font-semibold text-foreground cursor-pointer transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isEditingProfile ? "Fechar" : "Editar"}
                </button>
              )}
            </div>

            {effectiveIsGroup && (
              <div className="flex items-center gap-2 text-muted-foreground text-2xs">
                <Users className="size-3 shrink-0 text-primary" />
                <span>
                  {groupParticipants.length > 0
                    ? `Grupo WhatsApp · ${groupParticipants.length} participantes`
                    : "Grupo WhatsApp"}
                </span>
              </div>
            )}

            {safeDisplayPhone && (
              <div className="flex items-center gap-1 text-muted-foreground font-mono text-2xs">
                <Phone className="size-3 shrink-0 text-primary/80" />
                <span className="truncate">{safeDisplayPhone}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(String(safeDisplayPhone));
                    toast.success("Telefone copiado!");
                  }}
                  className="min-h-11 min-w-11 sm:min-h-6 sm:min-w-6 inline-flex items-center justify-center p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Copiar telefone"
                >
                  <Copy className="size-2.5" />
                </button>
              </div>
            )}

            {!effectiveIsGroup && !isChannel && (
              <p className="text-muted-foreground text-2xs truncate flex items-center gap-1">
                <Mail className="size-3 shrink-0 text-primary/80" />
                <span>{cleanCustomerEmail || "E-mail não informado"}</span>
              </p>
            )}

            {!effectiveIsGroup && (profile?.document_cpf || profile?.city) && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {profile?.document_cpf && (
                  <span className="px-2 py-1 rounded-md bg-background border border-border/60 text-2xs font-mono text-muted-foreground">
                    CPF: {profile.document_cpf}
                  </span>
                )}
                {profile?.city && (
                  <span className="px-2 py-1 rounded-md bg-background border border-border/60 text-2xs text-muted-foreground">
                    {profile.city}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditingProfile && (
          <div className="pt-2 border-t border-border/50 space-y-2">
            <p className="text-2xs font-bold text-foreground uppercase tracking-wider">
              {effectiveIsGroup ? "Editar Grupo e Foto" : "Editar Dados e Foto"}
            </p>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={effectiveIsGroup ? "Nome do grupo WhatsApp" : "Nome completo do cliente"}
              className="w-full min-h-11 sm:min-h-9 px-3 py-2 rounded-lg bg-background border border-border/70 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {!effectiveIsGroup && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="WhatsApp / Telefone"
                    className="w-full min-h-11 sm:min-h-9 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <input
                    value={editCpf}
                    onChange={(e) => setEditCpf(e.target.value)}
                    placeholder="CPF / CNPJ"
                    className="w-full min-h-11 sm:min-h-9 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="E-mail real do cliente"
                    className="w-full min-h-11 sm:min-h-9 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <input
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Cidade / UF"
                    className="w-full min-h-11 sm:min-h-9 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </>
            )}
            <input
              value={editAvatarUrl}
              onChange={(e) => setEditAvatarUrl(e.target.value)}
              placeholder="URL da Foto / Avatar (opcional)"
              className="w-full min-h-11 sm:min-h-9 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg border border-border/70 bg-background text-2xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={handleSaveCustomerProfile}
                className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isSavingProfile ? "Salvando..." : effectiveIsGroup ? "Salvar Grupo" : "Salvar Ficha"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1.1 PARTICIPANTES DO GRUPO (QUANDO @g.us) */}
      {effectiveIsGroup && groupParticipants.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="size-3.5 text-primary" />
              <span>Participantes ({groupParticipants.length})</span>
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {groupParticipants.map((p, idx) => (
              <div
                key={p.jid || p.phone || idx}
                className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-muted/30 text-2xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">
                    {p.name || p.phone || "Participante"}
                  </p>
                  {p.phone && (
                    <p className="font-mono text-muted-foreground truncate">{p.phone}</p>
                  )}
                </div>
                {p.admin && (
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary font-semibold shrink-0">
                    Admin
                  </span>
                )}
                {p.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(p.phone!);
                      toast.success("Telefone do participante copiado!");
                    }}
                    className="min-h-11 min-w-11 sm:min-h-7 sm:min-w-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Copiar número do participante"
                  >
                    <Copy className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1.2 ORIGEM, ANÚNCIO E PIXEL (ATRIBUIÇÃO CONECTADA) */}
      {threadId && (
        <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Target className="size-3.5 text-primary" />
              <span>Origem, Anúncio e Pixel</span>
            </span>
            <button
              type="button"
              onClick={() => setIsEditingAttribution((prev) => !prev)}
              className="min-h-11 sm:min-h-7 px-2 py-1 rounded-md border border-border/70 bg-background hover:bg-muted text-2xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isEditingAttribution ? "Fechar" : "Editar"}
            </button>
          </div>

          {!isEditingAttribution && (
            <>
              {attribution ? (
                <div className="space-y-1 text-2xs">
                  {(attribution.platform || attribution.utm_source || attribution.source) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Canal:</span>
                      <span className="font-semibold text-foreground truncate">
                        {attribution.platform || attribution.utm_source || attribution.source}
                        {attribution.utm_medium ? ` / ${attribution.utm_medium}` : ""}
                      </span>
                    </div>
                  )}
                  {(attribution.campaign || attribution.utm_campaign || attribution.campaign_id) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Campanha:</span>
                      <span className="font-semibold text-foreground truncate">
                        {attribution.campaign || attribution.utm_campaign || `#${attribution.campaign_id}`}
                      </span>
                    </div>
                  )}
                  {(attribution.ad_headline || attribution.ad_id) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Anúncio:</span>
                      <span className="font-semibold text-foreground truncate">
                        {attribution.ad_headline || `ID ${attribution.ad_id}`}
                      </span>
                    </div>
                  )}
                  {attribution.listing_title && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Oferta Waesy:</span>
                      <span className="font-semibold text-foreground truncate">{attribution.listing_title}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {attribution.ctwa_clid && (
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono">
                        CTWA
                      </span>
                    )}
                    {(attribution.fbclid || attribution.fbc || attribution.fbp) && (
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">
                        Meta Pixel
                      </span>
                    )}
                    {attribution.gclid && (
                      <span className="px-2 py-1 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono">
                        Google Ads
                      </span>
                    )}
                    {attribution.lead_code && (
                      <span className="px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
                        #{attribution.lead_code}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-2xs text-muted-foreground">
                  Origem direta ou ainda sem parâmetros de anúncio vinculados.
                </p>
              )}

              {pixelConversions.length > 0 && (
                <div className="pt-2 border-t border-border/50 flex items-center gap-1 flex-wrap">
                  {pixelConversions.slice(0, 4).map((ev: any) => (
                    <span
                      key={ev.id}
                      className={cn(
                        "px-2 py-1 rounded font-mono text-2xs border",
                        ev.status === "delivered" || ev.status === "dispatched"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-destructive/10 text-destructive border-destructive/30",
                      )}
                      title={ev.response_data?.error || `${ev.event_name} (${ev.event_source || "capi"})`}
                    >
                      CAPI: {ev.event_name}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {isEditingAttribution && (
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={attrPlatform}
                  onChange={(e) => setAttrPlatform(e.target.value)}
                  placeholder="Plataforma (meta_ads, google_ads)"
                  className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <input
                  value={attrUtmSource}
                  onChange={(e) => setAttrUtmSource(e.target.value)}
                  placeholder="UTM Source (ex: instagram)"
                  className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={attrUtmMedium}
                  onChange={(e) => setAttrUtmMedium(e.target.value)}
                  placeholder="UTM Medium (ex: cpc, ctwa)"
                  className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <input
                  value={attrAdId}
                  onChange={(e) => setAttrAdId(e.target.value)}
                  placeholder="ID do Anúncio (ad_id)"
                  className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <input
                value={attrCampaign}
                onChange={(e) => setAttrCampaign(e.target.value)}
                placeholder="Nome da Campanha"
                className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <input
                value={attrHeadline}
                onChange={(e) => setAttrHeadline(e.target.value)}
                placeholder="Título / Criativo do Anúncio"
                className="w-full min-h-11 sm:min-h-8 px-2 py-1 rounded-lg bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingAttribution(false)}
                  className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg border border-border/70 bg-background text-2xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingAttribution}
                  onClick={handleSaveAttribution}
                  className="min-h-11 sm:min-h-8 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isSavingAttribution ? "Salvando..." : "Salvar Origem"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. FEATURES RÁPIDAS: TAGS (COM PASTAS) & OBSERVAÇÕES DA EQUIPE */}
      {threadId && (
        <div className="rounded-xl border border-border/70 bg-card p-3 space-y-3">
          <div className="space-y-1">
            <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
              Etiquetas & Pastas (Tags)
            </span>
            <ThreadTagsPicker
              threadId={threadId}
              storeId={storeId}
              tags={data?.thread?.tags || []}
              contactName={profile?.full_name || guestName || null}
              contactAvatarUrl={effectiveAvatar}
              onTagsChange={(newTags) =>
                setData((prev: any) =>
                  prev ? { ...prev, thread: { ...(prev.thread || {}), tags: newTags } } : prev,
                )
              }
            />
          </div>

          <div className="space-y-1 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                Observações Rápidas (Equipe)
              </label>
              <button
                type="button"
                disabled={isSavingNotes}
                onClick={handleSaveInternalNotes}
                className="px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/15 text-primary border border-primary/30 text-2xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Save className="size-3" />
                <span>{isSavingNotes ? "Salvando..." : "Salvar"}</span>
              </button>
            </div>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              placeholder="Anotações importantes sobre o cliente, preferências ou negociação..."
              className="w-full rounded-lg border border-border/70 bg-muted/20 p-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>
      )}

      {/* 3. INTELIGÊNCIA ARTIFICIAL ATIVA, MODO, SETOR & ATENDENTE */}
      {threadId && (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Bot className="size-3.5 text-primary" />
              <span>IA & Roteamento</span>
            </span>
            {onToggleAiAutoReply && (
              <div className="flex items-center gap-2">
                <span className="text-2xs text-muted-foreground font-semibold">Auto-Resposta</span>
                <Switch checked={aiAutoReply} onCheckedChange={onToggleAiAutoReply} />
              </div>
            )}
          </div>

          {/* Escolher Agente / Especialista de IA */}
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-muted-foreground block">
              Agente IA Especialista Ativo
            </label>
            <select
              value={selectedAiAgent}
              onChange={(e) => handleSelectAiSpecialist(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {AI_AGENT_SPECIALISTS.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.label}
                </option>
              ))}
            </select>
          </div>

          {/* Modo de Atendimento (Botões Squircle Compactos) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
            {[
              { id: "ai_triage", label: "IA Copilot" },
              { id: "human_queue", label: "Fila" },
              { id: "human_active", label: "Humano" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleChangeHandoff(m.id as any)}
                className={cn(
                  "px-2 py-1 rounded-md text-2xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  handoffMode === m.id
                    ? "bg-background text-foreground font-bold border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Setor / Fila e Atendente Responsável Compactos */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-2xs font-semibold text-muted-foreground block">Setor / Fila</label>
              <select
                value={department || data?.threadContext?.department || "geral"}
                onChange={(e) => onDepartmentChange?.(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-border/70 bg-background text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {Object.entries(departmentLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-2xs font-semibold text-muted-foreground block">Responsável</label>
              <select
                value={assignedAgentId ?? data?.threadContext?.assigned_to_profile_id ?? ""}
                onChange={(e) => onAssignedAgentChange?.(e.target.value || null)}
                className="w-full px-2 py-1 rounded-lg border border-border/70 bg-background text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Automático</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. ATALHOS DE VIAGEM: LOCALIZADOR PNR, PACOTE NA OPERADORA & STATUS DE VOO */}
      {!isGroup && !isChannel && (
        <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Plane className="size-3.5 text-sky-500" />
              <span>Viagens, PNR & Operadora ({travelDossiers.length + trips.length})</span>
            </span>
            {threadId && (
              <button
                type="button"
                onClick={() => setIsAddingDossier((prev) => !prev)}
                className="px-2 py-1 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary text-2xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="size-3" />
                <span>{isAddingDossier ? "Fechar" : "PNR / Pacote"}</span>
              </button>
            )}
          </div>

          {isAddingDossier && (
            <div className="p-2 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={pnrLocator}
                  onChange={(e) => setPnrLocator(e.target.value.toUpperCase())}
                  placeholder="PNR / Localizador Cia"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-xs font-mono font-bold text-foreground uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <input
                  value={operatorPackageId}
                  onChange={(e) => setOperatorPackageId(e.target.value)}
                  placeholder="ID Pacote Operadora"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Operadora (ex: CVC, Orinter)"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <input
                  value={airlineName}
                  onChange={(e) => setAirlineName(e.target.value)}
                  placeholder="Cia Aérea (ex: LATAM, GOL)"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={routeSummary}
                  onChange={(e) => setRouteSummary(e.target.value)}
                  placeholder="Trecho (ex: FLN - GRU)"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <input
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  placeholder="Data / Voo (ex: 22/11 08:30)"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={flightStatus}
                  onChange={(e) => setFlightStatus(e.target.value as any)}
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-semibold text-foreground flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="confirmed">Voo / Pacote Confirmado</option>
                  <option value="scheduled">Programado / Emissão</option>
                  <option value="delayed">Alteração de Malha / Atraso</option>
                  <option value="cancelled">Voo Cancelado</option>
                  <option value="reaccommodation">Em Reacomodação</option>
                </select>
                <button
                  type="button"
                  disabled={isSavingDossier}
                  onClick={handleSaveTravelDossier}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isSavingDossier ? "..." : "Salvar PNR"}
                </button>
              </div>
            </div>
          )}

          {travelDossiers.length === 0 && trips.length === 0 && credits.length === 0 ? (
            <p className="text-2xs text-muted-foreground">
              Nenhum PNR ou pacote vinculado. Clique em "+ PNR / Pacote" para vincular localizador da cia ou ID da operadora.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
              {travelDossiers.map((dos: any) => {
                const statusInfo = FLIGHT_STATUS_LABELS[dos.flight_status] || FLIGHT_STATUS_LABELS.confirmed;
                return (
                  <div key={dos.id} className="p-2 rounded-lg bg-muted/30 border border-border/70 space-y-2">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        {dos.pnr_locator && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(dos.pnr_locator);
                              toast.success(`PNR ${dos.pnr_locator} copiado!`);
                            }}
                            className="px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono text-2xs font-bold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            title="Copiar PNR da Cia Aérea"
                          >
                            <span>PNR: {dos.pnr_locator}</span>
                            <Copy className="size-2.5" />
                          </button>
                        )}
                        {dos.operator_package_id && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(dos.operator_package_id);
                              toast.success(`ID Pacote ${dos.operator_package_id} copiado!`);
                            }}
                            className="px-2 py-1 rounded-md bg-background border border-border/70 font-mono text-2xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            title="Copiar ID do Pacote na Operadora"
                          >
                            <span>Pacote: #{dos.operator_package_id}</span>
                            <Copy className="size-2.5" />
                          </button>
                        )}
                      </div>
                      <span className={cn("px-2 py-1 rounded-md border text-2xs font-semibold leading-none", statusInfo.badgeClass)}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-2xs text-muted-foreground flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground">
                        {[dos.operator_name, dos.airline_name, dos.route_summary].filter(Boolean).join(" • ") || "Reserva vinculada"}
                      </span>
                      {dos.departure_date && <span className="font-mono shrink-0">{dos.departure_date}</span>}
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => openOperatorEmailShortcut(dos)}
                        className="px-2 py-1 rounded-md bg-background hover:bg-muted border border-border/70 text-2xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Mail className="size-3 text-primary" />
                        <span>Consultar Operadora por E-mail</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTravelDossier(dos.id)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Remover localizador"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {trips.map((tr: any) => (
                <div key={tr.id} className="p-2 rounded-lg bg-muted/20 border border-border/70 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-foreground text-xs block truncate">
                      {tr.title || tr.destination_city || `Viagem #${tr.trip_number || String(tr.id).slice(0, 6)}`}
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      {tr.destination_city || "Pacote"} • {formatBRL((tr.total_cents || 0) / 100)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openOperatorEmailShortcut({
                        operator_package_id: tr.trip_number || String(tr.id).slice(0, 8),
                        route_summary: tr.destination_city || tr.title,
                      })
                    }
                    className="px-2 py-1 rounded-md border border-border/70 bg-background text-2xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Mail className="size-3 text-primary" />
                    <span>E-mail</span>
                  </button>
                </div>
              ))}

              {credits.map((cr: any) => (
                <div key={cr.id} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 text-2xs block">
                      Crédito {cr.airline} • PNR {cr.original_pnr}
                    </span>
                    <span className="text-2xs text-muted-foreground">Validade: {cr.expires_at}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 text-xs">
                    {formatBRL((cr.remaining_amount_cents || 0) / 100)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. DOCUMENTOS, FATURAS PIX, BOLETOS, PEDIDOS / CARRINHO & IMAGEM (1-CLICK) */}
      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
            <Receipt className="size-3.5 text-primary" />
            <span>Faturas, Boletos, Pedidos & Cards</span>
          </span>
          <span className="text-2xs font-mono font-bold text-emerald-600">
            LTV: {formatBRL((metrics?.ltv_cents || 0) / 100)}
          </span>
        </div>

        {/* Grade de Disparo Rápido em Botões Squircle Finos */}
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => (onOpenQuickComposerModal ? onOpenQuickComposerModal("invoice") : setIsBudgetPadOpen(true))}
            className="px-2 py-2 rounded-lg border border-border/70 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 text-2xs font-semibold text-foreground inline-flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <QrCode className="size-3.5 text-primary shrink-0" />
            <span className="truncate">Gerar Fatura PIX</span>
          </button>
          <button
            type="button"
            onClick={() => (onOpenQuickComposerModal ? onOpenQuickComposerModal("boleto") : setIsBudgetPadOpen(true))}
            className="px-2 py-2 rounded-lg border border-border/70 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 text-2xs font-semibold text-foreground inline-flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <CreditCard className="size-3.5 text-primary shrink-0" />
            <span className="truncate">Emitir Boleto</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBudgetPadOpen(true)}
            className="px-2 py-2 rounded-lg border border-border/70 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 text-2xs font-semibold text-foreground inline-flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ShoppingBag className="size-3.5 text-primary shrink-0" />
            <span className="truncate">Pedido / Cotação</span>
          </button>
          <button
            type="button"
            onClick={() => (onOpenQuickComposerModal ? onOpenQuickComposerModal("image_card") : setIsBudgetPadOpen(true))}
            className="px-2 py-2 rounded-lg border border-border/70 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 text-2xs font-semibold text-foreground inline-flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Camera className="size-3.5 text-primary shrink-0" />
            <span className="truncate">Card em Imagem</span>
          </button>
        </div>

        {/* Situação Financeira Compacta */}
        {!isGroup && !isChannel && (
          <div
            className={cn(
              "px-3 py-2 rounded-lg border flex items-center justify-between text-2xs",
              (metrics?.pending_debt_cents || 0) > 0
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
            )}
          >
            <span className="font-semibold">Situação Financeira</span>
            <span className="font-bold font-mono">
              {(metrics?.pending_debt_cents || 0) > 0
                ? `Pendente: ${formatBRL((metrics.pending_debt_cents || 0) / 100)}`
                : "Adimplente"}
            </span>
          </div>
        )}

        {/* Listagem Compacta de Orçamentos, Contratos, Faturas e Pedidos */}
        {(quotes.length > 0 || contracts.length > 0 || invoices.length > 0 || orders.length > 0 || documents.length > 0) && (
          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar pt-1 border-t border-border/50">
            {quotes.map((q: any) => (
              <div key={q.id} className="px-2 py-1 rounded-lg bg-muted/20 border border-border/60 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-foreground text-2xs block truncate">
                    {q.title || q.destination || `Cotação #${q.quote_number || String(q.id).slice(0, 6)}`}
                  </span>
                  <span className="text-2xs font-mono text-primary font-bold">
                    {formatBRL((q.total_cents || 0) / 100)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSendOrCopyLink(
                      `Olá ${profile?.full_name || "Cliente"}! Segue o link da sua proposta (${formatBRL((q.total_cents || 0) / 100)}): https://waesy.app/orcamento/${q.id}`,
                    )
                  }
                  className="px-2 py-1 rounded-md border border-border/70 bg-background text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Send className="size-3" />
                  <span>Enviar</span>
                </button>
              </div>
            ))}

            {contracts.map((c: any) => (
              <div key={c.id} className="px-2 py-1 rounded-lg bg-muted/20 border border-border/60 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-foreground text-2xs block truncate">
                    {c.title || `Contrato #${c.contract_number || String(c.id).slice(0, 6)}`}
                  </span>
                  <span className="text-2xs text-muted-foreground">{c.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSendOrCopyLink(
                      `Olá ${profile?.full_name || "Cliente"}! Acesse seu contrato digital: https://waesy.app/contrato/${c.public_token || c.id}`,
                    )
                  }
                  className="px-2 py-1 rounded-md border border-border/70 bg-background text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Send className="size-3" />
                  <span>Contrato</span>
                </button>
              </div>
            ))}

            {invoices.map((inv: any) => (
              <div key={inv.id} className="px-2 py-1 rounded-lg bg-muted/20 border border-border/60 flex items-center justify-between gap-2">
                <span className="text-2xs font-medium text-foreground truncate">
                  {inv.description || "Fatura"}
                </span>
                <span className="text-2xs font-mono font-bold text-foreground shrink-0">
                  {formatBRL((inv.amount_cents || 0) / 100)}
                </span>
              </div>
            ))}

            {orders.map((o: any) => {
              const shortOrder = typeof o.id === "string" ? o.id.slice(0, 8) : "";
              return (
                <div key={o.id} className="px-2 py-1 rounded-lg bg-muted/20 border border-border/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-2xs font-mono font-bold text-foreground">Pedido #{shortOrder}</span>
                    <span className="text-2xs text-muted-foreground ml-2">{formatBRL((o.total_amount_cents || 0) / 100)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendOrCopyLink(
                        `Olá ${profile?.full_name || "Cliente"}! Acompanhe seu pedido #${shortOrder}: https://waesy.app/pedido/${o.id}`,
                      )
                    }
                    className="px-2 py-1 rounded-md border border-border/70 bg-background text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Send className="size-3" />
                    <span>Link</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. E-MAILS VINCULADOS AO CLIENTE / OPERADORA / CIA AÉREA / TICKET */}
      {threadId && (
        <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Mail className="size-3.5 text-primary" />
              <span>E-mails Vinculados ({linkedEmails.length})</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (!isEmailComposerOpen && cleanCustomerEmail && emailRecipientType === "client") {
                  setEmailRecipientAddress(cleanCustomerEmail);
                }
                setIsEmailComposerOpen((prev) => !prev);
              }}
              className="px-2 py-1 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary text-2xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-3" />
              <span>{isEmailComposerOpen ? "Fechar" : "Enviar E-mail"}</span>
            </button>
          </div>

          {isEmailComposerOpen && (
            <div className="p-2 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {[
                  { id: "operator", label: "Operadora" },
                  { id: "airline", label: "Cia Aérea" },
                  { id: "support", label: "Suporte" },
                  { id: "client", label: "Cliente" },
                ].map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => {
                      setEmailRecipientType(rt.id as any);
                      if (rt.id === "client" && cleanCustomerEmail) {
                        setEmailRecipientAddress(cleanCustomerEmail);
                        setEmailRecipientName(profile?.full_name || guestName || "");
                      }
                    }}
                    className={cn(
                      "px-2 py-1 rounded-md text-2xs font-semibold border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      emailRecipientType === rt.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:text-foreground border-border/60",
                    )}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>

              <input
                value={emailRecipientAddress}
                onChange={(e) => setEmailRecipientAddress(e.target.value)}
                placeholder={
                  emailRecipientType === "operator"
                    ? "E-mail da Operadora (ex: atendimento@operadora.com.br)"
                    : "E-mail do destinatário..."
                }
                className="w-full px-2 py-1 rounded-md bg-background border border-border/70 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={emailPnr}
                  onChange={(e) => setEmailPnr(e.target.value.toUpperCase())}
                  placeholder="Vincular PNR (opcional)"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-mono uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <input
                  value={emailPkgId}
                  onChange={(e) => setEmailPkgId(e.target.value)}
                  placeholder="ID Pacote Operadora"
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Assunto do e-mail..."
                className="w-full px-2 py-1 rounded-md bg-background border border-border/70 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />

              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={4}
                placeholder="Mensagem detalhada (será vinculada automaticamente ao ID do cliente e da conversa)..."
                className="w-full p-2 rounded-md bg-background border border-border/70 text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />

              <input
                value={emailAttachmentUrl}
                onChange={(e) => setEmailAttachmentUrl(e.target.value)}
                placeholder="URL de imagem / comprovante em anexo (opcional)"
                className="w-full px-2 py-1 rounded-md bg-background border border-border/70 text-2xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="flex items-center gap-1 text-2xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifyChat}
                    onChange={(e) => setEmailNotifyChat(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Visível ao cliente no WhatsApp</span>
                </label>
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={handleDispatchLinkedEmail}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Send className="size-3" />
                  <span>{isSendingEmail ? "Enviando..." : "Disparar E-mail"}</span>
                </button>
              </div>
            </div>
          )}

          {linkedEmails.length === 0 ? (
            <p className="text-2xs text-muted-foreground">
              Nenhum e-mail vinculado a este cliente. Envie e-mails para operadoras, cias aéreas ou suporte com rastreio automático de PNR e conversa.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar pr-1">
              {linkedEmails.map((eml: any) => (
                <div key={eml.id} className="p-2 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-2xs font-bold uppercase leading-none">
                      {eml.recipient_type === "operator"
                        ? "Operadora"
                        : eml.recipient_type === "airline"
                          ? "Cia Aérea"
                          : eml.recipient_type === "support"
                            ? "Suporte"
                            : "Cliente"}
                    </span>
                    <span className="text-2xs font-mono text-muted-foreground">
                      {eml.pnr_locator ? `PNR ${eml.pnr_locator}` : eml.operator_package_id ? `#${eml.operator_package_id}` : formatDate(eml.created_at)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">{eml.clean_subject || eml.subject}</p>
                  <p className="text-2xs text-muted-foreground truncate">Para: {eml.recipient_email}</p>
                  <p className="text-2xs text-muted-foreground line-clamp-2">{eml.body_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. FUNIL COMERCIAL (OPORTUNIDADES) & CHAMADOS SAC */}
      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
            <GitBranch className="size-3.5 text-primary" />
            <span>Kanban Comercial ({opportunities.length})</span>
          </span>
          {threadId && (
            <button
              type="button"
              onClick={() => {
                setLeadTitle(
                  isTourism
                    ? `Cotação Viagem - ${profile?.full_name || guestName || "Cliente"}`
                    : `Oportunidade - ${profile?.full_name || guestName || "Cliente"}`,
                );
                setIsCreatingLead(true);
              }}
              className="px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 font-bold text-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              + Oportunidade
            </button>
          )}
        </div>

        {threadId && opportunities.length > 0 && (
          <select
            value={activeOpportunity?.id || ""}
            disabled={isLinkingOpportunity}
            onChange={(e) => handleSelectOpportunity(e.target.value)}
            className="w-full px-2 py-1 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Sem oportunidade vinculada</option>
            {opportunities.map((opp: any) => (
              <option key={opp.id} value={opp.id}>
                {opp.title || opp.name || "Oportunidade"} · {FUNNEL_STAGES.find((s) => s.value === opp.status)?.label || opp.status}
              </option>
            ))}
          </select>
        )}

        <select
          value={funnelStage}
          disabled={isUpdatingStage}
          onChange={(e) => handleFunnelStageChange(e.target.value)}
          className="w-full px-2 py-1 rounded-lg border border-border/70 bg-background text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {FUNNEL_STAGES.map((st) => (
            <option key={st.value} value={st.value}>
              Etapa: {st.label}
            </option>
          ))}
        </select>

        {activeOpportunity && (
          <div className="flex items-center gap-1 pt-1">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as any)}
              className="px-2 py-1 rounded-md border border-border/70 bg-background text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="whatsapp_followup">Follow-up</option>
              <option value="call">Ligação</option>
              <option value="proposal_sent">Proposta</option>
              <option value="meeting">Reunião</option>
              <option value="note">Nota</option>
            </select>
            <input
              value={activityTitle}
              onChange={(e) => setActivityTitle(e.target.value)}
              placeholder="Atividade no funil..."
              className="flex-1 px-2 py-1 rounded-md border border-border/70 bg-background text-2xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              disabled={isSavingActivity}
              onClick={handleAddCommercialActivity}
              className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isSavingActivity ? "..." : "OK"}
            </button>
          </div>
        )}

        {/* Planilha Viva de Onboarding CS & Tarefas Sincronizadas (/workspace/tarefas e /workspace/suporte) */}
        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>
                Onboarding CS ({ONBOARDING_CS_STEPS.filter((s) => Boolean((onboardingSteps as any)?.[s.key])).length}/7)
              </span>
            </span>
            <Link
              to="/workspace/suporte"
              className="px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-muted text-2xs font-semibold text-primary inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>Abrir Sheet CS</span>
              <ArrowUpRight className="size-2.5" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-1">
            {ONBOARDING_CS_STEPS.map((step) => {
              const isChecked = Boolean((onboardingSteps as any)?.[step.key]);
              const isBusy = togglingOnboardingKey === step.key;
              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleToggleOnboardingStep(step.key)}
                  title={`${step.fullLabel}: ${step.description}`}
                  className={cn(
                    "px-2 py-1 rounded-md border text-2xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isChecked
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <CheckCircle2 className={cn("size-3", isChecked ? "text-emerald-600" : "opacity-40")} />
                  <span>{step.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Tarefas Vinculadas ao Cliente / Viagem / Pedido */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="size-3.5 text-primary" />
                <span>Tarefas Vinculadas ({tasks.length})</span>
              </span>
              <div className="flex items-center gap-1">
                <Link
                  to="/workspace/tarefas"
                  className="px-2 py-1 rounded-md text-2xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Ver Módulo
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCreatingTask((prev) => !prev)}
                  className="px-2 py-1 rounded-md border border-border/70 bg-muted/40 hover:bg-muted text-2xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isCreatingTask ? "Cancelar" : "+ Tarefa"}
                </button>
              </div>
            </div>

            {isCreatingTask && (
              <div className="p-2 rounded-lg bg-muted/40 border border-border/70 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <CustomerIdentityTagPill
                    name={profile?.full_name || guestName || "Cliente"}
                    avatarUrl={effectiveAvatar}
                    traceHash={effectiveTraceHash}
                  />
                </div>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Título da tarefa (ex: Enviar voucher / Conferir assinatura)..."
                  className="w-full px-2 py-1 rounded-md bg-background border border-border/70 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={newTaskSector}
                    onChange={(e) => setNewTaskSector(e.target.value as SacFunctionRoleKey)}
                    className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {SAC_FUNCTION_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.shortLabel}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="urgent">Prioridade Urgente</option>
                    <option value="high">Alta</option>
                    <option value="medium">Normal</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newTaskEntityCode}
                    onChange={(e) => setNewTaskEntityCode(e.target.value)}
                    placeholder="Vínculo opcional (#TRP, PNR ou #PED)..."
                    className="flex-1 px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    disabled={isSavingTask}
                    onClick={handleCreateLinkedTask}
                    className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {isSavingTask ? "..." : "Vincular"}
                  </button>
                </div>
              </div>
            )}

            {tasks.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                {tasks.map((tsk: any) => {
                  const isDone = tsk.status === "done";
                  const cf = (tsk.custom_fields || {}) as Record<string, any>;
                  return (
                    <div
                      key={tsk.id}
                      className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-start justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleLinkedTaskStatus(tsk)}
                        className={cn(
                          "mt-1 p-1 rounded border flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isDone
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-background border-border"
                        )}
                        title={isDone ? "Reabrir tarefa" : "Concluir tarefa"}
                      >
                        {isDone ? <CheckCircle2 className="size-3" /> : <span className="size-3 block" />}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className={cn(
                            "text-xs font-semibold text-foreground truncate",
                            isDone && "line-through text-muted-foreground"
                          )}
                        >
                          {tsk.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 text-2xs font-mono text-muted-foreground">
                          {tsk.task_code && <span>#{tsk.task_code}</span>}
                          {cf.trace_hash && <span className="text-primary">{cf.trace_hash}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chamados / Tickets SAC */}
        <div className="pt-2 border-t border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="size-3.5 text-primary" />
              <span>Tickets, Pepinos & SAC ({tickets.length})</span>
            </span>
            {threadId && (
              <button
                type="button"
                onClick={() => setIsCreatingTicket((prev) => !prev)}
                className="px-2 py-1 rounded-md border border-border/70 bg-muted/40 hover:bg-muted text-2xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {isCreatingTicket ? "Cancelar" : "+ Pepino / Ticket"}
              </button>
            )}
          </div>

          {isCreatingTicket && (
            <div className="p-2 rounded-lg bg-muted/40 border border-border/70 space-y-2">
              <input
                value={newTicketTitle}
                onChange={(e) => setNewTicketTitle(e.target.value)}
                placeholder="Título do pepino / reclamação / protocolo..."
                className="w-full px-2 py-1 rounded-md bg-background border border-border/70 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <textarea
                value={newTicketDesc}
                onChange={(e) => setNewTicketDesc(e.target.value)}
                placeholder="Descrição da ocorrência ou solicitação..."
                rows={2}
                className="w-full rounded-md bg-background border border-border/70 p-2 text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={newTicketRole}
                  onChange={(e) => setNewTicketRole(e.target.value as SacFunctionRoleKey)}
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {SAC_FUNCTION_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.shortLabel}
                    </option>
                  ))}
                </select>
                <select
                  value={newTicketPriority}
                  onChange={(e) => setNewTicketPriority(e.target.value as any)}
                  className="px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="normal">Prioridade Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente (Pepino Crítico)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={newTicketEntityCode}
                  onChange={(e) => setNewTicketEntityCode(e.target.value)}
                  placeholder="Ref. Viagem / PNR / Pedido..."
                  className="flex-1 px-2 py-1 rounded-md bg-background border border-border/70 text-2xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <button
                  type="button"
                  disabled={isSavingTicket}
                  onClick={handleCreateDemandTicket}
                  className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isSavingTicket ? "..." : "Abrir Ticket"}
                </button>
              </div>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
              {tickets.map((t: any) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "https://waesy.app";
                const publicTicketUrl = `${origin}/chamado/${t.id}`;
                return (
                  <div key={t.id} className="p-2 rounded-lg bg-muted/30 border border-border/60 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-xs truncate">{t.title}</span>
                      <Badge variant={t.status === "resolved" ? "secondary" : "default"} className="text-2xs">
                        {t.status === "resolved" ? "Resolvido" : "Aberto"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        value={stepInputByTicket[t.id] || ""}
                        onChange={(e) => setStepInputByTicket((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="Nova etapa..."
                        className="flex-1 px-2 py-1 rounded-md bg-background border border-border/70 text-2xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTicketStep(t.id)}
                        className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        + Etapa
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleSendOrCopyLink(
                            `Acompanhe seu protocolo "${t.title}" em tempo real: ${publicTicketUrl}`,
                          )
                        }
                        className="px-2 py-1 rounded-md border border-border/70 bg-background text-2xs font-semibold inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Send className="size-3" />
                        <span>Enviar Link</span>
                      </button>
                      {t.status !== "resolved" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAddTicketStep(t.id, "Atendimento finalizado e solucionado", "resolved")
                          }
                          className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-2xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Concluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Atalhos Auxiliares Compactos */}
        <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-border/50">
          {onOpenTransfer && (
            <button
              type="button"
              onClick={onOpenTransfer}
              className="px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-muted text-2xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowRightLeft className="size-3" />
              <span>Transferir</span>
            </button>
          )}
          {onOpenSchedule && (
            <button
              type="button"
              onClick={onOpenSchedule}
              className="px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-muted text-2xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Clock className="size-3" />
              <span>Agendar</span>
            </button>
          )}
          {resolvedCustomerId && (
            <Link
              to="/workspace/clientes/$id"
              params={{ id: resolvedCustomerId }}
              className="px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-muted text-2xs font-semibold text-foreground inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <User className="size-3 text-primary" />
              <span>Ficha CRM</span>
              <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Modal de Conversão Rápida em Lead */}
      {isCreatingLead && threadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm">Nova Oportunidade Comercial</h3>
              <button
                type="button"
                onClick={() => setIsCreatingLead(false)}
                className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Título da Oportunidade</label>
                <input
                  type="text"
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Ex: Cotação Pacote Família"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Orçamento Estimado (R$)</label>
                <input
                  type="number"
                  value={leadBudget}
                  onChange={(e) => setLeadBudget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Ex: 5000"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Notas Rápidas / Demanda</label>
                <textarea
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="O que o cliente está buscando..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreatingLead(false)}
                className="px-3 py-2 rounded-lg border border-border/70 bg-background text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!leadTitle.trim()) return;
                  try {
                    const { convertChatThreadToCrmLead } = await import("@/services/chat.functions");
                    await convertChatThreadToCrmLead({
                      data: {
                        threadId,
                        leadTitle: leadTitle.trim(),
                        estimatedBudget: leadBudget ? Number(leadBudget) : undefined,
                        notes: leadNotes.trim() || undefined,
                      },
                    });
                    setIsCreatingLead(false);
                    setLeadTitle("");
                    setLeadBudget("");
                    setLeadNotes("");
                    loadContext();
                    toast.success("Oportunidade adicionada ao funil de vendas!");
                  } catch (err: any) {
                    toast.error(err.message || "Erro ao criar oportunidade.");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Confirmar e Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Orçamento Comercial / Pedido / Fatura */}
      <CommercialBudgetPadSheet
        open={isBudgetPadOpen}
        onOpenChange={setIsBudgetPadOpen}
        initialCustomerId={customerId}
        initialClientData={{
          name: profile?.full_name || guestName || "",
          phone: profile?.phone || guestPhone || "",
          email: cleanCustomerEmail || "",
        }}
      />
    </div>
  );
};
