import { describe, it, expect } from 'vitest';
import * as CanonicalUI from './index';

describe('Canonical Design System Primitives (R10 & R11 / G27–G38)', () => {
  it('R10: deve exportar todas as primitivas de layout canônicas', () => {
    expect(CanonicalUI.CanonicalPage).toBeDefined();
    expect(CanonicalUI.CanonicalShell).toBeDefined();
    expect(CanonicalUI.CanonicalSection).toBeDefined();
    expect(CanonicalUI.CanonicalStack).toBeDefined();
    expect(CanonicalUI.CanonicalGrid).toBeDefined();
    expect(CanonicalUI.CanonicalToolbar).toBeDefined();
    expect(CanonicalUI.CanonicalRail).toBeDefined();
    expect(CanonicalUI.CanonicalSplit).toBeDefined();
    expect(CanonicalUI.CanonicalBottomBar).toBeDefined();
  });

  it('R11: deve exportar todas as primitivas de formulário canônicas', () => {
    expect(CanonicalUI.CanonicalField).toBeDefined();
    expect(CanonicalUI.CanonicalFieldGroup).toBeDefined();
    expect(CanonicalUI.CanonicalFormRow).toBeDefined();
    expect(CanonicalUI.CanonicalFieldError).toBeDefined();
    expect(CanonicalUI.CanonicalFieldMatrix).toBeDefined();
    expect(CanonicalUI.CanonicalFormFooter).toBeDefined();
  });

  it('P5 & P7: deve exportar o modal adaptativo e a tabela de dados densa', () => {
    expect(CanonicalUI.AdaptiveModal).toBeDefined();
    expect(CanonicalUI.DenseDataGrid).toBeDefined();
  });
});
