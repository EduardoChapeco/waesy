import React from "react";
import { CommercialDocumentTemplateProps } from "../types";
import { QrCode, ShieldCheck, CheckCircle2, Building2, Phone, Mail, Calendar, FileText } from "lucide-react";

export const BudgetCorporateClean: React.FC<CommercialDocumentTemplateProps> = ({
  data,
  scale = 1,
  className = "",
  onAcceptProposal,
}) => {
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top center",
      }}
      className={`w-full max-w-[800px] mx-auto bg-white text-slate-900 font-sans p-8 sm:p-12 border border-slate-200/80 shadow-lg rounded-2xl print:shadow-none print:border-none print:p-0 ${className}`}
    >
      {/* ── 1. Topo / Header Institucional ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-slate-200">
        <div>
          {data.issuer.logoUrl ? (
            <img
              src={data.issuer.logoUrl}
              alt={data.issuer.companyName}
              className="h-10 w-auto object-contain mb-3"
            />
          ) : (
            <div className="flex items-center gap-2 mb-3">
              <div className="size-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                W
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-950">
                {data.issuer.tradingName || data.issuer.companyName}
              </span>
            </div>
          )}

          <div className="text-xs text-slate-500 space-y-0.5 font-medium">
            <p className="font-semibold text-slate-700">{data.issuer.companyName}</p>
            <p>CNPJ/CPF: {data.issuer.cnpjOrCpf}</p>
            <p>{data.issuer.address} • {data.issuer.cityState}</p>
            <p className="flex items-center gap-2 pt-0.5">
              <span>{data.issuer.phoneOrWhatsapp}</span>
              <span>•</span>
              <span>{data.issuer.email}</span>
            </p>
          </div>
        </div>

        {/* Informações da Proposta / Código */}
        <div className="sm:text-right shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
            ORÇAMENTO COMERCIAL
          </span>
          <div className="text-2xl font-black font-mono text-slate-950 tracking-tight mb-2">
            {data.code}
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>
              <strong className="text-slate-700">Emissão:</strong> {data.issueDate}
            </p>
            <p>
              <strong className="text-slate-700">Validade:</strong> {data.validUntilDate}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 mt-1">
              <ShieldCheck className="size-3.5" />
              <span>Proposta Ativa</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Bloco do Cliente / Destinatário ── */}
      <div className="my-8 bg-slate-50/80 border border-slate-200/80 rounded-xl p-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          DADOS DO CLIENTE / CONTRATANTE
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-bold text-sm text-slate-900 mb-0.5">
              {data.client.name}
            </p>
            {data.client.companyName && (
              <p className="text-slate-600 font-medium">{data.client.companyName}</p>
            )}
            <p className="text-slate-500">Documento: {data.client.cnpjOrCpf}</p>
          </div>
          <div className="sm:text-right">
            {data.client.cityState && <p className="text-slate-600">{data.client.cityState}</p>}
            {data.client.phone && <p className="text-slate-500">Contato: {data.client.phone}</p>}
            {data.client.email && <p className="text-slate-500">{data.client.email}</p>}
          </div>
        </div>
      </div>

      {/* ── 3. Tabela Matricial de Itens ── */}
      <div className="my-8 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[11px] uppercase tracking-wider font-bold text-slate-500">
              <th className="py-3 pr-4">Item / Serviço</th>
              <th className="py-3 px-3 text-center">Qtd</th>
              <th className="py-3 px-3 text-right">Valor Unit.</th>
              <th className="py-3 pl-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {data.items.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50">
                <td className="py-3.5 pr-4 align-top">
                  <div className="font-bold text-slate-900 text-sm">
                    {item.title}
                  </div>
                  {item.description && (
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {item.sku && (
                    <span className="font-mono text-[10px] text-slate-400 mt-1 block">
                      SKU: {item.sku}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-3 align-top text-center font-mono font-semibold text-slate-700">
                  {item.quantity}
                </td>
                <td className="py-3.5 px-3 align-top text-right font-mono font-medium text-slate-700">
                  {formatMoney(item.unitPriceCents)}
                </td>
                <td className="py-3.5 pl-4 align-top text-right font-mono font-bold text-slate-950">
                  {formatMoney(item.totalPriceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 4. Fechamento de Totais ── */}
      <div className="flex flex-col items-end my-8 pt-4 border-t border-slate-200">
        <div className="w-full sm:w-72 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal dos Itens:</span>
            <span className="font-mono font-semibold">{formatMoney(data.subtotalCents)}</span>
          </div>
          {data.discountCents && data.discountCents > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Desconto Comercial:</span>
              <span className="font-mono">- {formatMoney(data.discountCents)}</span>
            </div>
          )}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 text-white mt-3">
            <span className="font-bold text-xs uppercase tracking-wider">TOTAL LÍQUIDO</span>
            <span className="font-mono font-black text-xl">
              {formatMoney(data.totalCents)}
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. Pagamento, PIX & QR Code ── */}
      <div className="my-8 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-1.5 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
            CONDIÇÕES DE PAGAMENTO & LIQUIDAÇÃO
          </span>
          <p className="font-semibold text-slate-900">
            Método: {data.paymentTerms.method.toUpperCase()}
            {data.paymentTerms.installmentsCount && ` (em até ${data.paymentTerms.installmentsCount}x)`}
          </p>
          {data.issuer.pixKey && (
            <div className="pt-2">
              <span className="text-[11px] text-slate-500 block">Chave PIX Oficial:</span>
              <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded select-all inline-block mt-1">
                {data.issuer.pixKey}
              </span>
            </div>
          )}
          {data.paymentTerms.notes && (
            <p className="text-slate-500 pt-1 leading-relaxed">
              {data.paymentTerms.notes}
            </p>
          )}
        </div>

        {/* QR Code de Pagamento */}
        <div className="shrink-0 flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <QrCode className="size-20 text-slate-900" />
          <span className="text-[10px] font-mono text-slate-500 uppercase mt-1">
            Pague via PIX
          </span>
        </div>
      </div>

      {/* ── 6. Assinaturas e Termos ── */}
      <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
        <div>
          <div className="h-14 border-b border-slate-300 mb-2 flex items-end justify-center pb-1">
            <span className="font-serif italic text-slate-600 text-sm">{data.issuer.tradingName || data.issuer.companyName}</span>
          </div>
          <p className="font-bold text-slate-800">{data.issuer.companyName}</p>
          <p className="text-slate-500">Emitente Autorizado</p>
        </div>

        <div>
          <div className="h-14 border-b border-slate-300 mb-2 flex items-end justify-center pb-1">
            {data.signatories?.clientSigned ? (
              <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="size-4" /> Aceito Digitalmente ({data.signatories.clientSignedAt})
              </span>
            ) : onAcceptProposal ? (
              <button
                type="button"
                onClick={onAcceptProposal}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Aprovar & Assinar Proposta
              </button>
            ) : (
              <span className="text-slate-400 text-xs">Aguardando Assinatura</span>
            )}
          </div>
          <p className="font-bold text-slate-800">{data.client.name}</p>
          <p className="text-slate-500">Contratante / Aceite</p>
        </div>
      </div>

      {/* Nota Legal Rodapé */}
      {data.legalNotes && (
        <p className="mt-8 text-[10px] text-slate-400 text-center leading-relaxed">
          {data.legalNotes}
        </p>
      )}
    </div>
  );
};
