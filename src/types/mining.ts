/**
 * Type definitions for the Waesy Mining & Crawling System
 * Full fidelity port from the proprietary mining infrastructure
 */

export type CrawlQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CrawlQueueItem {
  id: string;
  url: string;
  domain: string;
  priority: number;
  entity_type?: string | null;
  status: CrawlQueueStatus;
  depth: number;
  parent_url?: string | null;
  discovered_via?: string | null;
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string | null;
  last_error?: string | null;
  scheduled_for?: string | null;
  extracted_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  tenant_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlCacheEntry {
  id: string;
  url: string;
  domain: string;
  status_code?: number | null;
  content_hash?: string | null;
  html_content?: string | null;
  extracted_json_ld?: Record<string, unknown> | null;
  extracted_open_graph?: Record<string, unknown> | null;
  headers?: Record<string, string> | null;
  response_time_ms?: number | null;
  crawled_at: string;
  created_at: string;
}

export interface RssFeed {
  id: string;
  name: string;
  feed_url: string;
  website_url?: string | null;
  category?: string | null;
  entity_type: string;
  region?: string | null;
  is_active: boolean;
  last_fetched_at?: string | null;
  items_count: number;
  last_error?: string | null;
  tenant_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlSeed {
  id: string;
  name: string;
  seed_url: string;
  domain: string;
  entity_type?: string | null;
  category?: string | null;
  region?: string | null;
  is_active: boolean;
  priority: number;
  metadata?: Record<string, unknown> | null;
  tenant_id?: string | null;
  created_at: string;
}

export interface ScraperAuditLogEntry {
  id: string;
  scraper_name: string;
  action: string;
  target_table?: string | null;
  records_affected: number;
  input_params?: Record<string, unknown> | null;
  result_summary?: Record<string, unknown> | null;
  error_message?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface IndexedBusiness {
  id: string;
  external_id: string;
  source: string;
  name: string;
  description?: string | null;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  cnpj?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  price_level?: string | null;
  hours?: Record<string, unknown> | null;
  photos?: string[] | null;
  delivery?: boolean;
  scraper_source?: string | null;
  data_quality_score: number;
  last_validated_at?: string | null;
  metadata?: Record<string, unknown> | null;
  indexed_at: string;
  created_at: string;
}

export interface IndexedJob {
  id: string;
  external_id: string;
  source: string;
  title: string;
  company_name: string;
  company_logo?: string | null;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  location_city?: string | null;
  location_state?: string | null;
  remote_type?: string | null;
  employment_type?: string | null;
  apply_url?: string | null;
  posted_at?: string | null;
  is_active: boolean;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  indexed_at: string;
  created_at: string;
}

export interface IndexedEvent {
  id: string;
  external_id: string;
  source: string;
  name: string;
  description?: string | null;
  venue_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  banner_url?: string | null;
  ticket_url?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  is_free: boolean;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  indexed_at: string;
  created_at: string;
}

export interface IndexedProduct {
  id: string;
  external_id: string;
  source: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  category?: string | null;
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  thumbnail?: string | null;
  product_url?: string | null;
  rating?: number | null;
  in_stock: boolean;
  metadata?: Record<string, unknown> | null;
  indexed_at: string;
  created_at: string;
}

export interface MiningSchedule {
  id: string;
  job_type: string;
  display_name: string;
  description?: string | null;
  is_active: boolean;
  cron_expression?: string | null;
  config: Record<string, unknown>;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MiningStats {
  crawlQueue: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  indexedBusinesses: {
    total: number;
    withCnpj: number;
    highQuality: number;
  };
  rssFeeds: {
    total: number;
    active: number;
  };
  scraperAudit: {
    totalRuns: number;
    lastRunAt?: string | null;
    successRatePercent: number;
  };
  minedArticles?: {
    total: number;
    pendingReview: number;
    published: number;
  };
  economicIndicators: {
    totalAvailable: number;
    lastUpdated?: string | null;
  };
}

export interface EconomicIndicator {
  code: number;
  name: string;
  type: 'economic' | 'financial' | 'social';
  unit: string;
  currentValue: number;
  previousValue?: number;
  variationPercent?: number;
  referenceDate: string;
  timeSeries: Array<{ date: string; value: number }>;
}

export interface CNPJEnrichedData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  natureza_juridica?: string;
  capital_social?: number;
  porte?: string;
  data_inicio_atividade?: string;
  cnae_principal?: { codigo: string; descricao: string };
  cnaes_secundarios?: Array<{ codigo: string; descricao: string }>;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
  telefones?: string[];
  email?: string;
  socios?: Array<{
    nome: string;
    qualificacao?: string;
    cpf_cnpj_socio?: string;
  }>;
  source: 'cnpj.ja' | 'receitaws' | 'brasilapi';
  dataQualityScore: number;
}

export type MiningContentType =
  | 'noticia'
  | 'artigo'
  | 'blog_post'
  | 'educacao'
  | 'eventos'
  | 'portal_municipal'
  | 'portais_publicos'
  | 'empregos'
  | 'receitas'
  | 'empresas'
  | 'processos'
  | 'produtos';

export interface MinedRawExtraction {
  id: string;
  content_type: MiningContentType;
  source_url: string;
  source_domain: string;
  source_name: string;
  external_id?: string | null;
  raw_title: string;
  raw_lead?: string | null;
  raw_body_text: string;
  raw_html_fragment?: string | null;
  raw_author?: string | null;
  raw_published_at?: string | null;
  cover_image_url?: string | null;
  gallery_images: string[];
  city?: string | null;
  state?: string | null;
  region?: string | null;
  tags: string[];
  type_metadata?: Record<string, unknown> | null;
  word_count: number;
  paragraph_count: number;
  has_full_content: boolean;
  extraction_method: string;
  title_hash: string;
  cluster_id?: string | null;
  is_duplicate: boolean;
  primary_source_id?: string | null;
  status:
    | 'raw_extracted'
    | 'integrity_failed'
    | 'clustered'
    | 'curating'
    | 'curated'
    | 'published'
    | 'rejected'
    | 'archived';
  integrity_failure_reason?: string | null;
  store_id?: string | null;
  curated_article_id?: string | null;
  curated_event_id?: string | null;
  curated_job_id?: string | null;
  curated_directory_id?: string | null;
  curated_lawsuit_id?: string | null;
  curated_product_id?: string | null;
  curated_at?: string | null;
  curator_profile_id?: string | null;
  curator_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MinedLawsuit {
  id: string;
  process_number: string;
  process_number_clean?: string | null;
  court_code?: string | null;
  court_name?: string | null;
  class_name?: string | null;
  subject_name?: string | null;
  status?: string | null;
  priority?: string | null;
  value?: number | null;
  distribution_date?: string | null;
  last_movement_date?: string | null;
  last_movement_text?: string | null;
  linked_cpf?: string | null;
  linked_cnpj?: string | null;
  linked_profile_id?: string | null;
  parties: Array<{ name: string; role: string; type?: string; document?: string }>;
  lawyers: Array<{ name: string; oab?: string; uf?: string }>;
  secrecy_level?: string | null;
  source: string;
  source_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
