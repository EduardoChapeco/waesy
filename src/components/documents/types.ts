/**
 * types.ts — Tipos e Contratos Canônicos para o Motor de Documentos Comerciais (Propostas, Orçamentos & Contratos)
 */

export interface CommercialIssuerInfo {
  companyName: string;
  tradingName?: string;
  cnpjOrCpf: string;
  address: string;
  cityState: string;
  phoneOrWhatsapp: string;
  email: string;
  logoUrl?: string;
  pixKey?: string;
  pixKeyType?: "cnpj" | "email" | "telefone" | "aleatoria";
}

export interface CommercialClientInfo {
  name: string;
  companyName?: string;
  cnpjOrCpf: string;
  address?: string;
  cityState?: string;
  email?: string;
  phone?: string;
}

export interface CommercialBudgetItem {
  id: string;
  sku?: string;
  title: string;
  description?: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  category?: string;
}

export interface CommercialScopeStage {
  step: number;
  title: string;
  description: string;
  duration?: string;
  deliverables?: string[];
}

export interface CommercialDocumentData {
  id: string;
  code: string;
  title: string;
  category: "budget" | "proposal" | "contract";
  status: "draft" | "sent" | "accepted" | "expired" | "paid";
  issueDate: string;
  validUntilDate: string;
  
  issuer: CommercialIssuerInfo;
  client: CommercialClientInfo;
  
  items: CommercialBudgetItem[];
  stages?: CommercialScopeStage[];
  
  subtotalCents: number;
  discountCents?: number;
  totalCents: number;
  
  paymentTerms: {
    method: "pix" | "boleto" | "cartao" | "transferencia";
    installmentsCount?: number;
    installmentValueCents?: number;
    notes?: string;
  };
  
  legalNotes?: string;
  signatories?: {
    issuerSigned?: boolean;
    issuerSignedAt?: string;
    clientSigned?: boolean;
    clientSignedAt?: string;
    clientIp?: string;
  };
}

export interface CommercialDocumentTemplateProps {
  data: CommercialDocumentData;
  scale?: number;
  className?: string;
  onAcceptProposal?: () => void;
  onDownloadPdf?: () => void;
}
