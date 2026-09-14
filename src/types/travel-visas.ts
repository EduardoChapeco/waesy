export type VisaStatus =
  | 'coleta_documentos'
  | 'formulario_preenchido'
  | 'entrevista_agendada'
  | 'agendamento_consular'
  | 'analise_consular'
  | 'em_analise_consular'
  | 'aprovado'
  | 'recusado'
  | 'negado'
  | 'entregue';

export interface VisaDocumentItem {
 id: string;
 title: string;
 status: 'pendente' | 'recebido' | 'validado';
 file_url?: string | null;
}

export interface TravelVisaDTO {
 id: string;
 store_id: string;
 client_id?: string | null;
 client_name: string;
 client_passport?: string | null;
 country: string;
 visa_category: string;
 status: VisaStatus;
 interview_date?: string | null;
 expected_date?: string | null;
 documents: VisaDocumentItem[];
 notes?: string | null;
 created_at?: string;
 updated_at?: string;
}

export const VISA_STATUS_LABELS: Record<VisaStatus, { label: string; color: string }> = {
  coleta_documentos: { label: 'Coleta de Documentos', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  formulario_preenchido: { label: 'Formulário DS-160 / Preenchido', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  entrevista_agendada: { label: 'Entrevista Agendada', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  agendamento_consular: { label: 'Agendamento Consular', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  analise_consular: { label: 'Análise Consular', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  em_analise_consular: { label: 'Em Análise Consular', color: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  aprovado: { label: 'Visto Aprovado / Emitido', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  recusado: { label: 'Visto Recusado / Pendência', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  negado: { label: 'Visto Negado / Pendência', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  entregue: { label: 'Passaporte Entregue', color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
};
