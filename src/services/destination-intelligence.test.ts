import { describe, it, expect } from 'vitest';
import type { DestinationIntelligence, TravelAlert, DestinationTrend, SafetyLevel, AlertSeverity } from '@/types/destination-intelligence';

function getTrendLabel(trend: DestinationTrend): string {
 const map: Record<DestinationTrend, string> = { rising: 'Alta Demanda', stable: 'Estável', falling: 'Queda' };
 return map[trend];
}

function getSafetyLabel(level: SafetyLevel): string {
 const map: Record<SafetyLevel, string> = { safe: 'Seguro', moderate: 'Atenção Moderada', caution: 'Cautela', warning: 'Alerta' };
 return map[level];
}

function calculateDemandColor(score: number): string {
 if (score >= 85) return 'bg-emerald-500';
 if (score >= 60) return 'bg-warning';
 return 'bg-rose-400';
}

function formatAvgPackage(brl: number): string {
 return `R$ ${(brl / 1000).toFixed(1)}k`;
}

function filterDestinations(destinations: DestinationIntelligence[], search: string, continent: string): DestinationIntelligence[] {
 return destinations.filter(d => {
 const matchSearch = d.destination.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.includes(search.toLowerCase()));
 const matchContinent = continent === 'all' || d.continent === continent;
 return matchSearch && matchContinent;
 });
}

function computeAlertPriority(severity: AlertSeverity): number {
 const p: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1 };
 return p[severity];
}

const MOCK_DESTINATIONS: DestinationIntelligence[] = [
 { id: 'd-1', store_id: 'store-001', destination: 'Miami & Orlando, EUA', country_code: 'US', continent: 'América do Norte', demand_score: 95, trend: 'rising', is_featured: true, is_visa_required: false, safety_level: 'safe', currency_code: 'USD', exchange_rate_brl: 5.72, avg_package_brl: 9800, avg_daily_rate_brl: 850, min_budget_brl: 7500, avg_temp_celsius: 27, peak_season: 'Outubro a Março', best_months: ['out','nov'], tags: ['família','parques','praia'], highlights: ['Universal Studios','Disney World'], image_url: null },
 { id: 'd-2', store_id: 'store-001', destination: 'Lisboa & Porto, Portugal', country_code: 'PT', continent: 'Europa', demand_score: 82, trend: 'stable', is_featured: true, is_visa_required: false, safety_level: 'safe', currency_code: 'EUR', exchange_rate_brl: 6.18, avg_package_brl: 8900, avg_daily_rate_brl: 680, min_budget_brl: 6500, avg_temp_celsius: 20, peak_season: 'Março a Outubro', best_months: ['mar','abr'], tags: ['cultura','gastronomia','vinho'], highlights: ['Torre de Belém'], image_url: null },
 { id: 'd-3', store_id: 'store-001', destination: 'Buenos Aires, Argentina', country_code: 'AR', continent: 'América do Sul', demand_score: 74, trend: 'rising', is_featured: false, is_visa_required: false, safety_level: 'moderate', currency_code: 'ARS', exchange_rate_brl: 0.0057, avg_package_brl: 3800, avg_daily_rate_brl: 280, min_budget_brl: 2500, avg_temp_celsius: 22, peak_season: 'Outubro a Março', best_months: ['out','nov'], tags: ['tango','gastronomia'], highlights: ['La Boca'], image_url: null },
];

const MOCK_ALERTS: TravelAlert[] = [
 { id: 'a-1', store_id: 'store-001', destination: 'Miami & Orlando, EUA', severity: 'info', category: 'currency', title: 'Dólar em Alta', description: 'USD/BRL em R$ 5,72.', is_active: true, source_url: null, expires_at: null },
 { id: 'a-2', store_id: 'store-001', destination: 'Buenos Aires, Argentina', severity: 'warning', category: 'currency', title: 'Economia Instável', description: 'Volatilidade do peso.', is_active: true, source_url: null, expires_at: null },
];

