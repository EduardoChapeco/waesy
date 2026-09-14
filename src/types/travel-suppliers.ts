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
