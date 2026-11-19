export type SupplierKind =
  | 'operator'
  | 'consolidator'
  | 'hotel_chain'
  | 'hotel'
  | 'receptive'
  | 'airline'
  | 'car_rental'
  | 'insurance'
  | 'transfer'
  | 'visa'
  | 'other';

export interface TravelSupplierDTO {
  id: string;
  store_id: string;
  name: string;
  legal_name?: string | null;
  kind: SupplierKind;
  document?: string | null;
  commission_rate: number;
  max_card_installments?: number | null;
  max_boleto_installments?: number | null;
  card_interest_free?: boolean | null;
  boleto_requires_downpayment?: boolean | null;
  boleto_downpayment_pct?: number | null;
  pix_discount_pct?: number | null;
  allowed_payment_methods?: string[] | null;
  payment_terms_template?: string | null;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const SUPPLIER_KIND_LABELS: Record<SupplierKind, string> = {
  operator: 'Operadora / DMC',
  consolidator: 'Consolidadora',
  hotel_chain: 'Rede Hoteleira',
  hotel: 'Hotel / Resort',
  receptive: 'Receptivo Local',
  airline: 'Companhia Aérea',
  car_rental: 'Locadora de Veículos',
  insurance: 'Seguradora de Viagem',
  transfer: 'Transfer Privativo',
  visa: 'Assessoria Consular',
  other: 'Outro Fornecedor',
};
