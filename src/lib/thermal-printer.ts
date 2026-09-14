/**
 * thermal-printer.ts — Utilitário Canônico de Impressão Térmica (ESC/POS & Web Print)
 * Formata recibos e comandas para impressoras térmicas não fiscais (bobinas 80mm e 58mm).
 */

import { formatMoney } from "./money";
import { formatDateTime } from "./datetime";

export interface ThermalReceiptItem {
  title: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  sku?: string;
  modifiers?: Array<{ label: string; priceDeltaCents: number }>;
}

export interface ThermalReceiptPayment {
  method: string;
  amountCents: number;
  payerLabel?: string;
}

export interface ThermalReceiptData {
  storeName: string;
  storeCnpj?: string;
  storeAddress?: string;
  storePhone?: string;
  saleId: string;
  date?: string | Date;
  serviceMode?: string;
  tableOrComanda?: string;
  customerDoc?: string;
  customerName?: string;
  items: ThermalReceiptItem[];
  subtotalCents: number;
  discountCents?: number;
  totalCents: number;
  amountPaidCents: number;
  changeCents?: number;
  payments: ThermalReceiptPayment[];
  notes?: string;
}

const CHAR_WIDTH_80MM = 48;
const CHAR_WIDTH_58MM = 32;

function padLine(left: string, right: string, width: number): string {
  const spaceNeeded = width - (left.length + right.length);
  if (spaceNeeded <= 0) {
    return left.slice(0, Math.max(0, width - right.length - 1)) + " " + right;
  }
  return left + " ".repeat(spaceNeeded) + right;
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

function divider(width: number, char = "-"): string {
  return char.repeat(width);
}

function formatPaymentMethodName(method: string): string {
  const map: Record<string, string> = {
    cash: "Dinheiro",
    pix: "PIX",
    credit: "Cartão de Crédito",
    debit: "Cartão de Débito",
    carne: "Carnê / A Prazo",
    voucher: "Voucher",
  };
  return map[method] || method.toUpperCase();
}

/**
 * Gera o texto monospaçado puro do recibo formatado para bobina térmica.
 */
export function generateThermalReceiptText(
  data: ThermalReceiptData,
  width: number = CHAR_WIDTH_80MM,
): string {
  const lines: string[] = [];

  // Cabeçalho da Loja
  lines.push(centerText(data.storeName.toUpperCase(), width));
  if (data.storeCnpj) {
    lines.push(centerText(`CNPJ: ${data.storeCnpj}`, width));
  }
  if (data.storeAddress) {
    lines.push(centerText(data.storeAddress, width));
  }
  if (data.storePhone) {
    lines.push(centerText(`Tel: ${data.storePhone}`, width));
  }

  lines.push(divider(width, "="));
  lines.push(centerText("CUPOM NÃO FISCAL DE VENDA", width));
  lines.push(divider(width, "="));

  // Metadados da Venda
  lines.push(padLine("PEDIDO / VENDA:", data.saleId, width));
  lines.push(
    padLine(
      "DATA/HORA:",
      formatDateTime(data.date ? new Date(data.date).toISOString() : new Date().toISOString()),
      width,
    ),
  );

  if (data.serviceMode) {
    const modeLabel =
      data.serviceMode === "table"
        ? `MESA ${data.tableOrComanda || ""}`
        : data.serviceMode === "comanda"
          ? `COMANDA ${data.tableOrComanda || ""}`
          : "BALCÃO / RETIRADA";
    lines.push(padLine("MODO ATENDIMENTO:", modeLabel, width));
  }

  if (data.customerName || data.customerDoc) {
    const cust = [data.customerName, data.customerDoc ? `CPF: ${data.customerDoc}` : ""]
      .filter(Boolean)
      .join(" - ");
    lines.push(padLine("CLIENTE:", cust, width));
  }

  lines.push(divider(width, "-"));
  lines.push(padLine("ITEM / QTD x UNIT", "TOTAL", width));
  lines.push(divider(width, "-"));

  // Itens
  data.items.forEach((item, idx) => {
    const num = (idx + 1).toString().padStart(2, "0");
    const itemTitle = `${num}. ${item.title}`;
    const totalFormatted = formatMoney(item.totalCents);

    lines.push(padLine(itemTitle.slice(0, Math.max(0, width - 12)), totalFormatted, width));

    const unitFormatted = `${item.qty} un x ${formatMoney(item.unitPriceCents)}`;
    lines.push(`   ${unitFormatted}`);

    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((mod) => {
        const modDelta = mod.priceDeltaCents > 0 ? ` (+${formatMoney(mod.priceDeltaCents)})` : "";
        lines.push(`   + ${mod.label}${modDelta}`);
      });
    }
  });

  lines.push(divider(width, "-"));

  // Totais
  lines.push(padLine("SUBTOTAL:", formatMoney(data.subtotalCents), width));
  if (data.discountCents && data.discountCents > 0) {
    lines.push(padLine("DESCONTO APLICADO:", `-${formatMoney(data.discountCents)}`, width));
  }
  lines.push(padLine("TOTAL A PAGAR:", formatMoney(data.totalCents), width));

  lines.push(divider(width, "="));
  lines.push(centerText("DISCRIMINAÇÃO DE PAGAMENTOS", width));
  lines.push(divider(width, "-"));

  // Pagamentos (com suporte detalhado a Split Bill)
  if (data.payments && data.payments.length > 0) {
    data.payments.forEach((pay, idx) => {
      const label = pay.payerLabel
        ? `${pay.payerLabel} (${formatPaymentMethodName(pay.method)})`
        : `${idx + 1}. ${formatPaymentMethodName(pay.method)}`;
      lines.push(padLine(label, formatMoney(pay.amountCents), width));
    });
  } else {
    lines.push(padLine("PAGAMENTO:", formatMoney(data.totalCents), width));
  }

  if (data.changeCents && data.changeCents > 0) {
    lines.push(padLine("TROCO:", formatMoney(data.changeCents), width));
  }

  lines.push(divider(width, "="));

  if (data.notes) {
    lines.push(`OBS: ${data.notes}`);
    lines.push(divider(width, "-"));
  }

  // Rodapé
  lines.push(centerText("Obrigado pela preferência!", width));
  lines.push(centerText("Plataforma Waesy — Comércio & Comunidade", width));
  lines.push(centerText("waesy.com.br", width));
  lines.push("\n\n\n"); // Espaço para guilhotina / corte

  return lines.join("\n");
}

