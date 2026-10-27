import React from 'react';
import { Plane, Building2, Car, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { TravelVoucherDTO } from '@/types/travel-vouchers';
import { generateQrCodeDataUri } from '@/lib/qr-code';

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
  const voucherCode = voucher.voucher_number || 'VCH-2026-0001';
  const qrUri = generateQrCodeDataUri(voucherCode, { border: 1 });

  return (
    <div
      id="voucher-a4-canvas"
      className="a4-page w-full max-w-3xl min-h-screen bg-card text-card-foreground p-8 sm:p-10 font-sans flex flex-col justify-between border border-border/80 mx-auto"
    >
      {/* ── 1. CABEÇALHO DO VOUCHER ── */}
      <div className="border-b-2 border-foreground/80 pb-6 flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
            Voucher Oficial de Viagem e Confirmação de Reserva
          </span>
          <h1 className="text-2xl font-extrabold uppercase text-foreground leading-tight">
            {voucher.title || 'Cartão de Embarque'}
          </h1>
          <p className="text-xs text-muted-foreground">{agencyName}</p>
        </div>

        <div className="text-right space-y-1">
          <span className="text-xs font-mono text-muted-foreground block">Nº DO VOUCHER</span>
          <p className="text-lg font-mono font-black text-foreground">{voucherCode}</p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            CONFIRMADO / EMITIDO
          </span>
        </div>
      </div>

      {/* ── 2. DADOS DO PASSAGEIRO TITULAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-lg bg-muted/40 border border-border/80 my-4 text-xs">
        <div>
          <span className="text-xs font-mono text-muted-foreground uppercase block">PASSAGEIRO TITULAR</span>
          <p className="font-bold text-sm text-foreground">{voucher.passenger_name || 'Nome do Passageiro'}</p>
        </div>
        <div>
          <span className="text-xs font-mono text-muted-foreground uppercase block">DOCUMENTO / CPF</span>
          <p className="font-mono font-bold text-sm text-foreground">{voucher.passenger_document || '000.000.000-00'}</p>
        </div>
        <div>
          <span className="text-xs font-mono text-muted-foreground uppercase block">STATUS DA EMISSÃO</span>
          <p className="font-bold text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="size-4 shrink-0" /> Válido para Apresentação
          </p>
        </div>
      </div>

      {/* ── 3. SEÇÃO ESPECÍFICA: VOO ── */}
      {isFlight && (
        <div className="space-y-4 my-auto">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Plane className="size-4" /> Dados do Voo e Trecho Aéreo
          </div>

          <div className="p-6 rounded-lg bg-card border-2 border-dashed border-border/80 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-xs text-muted-foreground block">COMPANHIA</span>
                <p className="font-bold text-sm text-foreground">{voucher.flight_data?.airline || 'Companhia Aérea'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Nº VOO</span>
                <p className="font-mono font-bold text-sm text-foreground">{voucher.flight_data?.flightNumber || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">ORIGEM</span>
                <p className="font-mono font-bold text-sm text-foreground">{voucher.flight_data?.origin || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">DESTINO</span>
                <p className="font-mono font-bold text-sm text-foreground">{voucher.flight_data?.destination || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-border/60 pt-4">
              <div>
                <span className="text-xs text-muted-foreground block">EMBARQUE / SAÍDA</span>
                <p className="font-mono font-bold text-sm text-foreground">{voucher.flight_data?.departureTime || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">PORTÃO / TERMINAL</span>
                <p className="font-mono font-bold text-sm text-foreground">
                  {voucher.flight_data?.gate || '-'} / T{voucher.flight_data?.terminal || '-'}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">ASSENTO</span>
                <p className="font-mono font-bold text-sm text-primary">{voucher.flight_data?.seat || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">FRANQUIA BAGAGEM</span>
                <p className="font-medium text-xs text-foreground">{voucher.flight_data?.baggage || 'Sob Consulta'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. SEÇÃO ESPECÍFICA: HOTEL ── */}
      {isHotel && (
        <div className="space-y-4 my-auto">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Building2 className="size-4" /> Voucher de Hospedagem e Check-in
          </div>

          <div className="p-6 rounded-lg bg-card border-2 border-dashed border-border/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-xs text-muted-foreground block">HOTEL / RESORT</span>
                <p className="font-bold text-sm text-foreground">{voucher.hotel_data?.hotelName || 'Hospedagem Confirmada'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">CATEGORIA QUARTO</span>
                <p className="font-medium text-xs text-foreground">{voucher.hotel_data?.roomType || 'Sob Consulta'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">REGIME DE ALIMENTAÇÃO</span>
                <p className="font-bold text-xs text-primary">{voucher.hotel_data?.boardBasis || 'Sob Consulta'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-t border-border/60 pt-4">
              <div>
                <span className="text-xs text-muted-foreground block">CHECK-IN</span>
                <p className="font-mono font-bold text-sm text-foreground">{voucher.hotel_data?.checkInDate || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">CHECK-OUT</span>
                <p className="font-mono font-bold text-sm text-foreground">{voucher.hotel_data?.checkOutDate || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">CÓDIGO DE RESERVA HOTEL</span>
                <p className="font-mono font-bold text-sm text-foreground">
                  {voucher.hotel_data?.confirmationCode || (voucher.voucher_number ? voucher.voucher_number.toUpperCase() : '-')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SEÇÃO ESPECÍFICA: TRANSFER ── */}
      {isTransfer && (
        <div className="space-y-4 my-auto">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Car className="size-4" /> Voucher de Transfer & Receptivo
          </div>
          <div className="p-6 rounded-lg bg-card border-2 border-dashed border-border/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-xs text-muted-foreground block">TIPO DE SERVIÇO</span>
                <p className="font-bold text-sm text-foreground">Transfer Privativo Executivo</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">PONTO DE ENCONTRO</span>
                <p className="font-bold text-sm text-foreground">Saguão de Desembarque Principal</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">PLANTÃO LOCAL</span>
                <p className="font-mono font-bold text-sm text-primary">0800 900 1234</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. QR CODE & VALIDAÇÃO CRIPTOGRÁFICA ── */}
      <div className="p-6 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-between mt-auto">
        <div className="space-y-1">
          <span className="text-xs font-mono tracking-widest text-primary uppercase font-bold">
            Validação Criptográfica Digital
          </span>
          <h4 className="text-sm font-bold text-foreground">Apresente este voucher no balcão de atendimento</h4>
          <p className="text-xs text-muted-foreground max-w-md">
            Documento com hash SHA-256 e conferência em tempo real via sistema Waesy Travel.
          </p>
        </div>

        <div className="p-3 bg-card rounded-lg border border-border text-center space-y-1">
          {qrUri ? (
            <img src={qrUri} alt="QR Code de Validação" className="size-16 mx-auto pointer-events-none" />
          ) : (
            <div className="size-16 bg-muted rounded flex items-center justify-center text-xs font-mono">QR</div>
          )}
          <span className="text-xs font-mono font-bold block text-muted-foreground">{voucherCode}</span>
        </div>
      </div>

      {/* ── 7. RODAPÉ INSTITUCIONAL ── */}
      <div className="border-t border-border/80 pt-4 text-center text-xs text-muted-foreground font-mono">
        Plantão Emergencial 24h da Agência: (49) 99999-9999 · Atendimento Nacional e Internacional
      </div>
    </div>
  );
}
export default TemplateVoucherA4;
