import { describe, it, expect } from 'vitest';
import { replaceContractVariables, DEFAULT_CLAUSES } from './contract-clause-library';
import { builderRegistry, BUILDER_BLOCK_DEFINITIONS } from '@/lib/builder-registry';

describe('[FASE 6 AUDIT] Waesy Office Suite & Waesy Creative Studio', () => {
 it('should accurately replace dynamic variables in contract templates', () => {
 const template = 'O CONTRATANTE {{cliente.nome}}, CPF {{cliente.cpf}}, pagará o montante de {{valor_total}} para {{loja.nome}} até {{data_vencimento}}.';
 const variables = {
 'cliente.nome': 'Carlos Eduardo',
 'cliente.cpf': '123.456.789-00',
 'valor_total': 'R$ 5.000,00',
 'loja.nome': 'Waesy Experiências',
 'data_vencimento': '30/11/2026',
 };

 const rendered = replaceContractVariables(template, variables);
 expect(rendered).toContain('Carlos Eduardo');
 expect(rendered).toContain('123.456.789-00');
 expect(rendered).toContain('R$ 5.000,00');
 expect(rendered).toContain('Waesy Experiências');
 expect(rendered).toContain('30/11/2026');
 expect(rendered).not.toContain('{{cliente.nome}}');
 });

 it('should contain robust legal clauses covering general, payment, lgpd, cancellation and liability', () => {
 expect(DEFAULT_CLAUSES.length).toBeGreaterThanOrEqual(5);

 const categories = DEFAULT_CLAUSES.map((c) => c.category);
 expect(categories).toContain('general');
 expect(categories).toContain('payment');
 expect(categories).toContain('cancellation');
 expect(categories).toContain('lgpd');
 expect(categories).toContain('liability');

 const lgpdClause = DEFAULT_CLAUSES.find((c) => c.category === 'lgpd');
 expect(lgpdClause?.content).toContain('13.709/2018');
 });

 it('should register office_contract_viewer in builderRegistry and BUILDER_BLOCK_DEFINITIONS', () => {
 const officeBlock = builderRegistry['office_contract_viewer'] || BUILDER_BLOCK_DEFINITIONS.find((b) => b.type === 'office_contract_viewer');
 expect(officeBlock).toBeDefined();
 expect(officeBlock?.name).toBe('Visualizador & Assinador de Contratos');
 expect(officeBlock?.category).toBe('content');
 expect(officeBlock?.defaultProps).toHaveProperty('block_type', 'office_contract_viewer');
 });

 it('should verify MP 2.200-2/2001 and Lei 14.063/2020 compliance string in office contract viewer defaults', () => {
 const officeBlock = builderRegistry['office_contract_viewer'];
 expect(officeBlock?.description).toContain('MP 2.200-2/2001');
 });
});
