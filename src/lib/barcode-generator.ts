/**
 * Gerador Canônico de Código de Barras (EAN-13 & Code-128)
 * Gera representações vetoriais SVG puras e cálculo de dígito verificador sem dependências externas.
 */

// ---------------------------------------------------------------------------
// EAN-13 Checksum & Encoding
// ---------------------------------------------------------------------------

const EAN13_STRUCTURE = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
];

const EAN13_L_CODE = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];

const EAN13_G_CODE = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111",
];

const EAN13_R_CODE = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
];

export function calculateEAN13Checksum(code12: string): number {
  const digits = code12.replace(/\D/g, "").slice(0, 12).split("").map(Number);
  if (digits.length < 12) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

export function generateEAN13(rawDigits: string): string {
  const clean = rawDigits.replace(/\D/g, "");
  if (clean.length === 12) {
    return clean + calculateEAN13Checksum(clean);
  }
  if (clean.length === 13) {
    const base = clean.slice(0, 12);
    return base + calculateEAN13Checksum(base);
  }
  // Se for menor, completa com zeros (prefixo 789 do Brasil)
  const padded = ("789" + clean).slice(0, 12).padEnd(12, "0");
  return padded + calculateEAN13Checksum(padded);
}

// ---------------------------------------------------------------------------
// Code-128 Subset B (Universal para SKUs alfanuméricos)
// ---------------------------------------------------------------------------

const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

export function encodeCode128B(text: string): string {
  const START_B = 104;
  const STOP = 106;
  const values: number[] = [START_B];

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      values.push(code);
    }
  }

  // Checksum: Start + sum(val * index) mod 103
  let sum = values[0];
  for (let i = 1; i < values.length; i++) {
    sum += values[i] * i;
  }
  const check = sum % 103;
  values.push(check);
  values.push(STOP);

  // Converte padrão de larguras para sequência de barras e espaços (1 = preto, 0 = branco)
  let binary = "";
  for (const val of values) {
    const pattern = CODE128_PATTERNS[val] || "212222";
    let isBar = true;
    for (const char of pattern) {
      const width = parseInt(char, 10);
      binary += (isBar ? "1" : "0").repeat(width);
      isBar = !isBar;
    }
  }
  return binary;
}

// ---------------------------------------------------------------------------
// Renderizador SVG Vetorial
// ---------------------------------------------------------------------------

export interface BarcodeRenderOptions {
  width?: number;
  height?: number;
  showText?: boolean;
  barColor?: string;
  textColor?: string;
}

export function generateBarcodeSVG(
  text: string,
  options: BarcodeRenderOptions = {}
): string {
  const {
    height = 50,
    showText = true,
    // design-lint-ignore DL-01 reason:"Cor preta padrao SVG para contraste de scanner otico de codigo de barras" expiry:"2027-12-31"
    barColor = "#000000",
    // design-lint-ignore DL-01 reason:"Cor preta padrao SVG para legibilidade de texto em etiquetas termicas" expiry:"2027-12-31"
    textColor = "#000000",
  } = options;

  const cleanText = text.trim() || "000000000000";
  const binary = encodeCode128B(cleanText);

  const barWidth = 1.5;
  const totalWidth = binary.length * barWidth;
  const svgHeight = showText ? height + 16 : height;

  let rects = "";
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === "1") {
      const x = i * barWidth;
      rects += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="${barColor}" />`;
    }
  }

  const textElement = showText
    ? `<text x="${totalWidth / 2}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="600" fill="${textColor}">${cleanText}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="100%" height="100%">${rects}${textElement}</svg>`;
}
