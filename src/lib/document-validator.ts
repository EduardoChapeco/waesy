/**
 * document-validator.ts — Validação Estrita de Documentos Brasileiros (CPF / CNPJ)
 * Implementa algoritmo Mod-11 oficial da Receita Federal do Brasil.
 *
 * Utilizado em validações Zod, Server Functions e proteção KYC.
 */

/**
 * Remove todos os caracteres não-numéricos de uma string.
 */
export function cleanDocument(val?: string | null): string {
 if (!val) return "";
 return val.replace(/\D/g, "");
}

/**
 * Valida se um CPF é estruturalmente válido segundo o algoritmo Módulo 11 oficial.
 * Rejeita dígitos repetidos (ex: 111.111.111-11) e tamanhos inválidos.
 */
export function validateCpfMod11(rawCpf?: string | null): boolean {
 const cpf = cleanDocument(rawCpf);

 if (cpf.length !== 11) return false;

 // Rejeita sequências de dígitos iguais
 if (/^(\d)\1{10}$/.test(cpf)) return false;

 // Primeiro dígito verificador
 let sum = 0;
 for (let i = 0; i < 9; i++) {
 sum += parseInt(cpf.charAt(i), 10) * (10 - i);
 }
 let rev = 11 - (sum % 11);
 if (rev === 10 || rev === 11) rev = 0;
 if (rev !== parseInt(cpf.charAt(9), 10)) return false;

 // Segundo dígito verificador
 sum = 0;
 for (let i = 0; i < 10; i++) {
 sum += parseInt(cpf.charAt(i), 10) * (11 - i);
 }
 rev = 11 - (sum % 11);
 if (rev === 10 || rev === 11) rev = 0;
 if (rev !== parseInt(cpf.charAt(10), 10)) return false;

 return true;
}

/**
 * Valida se um CNPJ é estruturalmente válido segundo o algoritmo Módulo 11 oficial.
 */
export function validateCnpjMod11(rawCnpj?: string | null): boolean {
 const cnpj = cleanDocument(rawCnpj);

 if (cnpj.length !== 14) return false;

 // Rejeita sequências de dígitos iguais
 if (/^(\d)\1{13}$/.test(cnpj)) return false;

 // Primeiro dígito verificador
 let size = cnpj.length - 2;
 let numbers = cnpj.substring(0, size);
 const digits = cnpj.substring(size);
 let sum = 0;
 let pos = size - 7;

 for (let i = size; i >= 1; i--) {
 sum += parseInt(numbers.charAt(size - i), 10) * pos--;
 if (pos < 2) pos = 9;
 }

 let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
 if (result !== parseInt(digits.charAt(0), 10)) return false;

 // Segundo dígito verificador
 size = size + 1;
 numbers = cnpj.substring(0, size);
 sum = 0;
 pos = size - 7;

 for (let i = size; i >= 1; i--) {
 sum += parseInt(numbers.charAt(size - i), 10) * pos--;
 if (pos < 2) pos = 9;
 }

 result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
 if (result !== parseInt(digits.charAt(1), 10)) return false;

 return true;
}

/**
 * Formata um CPF no padrão 000.000.000-00.
 */
