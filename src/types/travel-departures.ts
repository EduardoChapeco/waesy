export type DepartureStage =
 | 'booked'
 | 'vouchers_ready'
 | 'checkin_48h'
 | 'traveling'
 | 'post_trip'
 | 'completed';

export interface DepartureCardDTO {
 id: string;
 store_id: string;
 trip_id?: string | null;
 client_name: string;
 client_phone?: string | null;
 destination: string;
 departure_date: string;
 return_date?: string | null;
 stage: DepartureStage;
 passengers_count: number;
 notes?: string | null;
 created_at?: string;
 updated_at?: string;
}

export const DEPARTURE_STAGES: Array<{ id: DepartureStage; label: string; color: string; desc: string }> = [
 { id: 'booked', label: '1. Reserva Confirmada', color: 'border-slate-500/40 text-slate-600 dark:text-slate-400', desc: 'Aguardando vouchers e emissão' },
 { id: 'vouchers_ready', label: '2. Vouchers Emitidos', color: 'border-blue-500/40 text-blue-600 dark:text-blue-400', desc: 'Vouchers enviados ao cliente' },
 { id: 'checkin_48h', label: '3. Check-in Aberto (48h)', color: 'border-warning/40 text-warning-strong ', desc: 'Horário de check-in e assentos' },
 { id: 'traveling', label: '4. Em Viagem (Suporte)', color: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400', desc: 'Passageiro em trânsito' },
 { id: 'post_trip', label: '5. Pós-Venda & NPS', color: 'border-purple-500/40 text-purple-600 dark:text-purple-400', desc: 'Coleta de feedback e avaliação' },
];
