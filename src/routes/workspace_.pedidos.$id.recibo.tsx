import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { getOrderForReceipt } from "@/services/order.functions";
import { FileText, Download, CheckCircle, Printer } from "lucide-react";

export const Route = createFileRoute("/workspace_/pedidos/$id/recibo")({
  head: () => ({ meta: [{ title: "Recibo do Pedido" }] }),
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      return await getOrderForReceipt({ data: { id: params.id } });
    } catch (err) {
      console.error("[loader:workspace_.pedidos.$id.recibo] Unhandled error:", err);
      return {} as any;
    }
  },
  component: ReceiptPrintPage,
});

function ReceiptPrintPage() {
  const order = Route.useLoaderData();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (!order || !order.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">Pedido não localizado para impressão do recibo.</p>
      </div>
    );
  }

  const customFields = (order as any).custom_fields || {};
  const hasCustomFields = Object.keys(customFields).length > 0;
  const hasNFe = Boolean((order as any).danfe_pdf_url || (order as any).nfe_key);

  return (
    <div className="bg-white text-black p-8 max-w-3xl mx-auto min-h-screen font-mono text-xs">
      {/* Botão de Impressão na visualização em tela */}
      <div className="flex justify-end gap-2 mb-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-sans font-medium text-neutral-800 hover:bg-neutral-100 transition-colors shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir Recibo
        </button>
        {hasNFe && (order as any).danfe_pdf_url && (
          <a
            href={(order as any).danfe_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-sans font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar DANFE (PDF)
          </a>
        )}
      </div>

      {/* Cabeçalho */}
      <div className="border-b border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight">COMPROVANTE DE PEDIDO</h1>
            <p className="text-xs text-neutral-600">Pedido #{order.id?.slice(0, 8)}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{formatDateTime(order.created_at)}</p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                hasNFe ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {hasNFe ? "Documento Fiscal Emitido (NF-e)" : "Comprovante Não Fiscal"}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Auditoria e DANFE */}
      {hasNFe && (
        <div className="mb-6 p-3.5 border border-emerald-300 bg-emerald-50/60 rounded text-xs space-y-1.5 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-950">Nota Fiscal Eletrônica Autorizada (SEFAZ)</span>
            </div>
            {(order as any).danfe_pdf_url && (
              <a
                href={(order as any).danfe_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-emerald-700 underline hover:text-emerald-900 inline-flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                Visualizar DANFE Oficial
              </a>
            )}
          </div>
          {(order as any).nfe_key && (
            <p className="text-[10px] font-mono text-emerald-900 break-all">
              <strong>Chave de Acesso:</strong> {(order as any).nfe_key}
            </p>
          )}
        </div>
      )}

      {/* Informações do Cliente e Entrega */}
      <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-neutral-200">
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">Dados do Cliente:</p>
          <p className="font-semibold">{(order as any).customer_name || "Cliente Final"}</p>
          {(order as any).customer_document && (
            <p>
              <strong>CPF/CNPJ:</strong> {(order as any).customer_document}
            </p>
          )}
          {(order as any).customer_email && (
            <p>
              <strong>E-mail:</strong> {(order as any).customer_email}
            </p>
          )}
          {(order as any).customer_phone && (
            <p>
              <strong>Tel:</strong> {(order as any).customer_phone}
            </p>
          )}
          {(order as any).cpf_on_receipt?.requested && (
            <p>
              <strong>CPF na Nota:</strong> {(order as any).cpf_on_receipt?.document || "Solicitado"}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">Logística & Entrega:</p>
          <p>
            <strong>Modalidade:</strong>{" "}
            {order.shipping_method === "pickup" ? "Retirada na Loja" : "Entrega / Envio"}
          </p>
          {(order as any).shipping_address && (
            <p className="text-[11px]">
              <strong>Endereço:</strong>{" "}
              {typeof (order as any).shipping_address === "string"
                ? (order as any).shipping_address
                : `${(order as any).shipping_address?.street || ""}, ${(order as any).shipping_address?.number || ""} - ${(order as any).shipping_address?.neighborhood || ""}`}
            </p>
          )}
          {(order as any).receiver_info?.isOtherPerson && (
            <p className="text-[11px]">
              <strong>Recebedor Autorizado:</strong> {(order as any).receiver_info?.name} {(order as any).receiver_info?.phone ? `(${(order as any).receiver_info.phone})` : ""}
            </p>
          )}
          {(order as any).substitution_policy && (
            <p className="text-[11px]">
              <strong>Política em Falta:</strong> {(order as any).substitution_policy === "similar" ? "Trocar por similar" : (order as any).substitution_policy === "contact" ? "Confirmar WhatsApp" : "Cancelar item"}
            </p>
          )}
          {(order as any).checkout_niche_metadata?.utensilsRequested && (
            <p className="text-[11px]">
              <strong>Descartáveis:</strong> Enviar talheres/guardanapos
            </p>
          )}
          {(order as any).payment_method && (
            <p>
              <strong>Pagamento:</strong> {String((order as any).payment_method).toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {/* Informações Customizadas do Nicho */}
      {hasCustomFields && (
        <div className="mb-6 p-3 border border-neutral-200 rounded text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">
            Informações Complementares:
          </p>
          {Object.entries(customFields).map(([k, v]: [string, any]) => (
            <p key={k}>
              <strong>{k}:</strong> {String(v)}
            </p>
          ))}
        </div>
      )}

      {/* Observações */}
      {(order as any).notes && (
        <div className="mb-6 p-3 border border-neutral-200 rounded text-xs">
          <p>
            <strong>Observações:</strong> {(order as any).notes}
          </p>
        </div>
      )}

      {/* Tabela de Itens */}
      <table className="w-full text-xs mb-8 border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-2 font-bold">Qtd</th>
            <th className="text-left py-2 font-bold">Descrição do Item</th>
            <th className="text-right py-2 font-bold">V. Unit</th>
            <th className="text-right py-2 font-bold">V. Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {order.order_items?.map((item: any) => (
            <tr key={item.id}>
              <td className="py-2">{item.qty}x</td>
              <td className="py-2">
                <div className="font-semibold">{item.product_title}</div>
                {item.notes && <div className="text-[10px] text-amber-700 font-sans italic">Obs: {item.notes}</div>}
                {item.variant_sku && <div className="text-[10px] text-neutral-500">SKU: {item.variant_sku}</div>}
              </td>
              <td className="text-right py-2">{formatMoney(item.unit_price_cents)}</td>
              <td className="text-right py-2">
                {formatMoney(item.total_cents ?? (item.unit_price_cents || 0) * (item.qty || 1))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totais */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal:</span>
            <span>{formatMoney(order.subtotal_cents)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Frete:</span>
            <span>{formatMoney(order.shipping_cents)}</span>
          </div>
          {order.discount_cents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Desconto:</span>
              <span>-{formatMoney(order.discount_cents)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-black pt-2">
            <span>TOTAL:</span>
            <span>{formatMoney(order.total_cents)}</span>
          </div>
        </div>
      </div>

      {/* Rodapé do Recibo */}
      <div className="text-center text-[10px] text-neutral-500 mt-12 pt-4 border-t border-dashed border-neutral-300 space-y-1">
        <p>Agradecemos a sua preferência!</p>
        <p>Waesy Commerce • Sistema Integrado de Gestão & Conformidade Fiscal</p>
      </div>

      {/* Estilos para impressão limpa */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              margin: 0;
              padding: 0;
            }
            .print\\:hidden {
              display: none !important;
            }
            @page {
              margin: 0.8cm;
              size: auto;
            }
          }
        `,
        }}
      />
    </div>
  );
}
