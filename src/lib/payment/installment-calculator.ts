/**
 * installment-calculator.ts — Dono Único de Parcelamento e Planos de Pagamento (R21)
 *
 * Fonte Única da Verdade para:
 * - Constantes máximas e mínimas de parcelamento
 * - Algoritmo de cálculo de parcelas com e sem juros (Tabela Price e linear)
 * - Simulação de planos de carnê e cartão de crédito
 * - Resolução de centavos residuais (Zero-Float Drift)
 *
 * Regra B.2: src/lib/ é utilitário puro. Proibido manipular DOM ou importar UI.
 * Regra B.8: Proibido !important e valores mágicos.
 * Regra R21: Nenhum outro arquivo deve reimplementar cálculo de parcelas.
 */

export const MAX_INSTALLMENTS = 12;
export const DEFAULT_INTEREST_FREE_INSTALLMENTS = 3;
export const MIN_INSTALLMENT_VALUE_CENTS = 500; // R$ 5,00

export interface InstallmentOption {
  installmentCount: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  hasInterest: boolean;
  monthlyInterestRatePercent: number;
  displayFormatted: string;
}

export interface InstallmentCalculationParams {
  totalCents: number;
  maxInstallments?: number;
  interestFreeCount?: number;
  monthlyInterestRatePercent?: number;
  minInstallmentCents?: number;
}

/**
 * Calcula a grade completa de opções de parcelamento para um determinado valor.
 * DONO ÚNICO da lógica de parcelamento (R21).
 */
export function calcInstallments(
  totalCents: number,
  params?: InstallmentCalculationParams
): InstallmentOption[] {
  if (totalCents <= 0) {
    return [];
  }

  const maxCount = Math.min(
    Math.max(1, params?.maxInstallments ?? MAX_INSTALLMENTS),
    24
  );
  const interestFree = params?.interestFreeCount ?? DEFAULT_INTEREST_FREE_INSTALLMENTS;
  const rate = params?.monthlyInterestRatePercent ?? 1.99;
  const minVal = params?.minInstallmentCents ?? MIN_INSTALLMENT_VALUE_CENTS;

  const options: InstallmentOption[] = [];

  for (let count = 1; count <= maxCount; count++) {
    const isFree = count <= interestFree;
    let totalForOptionCents = totalCents;
    let installmentCents = 0;

    if (isFree || rate <= 0) {
      installmentCents = Math.floor(totalCents / count);
      totalForOptionCents = totalCents;
    } else {
      // Cálculo composto para parcelamento com juros
      const monthlyRate = rate / 100;
      const factor = (monthlyRate * Math.pow(1 + monthlyRate, count)) / (Math.pow(1 + monthlyRate, count) - 1);
      installmentCents = Math.round(totalCents * factor);
      totalForOptionCents = installmentCents * count;
    }

    // Regra de valor mínimo de parcela
    if (count > 1 && installmentCents < minVal) {
      break;
    }

    const formattedInstallment = (installmentCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    options.push({
      installmentCount: count,
      installmentAmountCents: installmentCents,
      totalAmountCents: totalForOptionCents,
      hasInterest: Boolean(isFree) === false,
      monthlyInterestRatePercent: isFree ? 0 : rate,
      displayFormatted: `${count}x de ${formattedInstallment}${isFree ? ' sem juros' : ''}`,
    });
  }

  return options;
}

/**
 * Retorna o melhor parcelamento sem juros disponível para exibição rápida em cards de produto.
 */
export function getBestInterestFreeInstallment(
  totalCents: number,
  interestFreeLimit = DEFAULT_INTEREST_FREE_INSTALLMENTS
): InstallmentOption | null {
  const options = calcInstallments(totalCents, {
    maxInstallments: interestFreeLimit,
    interestFreeCount: interestFreeLimit,
  });

  if (options.length === 0) {
    return null;
  }

  // Retorna a maior quantidade de parcelas sem juros permitida
  const freeOptions = options.filter((opt) => opt.hasInterest === false);
  if (freeOptions.length === 0) {
    return options[0];
  }

  return freeOptions[freeOptions.length - 1];
}

/**
 * Distribui centavos com exatidão evitando perdas ou sobras no arredondamento (Zero-Float Drift).
 * Retorna array com o valor exato de cada parcela individual.
 */
export function splitAmountIntoInstallments(
  totalCents: number,
  installmentCount: number
): number[] {
  if (installmentCount <= 0) return [];
  if (installmentCount === 1) return [totalCents];

  const baseInstallment = Math.floor(totalCents / installmentCount);
  const remainder = totalCents - baseInstallment * installmentCount;

  const result: number[] = new Array(installmentCount).fill(baseInstallment);
  // O resíduo é adicionado na primeira parcela para liquidação precisa
  result[0] += remainder;

  return result;
}