/**
 * Dispara a impressão limpa do recibo térmico no navegador respeitando as dimensões da bobina.
 */
export function printThermalReceipt(
  data: ThermalReceiptData,
  paperWidth: "80mm" | "58mm" = "80mm",
): void {
  const charWidth = paperWidth === "80mm" ? CHAR_WIDTH_80MM : CHAR_WIDTH_58MM;
  const receiptText = generateThermalReceiptText(data, charWidth);

  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    printViaHiddenIframe(receiptText, paperWidth);
    return;
  }

  const mmWidth = paperWidth === "80mm" ? "76mm" : "54mm";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo - ${data.saleId}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            margin: 0;
            size: ${paperWidth} auto;
          }
          body {
            margin: 0;
            padding: 4mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: ${paperWidth === "80mm" ? "12px" : "10px"};
            line-height: 1.25;
            color: #000;
            background: #fff;
            width: ${mmWidth};
            max-width: ${mmWidth};
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-all;
            font-family: inherit;
            font-size: inherit;
          }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(receiptText)}</pre>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function printViaHiddenIframe(receiptText: string, paperWidth: "80mm" | "58mm"): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const mmWidth = paperWidth === "80mm" ? "76mm" : "54mm";

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo</title>
        <style>
          @page { margin: 0; size: ${paperWidth} auto; }
          body {
            margin: 0;
            padding: 4mm;
            font-family: monospace;
            font-size: ${paperWidth === "80mm" ? "12px" : "10px"};
            line-height: 1.25;
            width: ${mmWidth};
          }
          pre { margin: 0; white-space: pre-wrap; font-family: inherit; }
        </style>
      </head>
      <body>
        <pre>${escapeHtml(receiptText)}</pre>
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Engine de Bytes ESC/POS & ZPL Raw para Integrações de Balcão e Expedição
// ---------------------------------------------------------------------------

export interface EscPosReceiptParams {
  storeName: string;
  orderNumber: string;
  orderDate?: string;
  items: Array<{ name: string; qty: number; priceCents: number }>;
  subtotalCents: number;
  discountCents?: number;
  totalCents: number;
  paymentMethod?: string;
  channelSource?: string;
  customerName?: string;
}

/**
 * Gera os bytes brutos ESC/POS (Uint8Array) para envio direto a impressoras térmicas
 * seriais ou via USB / raw socket.
 */
