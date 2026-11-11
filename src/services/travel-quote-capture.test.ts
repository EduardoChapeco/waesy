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
    leads_crm: [
      {
        id: '22222222-2222-4222-a222-222222222222',
        store_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        full_name: 'Carlos Alberto Mendes',
        phone: '49999991234',
        destination: 'Lisboa',
        travel_start: '2027-05-05',
        travel_end: '2027-05-20',
        budget_cents: 1200000,
        pax_adults: 2,
        pax_children: 0,
        status: 'qualified',
        custom_fields: {},
        created_at: '2027-04-12T10:00:00Z'
      }
    ],
    travel_opportunities: []
  };

  const client = {
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
        update: vi.fn((payload: any) => ({
          eq: vi.fn((_col: string, val: any) => {
            const item = tableData[table]?.find((r) => r.id === val);
            if (item) Object.assign(item, payload);
            return { data: item, error: null };
          })
        })),
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
    };
  return {
    supabase: client,
    getServerClient: () => client,
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

  it('deve validar e processar a ingestão de cotação gerando oportunidade casada com demanda e lead CRM', async () => {
    const result = await ingestTravelQuoteCapture(validPayload);
    expect(result.success).toBe(true);
    expect(result.captureId).toBeDefined();
    expect(result.opportunitiesGenerated).toBe(2);
    expect(result.opportunities.some(o => o.whatsapp_pitch_draft.includes('Juliana'))).toBe(true);
    expect(result.opportunities.some(o => o.whatsapp_pitch_draft.includes('Carlos'))).toBe(true);
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
