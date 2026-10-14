/**
 * voucher.functions.ts — Camada de Server Functions Canônicas de Vouchers (Waesy Turismo)
 * 
 * Re-exporta e unifica todas as funções de ciclo de vida e vouchers de viagem
 * com 100% de desestruturação de parâmetros (Invariante B.25) e garantia de
 * idempotência/deduplicação atômica (Zero Math.random, Zero Race Conditions).
 */

export * from './travel-vouchers.functions';
export * from './travel-lifecycle.functions';
