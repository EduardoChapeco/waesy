import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLeadById, updateLeadDetails, updateLeadStaleness, addLeadPassenger, removeLeadPassenger, addLeadActivity } from "@/services/crm.functions";
import { useConfirm } from "@/hooks/use-confirm";

import { useLeadChecklist } from "./use-lead-checklist";
import { useLeadMeetings } from "./use-lead-meetings";
import { useLeadTags } from "./use-lead-tags";
import { useLeadConvert } from "./use-lead-convert";

export function useLeadDetail(leadId: string | null, onClose: () => void) {
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

  const [editing, setEditing] = useState(false);
  const [proposalSheetOpen, setProposalSheetOpen] = useState(false);

  // Acompanhantes modal / form
  const [paxForm, setPaxForm] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    relationship: "outro",
    phone: "",
    email: "",
  });
  const [paxFormOpen, setPaxFormOpen] = useState(false);

  // Query do Lead
  const leadQ = useQuery({
    enabled: !!leadId,
    queryKey: ["lead-detail", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      return await getLeadById({ data: { leadId } });
    },
  });

  const lead = leadQ.data?.lead;
  const activities = leadQ.data?.activities || [];
  const initialMeetings = leadQ.data?.meetings || [];
  const proposals = leadQ.data?.proposals || [];

  // Cálculos de inatividade (staleness)
  const lastContactDate = lead?.last_contacted_at
    ? new Date(lead.last_contacted_at)
    : lead?.created_at
    ? new Date(lead.created_at)
    : new Date();

  const diffDays = Math.max(
    0,
    Math.ceil(Math.abs(new Date().getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Sub-hooks especializados
  const {
    checklistInput,
    setChecklistInput,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
  } = useLeadChecklist(leadId || undefined, qc);

  const {
    meetingForm,
    setMeetingForm,
    meetingFormOpen,
    setMeetingFormOpen,
    createMeeting,
    deleteMeeting,
    openGoogleCalendar,
    copyMeetingInvite,
  } = useLeadMeetings(leadId || undefined, qc, confirm, initialMeetings);

  const { newTagName, setNewTagName, newTagColor, setNewTagColor, addTag, removeTag } =
    useLeadTags(leadId || undefined, qc);

  const { confirmConvertOpen, setConfirmConvertOpen, clientPayload, setClientPayload, handleConvert } =
    useLeadConvert(lead, "#3b82f6", qc, setEditing);

  // Atualização rápida de inatividade (Botões do Alerta)
  async function handleUpdateStaleness(status: "active" | "disappeared" | "gave_up" | "no_credit" | "postponed", label: string) {
    if (!leadId) return;
    try {
      await updateLeadStaleness({
        data: {
          leadId,
          stalenessStatus: status,
          reasonLabel: label,
        },
      });
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
      toast.success(`Classificação atualizada: ${label}`);
    } catch (e: any) {
      toast.error("Erro ao atualizar status: " + e.message);
    }
  }

  async function handleReactivateLead() {
    if (!leadId) return;
    try {
      await updateLeadStaleness({
        data: {
          leadId,
          stalenessStatus: "active",
          reasonLabel: "Lead re-ativado pelo operador",
        },
      });
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
      toast.success("Lead re-ativado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao re-ativar lead");
    }
  }

  // Acompanhantes
  async function handleAddPax(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) return;
    if (!paxForm.full_name.trim()) return toast.error("Informe o nome do passageiro");
    try {
      await addLeadPassenger({
        data: {
          leadId,
          passenger: {
            full_name: paxForm.full_name.trim(),
            document: paxForm.document?.trim() || null,
            birth_date: paxForm.birth_date || null,
            relationship: paxForm.relationship || "outro",
            phone: paxForm.phone?.trim() || null,
            email: paxForm.email?.trim() || null,
          },
        },
      });
      setPaxForm({
        full_name: "",
        document: "",
        birth_date: "",
        relationship: "outro",
        phone: "",
        email: "",
      });
      setPaxFormOpen(false);
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
      toast.success("Acompanhante vinculado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao adicionar passageiro: " + e.message);
    }
  }

  async function handleRemovePax(index: number) {
    if (!leadId) return;
    try {
      await removeLeadPassenger({ data: { leadId, index } });
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
      toast.success("Passageiro removido.");
    } catch (e: any) {
      toast.error("Erro ao remover passageiro: " + e.message);
    }
  }

  // LGPD Toggle
  async function handleLgpdToggle(accepted: boolean) {
    if (!leadId) return;
    try {
      await updateLeadDetails({
        data: {
          leadId,
          notes: accepted ? `${lead?.notes || ""}\n[LGPD Aceito em ${new Date().toLocaleString("pt-BR")}]` : lead?.notes,
        },
      });
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast.success(accepted ? "Consentimento LGPD registrado!" : "LGPD desmarcado.");
    } catch (e: any) {
      toast.error("Erro ao alterar LGPD");
    }
  }

  // Magic Link Helpers
  function getMagicLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const token = lead?.magic_token || lead?.id;
    return `${origin}/m/lead/${token}`;
  }

  function handleCopyFormLink() {
    const link = getMagicLink();
    navigator.clipboard.writeText(link);
    toast.success("Link Mágico copiado para a área de transferência!");
  }

  function handleShareFormWhatsApp() {
    if (!lead) return;
    const link = getMagicLink();
    const leadName = lead.full_name || lead.name || "Cliente";
    const text = `Olá ${leadName}! Tudo bem?\nPara garantir que sua viagem ocorra perfeitamente, por favor preencha suas preferências e os dados dos seus acompanhantes no link seguro abaixo:\n\n${link}\n\nLeva menos de 2 minutos! Obrigado!`;
    const cleanPhone = (lead.phone || "").replace(/\D/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  }

  return {
    lead,
    activities,
    meetings: initialMeetings,
    proposals,
    diffDays,
    lastContactDate,
    editing,
    setEditing,
    proposalSheetOpen,
    setProposalSheetOpen,
    // Pax
    paxForm,
    setPaxForm,
    paxFormOpen,
    setPaxFormOpen,
    handleAddPax,
    handleRemovePax,
    // Tags
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    addTag,
    removeTag,
    // Checklist
    checklistInput,
    setChecklistInput,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    // Meetings
    meetingForm,
    setMeetingForm,
    meetingFormOpen,
    setMeetingFormOpen,
    createMeeting,
    deleteMeeting,
    openGoogleCalendar,
    copyMeetingInvite,
    // Inactivity & Status
    handleUpdateStaleness,
    handleReactivateLead,
    handleLgpdToggle,
    // Magic Link
    handleCopyFormLink,
    handleShareFormWhatsApp,
    // Convert
    confirmConvertOpen,
    setConfirmConvertOpen,
    clientPayload,
    setClientPayload,
    handleConvert,
    // Dialogs & state
    ConfirmDialog,
    confirm,
    leadQ,
    qc,
    onClose,
  };
}