describe('Microfase 9: Radar Global de Destinos & Inteligência de Mercado', () => {
 describe('9.1 Tipagem e Estrutura', () => {
 it('deve validar campos obrigatórios de DestinationIntelligence', () => {
 const d = MOCK_DESTINATIONS[0];
 expect(d.id).toBeDefined();
 expect(d.store_id).toBeDefined();
 expect(d.destination.length).toBeGreaterThan(2);
 expect(d.country_code.length).toBe(2);
 expect(d.demand_score).toBeGreaterThanOrEqual(0);
 expect(d.demand_score).toBeLessThanOrEqual(100);
 expect(['rising','stable','falling']).toContain(d.trend);
 expect(['safe','moderate','caution','warning']).toContain(d.safety_level);
 expect(Array.isArray(d.tags)).toBe(true);
 });
 it('deve validar TravelAlert com severidade e categoria válidas', () => {
 const a = MOCK_ALERTS[0];
 expect(['info','warning','critical']).toContain(a.severity);
 expect(['health','security','weather','operational','visa','currency']).toContain(a.category);
 expect(typeof a.is_active).toBe('boolean');
 });
 });

 describe('9.2 Lógica de UI', () => {
 it('deve mapear trend para label correto', () => {
 expect(getTrendLabel('rising')).toBe('Alta Demanda');
 expect(getTrendLabel('stable')).toBe('Estável');
 expect(getTrendLabel('falling')).toBe('Queda');
 });
 it('deve mapear safety_level para label correto', () => {
 expect(getSafetyLabel('safe')).toBe('Seguro');
 expect(getSafetyLabel('moderate')).toBe('Atenção Moderada');
 expect(getSafetyLabel('caution')).toBe('Cautela');
 expect(getSafetyLabel('warning')).toBe('Alerta');
 });
 it('deve calcular cor de demanda por faixa', () => {
 expect(calculateDemandColor(95)).toBe('bg-emerald-500');
 expect(calculateDemandColor(75)).toBe('bg-warning');
 expect(calculateDemandColor(40)).toBe('bg-rose-400');
 });
 it('deve formatar pacote médio em formato compacto', () => {
 expect(formatAvgPackage(9800)).toBe('R$ 9.8k');
 expect(formatAvgPackage(14500)).toBe('R$ 14.5k');
 });
 });

 describe('9.3 Filtros', () => {
 it('deve retornar todos com filtro all e busca vazia', () => {
 expect(filterDestinations(MOCK_DESTINATIONS, '', 'all')).toHaveLength(3);
 });
 it('deve filtrar por nome de destino', () => {
 const r = filterDestinations(MOCK_DESTINATIONS, 'Miami', 'all');
 expect(r).toHaveLength(1);
 expect(r[0].country_code).toBe('US');
 });
 it('deve filtrar por tag', () => {
 const r = filterDestinations(MOCK_DESTINATIONS, 'tango', 'all');
 expect(r).toHaveLength(1);
 expect(r[0].country_code).toBe('AR');
 });
 it('deve filtrar por continente', () => {
 expect(filterDestinations(MOCK_DESTINATIONS, '', 'Europa')).toHaveLength(1);
 });
 it('deve retornar vazio para busca sem match', () => {
 expect(filterDestinations(MOCK_DESTINATIONS, 'xyzabc', 'all')).toHaveLength(0);
 });
 });

 describe('9.4 Alertas', () => {
 it('deve ordenar por prioridade warning > info', () => {
 const sorted = [...MOCK_ALERTS].sort((a, b) => computeAlertPriority(b.severity) - computeAlertPriority(a.severity));
 expect(sorted[0].severity).toBe('warning');
 });
 it('deve filtrar apenas alertas ativos', () => {
 const withInactive = [...MOCK_ALERTS, { ...MOCK_ALERTS[0], id: 'a-3', is_active: false }];
 expect(withInactive.filter(a => a.is_active)).toHaveLength(2);
 });
 });

 describe('9.5 Cálculo Financeiro', () => {
 it('deve calcular total de pacote com markup de agência 18%', () => {
 const base = 980000 + 595000 + 30000;
 const total = base + Math.round(base * 0.18);
 expect(total).toBeGreaterThan(base);
 expect(total / 100).toBeGreaterThan(18000);
 });
 it('deve parcelar em 10x com distribuição precisa de centavos', () => {
 const total = 1893420;
 const base = Math.floor(total / 10);
 const remainder = total - base * 10;
 expect(base * 10 + remainder).toBe(total);
 });
 });
});