export function buildEscPosReceipt(params: EscPosReceiptParams): Uint8Array {
  const bytes: number[] = [];

  // ESC @ (Inicialização da Impressora)
  bytes.push(0x1b, 0x40);

  // Alinhamento centralizado: ESC a 1
  bytes.push(0x1b, 0x61, 0x01);

  // Negrito ON: ESC E 1
  bytes.push(0x1b, 0x45, 0x01);
  const enc = new TextEncoder();
  bytes.push(...enc.encode(params.storeName.toUpperCase() + "\n"));
  bytes.push(0x1b, 0x45, 0x00); // Negrito OFF

  bytes.push(...enc.encode("PEDIDO: " + params.orderNumber + "\n"));
  if (params.orderDate) {
    bytes.push(...enc.encode("DATA: " + params.orderDate + "\n"));
  }
  if (params.channelSource) {
    bytes.push(...enc.encode("CANAL: " + params.channelSource.toUpperCase() + "\n"));
  }

  // Divisor
  bytes.push(...enc.encode("--------------------------------\n"));

  // Alinhamento à esquerda: ESC a 0
  bytes.push(0x1b, 0x61, 0x00);

  // Itens
  for (const item of params.items) {
    const itemLine = `${item.qty}x ${item.name}`;
    const priceStr = formatMoney(item.priceCents);
    const space = Math.max(1, 32 - (itemLine.length + priceStr.length));
    bytes.push(...enc.encode(itemLine + " ".repeat(space) + priceStr + "\n"));
  }

  // Divisor
  bytes.push(...enc.encode("--------------------------------\n"));

  // Total
  bytes.push(0x1b, 0x45, 0x01); // Negrito ON
  const totalStr = formatMoney(params.totalCents);
  const totalLine = "TOTAL:";
  const totalSpace = Math.max(1, 32 - (totalLine.length + totalStr.length));
  bytes.push(...enc.encode(totalLine + " ".repeat(totalSpace) + totalStr + "\n"));
  bytes.push(0x1b, 0x45, 0x00); // Negrito OFF

  if (params.paymentMethod) {
    bytes.push(...enc.encode(`FORMA PGTO: ${params.paymentMethod.toUpperCase()}\n`));
  }

  // Alimentação de papel: 3 linhas
  bytes.push(0x0a, 0x0a, 0x0a);

  // Corte de papel total: GS V A 0 (0x1D, 0x56, 0x41, 0x00)
  bytes.push(0x1d, 0x56, 0x41, 0x00);

  return new Uint8Array(bytes);
}

export interface ZplShippingLabelParams {
  carrierName: string;
  serviceType?: string;
  trackingNumber: string;
  orderNumber: string;
  batchCode?: string;
  recipient: {
    name: string;
    street: string;
    number: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  sender?: {
    storeName: string;
    city: string;
    state: string;
    zipCode: string;
  };
  channelSource?: string;
  totalItemsCount?: number;
}

/**
 * Gera o script ZPL completo para etiquetas térmicas 100x150mm (Zebra, Elgin, Argox).
 */
export function buildZplShippingLabel(params: ZplShippingLabelParams): string {
  const zpl = [
    "^XA",
    "^PW800",
    "^LL1200",
    "^LH0,0",

    // Cabeçalho da Transportadora
    `^FO50,50^A0N,40,40^FD${params.carrierName.toUpperCase()}^FS`,
    params.serviceType ? `^FO50,100^A0N,28,28^FD${params.serviceType.toUpperCase()}^FS` : "",
    params.channelSource ? `^FO500,50^A0N,32,32^FD${params.channelSource.toUpperCase()}^FS` : "",
    `^FO50,140^GB700,2,2^FS`,

    // Código de Rastreio (Texto e Código de Barras 128)
    `^FO50,160^A0N,30,30^FDRastreio: ${params.trackingNumber}^FS`,
    `^FO50,200^BCN,100,Y,N,N^FD${params.trackingNumber}^FS`,
    `^FO50,330^GB700,2,2^FS`,

    // Destinatário
    `^FO50,350^A0N,26,26^FDPARA:^FS`,
    `^FO50,385^A0N,34,34^FD${params.recipient.name}^FS`,
    `^FO50,430^A0N,28,28^FD${params.recipient.street}, ${params.recipient.number}^FS`,
    params.recipient.neighborhood ? `^FO50,465^A0N,26,26^FD${params.recipient.neighborhood}^FS` : "",
    `^FO50,500^A0N,32,32^FD${params.recipient.city} - ${params.recipient.state}^FS`,
    `^FO50,540^A0N,36,36^FDCER: ${params.recipient.zipCode}^FS`,
    `^FO50,590^GB700,2,2^FS`,

    // Remetente
    params.sender
      ? [
          `^FO50,610^A0N,24,24^FDDE: ${params.sender.storeName}^FS`,
          `^FO50,640^A0N,22,22^FD${params.sender.city} - ${params.sender.state} | CEP ${params.sender.zipCode}^FS`,
          `^FO50,670^GB700,2,2^FS`,
        ].join("\n")
      : "",

    // Informações do Pacote / Pedido
    `^FO50,690^A0N,28,28^FDPEDIDO: #${params.orderNumber}^FS`,
    params.batchCode ? `^FO500,690^A0N,28,28^FDLOTE: ${params.batchCode}^FS` : "",
    params.totalItemsCount ? `^FO50,730^A0N,24,24^FDVOLUMES/ITENS: ${params.totalItemsCount}^FS` : "",

    "^XZ",
  ]
    .filter(Boolean)
    .join("\n");

  return zpl;
}

/**
 * Envia string de comandos ZPL para a impressora serial via Web Serial API.
 */
export async function sendZplToSerialPrinter(zpl: string): Promise<boolean> {
  const enc = new TextEncoder();
  return sendBytesToSerialPrinter(enc.encode(zpl));
}

/**
 * Envia bytes brutos (ESC/POS ou ZPL) diretamente para a impressora via Web Serial API.
 */
export async function sendBytesToSerialPrinter(bytes: Uint8Array): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serial" in navigator)) {
    console.warn("Web Serial API não suportada neste navegador.");
    return false;
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();
    return true;
  } catch (err) {
    console.error("Falha ao comunicar com impressora serial:", err);
    return false;
  }
}

