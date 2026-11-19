export type WhatsAppContactScope =
  | "lead"
  | "internal_team"
  | "stakeholder"
  | "supplier"
  | "ignored";

export const WHATSAPP_CONTACT_SCOPE_OPTIONS: Array<{
  value: WhatsAppContactScope;
  label: string;
  description: string;
}> = [
  {
    value: "lead",
    label: "Lead Comercial",
    description: "Captura ativa no Kanban CRM e disparo de conversões CAPI.",
  },
  {
    value: "internal_team",
    label: "Equipe Interna",
    description: "Colaborador da loja; conversa interna sem gerar lead nem CAPI.",
  },
  {
    value: "stakeholder",
    label: "Stakeholder / Sócio",
    description: "Gestor, diretor ou investidor; CRM e CAPI silenciados.",
  },
  {
    value: "supplier",
    label: "Fornecedor / Parceiro",
    description: "Operadora, hotelaria ou parceiro comercial; sem card no Kanban.",
  },
  {
    value: "ignored",
    label: "Ignorar Captura CRM",
    description: "Mantém mensagens no inbox sem criar card CRM nem eventos de anúncio.",
  },
];

export function isContactScopeSuppressed(
  contactScope?: string | null,
  suppressLeadCapture?: boolean | null,
): boolean {
  if (suppressLeadCapture === true) return true;
  if (!contactScope) return false;
  return contactScope !== "lead";
}

export function getContactScopeLabel(scope?: string | null): string {
  const found = WHATSAPP_CONTACT_SCOPE_OPTIONS.find((opt) => opt.value === scope);
  return found ? found.label : "Lead Comercial";
}
