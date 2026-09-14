export type VoucherType = 'flight' | 'hotel' | 'transfer' | 'package' | 'insurance' | 'tour' | 'car_rental' | 'activity' | 'other';

export interface VoucherFlightData {
 airline?: string;
 flightNumber?: string;
 origin?: string;
 destination?: string;
 departureTime?: string;
 arrivalTime?: string;
 gate?: string;
 terminal?: string;
 seat?: string;
 baggage?: string;
}

export interface VoucherHotelData {
 hotelName?: string;
 address?: string;
 checkInDate?: string;
 checkOutDate?: string;
 roomType?: string;
 boardBasis?: string;
 confirmationCode?: string;
}

export interface VoucherTransferData {
 pickupLocation?: string;
 dropoffLocation?: string;
 pickupTime?: string;
 driverName?: string;
 driverPhone?: string;
 vehicleType?: string;
}

export interface TravelVoucherDTO {
 id: string;
 store_id: string;
 trip_id?: string | null;
 voucher_number: string;
 voucher_type: VoucherType;
 title: string;
 passenger_name: string;
 passenger_document?: string | null;
 qr_code_hash?: string | null;
 flight_data: VoucherFlightData;
 hotel_data: VoucherHotelData;
 transfer_data: VoucherTransferData;
 status: 'draft' | 'issued' | 'used' | 'cancelled';
 created_at?: string;
 updated_at?: string;
}

export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  flight: 'Aéreo / Boarding Pass',
  hotel: 'Hospedagem / Hotel',
  transfer: 'Transfer / Receptivo',
  insurance: 'Seguro Viagem',
  tour: 'Ingresso / Passeio',
  package: 'Pacote Completo',
  activity: 'Atividade / Experiência',
  car_rental: 'Locação de Veículo',
  other: 'Outro Voucher',
};