export function formatCpf(val?: string | null): string {
 const clean = cleanDocument(val);
 if (clean.length !== 11) return val || "";
 return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata um CNPJ no padrão 00.000.000/0000-00.
 */
export function formatCnpj(val?: string | null): string {
  const clean = cleanDocument(val);
  if (clean.length !== 14) return val || "";
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Valida formato e intervalo de data de nascimento, calculando idade e checando maioridade opcional.
 * Suporta formatos ISO (YYYY-MM-DD) e brasileiro (DD/MM/YYYY).
 */
export function validateBirthDate(
  val?: string | null,
  options?: { minAge?: number; maxAge?: number }
): { isValid: boolean; age?: number; error?: string } {
  if (!val || typeof val !== "string" || !val.trim()) {
    return { isValid: false, error: "Data de nascimento não informada." };
  }

  const raw = val.trim();
  let day: number, month: number, year: number;

  if (raw.includes("-")) {
    // Formato ISO: YYYY-MM-DD
    const parts = raw.split("-");
    if (parts.length !== 3) return { isValid: false, error: "Formato de data inválido." };
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (raw.includes("/")) {
    // Formato BR: DD/MM/YYYY
    const parts = raw.split("/");
    if (parts.length !== 3) return { isValid: false, error: "Formato de data inválido." };
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // 8 dígitos numéricos: DDMMAAAA
    const clean = raw.replace(/\D/g, "");
    if (clean.length !== 8) return { isValid: false, error: "Data incompleta." };
    day = parseInt(clean.slice(0, 2), 10);
    month = parseInt(clean.slice(2, 4), 10);
    year = parseInt(clean.slice(4, 8), 10);
  }

  // Validação do intervalo do calendário
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { isValid: false, error: "Data inválida." };
  }

  if (month < 1 || month > 12) {
    return { isValid: false, error: "Mês inválido (1-12)." };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { isValid: false, error: `Dia inválido para o mês informado (máx ${daysInMonth}).` };
  }

  const birthDate = new Date(year, month - 1, day);
  const now = new Date();

  if (birthDate > now) {
    return { isValid: false, error: "A data de nascimento não pode estar no futuro." };
  }

  // Cálculo da idade precisa
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  const minAge = options?.minAge ?? 0;
  const maxAge = options?.maxAge ?? 125;

  if (age < minAge) {
    return {
      isValid: false,
      age,
      error: `Idade mínima de ${minAge} anos necessária (idade atual: ${age} anos).`,
    };
  }

  if (age > maxAge) {
    return { isValid: false, age, error: "Data de nascimento fora do intervalo plausível." };
  }

  return { isValid: true, age };
}

/**
 * Valida se um CEP é estruturalmente válido (8 dígitos numéricos).
 */
export function validateCep(rawCep?: string | null): boolean {
  if (!rawCep) return false;
  const clean = rawCep.replace(/\D/g, "");
  return clean.length === 8;
}

/**
 * Formata um CEP no padrão 00000-000.
 */
export function formatCep(val?: string | null): string {
  if (!val) return "";
  const clean = val.replace(/\D/g, "");
  if (clean.length < 5) return clean;
  if (clean.length <= 8) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

/**
 * Formata telefone/celular nacional no padrão (00) 00000-0000 ou (00) 0000-0000.
 */
export function formatPhone(val?: string | null): string {
  if (!val) return "";
  const clean = val.replace(/\D/g, "");
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

/**
 * Máscara progressiva para CPF conforme o usuário digita (ex: 123 -> 123, 1234 -> 123.4, 12345678901 -> 123.456.789-01).
 */
export function maskCpfProgressive(val?: string | null): string {
  const clean = cleanDocument(val).slice(0, 11);
  if (!clean) return "";
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

/**
 * Máscara progressiva para CNPJ conforme o usuário digita (ex: 12345678000190 -> 12.345.678/0001-90).
 */
export function maskCnpjProgressive(val?: string | null): string {
  const clean = cleanDocument(val).slice(0, 14);
  if (!clean) return "";
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
}

/**
 * Máscara dinâmica que alterna suavemente entre CPF (até 11 dígitos) e CNPJ (12 a 14 dígitos).
 */
export function maskDocumentProgressive(
  val?: string | null,
  mode: "cpf" | "cnpj" | "dynamic" = "dynamic"
): string {
  const clean = cleanDocument(val);
  if (mode === "cpf") return maskCpfProgressive(clean);
  if (mode === "cnpj") return maskCnpjProgressive(clean);
  // Modo dinâmico: se passar de 11 dígitos, transiciona imediatamente para CNPJ
  if (clean.length > 11) {
    return maskCnpjProgressive(clean);
  }
  return maskCpfProgressive(clean);
}

/**
 * Formata placa de veículo (Padrão Tradicional ABC-1234 ou Mercosul ABC1D23).
 */
export function maskPlate(val?: string | null): string {
  if (!val) return "";
  const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  if (clean.length <= 3) return clean;

  // Se o 5º caractere for número (índice 4), formato tradicional (ABC-1234)
  // Se for letra, padrão Mercosul (ABC1D23)
  const char4 = clean[4];
  if (char4 && /[0-9]/.test(char4)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  if (clean.length > 3 && clean.length <= 4) {
    return clean;
  }
  return clean;
}

/**
 * Valida se uma placa é válida pelo padrão tradicional (ABC-1234) ou Mercosul (ABC1D23).
 */
export function validatePlate(val?: string | null): boolean {
  if (!val) return false;
  const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length !== 7) return false;

  const traditionalRegex = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return traditionalRegex.test(clean) || mercosulRegex.test(clean);
}

export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "unknown";

/**
 * Detecta a bandeira do cartão de crédito através dos BINs oficiais operantes no Brasil.
 */
export function detectCardBrand(cardNumber?: string | null): CardBrand {
  if (!cardNumber) return "unknown";
  const clean = cardNumber.replace(/\D/g, "");
  if (!clean) return "unknown";

  // Elo (BINs específicos no Brasil)
  const eloPrefixes = [
    "401178", "401179", "438935", "457631", "457632", "504175",
    "627780", "636297", "636368"
  ];
  if (eloPrefixes.some((p) => clean.startsWith(p))) return "elo";
  const eloRanges = [
    [506699, 506778], [509000, 509999], [650031, 650033], [650035, 650051],
    [650405, 650439], [650485, 650538], [650541, 650598], [650700, 650718],
    [650720, 650727], [650901, 650978], [651652, 651679], [655000, 655019],
    [655021, 655058]
  ];
  const prefix6 = parseInt(clean.slice(0, 6), 10);
  if (eloRanges.some(([min, max]) => prefix6 >= min && prefix6 <= max)) return "elo";

  // Hipercard
  if (clean.startsWith("606282") || clean.startsWith("3841")) return "hipercard";

  // Amex (34, 37)
  if (clean.startsWith("34") || clean.startsWith("37")) return "amex";

  // Visa (4)
  if (clean.startsWith("4")) return "visa";

  // Mastercard (51-55 ou 2221-2720)
  const prefix2 = parseInt(clean.slice(0, 2), 10);
  const prefix4 = parseInt(clean.slice(0, 4), 10);
  if ((prefix2 >= 51 && prefix2 <= 55) || (prefix4 >= 2221 && prefix4 <= 2720)) {
    return "mastercard";
  }

  return "unknown";
}

/**
 * Máscara progressiva para número de cartão de crédito (agrupamento de 4 em 4 dígitos ou 4-6-5 para Amex).
 */
export function maskCreditCardNumber(val?: string | null): string {
  if (!val) return "";
  const clean = val.replace(/\D/g, "");
  const brand = detectCardBrand(clean);

  if (brand === "amex") {
    // Amex: 4-6-5 (15 dígitos)
    const limited = clean.slice(0, 15);
    if (limited.length <= 4) return limited;
    if (limited.length <= 10) return `${limited.slice(0, 4)} ${limited.slice(4)}`;
    return `${limited.slice(0, 4)} ${limited.slice(4, 10)} ${limited.slice(10)}`;
  }

  // Padrão 16 dígitos: 4-4-4-4
  const limited = clean.slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < limited.length; i += 4) {
    parts.push(limited.slice(i, i + 4));
  }
  return parts.join(" ");
}

/**
 * Máscara para data de validade de cartão (MM/AA).
 */
export function maskCardExpiry(val?: string | null): string {
  if (!val) return "";
  const clean = val.replace(/\D/g, "").slice(0, 4);
  if (clean.length <= 2) return clean;
  return `${clean.slice(0, 2)}/${clean.slice(2)}`;
}
