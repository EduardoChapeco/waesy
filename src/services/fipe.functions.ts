/**
 * fipe.functions.ts — Integração Canônica com Cache da Tabela FIPE (Cluster 5)
 * Tabela: classified_vehicle_fipe_cache
 * NORMAS: AGENTS.md (B.1 a B.41), Zero Mocks, Cache Inteligente
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

export interface FipeVehicleQuoteDTO {
  id?: string;
  fipeCode: string;
  brand: string;
  model: string;
  modelYear: number;
  fuelType: string;
  referenceMonth: string;
  priceCents: number;
  rawPayload?: Record<string, any>;
}

export const getCachedFipeVehicle = createServerFn({ method: "GET" })
  .validator(
    z.object({
      fipeCode: z.string().min(1),
      modelYear: z.number().int(),
      referenceMonth: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<FipeVehicleQuoteDTO | null> => {
    const supabase = getServerClient();
    const currentMonth =
      data.referenceMonth ||
      new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

    const { data: row, error } = await supabase
      .from("classified_vehicle_fipe_cache")
      .select("*")
      .eq("fipe_code", data.fipeCode.trim())
      .eq("model_year", data.modelYear)
      .eq("reference_month", currentMonth)
      .maybeSingle();

    if (error || !row) {
      return null;
    }

    return {
      id: row.id,
      fipeCode: row.fipe_code,
      brand: row.brand,
      model: row.model,
      modelYear: row.model_year,
      fuelType: row.fuel_type,
      referenceMonth: row.reference_month,
      priceCents: Number(row.price_cents),
      rawPayload: row.raw_payload,
    };
  });

export const cacheFipeVehicle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fipeCode: z.string().min(1),
      brand: z.string().min(1),
      model: z.string().min(1),
      modelYear: z.number().int(),
      fuelType: z.string().default("Gasolina"),
      referenceMonth: z.string().optional(),
      priceCents: z.number().int().min(0),
      rawPayload: z.record(z.any()).default({}),
    })
  )
  .handler(async ({ data }): Promise<FipeVehicleQuoteDTO> => {
    const supabase = getServerClient();
    const currentMonth =
      data.referenceMonth ||
      new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

    const payload = {
      fipe_code: data.fipeCode.trim(),
      brand: data.brand.trim(),
      model: data.model.trim(),
      model_year: data.modelYear,
      fuel_type: data.fuelType,
      reference_month: currentMonth,
      price_cents: data.priceCents,
      raw_payload: data.rawPayload,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from("classified_vehicle_fipe_cache")
      .upsert(payload, { onConflict: "fipe_code,model_year,reference_month" })
      .select()
      .single();

    if (error) {
      throw new Error("Erro ao gravar cotação FIPE em cache: " + error.message);
    }

    return {
      id: upserted.id,
      fipeCode: upserted.fipe_code,
      brand: upserted.brand,
      model: upserted.model,
      modelYear: upserted.model_year,
      fuelType: upserted.fuel_type,
      referenceMonth: upserted.reference_month,
      priceCents: Number(upserted.price_cents),
      rawPayload: upserted.raw_payload,
    };
  });

export const searchFipeCachedVehicles = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    })
  )
  .handler(async ({ data }): Promise<FipeVehicleQuoteDTO[]> => {
    const supabase = getServerClient();
    let q = supabase
      .from("classified_vehicle_fipe_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.query?.trim()) {
      const term = data.query.trim();
      q = q.or(`model.ilike.%${term}%,brand.ilike.%${term}%,fipe_code.ilike.%${term}%`);
    }

    const { data: rows, error } = await q;
    if (error) {
      console.warn("[searchFipeCachedVehicles] Erro:", error.message);
      return [];
    }

    return (rows || []).map((r: any) => ({
      id: r.id,
      fipeCode: r.fipe_code,
      brand: r.brand,
      model: r.model,
      modelYear: r.model_year,
      fuelType: r.fuel_type,
      referenceMonth: r.reference_month,
      priceCents: Number(r.price_cents),
      rawPayload: r.raw_payload,
    }));
  });
