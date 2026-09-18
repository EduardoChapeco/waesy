/**
 * scripts/seed-central-knowledge.ts
 * Ingestão em massa e mineração dos dados do Banco Central da Waesy:
 * 1. Aeroportos Comerciais do Brasil e Hubs Internacionais (airports_global)
 * 2. Catálogo Mestre de Produtos com EAN-13, NCM, CEST e Reforma Tributária IBS/CBS 2026 (global_master_catalog)
 * 3. Referência Fiscal de NCMs e CESTs da Receita Federal (global_ncm_tributes)
 * 4. Banco Hoteleiro Internacional e Grandes Resorts do Brasil (hotels_bank)
 * 5. Modelos de Contratos Jurídicos Avançados com Validade Legal (contract_templates)
 * 6. Catálogo de Veículos, Motos e Utilitários FIPE (vehicles_catalog)
 * 7. Catálogo Nacional de Serviços Regulamentados LC 116/03 & NBS (services_master_catalog)
 * 8. Municípios e Cidades do Brasil com IBGE e DDD (cities_global)
 * 9. Instituições Financeiras do Brasil - BACEN / COMPE / ISPB / PIX (financial_institutions_catalog)
 * 10. Países, Moedas e DDI Internacional ISO 3166 / ISO 4217 (countries_currencies_catalog)
 */

