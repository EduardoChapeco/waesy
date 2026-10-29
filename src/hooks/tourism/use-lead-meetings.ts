import { useState } from "react";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addLeadMeeting, deleteLeadMeeting } from "@/services/crm.functions";

export function useLeadMeetings(
  leadId: string | undefined,
  qc: QueryClient,
  confirm: any,
  initialMeetings?: any[],
) {
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 30,
    meeting_type: "call" as "call" | "video" | "in_person",
  });
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);

  const meetingsQ = useQuery({
    enabled: !!leadId,
    queryKey: ["lead-meetings", leadId],
    queryFn: async () => {
      // Invalidate will refetch via parent or direct
      return initialMeetings || [];
    },
    initialData: initialMeetings || [],
  });

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) return;
    if (!meetingForm.title.trim() || !meetingForm.scheduled_at) {
      return toast.error("Preencha o título e o horário da reunião");
    }
    try {
      await addLeadMeeting({
        data: {
          leadId,
          title: meetingForm.title.trim(),
          description: meetingForm.description || null,
          scheduledAt: new Date(meetingForm.scheduled_at).toISOString(),
          durationMinutes: meetingForm.duration_minutes,
          meetingType: meetingForm.meeting_type,
        },
      });
      setMeetingForm({
        title: "",
        description: "",
        scheduled_at: "",
        duration_minutes: 30,
        meeting_type: "call",
      });
      setMeetingFormOpen(false);
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["lead-meetings", leadId] });
      toast.success("Reunião agendada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar reunião");
    }
  }

  async function deleteMeeting(meetingId: string) {
    if (!leadId) return;
    if (confirm) {
      confirm({
        title: "Cancelar Reunião",
        description: "Deseja cancelar este compromisso permanentemente?",
        variant: "destructive",
        onConfirm: async () => {
          try {
            await deleteLeadMeeting({ data: { meetingId } });
            qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
            qc.invalidateQueries({ queryKey: ["lead-meetings", leadId] });
            toast.success("Reunião cancelada com sucesso.");
          } catch (e: any) {
            toast.error(e.message || "Falha ao cancelar reunião");
          }
        },
      });
    } else {
      try {
        await deleteLeadMeeting({ data: { meetingId } });
        qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
        qc.invalidateQueries({ queryKey: ["lead-meetings", leadId] });
        toast.success("Reunião cancelada.");
      } catch (e: any) {
        toast.error(e.message || "Falha ao cancelar reunião");
      }
    }
  }

  function openGoogleCalendar(meeting: any) {
    try {
      const start = new Date(meeting.scheduled_at);
      const end = new Date(start.getTime() + (meeting.duration_minutes || 30) * 60000);
      const startStr = start.toISOString().replace(/-|:|\.\d\d\d/g, "");
      const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, "");
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(meeting.description || "Reunião de alinhamento e proposta de viagem.")}`;
      window.open(url, "_blank");
    } catch (e) {
      toast.error("Erro ao gerar link do Google Agenda");
    }
  }

  function copyMeetingInvite(meeting: any, leadName: string) {
    const dateFormatted = new Date(meeting.scheduled_at).toLocaleString("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const text = ` *Convite de Reunião: ${meeting.title}*\nOlá ${leadName}!\nConfirmamos nossa reunião para:\n *${dateFormatted}* (${meeting.duration_minutes || 30} min)\n${meeting.description ? `\n Detalhes: ${meeting.description}` : ""}\n\nAguardamos você!`;
    navigator.clipboard.writeText(text);
    toast.success("Convite copiado para a área de transferência!");
  }

  return {
    meetingForm,
    setMeetingForm,
    meetingFormOpen,
    setMeetingFormOpen,
    meetingsQ,
    createMeeting,
    deleteMeeting,
    openGoogleCalendar,
    copyMeetingInvite,
  };
}
