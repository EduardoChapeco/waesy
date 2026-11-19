/**
 * Catálogo Canônico de Papéis de Signatário em Contratos & Assinatura Digital
 */

export interface SignerRoleOption {
  value: string;
  label: string;
}

export interface SignerRoleGroup {
  group: string;
  options: SignerRoleOption[];
}

export const CONTRACT_SIGNER_ROLE_GROUPS: SignerRoleGroup[] = [
  {
    group: "Partes Contratuais",
    options: [
      { value: "party", label: "Parte / Signatário" },
      { value: "contractor", label: "Contratante" },
      { value: "contracted", label: "Contratado(a)" },
      { value: "client", label: "Cliente" },
      { value: "supplier", label: "Fornecedor / Prestador" },
      { value: "buyer", label: "Comprador(a) / Adquirente" },
      { value: "vendor", label: "Vendedor(a)" },
      { value: "assignor", label: "Cedente" },
      { value: "assignee", label: "Cessionário(a)" },
    ],
  },
  {
    group: "Representação Legal & Societária",
    options: [
      { value: "legal_representative", label: "Representante Legal" },
      { value: "attorney_in_fact", label: "Procurador(a)" },
      { value: "administrator", label: "Administrador(a) / Sócio(a)" },
      { value: "director", label: "Diretor(a) / Executivo(a)" },
      { value: "lawyer", label: "Advogado(a)" },
      { value: "intervening_party", label: "Interveniente / Anuente" },
    ],
  },
  {
    group: "Garantias, Aprovação & Testemunho",
    options: [
      { value: "witness", label: "Testemunha" },
      { value: "guarantor", label: "Fiador(a) / Avalista" },
      { value: "co_signer", label: "Co-signatário(a) / Solidário(a)" },
      { value: "approver", label: "Aprovador(a) / Alçada" },
      { value: "validator", label: "Validador(a) / Conferente" },
    ],
  },
  {
    group: "Turismo, Eventos & Passageiros",
    options: [
      { value: "lead_traveler", label: "Passageiro(a) Líder / Titular" },
      { value: "traveler", label: "Passageiro(a) / Viajante" },
      { value: "legal_guardian", label: "Responsável Legal (Menor)" },
      { value: "agency_agent", label: "Agente / Consultor(a) de Viagens" },
      { value: "tour_guide", label: "Guia / Coordenador(a) de Grupo" },
    ],
  },
  {
    group: "Imobiliário & Locação",
    options: [
      { value: "landlord", label: "Locador(a) / Proprietário(a)" },
      { value: "tenant", label: "Locatário(a) / Inquilino(a)" },
      { value: "broker", label: "Corretor(a) / Intermediador(a)" },
    ],
  },
  {
    group: "RH, Equipe & Compliance",
    options: [
      { value: "employee", label: "Colaborador(a) / Funcionário(a)" },
      { value: "employer", label: "Empregador(a) / RH" },
      { value: "intern", label: "Estagiário(a) / Bolsista" },
      { value: "dpo_compliance", label: "DPO / Compliance / Auditor(a)" },
      { value: "accountant", label: "Contador(a) / Fiscal" },
      { value: "issuer", label: "Emissor(a) / Responsável Interno" },
    ],
  },
];

export const CONTRACT_SIGNER_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  CONTRACT_SIGNER_ROLE_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label])),
);

export function getSignerRoleLabel(role?: string | null): string {
  if (!role) return "Parte / Signatário";
  return CONTRACT_SIGNER_ROLE_LABELS[role] || role;
}

export interface StudioSignerDraft {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  role: string;
  dispatchChannel: "whatsapp" | "email" | "sms" | "direct_link";
  authLevel: "basic" | "advanced";
  requireFacialBiometrics: boolean;
  signingOrderIndex: number;
  profileId?: string;
  colorCode: string;
}
