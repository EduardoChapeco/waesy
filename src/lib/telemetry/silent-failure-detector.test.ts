import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeAsyncJobSafely,
  assertRequiredEntity,
  SilentEntityNotFoundError,
  AsyncJobTimeoutError,
  setupUnhandledRejectionMonitor,
} from './silent-failure-detector';
import { errorRegistry } from './error-correlator';

describe('Silent Failure Detector (Fase S34)', () => {
  beforeEach(() => {
    errorRegistry.clear();
  });

  describe('executeAsyncJobSafely', () => {
    it('deve retornar resultado positivo para operação bem-sucedida', async () => {
      const result = await executeAsyncJobSafely('test_success_job', async () => {
        return { count: 42 };
      });

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ count: 42 });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.traceId).toContain('job_');
      expect(errorRegistry.pendingCount).toBe(0);
    });

    it('deve interceptar falhas, registrar no errorRegistry e retornar fallback seguro', async () => {
      let onErrorCalled = false;
      let reportedTraceId = '';

      const result = await executeAsyncJobSafely(
        'failing_payment_job',
        async () => {
          throw new Error('Falha de conexão com gateway de pagamento');
        },
        {
          fallbackValue: { status: 'failed_safely' },
          tenantId: 'tenant_loja_123',
          onError: (err, trace) => {
            onErrorCalled = true;
            reportedTraceId = trace;
          },
        }
      );

      expect(result.ok).toBe(false);
      expect(result.data).toEqual({ status: 'failed_safely' });
      expect(result.error).toBeInstanceOf(Error);
      expect(onErrorCalled).toBe(true);
      expect(reportedTraceId).toBe(result.traceId);

      // Deve estar registrado no errorRegistry
      const recorded = errorRegistry.consume(result.traceId);
      expect(recorded).toBeDefined();
      expect(recorded?.tenantId).toBe('tenant_loja_123');
      expect(recorded?.error.message).toContain('gateway de pagamento');
      expect(recorded?.context?.jobName).toBe('failing_payment_job');
    });

    it('deve abortar e registrar erro quando o job excede o timeout operacional', async () => {
      const result = await executeAsyncJobSafely(
        'slow_indexing_job',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 'completed';
        },
        {
          timeoutMs: 10,
          fallbackValue: 'timed_out_fallback',
        }
      );

      expect(result.ok).toBe(false);
      expect(result.data).toBe('timed_out_fallback');
      expect(result.error).toBeInstanceOf(AsyncJobTimeoutError);

      const recorded = errorRegistry.consume(result.traceId);
      expect(recorded).toBeDefined();
      expect(recorded?.context?.isTimeout).toBe(true);
    });
  });

  describe('assertRequiredEntity', () => {
    it('deve retornar o valor da entidade quando presente', () => {
      const user = { id: 'usr_1', name: 'Ana Silva' };
      const result = assertRequiredEntity(user, 'UserProfile');
      expect(result).toBe(user);
    });

    it('deve registrar erro estruturado e lançar SilentEntityNotFoundError quando for nulo', () => {
      expect(() => {
        assertRequiredEntity(null, 'StoreProfile', {
          tenantId: 'tenant_456',
          routeId: '/store/dashboard',
        });
      }).toThrowError(SilentEntityNotFoundError);

      expect(errorRegistry.pendingCount).toBe(1);
      const recent = errorRegistry.getRecentEvents();
      expect(recent[0].tenantId).toBe('tenant_456');
      expect(recent[0].error.name).toBe('SilentEntityNotFoundError');
      expect(recent[0].error.message).toContain('StoreProfile');
    });
  });

  describe('setupUnhandledRejectionMonitor', () => {
    it('deve registrar monitor sem lançar erro e retornar função de desinscrição', () => {
      const teardown = setupUnhandledRejectionMonitor();
      expect(typeof teardown).toBe('function');
      teardown();
    });
  });
});
