import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestTravelQuoteCapture, TravelQuoteCapturePayload } from './travel-quote-capture.functions';

// Mock do cliente Supabase isolado para validação do BFF
vi.mock('@/lib/supabase', () => {
  const tableData: Record<string, any[]> = {
    travel_quote_captures: [],
    travel_quote_capture_items: [],
    travel_price_observations: [],
    travel_client_demands: [
      {
        id: '11111111-1111-4111-a111-111111111111',
        store_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        contact_name: 'Juliana Rossi',
        contact_phone: '49988887777',
        destination_city: 'Lisboa',
        earliest_departure: '2027-05-01',
        latest_departure: '2027-05-15',
        budget_max_cents: 1100000,
        adults_count: 2,
        children_count: 0,
        preferred_product_type: 'package',
        status: 'active',
        last_interaction_at: '2027-04-10T10:00:00Z'
      }
    ],
    travel_opportunities: []
  };

  return {
    supabase: {
      from: vi.fn((table: string) => ({
        insert: vi.fn((payload: any) => {
          const rows = Array.isArray(payload) ? payload : [payload];
          const inserted = rows.map((r, i) => ({ id: `gen-id-${Date.now()}-${i}`, ...r }));
          tableData[table]?.push(...inserted);
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: inserted[0], error: null }))
            })),
            error: null,
            data: inserted
          };
        }),
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, _val: any) => ({
            eq: vi.fn((_c2: string, _v2: any) => ({
              limit: vi.fn(() => ({ data: tableData[table] || [], error: null })),
              data: tableData[table] || [],
              error: null
            })),
            limit: vi.fn(() => ({ data: tableData[table] || [], error: null })),
            order: vi.fn(() => ({ data: tableData[table] || [], error: null })),
            data: tableData[table] || [],
            error: null
          })),
          data: tableData[table] || [],
          error: null
        }))
      }))
    }
  };
});

describe('BFF Server Function: ingestTravelQuoteCapture', () => {
  const validPayload: TravelQuoteCapturePayload = {
    storeId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    operatorSlug: 'frt',
    sourcePage: 'carrinho',
    originCity: 'Chapecó',
    destinationCity: 'Lisboa',
    startDate: '2027-05-07',
    endDate: '2027-05-18',
    adultsCount: 2,
    childrenCount: 0,
    infantsCount: 0,
    currency: 'BRL',
    totalCents: 1010619, // R$ 10.106,19
    perAdultCents: 505310,
    taxesCents: 120000,
    items: [
      {
        itemType: 'flight',
        title: '05:30 XAP - 08:15 LIS (Azul)',
        providerOrAirline: 'Azul',
        totalAmountCents: 1010619,
        flightStops: 1
      }
    ],
    rawPayloadJson: { test: true }
  };

  it('deve validar e processar a ingestão de cotação gerando oportunidade casada', async () => {
    const result = await ingestTravelQuoteCapture(validPayload);
    expect(result.success).toBe(true);
    expect(result.captureId).toBeDefined();
    expect(result.opportunitiesGenerated).toBe(1);
    expect(result.opportunities[0].whatsapp_pitch_draft).toContain('Juliana');
  });

  it('deve rejeitar payload com tipos inválidos via Zod', async () => {
    const invalidPayload: any = {
      ...validPayload,
      destinationCity: '', // Requer min(2)
      totalCents: -500 // Negativo
    };

    await expect(ingestTravelQuoteCapture(invalidPayload)).rejects.toThrow();
  });
});
