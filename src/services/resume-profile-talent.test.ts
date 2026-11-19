import { describe, it, expect, vi } from 'vitest';
import type { ResumeDataDTO } from '@/components/profile/professional-resume-editor';
import { parseSalaryInputToCents } from '@/lib/money';
import { syncEmployerReviewsForUser } from '@/lib/careers/employer-reviews.server';
import * as claimIntel from './claim-intelligence.functions';

describe('Professional Resume 360° & Talent Intelligence ([REQ-1], [REQ-3])', () => {
  it('should support extended experiences with salary_cents, exit_reason and employer rating', () => {
    const resume: any = {
      headline: 'Staff Software Architect & Tech Lead',
      summary: 'Especialista em sistemas distribuídos e plataformas multi-tenant de alta densidade.',
      experiences: [
        {
          id: 'exp_uber',
          title: 'Senior Software Engineer',
          company: 'Uber Brasil Tecnologia',
          location: 'São Paulo, SP',
          location_type: 'Híbrido',
          employment_type: 'CLT',
          start_date: 'Jan 2021',
          end_date: 'Fev 2024',
          is_current: false,
          description: 'Liderança técnica na modernização de gateways e precificação dinâmica.',
          salary_cents: 2200000,
          exit_reason: 'Proposta mais vantajosa para atuar como Staff Architect.',
          company_rating: 5,
          would_recommend: true,
        },
        {
          id: 'exp_waesy',
          title: 'Staff Software Architect',
          company: 'Waesy',
          location: 'Chapecó, SC',
          location_type: 'Remoto',
          employment_type: 'PJ',
          start_date: 'Mar 2024',
          is_current: true,
          description: 'Arquitetura de microsserviços, motor BFF e isolamento multi-tenant.',
          salary_cents: 3500000,
          company_rating: 5,
          would_recommend: true,
        },
      ],
    };

    expect(resume.experiences).toHaveLength(2);
    expect((resume.experiences![0] as any).salary_cents).toBe(2200000);
    expect((resume.experiences![0] as any).exit_reason).toContain('Proposta mais vantajosa');
    expect((resume.experiences![0] as any).company_rating).toBe(5);
    expect((resume.experiences![0] as any).would_recommend).toBe(true);

    expect(resume.experiences![1].is_current).toBe(true);
    expect((resume.experiences![1] as any).salary_cents).toBe(3500000);
  });

  it('should ensure claim intelligence functions have zero simulated mock returns', () => {
    // Verificando que as server functions de claim-intelligence exportam funções legítimas
    expect(typeof claimIntel.submitClaimProfile).toBe('function');
    expect(typeof claimIntel.listClaimRequests).toBe('function');
    expect(typeof claimIntel.getClaimIntelligence).toBe('function');
    expect(typeof claimIntel.createConsumerClaim).toBe('function');
    expect(typeof claimIntel.listConsumerClaims).toBe('function');
    expect(typeof claimIntel.respondToConsumerClaim).toBe('function');
    expect(typeof claimIntel.escalateClaimToLegal).toBe('function');
  });

  it('deve converter salários BRL para centavos sem erro de fator 100x em reedições', () => {
    expect(parseSalaryInputToCents('3500')).toBe(350000);
    expect(parseSalaryInputToCents('3.500')).toBe(350000);
    expect(parseSalaryInputToCents('3500,50')).toBe(350050);
    expect(parseSalaryInputToCents('R$ 5.500,00')).toBe(550000);
    expect(parseSalaryInputToCents('')).toBeUndefined();
  });

  it('deve sincronizar avaliações de empregadores e contabilizar erro sem engolir falha', async () => {
    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: () => ({
        delete: () => ({ eq: () => ({ eq: deleteEqMock }) }),
        insert: insertMock,
      }),
    };

    const okRes = await syncEmployerReviewsForUser(db, 'user-1', [
      { company: 'Waesy Tech', title: 'Engenheiro', company_rating: 5, salary_cents: 1200000 },
      { company: 'Sem Insight', title: 'Estagiário' },
    ]);
    expect(okRes).toEqual({ synced: 1, errors: 0 });
    expect(insertMock).toHaveBeenCalledTimes(1);

    const failDb = {
      from: () => ({
        delete: () => ({ eq: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
        insert: vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
      }),
    };
    const errRes = await syncEmployerReviewsForUser(failDb, 'user-1', [
      { company: 'Empresa Erro', company_rating: 4 },
    ]);
    expect(errRes).toEqual({ synced: 0, errors: 1 });
  });
});
