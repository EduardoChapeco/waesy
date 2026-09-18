/**
 * master-catalog.functions.ts — BFF para Busca no Catálogo Mestre de Produtos & Inteligência Fiscal
 * Oferece auto-complete de produtos, preenchimento de NCM, CEST, IBS e CBS em 1 clique.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import {
  GLOBAL_MASTER_PRODUCTS_CATALOG,
  MasterProductRecord,
} from "@/lib/data/master-products-catalog";

const searchMasterProductsSchema = z.object({
  query: z.string().optional().default(""),
  barcode: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional().default(20),
});

export const searchMasterCatalogProducts = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchMasterProductsSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, barcode, category, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();
    const cleanBarcode = (barcode || "").trim();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("global_master_catalog").select("*").limit(limit);

      if (cleanBarcode) {
        dbQuery = dbQuery.eq("barcode_ean", cleanBarcode);
      } else {
        if (category) {
          dbQuery = dbQuery.eq("category", category);
        }
        if (cleanQuery) {
          dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,brand_name.ilike.%${cleanQuery}%,ncm_code.ilike.%${cleanQuery}%`);
        }
      }

      const { data: dbProducts, error } = await dbQuery;

      if (!error && dbProducts && dbProducts.length > 0) {
        return {
          products: dbProducts as MasterProductRecord[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_MASTER_PRODUCTS_CATALOG;

    if (cleanBarcode) {
      filtered = filtered.filter((p) => p.barcode_ean === cleanBarcode);
    } else {
      if (category) {
        filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
      if (cleanQuery) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(cleanQuery) ||
            p.brand_name.toLowerCase().includes(cleanQuery) ||
            p.ncm_code.includes(cleanQuery) ||
            p.barcode_ean.includes(cleanQuery) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(cleanQuery))
        );
      }
    }

    return {
      products: filtered.slice(0, limit),
      source: "master_catalog_memory" as const,
    };
  });

const lookupNcmSchema = z.object({
  query: z.string().optional().default(""),
  ncmCode: z.string().optional(),
});

export const lookupNcmTributes = createServerFn({ method: "GET" })
  .validator((data: unknown) => lookupNcmSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, ncmCode } = data;
    const cleanQuery = (query || "").trim().toLowerCase();
    const cleanNcm = (ncmCode || "").replace(/\D/g, "");

    // Amostra representativa das classificações NCM mais frequentes no varejo nacional
    const NCM_KNOWLEDGE_BASE = [
      { ncm: "1006.30.21", cest: "17.001.00", desc: "Arroz polido ou brunido de grão longo", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "0713.33.19", cest: "17.002.00", desc: "Feijão preto em grãos secos", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "0901.21.00", cest: "17.005.00", desc: "Café torrado não descafeinado", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "1701.99.00", cest: "17.011.00", desc: "Açúcar refinado de cana", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "1507.90.11", cest: "17.014.00", desc: "Óleo de soja refinado em recipientes até 5 litros", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "0401.20.10", cest: "17.018.00", desc: "Leite UHT integral", ibs: 0.0, cbs: 0.0, is_exempt: true },
      { ncm: "2202.10.00", cest: "03.007.00", desc: "Águas minerais gaseificadas e refrigerantes", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "2203.00.00", cest: "03.001.00", desc: "Cervejas de malte", ibs: 18.0, cbs: 9.0, is_exempt: false },
      { ncm: "3402.50.00", cest: "11.001.00", desc: "Preparações para lavagem de roupas (sabão/detergente)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "4818.10.00", cest: "11.006.00", desc: "Papel higiênico em rolos", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "3306.10.00", cest: "20.001.00", desc: "Dentifrícios (cremes dentais)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "4802.56.10", cest: "19.001.00", desc: "Papel cortado no formato A4 (sulfite)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "8544.42.00", cest: "21.011.00", desc: "Condutores elétricos munidos de peças de conexão (cabos)", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "8518.30.00", cest: "21.015.00", desc: "Fones de ouvido mesmo combinados com microfone", ibs: 15.5, cbs: 8.8, is_exempt: false },
      { ncm: "8471.60.53", cest: "21.020.00", desc: "Dispositivos de entrada de dados (mouses ópticos e sem fio)", ibs: 15.5, cbs: 8.8, is_exempt: false },
    ];

    let results = NCM_KNOWLEDGE_BASE;

    if (cleanNcm) {
      results = results.filter((item) => item.ncm.replace(/\D/g, "").includes(cleanNcm));
    } else if (cleanQuery) {
      results = results.filter((item) =>
        item.desc.toLowerCase().includes(cleanQuery) || item.ncm.includes(cleanQuery)
      );
    }

    return {
      tributes: results,
      total: results.length,
    };
  });
