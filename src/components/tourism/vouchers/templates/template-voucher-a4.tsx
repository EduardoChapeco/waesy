import React from 'react';
import { Plane, Building2, Car, Shield, QrCode, CheckCircle2 } from 'lucide-react';
import type { TravelVoucherDTO } from '@/types/travel-vouchers';

interface TemplateVoucherA4Props {
 voucher: Partial<TravelVoucherDTO>;
 agencyName?: string;
 agencyLogo?: string;
}

export function TemplateVoucherA4({
 voucher,
 agencyName = 'Agência Waesy Turismo',
}: TemplateVoucherA4Props) {
 const isFlight = voucher.voucher_type === 'flight';
 const isHotel = voucher.voucher_type === 'hotel';
 const isTransfer = voucher.voucher_type === 'transfer';

 return (
 <div
 id="voucher-a4-canvas"
 className="w-[794px] min-h-[1123px] bg-white text-slate-900 p-10 font-sans flex flex-col justify-between shadow-2xl border border-slate-200"
 >
 {/* Header */}
 <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
 <div>
 <span className="text-[11px] font-mono font-bold tracking-widest text-sky-600 uppercase">
 Voucher Oficial de Viagem & Confirmação de Reserva
 </span>
 <h1 className="text-2xl font-extrabold uppercase text-slate-900 mt-1">
 {voucher.title || 'Cartão de Embarque & Hospedagem'}
 </h1>
 <p className="text-xs text-slate-500 mt-0.5">{agencyName}</p>
 </div>

 <div className="text-right">
 <span className="text-[10px] font-mono text-slate-400">Nº DO VOUCHER</span>
 <p className="text-lg font-mono font-black text-slate-900">{voucher.voucher_number || 'VCH-2026-0001'}</p>
 <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
 CONFIRMADO / EMITIDO
 </span>
 </div>
 </div>

 {/* Titular */}
 <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 my-4 text-xs">
 <div>
 <span className="text-[10px] font-mono text-slate-400 uppercase">PASSAGEIRO TITULAR</span>
 <p className="font-bold text-sm text-slate-900">{voucher.passenger_name || 'Nome do Passageiro'}</p>
 </div>
 <div>
 <span className="text-[10px] font-mono text-slate-400 uppercase">DOCUMENTO / CPF</span>
 <p className="font-mono font-bold text-sm text-slate-900">{voucher.passenger_document || '000.000.000-00'}</p>
 </div>
 <div>
 <span className="text-[10px] font-mono text-slate-400 uppercase">STATUS DA EMISSÃO</span>
 <p className="font-bold text-sm text-emerald-600 flex items-center gap-1">
 <CheckCircle2 className="size-4" /> Válido para Apresentação
 </p>
 </div>
 </div>

 {/* Seção Específica: Voo */}
 {isFlight && (
 <div className="space-y-4 my-auto">
 <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
 <Plane className="size-4" /> Dados do Voo & Trecho Aéreo
 </div>

 <div className="p-6 rounded-2xl bg-sky-50/50 border-2 border-dashed border-sky-200 space-y-4">
 <div className="grid grid-cols-4 gap-4 text-xs">
 <div>
 <span className="text-[10px] text-slate-500">COMPANHIA</span>
 <p className="font-bold text-sm">{voucher.flight_data?.airline || 'Companhia Aérea'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">Nº VOO</span>
 <p className="font-mono font-bold text-sm">{voucher.flight_data?.flightNumber || '-'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">ORIGEM</span>
 <p className="font-mono font-bold text-sm">{voucher.flight_data?.origin || '-'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">DESTINO</span>
 <p className="font-mono font-bold text-sm">{voucher.flight_data?.destination || '-'}</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4 text-xs border-t border-sky-200/60 pt-4">
 <div>
 <span className="text-[10px] text-slate-500">EMBARQUE / SAÍDA</span>
 <p className="font-mono font-bold text-sm">{voucher.flight_data?.departureTime || '-'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">PORTÃO / TERMINAL</span>
 <p className="font-mono font-bold text-sm">
 {voucher.flight_data?.gate || '-'} / T{voucher.flight_data?.terminal || '-'}
 </p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">ASSENTO</span>
 <p className="font-mono font-bold text-sm text-sky-700">{voucher.flight_data?.seat || '-'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">FRANQUIA BAGAGEM</span>
 <p className="font-medium text-xs">{voucher.flight_data?.baggage || 'Sob Consulta'}</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Seção Específica: Hotel */}
 {isHotel && (
 <div className="space-y-4 my-auto">
 <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
 <Building2 className="size-4" /> Voucher de Hospedagem & Check-in
 </div>

 <div className="p-6 rounded-2xl bg-emerald-50/50 border-2 border-dashed border-emerald-200 space-y-4">
 <div className="grid grid-cols-3 gap-4 text-xs">
 <div>
 <span className="text-[10px] text-slate-500">HOTEL / RESORT</span>
 <p className="font-bold text-sm">{voucher.hotel_data?.hotelName || 'Hospedagem Confirmada'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">CATEGORIA QUARTO</span>
 <p className="font-medium text-xs">{voucher.hotel_data?.roomType || 'Sob Consulta'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">REGIME DE ALIMENTAÇÃO</span>
 <p className="font-bold text-xs text-emerald-700">{voucher.hotel_data?.boardBasis || 'Sob Consulta'}</p>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-4 text-xs border-t border-emerald-200/60 pt-4">
 <div>
 <span className="text-[10px] text-slate-500">CHECK-IN</span>
 <p className="font-mono font-bold text-sm">{voucher.hotel_data?.checkInDate || '-'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">CHECK-OUT</span>
 <p className="font-mono font-bold text-sm">{voucher.hotel_data?.checkOutDate || '-'}</p>
 </div>
 <div>
 <span className="text-[10px] text-slate-500">CÓDIGO DE RESERVA HOTEL</span>
 <p className="font-mono font-bold text-sm text-slate-900">{voucher.hotel_data?.confirmationCode || (voucher.code ? voucher.code.toUpperCase() : '-')}</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* QR Code & Validação */}
 <div className="p-6 rounded-2xl bg-slate-900 text-white flex items-center justify-between mt-auto">
 <div className="space-y-1">
 <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase">Validação Criptográfica Digital</span>
 <h4 className="text-sm font-bold">Apresente este voucher no balcão de atendimento</h4>
 <p className="text-[11px] text-slate-400 max-w-md">
 Documento com hash SHA-256 e conferência em tempo real via sistema Waesy Travel.
 </p>
 </div>

 <div className="p-3 bg-white rounded-xl text-slate-900 text-center space-y-1">
 <QrCode className="size-16 mx-auto text-slate-900" />
 <span className="text-[9px] font-mono font-bold block text-slate-500">{voucher.voucher_number || 'VCH-QR'}</span>
 </div>
 </div>

 {/* Footer */}
 <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-mono">
 Plantão Emergencial 24h da Agência: (49) 99999-9999 · Atendimento Nacional e Internacional
 </div>
 </div>
 );
}
