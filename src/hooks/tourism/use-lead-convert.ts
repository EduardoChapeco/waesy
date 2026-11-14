import { useState, useEffect } from "react";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { promoteLeadToCustomer } from "@/services/crm.functions";
import { TOKEN_HEX } from "@/lib/design-tokens";

export function useLeadConvert(
  lead: any | undefined,
  stageColor: string | undefined,
  qc: QueryClient,
  setEditing: (editing: boolean) => void,
) {
  const [confirmConvertOpen, setConfirmConvertOpen] = useState(false);
  const [clientPayload, setClientPayload] = useState({
    full_name: "",
    document: "",
    birth_date: "",
    email: "",
    phone: "",
    pcd: false,
    reduced_mobility: false,
    autism: false,
    health_notes: "",
  });

  useEffect(() => {
    if (lead) {
      setClientPayload({
        full_name: lead.full_name || lead.name || "",
        document: lead.document || lead.cpf || "",
        birth_date: lead.birth_date || "",
        email: lead.email || "",
        phone: lead.phone || "",
        pcd: lead.pcd || false,
        reduced_mobility: lead.reduced_mobility || false,
        autism: lead.autism || false,
        health_notes: lead.health_notes || "",
      });
    }
  }, [lead]);

  async function handleConvert() {
    if (!lead) return;
    const missing: string[] = [];
    if (!lead.full_name?.trim() && !lead.name?.trim()) missing.push("Nome completo");
    if (!lead.phone?.trim()) missing.push("WhatsApp / Telefone");

    if (missing.length > 0) {
      toast.error(
        `Preencha os campos obrigatórios antes de converter:\n• ${missing.join("\n• ")}`,
        { duration: 5000 },
      );
      setEditing(true);
      return;
    }

    try {
      await promoteLeadToCustomer({ data: { leadId: lead.id } });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [TOKEN_HEX.neutral950, TOKEN_HEX.white, TOKEN_HEX.green500, stageColor || TOKEN_HEX.blue500],
        disableForReducedMotion: true,
      });

      toast.success("Lead promovido para Cliente Oficial com sucesso!");
      setConfirmConvertOpen(false);
      qc.invalidateQueries({ queryKey: ["lead-detail", lead.id] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
    } catch (error: any) {
      toast.error("Erro ao converter lead: " + error.message);
    }
  }

  return {
    confirmConvertOpen,
    setConfirmConvertOpen,
    clientPayload,
    setClientPayload,
    handleConvert,
  };
}
