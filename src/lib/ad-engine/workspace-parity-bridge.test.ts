import { describe, it, expect } from 'vitest';
import {
  inferArchetypeFromRawListing,
  resolveUnifiedListingContext,
} from './workspace-parity-bridge';

describe('Workspace Parity Bridge (G55–G60)', () => {
  it('G57: deve inferir arquétipo A12 para imóveis e veículos com venda formal', () => {
    const rawCar = {
      title: 'Honda Civic Touring 2022',
      vehicle_make: 'Honda',
      price_cents: 14500000,
    };
    const archetypeCar = inferArchetypeFromRawListing(rawCar, 'veiculos');
    expect(archetypeCar).toBe('A12');

    const rawProperty = {
      title: 'Cobertura Duplex 4 Suítes',
      property_type: 'cobertura',
      price_cents: 280000000,
    };
    const archetypeProperty = inferArchetypeFromRawListing(rawProperty, 'imoveis');
    expect(archetypeProperty).toBe('A12');
  });

  it('G58: deve habilitar produto digital e assinatura corretamente', () => {
    const rawCourse = {
      title: 'Imersão em Inteligência Artificial',
      digital_file_url: 'https://cdn.waesy.com/course.zip',
      price_cents: 99700,
    };
    const context = resolveUnifiedListingContext('product', rawCourse, 'digital');

    expect(context.archetypeId).toBe('A05');
    expect(context.capabilities.canAcceptOnlinePayment).toBe(true);
    expect(context.capabilities.hasPhysicalStock).toBe(false);
  });

  it('G60: deve mapear permissões e necessidade de documentos contratuais', () => {
    const rawRentalApartment = {
      title: 'Apartamento Beira-Mar Temporada',
      is_vacation_rental: true,
      price_cents: 45000, // Diária
    };
    const context = resolveUnifiedListingContext('classified', rawRentalApartment, 'imoveis');

    expect(context.archetypeId).toBe('A10');
    expect(context.capabilities.canHoldDeposit).toBe(true);
    expect(context.capabilities.canGenerateContract).toBe(true);
    expect(context.requiresDocument).toBe(true);
  });
});
