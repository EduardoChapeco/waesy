/**
 * pix-payload.ts — Gerador e Validador Canônico de Códigos Pix (BRCode / EMV BACEN)
 * Padrão Banco Central do Brasil | Zero Dependências Externas
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface GeneratePixOptions {
  pixKey: string;
  amountCents?: number | null;
  merchantName: string;
  merchantCity: string;
  txId?: string;
  description?: string;
}

/**
 * Gera código Pix "Copia e Cola" (EMV payload) de acordo com o padrão do BACEN.
 */
export function generatePixBrCode(options: GeneratePixOptions): string {
  const {
    pixKey,
    amountCents,
    merchantName = "WAESY TURISMO",
    merchantCity = "CHAPECO",
    txId = "***",
    description,
  } = options;

  // Normalização
  const cleanKey = pixKey.trim();
  if (!cleanKey) {
    throw new Error("Chave Pix obrigatória");
  }
  const cleanName = merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .slice(0, 25)
    .toUpperCase();
  const cleanCity = merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .slice(0, 15)
    .toUpperCase();
  const cleanTxId = (txId || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  // Sub-campos 26 (Merchant Account Information)
  let sub26 = formatField("00", "br.gov.bcb.pix");
  sub26 += formatField("01", cleanKey);
  if (description) {
    sub26 += formatField("02", description.slice(0, 40));
  }

  // Sub-campos 62 (Additional Data Field)
  const sub62 = formatField("05", cleanTxId);

  let payload = "";
  payload += formatField("00", "01"); // Payload Format Indicator
  payload += formatField("26", sub26); // Merchant Account Information
  payload += formatField("52", "0000"); // Merchant Category Code (General)
  payload += formatField("53", "986"); // Transaction Currency (BRL)

  if (amountCents && amountCents > 0) {
    const amountStr = (amountCents / 100).toFixed(2);
    payload += formatField("54", amountStr); // Transaction Amount
  }

  payload += formatField("58", "BR"); // Country Code
  payload += formatField("59", cleanName || "WAESY"); // Merchant Name
  payload += formatField("60", cleanCity || "CHAPECO"); // Merchant City
  payload += formatField("62", sub62); // Additional Data Field (Reference/TxId)

  // Adiciona chave 63 para o CRC
  payload += "6304";
  const checksum = crc16Ccitt(payload);

  return `${payload}${checksum}`;
}

export interface EmvPixCopyPasteParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid: string;
}

/**
 * Gera payload EMV Pix Copia e Cola para checkout de eventos/ingressos com sanitização estrita ASCII.
 */
export function buildEmvPixCopyPaste(params: EmvPixCopyPasteParams): string {
  const cleanName =
    params.merchantName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 25)
      .toUpperCase() || "WAESY EVENTOS";
  const cleanCity =
    params.merchantCity
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 15)
      .toUpperCase() || "CHAPECO";
  const cleanTxid = params.txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "WAESYTKT";
  const amountStr = (Math.max(0, params.amountCents) / 100).toFixed(2);

  const gui = formatField("00", "br.gov.bcb.pix");
  const key = formatField("01", params.pixKey.trim());
  const merchantAccount = formatField("26", `${gui}${key}`);

  const payloadWithoutCrc = [
    formatField("00", "01"),
    merchantAccount,
    formatField("52", "0000"),
    formatField("53", "986"),
    ...(params.amountCents > 0 ? [formatField("54", amountStr)] : []),
    formatField("58", "BR"),
    formatField("59", cleanName),
    formatField("60", cleanCity),
    formatField("62", formatField("05", cleanTxid)),
    "6304",
  ].join("");

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}