import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { GLOBAL_AIRPORTS_CATALOG } from "../src/lib/data/airports-catalog";
import { GLOBAL_MASTER_PRODUCTS_CATALOG } from "../src/lib/data/master-products-catalog";
import { GLOBAL_HOTELS_RESORTS_CATALOG } from "../src/lib/data/hotels-resorts-catalog";
import { ADVANCED_CONTRACT_TEMPLATES } from "../src/lib/data/advanced-contract-templates";
import { GLOBAL_VEHICLES_CATALOG } from "../src/lib/data/vehicles-catalog";
import { GLOBAL_SERVICES_CATALOG } from "../src/lib/data/services-catalog";
import { GLOBAL_BRAZIL_CITIES_CATALOG } from "../src/lib/data/cities-brazil-catalog";
import { GLOBAL_FINANCIAL_INSTITUTIONS_CATALOG } from "../src/lib/data/financial-institutions-catalog";
import { GLOBAL_COUNTRIES_CATALOG } from "../src/lib/data/countries-catalog";
import { GLOBAL_AIRLINES_CATALOG, GLOBAL_CRUISES_CATALOG } from "../src/lib/data/airlines-cruises-catalog";
import { GLOBAL_CNAE_CATALOG } from "../src/lib/data/cnae-catalog";
import { GLOBAL_HEALTH_INSURANCE_CATALOG } from "../src/lib/data/health-insurance-catalog";
import { GLOBAL_SHIPPING_CARRIERS_CATALOG } from "../src/lib/data/shipping-carriers-catalog";
import { GLOBAL_UNITS_OF_MEASURE_CATALOG } from "../src/lib/data/units-of-measure-catalog";
import { GLOBAL_PAYMENT_METHODS_CATALOG } from "../src/lib/data/payment-methods-catalog";
import { GLOBAL_REAL_ESTATE_TYPES_CATALOG } from "../src/lib/data/real-estate-types-catalog";
import { GLOBAL_HOLIDAYS_CATALOG } from "../src/lib/data/holidays-calendar-catalog";
import { GLOBAL_PROFESSIONS_CATALOG } from "../src/lib/data/professions-catalog";
import { GLOBAL_ON_DEMAND_SERVICES_CATALOG } from "../src/lib/data/services-catalog";
import { IBGE_ECONOMIC_CLASSES } from "../src/lib/data/ibge-demographics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretsPath = path.resolve(__dirname, "../.env.secrets");
let dbPassword = process.env.SUPABASE_DB_PASSWORD || "";
if (fs.existsSync(secretsPath)) {
  const content = fs.readFileSync(secretsPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("SUPABASE_DB_PASSWORD=")) {
      dbPassword = trimmed.replace("SUPABASE_DB_PASSWORD=", "").replace(/["']/g, "").trim();
    }
  }
}

if (!dbPassword) {
  dbPassword = "EEaR6399!@#2026";
}

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function runSeed() {
  console.log("==================================================================");
  console.log("  INICIANDO INGESTÃO DO BANCO CENTRAL DE DADOS DA WAESY (10 BASES)");
  console.log("==================================================================");

  try {
    // ── 1. AEROPORTOS GLOBAIS & REGIONAIS ──
    console.log(`\n[1/10] Inserindo ${GLOBAL_AIRPORTS_CATALOG.length} aeroportos globais e regionais...`);
    let airportsInserted = 0;
    for (const a of GLOBAL_AIRPORTS_CATALOG) {
      await sql`
        INSERT INTO public.airports_global (
          iata_code, icao_code, name, city, state_province, country, country_code,
          latitude, longitude, timezone, is_commercial
        ) VALUES (
          ${a.iata_code}, ${a.icao_code || null}, ${a.name}, ${a.city}, ${a.state_province || null},
          ${a.country}, ${a.country_code}, ${a.latitude || null}, ${a.longitude || null},
          ${a.timezone || 'America/Sao_Paulo'}, ${a.is_commercial}
        )
        ON CONFLICT (iata_code) DO UPDATE SET
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          state_province = EXCLUDED.state_province,
          country = EXCLUDED.country,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          timezone = EXCLUDED.timezone;
      `;
      airportsInserted++;
    }
    console.log(`  ✓ ${airportsInserted} aeroportos consolidados com sucesso!`);

    // ── 2. CATÁLOGO MESTRE DE PRODUTOS & TRIBUTOS (REFORMA 2026) ──
    console.log(`\n[2/10] Inserindo ${GLOBAL_MASTER_PRODUCTS_CATALOG.length} produtos no catálogo central...`);
    let productsInserted = 0;
    for (const p of GLOBAL_MASTER_PRODUCTS_CATALOG) {
      const subcat = p.subcategory || null;
      const cest = p.cest_code || null;
      const desc = p.description || null;
      const unit = p.unit_of_measure || 'UN';
      const taxGroup = p.tax_tribute_group || 'tributado_integralmente';

      await sql`
        INSERT INTO public.global_master_catalog (
          barcode_ean, name, brand_name, category, subcategory, ncm_code, cest_code,
          suggested_price_cents, unit_of_measure, image_urls, description, ibs_rate, cbs_rate,
          cfop_default, tax_tribute_group, is_verified
        ) VALUES (
          ${p.barcode_ean}, ${p.name}, ${p.brand_name}, ${p.category}, ${subcat},
          ${p.ncm_code}, ${cest}, ${p.suggested_price_cents}, ${unit},
          ${p.image_urls || []}, ${desc}, ${p.ibs_rate}, ${p.cbs_rate},
          ${p.cfop_default}, ${taxGroup}, true
        )
        ON CONFLICT (barcode_ean) DO UPDATE SET
          name = EXCLUDED.name,
          brand_name = EXCLUDED.brand_name,
          category = EXCLUDED.category,
          ncm_code = EXCLUDED.ncm_code,
          cest_code = EXCLUDED.cest_code,
          suggested_price_cents = EXCLUDED.suggested_price_cents,
          ibs_rate = EXCLUDED.ibs_rate,
          cbs_rate = EXCLUDED.cbs_rate,
          cfop_default = EXCLUDED.cfop_default,
          tax_tribute_group = EXCLUDED.tax_tribute_group,
          image_urls = EXCLUDED.image_urls;
      `;
      productsInserted++;
    }
    console.log(`  ✓ ${productsInserted} produtos do catálogo mestre consolidados com sucesso!`);

    // ── 3. REFERÊNCIA FISCAL NCM / CEST DA RECEITA FEDERAL ──
    console.log(`\n[3/10] Alimentando tabela global_ncm_tributes com inteligência fiscal...`);
    let ncmInserted = 0;
    for (const p of GLOBAL_MASTER_PRODUCTS_CATALOG) {
      const cest = p.cest_code || null;
      const desc = p.description || p.name;
      const isST = p.tax_tribute_group === 'substituicao_tributaria';

      await sql`
        INSERT INTO public.global_ncm_tributes (
          ncm_code, cest_code, description, category_name,
          ibs_rate, cbs_rate, is_tax_substituted
        ) VALUES (
          ${p.ncm_code}, ${cest}, ${desc}, ${p.category},
          ${p.ibs_rate}, ${p.cbs_rate}, ${isST}
        )
        ON CONFLICT (ncm_code) DO UPDATE SET
          ibs_rate = EXCLUDED.ibs_rate,
          cbs_rate = EXCLUDED.cbs_rate,
          is_tax_substituted = EXCLUDED.is_tax_substituted,
          description = EXCLUDED.description;
      `;
      ncmInserted++;
    }
    console.log(`  ✓ ${ncmInserted} códigos NCM de referência registrados!`);

    // ── 4. BANCO HOTELEIRO & GRANDES RESORTS ──
    console.log(`\n[4/10] Inserindo ${GLOBAL_HOTELS_RESORTS_CATALOG.length} hotéis e resorts no banco central...`);
    let hotelsInserted = 0;
    for (const h of GLOBAL_HOTELS_RESORTS_CATALOG) {
      const cover = h.cover_photo_url || (h.photos && h.photos[0]) || null;
      const web = h.website || null;
      const phone = h.phone || null;

      await sql`
        INSERT INTO public.hotels_bank (
          name, city, state, country, stars, regime_options,
          description, bio_bullets, highlights, badges, photos,
          cover_photo_url, website, phone, internal_rating, is_active
        ) VALUES (
          ${h.name}, ${h.city}, ${h.state}, ${h.country}, ${h.stars || 4},
          ${h.regime_options || ['All Inclusive']}, ${h.description}, ${h.bio_bullets || []},
          ${sql.json(h.bio_bullets || [])}, ${h.badges || []}, ${h.photos || []},
          ${cover}, ${web}, ${phone}, ${h.internal_rating || 4.8}, true
        )
        ON CONFLICT DO NOTHING;
      `;
      hotelsInserted++;
    }
    console.log(`  ✓ ${hotelsInserted} hotéis e resorts consolidados com sucesso!`);

    // ── 5. MODELOS DE CONTRATOS JURÍDICOS AVANÇADOS ──
    console.log(`\n[5/10] Inserindo ${ADVANCED_CONTRACT_TEMPLATES.length} minutas jurídicas avançadas...`);
    try {
      await sql`ALTER TABLE public.contract_templates DROP CONSTRAINT IF EXISTS contract_templates_category_check;`;
    } catch {}

    let contractsInserted = 0;
    for (const t of ADVANCED_CONTRACT_TEMPLATES) {
      await sql`
        INSERT INTO public.contract_templates (
          title, category, description,
          clauses, variables_schema, legal_framework, is_active
        ) VALUES (
          ${t.title}, ${t.category}, ${t.summary},
          ${sql.json(t.clauses as any)}, ${sql.json(t.variables_schema as any)},
          ${t.legal_framework}, true
        )
        ON CONFLICT DO NOTHING;
      `;
      contractsInserted++;
    }
    console.log(`  ✓ ${contractsInserted} modelos de contratos registrados no hub jurídico!`);

    // ── 6. VEÍCULOS, UTILITÁRIOS E MOTOCICLETAS (FIPE) ──
    console.log(`\n[6/10] Inserindo ${GLOBAL_VEHICLES_CATALOG.length} veículos e motocicletas...`);
    let vehiclesInserted = 0;
    for (const v of GLOBAL_VEHICLES_CATALOG) {
      await sql`
        INSERT INTO public.vehicles_catalog (
          model_id, brand, model, category, fuel_types, transmission_options,
          engine_options, year_range, average_market_value_cents, fipe_code_prefix,
          doors, popular_features, image_url
        ) VALUES (
          ${v.id}, ${v.brand}, ${v.model}, ${v.category},
          ${v.fuel_types || []}, ${v.transmission_options || []}, ${v.engine_options || []},
          ${v.year_range}, ${v.average_market_value_cents}, ${v.fipe_code_prefix || null},
          ${v.doors}, ${v.popular_features || []}, ${v.image_url || null}
        )
        ON CONFLICT (model_id) DO UPDATE SET
          brand = EXCLUDED.brand,
          model = EXCLUDED.model,
          category = EXCLUDED.category,
          fuel_types = EXCLUDED.fuel_types,
          transmission_options = EXCLUDED.transmission_options,
          engine_options = EXCLUDED.engine_options,
          year_range = EXCLUDED.year_range,
          average_market_value_cents = EXCLUDED.average_market_value_cents,
          fipe_code_prefix = EXCLUDED.fipe_code_prefix,
          popular_features = EXCLUDED.popular_features,
          image_url = EXCLUDED.image_url;
      `;
      vehiclesInserted++;
    }
    console.log(`  ✓ ${vehiclesInserted} veículos e motos consolidados no banco automotivo!`);

    // ── 7. SERVIÇOS REGULAMENTADOS (LC 116/03 & NBS) ──
    console.log(`\n[7/10] Inserindo ${GLOBAL_SERVICES_CATALOG.length} serviços regulamentados...`);
    let servicesInserted = 0;
    for (const s of GLOBAL_SERVICES_CATALOG) {
      await sql`
        INSERT INTO public.services_master_catalog (
          service_id, code_lc116, name, category, description,
          cnae_principal, nbs_code, iss_suggested_rate, ibs_rate, cbs_rate,
          requires_technical_manager, regulatory_body, keywords
        ) VALUES (
          ${s.id}, ${s.code_lc116}, ${s.name}, ${s.category}, ${s.description},
          ${s.cnae_principal}, ${s.nbs_code || null}, ${s.iss_suggested_rate},
          ${s.ibs_rate}, ${s.cbs_rate}, ${s.requires_technical_manager},
          ${s.regulatory_body || null}, ${s.keywords || []}
        )
        ON CONFLICT (service_id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          cnae_principal = EXCLUDED.cnae_principal,
          nbs_code = EXCLUDED.nbs_code,
          iss_suggested_rate = EXCLUDED.iss_suggested_rate,
          ibs_rate = EXCLUDED.ibs_rate,
          cbs_rate = EXCLUDED.cbs_rate,
          regulatory_body = EXCLUDED.regulatory_body,
          keywords = EXCLUDED.keywords;
      `;
      servicesInserted++;
    }
    console.log(`  ✓ ${servicesInserted} serviços regulamentados consolidados com sucesso!`);

    // ── 8. CIDADES E MUNICÍPIOS DO BRASIL (IBGE) ──
    console.log(`\n[8/10] Inserindo ${GLOBAL_BRAZIL_CITIES_CATALOG.length} municípios e polos do Brasil...`);
    let citiesInserted = 0;
    for (const c of GLOBAL_BRAZIL_CITIES_CATALOG) {
      await sql`
        INSERT INTO public.cities_global (
          ibge_code, name, state, region, ddd,
          nearest_airport_iata, latitude, longitude,
          is_tourism_hub, is_state_capital, country, country_code
        ) VALUES (
          ${c.ibge_code}, ${c.name}, ${c.state}, ${c.region}, ${c.ddd},
          ${c.nearest_airport_iata || null}, ${c.latitude || null}, ${c.longitude || null},
          ${c.is_tourism_hub}, ${c.is_state_capital}, 'Brasil', 'BR'
        )
        ON CONFLICT (ibge_code) DO UPDATE SET
          name = EXCLUDED.name,
          state = EXCLUDED.state,
          region = EXCLUDED.region,
          ddd = EXCLUDED.ddd,
          nearest_airport_iata = EXCLUDED.nearest_airport_iata,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          is_tourism_hub = EXCLUDED.is_tourism_hub,
          is_state_capital = EXCLUDED.is_state_capital;
      `;
      citiesInserted++;
    }
    console.log(`  ✓ ${citiesInserted} cidades cadastradas no banco geográfico!`);

    // ── 9. INSTITUIÇÕES FINANCEIRAS (BACEN / COMPE / ISPB) ──
    console.log(`\n[9/10] Inserindo ${GLOBAL_FINANCIAL_INSTITUTIONS_CATALOG.length} instituições financeiras do Brasil...`);
    let banksInserted = 0;
    for (const b of GLOBAL_FINANCIAL_INSTITUTIONS_CATALOG) {
      await sql`
        INSERT INTO public.financial_institutions_catalog (
          compe_code, ispb_code, short_name, legal_name,
          institution_type, supports_pix, supports_ted, is_popular
        ) VALUES (
          ${b.compe_code}, ${b.ispb_code}, ${b.short_name}, ${b.legal_name},
          ${b.type}, ${b.supports_pix}, ${b.supports_ted}, ${b.is_popular}
        )
        ON CONFLICT (compe_code) DO UPDATE SET
          ispb_code = EXCLUDED.ispb_code,
          short_name = EXCLUDED.short_name,
          legal_name = EXCLUDED.legal_name,
          institution_type = EXCLUDED.institution_type,
          supports_pix = EXCLUDED.supports_pix,
          supports_ted = EXCLUDED.supports_ted,
          is_popular = EXCLUDED.is_popular;
      `;
      banksInserted++;
    }
    console.log(`  ✓ ${banksInserted} instituições financeiras consolidadas no hub bancário!`);

    // ── 10. PAÍSES, MOEDAS E DDI (ISO 3166 / ISO 4217) ──
    console.log(`\n[10/10] Inserindo ${GLOBAL_COUNTRIES_CATALOG.length} países e moedas internacionais...`);
    let countriesInserted = 0;
    for (const co of GLOBAL_COUNTRIES_CATALOG) {
      await sql`
        INSERT INTO public.countries_currencies_catalog (
          iso_alpha2, iso_alpha3, numeric_code, name_pt, name_en,
          currency_code, currency_symbol, currency_name,
          phone_ddi, continent, capital, timezones
        ) VALUES (
          ${co.iso_alpha2}, ${co.iso_alpha3}, ${co.numeric_code}, ${co.name_pt}, ${co.name_en},
          ${co.currency_code}, ${co.currency_symbol}, ${co.currency_name},
          ${co.phone_ddi}, ${co.continent}, ${co.capital}, ${co.timezones || []}
        )
        ON CONFLICT (iso_alpha2) DO UPDATE SET
          iso_alpha3 = EXCLUDED.iso_alpha3,
          numeric_code = EXCLUDED.numeric_code,
          name_pt = EXCLUDED.name_pt,
          name_en = EXCLUDED.name_en,
          currency_code = EXCLUDED.currency_code,
          currency_symbol = EXCLUDED.currency_symbol,
          currency_name = EXCLUDED.currency_name,
          phone_ddi = EXCLUDED.phone_ddi,
          continent = EXCLUDED.continent,
          capital = EXCLUDED.capital,
          timezones = EXCLUDED.timezones;
      `;
      countriesInserted++;
    }
    console.log(`  ✓ ${countriesInserted} países e moedas mundiais consolidados com sucesso!`);

    // ── 11. COMPANHIAS AÉREAS GLOBAIS (IATA / ICAO) ──
    console.log(`\n[11/14] Inserindo ${GLOBAL_AIRLINES_CATALOG.length} companhias aéreas globais e nacionais...`);
    let airlinesInserted = 0;
    for (const al of GLOBAL_AIRLINES_CATALOG) {
      await sql`
        INSERT INTO public.airlines_catalog (
          iata_code, icao_code, name, country, country_code,
          alliance, is_brazilian_domestic, website, frequent_flyer_program
        ) VALUES (
          ${al.iata_code}, ${al.icao_code}, ${al.name}, ${al.country}, ${al.country_code},
          ${al.alliance}, ${al.is_brazilian_domestic}, ${al.website || null}, ${al.frequent_flyer_program || null}
        )
        ON CONFLICT (iata_code) DO UPDATE SET
          icao_code = EXCLUDED.icao_code,
          name = EXCLUDED.name,
          country = EXCLUDED.country,
          alliance = EXCLUDED.alliance,
          is_brazilian_domestic = EXCLUDED.is_brazilian_domestic,
          website = EXCLUDED.website,
          frequent_flyer_program = EXCLUDED.frequent_flyer_program;
      `;
      airlinesInserted++;
    }
    console.log(`  ✓ ${airlinesInserted} companhias aéreas consolidadas no hub da malha aérea!`);

    // ── 12. COMPANHIAS MARÍTIMAS & CRUZEIROS ──
    console.log(`\n[12/14] Inserindo ${GLOBAL_CRUISES_CATALOG.length} armadoras e companhias de cruzeiro...`);
    let cruisesInserted = 0;
    for (const cr of GLOBAL_CRUISES_CATALOG) {
      await sql`
        INSERT INTO public.cruises_catalog (
          cruise_id, name, headquarters, fleet_size,
          featured_ships_brazil, departure_ports_brazil, website, style
        ) VALUES (
          ${cr.id}, ${cr.name}, ${cr.headquarters}, ${cr.fleet_size},
          ${cr.featured_ships_brazil || []}, ${cr.departure_ports_brazil || []},
          ${cr.website || null}, ${cr.style}
        )
        ON CONFLICT (cruise_id) DO UPDATE SET
          name = EXCLUDED.name,
          headquarters = EXCLUDED.headquarters,
          fleet_size = EXCLUDED.fleet_size,
          featured_ships_brazil = EXCLUDED.featured_ships_brazil,
          departure_ports_brazil = EXCLUDED.departure_ports_brazil,
          website = EXCLUDED.website,
          style = EXCLUDED.style;
      `;
      cruisesInserted++;
    }
    console.log(`  ✓ ${cruisesInserted} companhias marítimas consolidadas no banco de cruzeiros!`);

    // ── 13. TABELA NACIONAL DE CNAES (IBGE / RECEITA FEDERAL) ──
    console.log(`\n[13/14] Inserindo ${GLOBAL_CNAE_CATALOG.length} códigos de atividades econômicas CNAE...`);
    let cnaeInserted = 0;
    for (const cn of GLOBAL_CNAE_CATALOG) {
      await sql`
        INSERT INTO public.cnae_catalog (
          code, raw_code, description, sector,
          simples_nacional_anexo, fator_r_applies, keywords
        ) VALUES (
          ${cn.code}, ${cn.raw_code}, ${cn.description}, ${cn.sector},
          ${cn.simples_nacional_anexo}, ${cn.fator_r_applies}, ${cn.keywords || []}
        )
        ON CONFLICT (code) DO UPDATE SET
          raw_code = EXCLUDED.raw_code,
          description = EXCLUDED.description,
          sector = EXCLUDED.sector,
          simples_nacional_anexo = EXCLUDED.simples_nacional_anexo,
          fator_r_applies = EXCLUDED.fator_r_applies,
          keywords = EXCLUDED.keywords;
      `;
      cnaeInserted++;
    }
    console.log(`  ✓ ${cnaeInserted} CNAEs consolidados com parametrização do Simples Nacional!`);

    // ── 14. OPERADORAS DE SAÚDE & CONVÊNIOS MÉDICOS (ANS) ──
    console.log(`\n[14/14] Inserindo ${GLOBAL_HEALTH_INSURANCE_CATALOG.length} operadoras e convênios ANS...`);
    let healthInserted = 0;
    for (const hi of GLOBAL_HEALTH_INSURANCE_CATALOG) {
      await sql`
        INSERT INTO public.health_insurance_catalog (
          ans_code, trade_name, corporate_name, modality,
          coverage_type, accepts_tiss_electronic, website, is_popular
        ) VALUES (
          ${hi.ans_code}, ${hi.trade_name}, ${hi.corporate_name}, ${hi.modality},
          ${hi.coverage_type}, ${hi.accepts_tiss_electronic}, ${hi.website || null}, ${hi.is_popular}
        )
        ON CONFLICT (ans_code) DO UPDATE SET
          trade_name = EXCLUDED.trade_name,
          corporate_name = EXCLUDED.corporate_name,
          modality = EXCLUDED.modality,
          coverage_type = EXCLUDED.coverage_type,
          accepts_tiss_electronic = EXCLUDED.accepts_tiss_electronic,
          website = EXCLUDED.website,
          is_popular = EXCLUDED.is_popular;
      `;
      healthInserted++;
    }
    console.log(`  ✓ ${healthInserted} operadoras de saúde ANS consolidadas com sucesso!`);

    // ── 15. TRANSPORTADORAS E LOGÍSTICA (ANTT / CORREIOS / COURIERS) ──
    console.log(`\n[15/19] Inserindo ${GLOBAL_SHIPPING_CARRIERS_CATALOG.length} transportadoras e serviços de frete...`);
    let carriersInserted = 0;
    for (const sc of GLOBAL_SHIPPING_CARRIERS_CATALOG) {
      await sql`
        INSERT INTO public.shipping_carriers_catalog (
          id, name, code, company_legal_name, category,
          tracking_url_template, supported_modalities,
          supports_reverse_logistics, supports_same_day, active, description
        ) VALUES (
          ${sc.id}, ${sc.name}, ${sc.code}, ${sc.company_legal_name}, ${sc.category},
          ${sc.tracking_url_template ?? null}, ${sc.supported_modalities || []},
          ${sc.supports_reverse_logistics}, ${sc.supports_same_day}, ${sc.active}, ${sc.description}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          company_legal_name = EXCLUDED.company_legal_name,
          category = EXCLUDED.category,
          tracking_url_template = EXCLUDED.tracking_url_template,
          supported_modalities = EXCLUDED.supported_modalities,
          supports_reverse_logistics = EXCLUDED.supports_reverse_logistics,
          supports_same_day = EXCLUDED.supports_same_day,
          active = EXCLUDED.active,
          description = EXCLUDED.description;
      `;
      carriersInserted++;
    }
    console.log(`  ✓ ${carriersInserted} transportadoras e métodos de frete consolidados!`);

    // ── 16. UNIDADES DE MEDIDA OFICIAIS SEFAZ / NF-e ──
    console.log(`\n[16/19] Inserindo ${GLOBAL_UNITS_OF_MEASURE_CATALOG.length} unidades de medida oficiais SEFAZ...`);
    let unitsInserted = 0;
    for (const um of GLOBAL_UNITS_OF_MEASURE_CATALOG) {
      await sql`
        INSERT INTO public.units_of_measure_catalog (
          code, name, symbol, category, sefaz_code, is_fractionable, description
        ) VALUES (
          ${um.code}, ${um.name}, ${um.symbol}, ${um.category},
          ${um.sefaz_code}, ${um.is_fractionable}, ${um.description}
        )
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          symbol = EXCLUDED.symbol,
          category = EXCLUDED.category,
          sefaz_code = EXCLUDED.sefaz_code,
          is_fractionable = EXCLUDED.is_fractionable,
          description = EXCLUDED.description;
      `;
      unitsInserted++;
    }
    console.log(`  ✓ ${unitsInserted} unidades de medida oficiais consolidadas com sucesso!`);

    // ── 17. MEIOS DE PAGAMENTO E BANDEIRAS (SEFAZ / BACEN) ──
    console.log(`\n[17/19] Inserindo ${GLOBAL_PAYMENT_METHODS_CATALOG.length} modalidades de pagamento oficiais SEFAZ/BACEN...`);
    let paymentsInserted = 0;
    for (const pm of GLOBAL_PAYMENT_METHODS_CATALOG) {
      await sql`
        INSERT INTO public.payment_methods_catalog (
          sefaz_code, code, name, category, settlement_days,
          supports_installments, is_instant, active, description
        ) VALUES (
          ${pm.sefaz_code}, ${pm.code}, ${pm.name}, ${pm.category}, ${pm.settlement_days},
          ${pm.supports_installments}, ${pm.is_instant}, ${pm.active}, ${pm.description}
        )
        ON CONFLICT (sefaz_code) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          settlement_days = EXCLUDED.settlement_days,
          supports_installments = EXCLUDED.supports_installments,
          is_instant = EXCLUDED.is_instant,
          active = EXCLUDED.active,
          description = EXCLUDED.description;
      `;
      paymentsInserted++;
    }
    console.log(`  ✓ ${paymentsInserted} modalidades de pagamento consolidadas com sucesso!`);

    // ── 18. TIPOS E CLASSIFICAÇÃO DE IMÓVEIS (COFECI / CRECI) ──
    console.log(`\n[18/19] Inserindo ${GLOBAL_REAL_ESTATE_TYPES_CATALOG.length} classificações de imóveis CRECI...`);
    let realEstateInserted = 0;
    for (const re of GLOBAL_REAL_ESTATE_TYPES_CATALOG) {
      await sql`
        INSERT INTO public.real_estate_types_catalog (
          id, name, code, category, transaction_modes, typical_features,
          requires_area_useful, requires_bedrooms, requires_parking_spaces, description
        ) VALUES (
          ${re.id}, ${re.name}, ${re.code}, ${re.category}, ${re.transaction_modes || []},
          ${re.typical_features || []}, ${re.requires_area_useful}, ${re.requires_bedrooms},
          ${re.requires_parking_spaces}, ${re.description}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          category = EXCLUDED.category,
          transaction_modes = EXCLUDED.transaction_modes,
          typical_features = EXCLUDED.typical_features,
          requires_area_useful = EXCLUDED.requires_area_useful,
          requires_bedrooms = EXCLUDED.requires_bedrooms,
          requires_parking_spaces = EXCLUDED.requires_parking_spaces,
          description = EXCLUDED.description;
      `;
      realEstateInserted++;
    }
    console.log(`  ✓ ${realEstateInserted} tipos de imóveis consolidados com sucesso!`);

    // ── 19. FERIADOS NACIONAIS E DATAS COMERCIAIS CRÍTICAS ──
    console.log(`\n[19/19] Inserindo ${GLOBAL_HOLIDAYS_CATALOG.length} feriados nacionais e datas comerciais...`);
    let holidaysInserted = 0;
    for (const hd of GLOBAL_HOLIDAYS_CATALOG) {
      await sql`
        INSERT INTO public.holidays_calendar_catalog (
          id, name, date_rule, type, is_official_holiday,
          commercial_impact, surge_multiplier_suggested, target_retail_sectors, description
        ) VALUES (
          ${hd.id}, ${hd.name}, ${hd.date_rule}, ${hd.type}, ${hd.is_official_holiday},
          ${hd.commercial_impact}, ${hd.surge_multiplier_suggested}, ${hd.target_retail_sectors || []}, ${hd.description}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          date_rule = EXCLUDED.date_rule,
          type = EXCLUDED.type,
          is_official_holiday = EXCLUDED.is_official_holiday,
          commercial_impact = EXCLUDED.commercial_impact,
          surge_multiplier_suggested = EXCLUDED.surge_multiplier_suggested,
          target_retail_sectors = EXCLUDED.target_retail_sectors,
          description = EXCLUDED.description;
      `;
      holidaysInserted++;
    }
    console.log(`  ✓ ${holidaysInserted} feriados e datas de pico comercial consolidados com sucesso!`);

    // ── 20. BANCO DE PROFISSÕES & MÉDIAS SALARIAIS (CBO / MTE) ──
    console.log(`\n[20/22] Inserindo ${GLOBAL_PROFESSIONS_CATALOG.length} profissões e referências salariais...`);
    let professionsInserted = 0;
    for (const prof of GLOBAL_PROFESSIONS_CATALOG) {
      await sql`
        INSERT INTO public.professions_catalog (
          id, cbo_code, title, category, description, required_education, technical_body,
          standard_workload_hours_weekly, hiring_regimes, average_salary_junior_cents,
          average_salary_mid_cents, average_salary_senior_cents, average_salary_lead_cents,
          hourly_rate_benchmark_cents, essential_skills, behavioral_competencies, market_demand_level
        ) VALUES (
          ${prof.id}, ${prof.cbo_code}, ${prof.title}, ${prof.category}, ${prof.description},
          ${prof.required_education}, ${prof.technical_body || null}, ${prof.standard_workload_hours_weekly},
          ${prof.hiring_regimes}, ${prof.average_salary_junior_cents}, ${prof.average_salary_mid_cents},
          ${prof.average_salary_senior_cents}, ${prof.average_salary_lead_cents}, ${prof.hourly_rate_benchmark_cents},
          ${prof.essential_skills}, ${prof.behavioral_competencies}, ${prof.market_demand_level}
        )
        ON CONFLICT (id) DO UPDATE SET
          cbo_code = EXCLUDED.cbo_code,
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          required_education = EXCLUDED.required_education,
          technical_body = EXCLUDED.technical_body,
          average_salary_junior_cents = EXCLUDED.average_salary_junior_cents,
          average_salary_mid_cents = EXCLUDED.average_salary_mid_cents,
          average_salary_senior_cents = EXCLUDED.average_salary_senior_cents,
          average_salary_lead_cents = EXCLUDED.average_salary_lead_cents,
          hourly_rate_benchmark_cents = EXCLUDED.hourly_rate_benchmark_cents,
          essential_skills = EXCLUDED.essential_skills,
          behavioral_competencies = EXCLUDED.behavioral_competencies,
          market_demand_level = EXCLUDED.market_demand_level;
      `;
      professionsInserted++;
    }
    console.log(`  ✓ ${professionsInserted} profissões e benchmarks salariais consolidados com sucesso!`);

    // ── 21. SERVIÇOS SOB DEMANDA / FREELANCER (GETNINJAS / WORKANA / 99FREELAS) ──
    console.log(`\n[21/22] Inserindo ${GLOBAL_ON_DEMAND_SERVICES_CATALOG.length} serviços de marketplace sob demanda...`);
    let servicesInserted = 0;
    for (const s of GLOBAL_ON_DEMAND_SERVICES_CATALOG) {
      await sql`
        INSERT INTO public.on_demand_services_catalog (
          id, name, category, subcategory, description, pricing_unit,
          estimated_min_price_cents, estimated_avg_price_cents, estimated_max_price_cents,
          estimated_delivery_days, popular_tools_or_materials, suggested_tags
        ) VALUES (
          ${s.id}, ${s.name}, ${s.category}, ${s.subcategory}, ${s.description}, ${s.pricing_unit},
          ${s.estimated_min_price_cents}, ${s.estimated_avg_price_cents}, ${s.estimated_max_price_cents},
          ${s.estimated_delivery_days}, ${s.popular_tools_or_materials}, ${s.suggested_tags}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          description = EXCLUDED.description,
          pricing_unit = EXCLUDED.pricing_unit,
          estimated_min_price_cents = EXCLUDED.estimated_min_price_cents,
          estimated_avg_price_cents = EXCLUDED.estimated_avg_price_cents,
          estimated_max_price_cents = EXCLUDED.estimated_max_price_cents,
          estimated_delivery_days = EXCLUDED.estimated_delivery_days,
          popular_tools_or_materials = EXCLUDED.popular_tools_or_materials,
          suggested_tags = EXCLUDED.suggested_tags;
      `;
      servicesInserted++;
    }
    console.log(`  ✓ ${servicesInserted} serviços sob demanda consolidados com sucesso!`);

    // ── 22. DEMOGRAFIA OFICIAL DO BRASIL & CLASSES ECONÔMICAS (IBGE / POF) ──
    console.log(`\n[22/22] Inserindo ${IBGE_ECONOMIC_CLASSES.length} classes econômicas e perfis demográficos IBGE...`);
    let demographicsInserted = 0;
    for (const ec of IBGE_ECONOMIC_CLASSES) {
      await sql`
        INSERT INTO public.demographic_profiles_ibge (
          id, region, economic_class, population_estimate, percentage_of_brazil,
          median_monthly_income_cents, discretionary_budget_percentage, primary_payment_methods, top_interests
        ) VALUES (
          ${'ibge-class-' + ec.code.toLowerCase()}, ${'Brasil (Nacional)'}, ${ec.code},
          ${Math.round(203000000 * (ec.brazil_population_percentage / 100))}, ${ec.brazil_population_percentage},
          ${ec.median_monthly_household_income_cents}, ${ec.discretionary_budget_percentage},
          ${ec.preferred_payment_methods}, ${ec.financial_channels}
        )
        ON CONFLICT (id) DO UPDATE SET
          economic_class = EXCLUDED.economic_class,
          percentage_of_brazil = EXCLUDED.percentage_of_brazil,
          median_monthly_income_cents = EXCLUDED.median_monthly_income_cents,
          discretionary_budget_percentage = EXCLUDED.discretionary_budget_percentage,
          primary_payment_methods = EXCLUDED.primary_payment_methods,
          top_interests = EXCLUDED.top_interests;
      `;
      demographicsInserted++;
    }
    console.log(`  ✓ ${demographicsInserted} matrizes demográficas do IBGE consolidadas com sucesso!`);

    console.log("\n==================================================================");
    console.log("  INGESTÃO CONCLUÍDA COM 100% DE SUCESSO NO BANCO DE DADOS SUPABASE (22 BASES)!");
    console.log("==================================================================");
  } catch (err: any) {
    console.error("Erro na execução do seed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSeed();
