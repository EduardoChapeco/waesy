import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  calculateDagLayers,
  calculateCriticalPath,
  validateDecompositionMece,
  generateMermaidDag,
  generateTraceabilityMatrix,
  TaskSpec,
  DecompositionResult,
  NormalizedPrd,
} from '@/lib/prd-decomposer';

describe('Skill decompose-prd & Hierarchical DAG Engine', () => {
  const sampleTasks: TaskSpec[] = [
    {
      id: 'TASK-DB-01',
      featureId: 'FEAT-CORE-01',
      name: 'Criar Migration e Tabelas no Postgres',
      objective: 'Persistência atômica',
      inputs: ['docs/DOMAIN_MODEL.md'],
      outputs: { codePath: 'supabase/migrations/20260929_split.sql' },
      acceptanceCriteria: [{ given: 'Banco rodando', when: 'Migrar', then: 'Tabela criada' }],
      dependencies: [],
      durationHours: 2,
    },
    {
      id: 'TASK-BFF-01',
      featureId: 'FEAT-CORE-01',
      name: 'Contratos Server Function com Zod',
      objective: 'BFF seguro',
      inputs: ['src/services/*.functions.ts'],
      outputs: { codePath: 'src/services/split.functions.ts' },
      acceptanceCriteria: [{ given: 'Sessão válida', when: 'Chamar', then: 'Retornar 200' }],
      dependencies: ['TASK-DB-01'],
      durationHours: 3,
    },
    {
      id: 'TASK-UI-01',
      featureId: 'FEAT-CORE-02',
      name: 'Componente Visual de Split',
      objective: 'Interface limpa',
      inputs: ['src/lib/money.ts'],
      outputs: { codePath: 'src/components/split-view.tsx' },
      acceptanceCriteria: [{ given: 'Dado carregado', when: 'Renderizar', then: 'Exibir tabela' }],
      dependencies: ['TASK-BFF-01'],
      durationHours: 4,
    },
    {
      id: 'TASK-ADMIN-01',
      featureId: 'FEAT-CORE-02',
      name: 'Painel de Governança no Workspace',
      objective: 'Auditoria de split',
      inputs: ['src/services/split.functions.ts'],
      outputs: { codePath: 'src/routes/workspace.financeiro.split.tsx' },
      acceptanceCriteria: [{ given: 'Admin logado', when: 'Acessar rota', then: 'Exibir extrato' }],
      dependencies: ['TASK-BFF-01'],
      durationHours: 2,
    },
    {
      id: 'TASK-TEST-01',
      featureId: 'FEAT-CORE-02',
      name: 'Suíte de Testes Vitest E2E',
      objective: 'Qualidade 100%',
      inputs: ['src/services/split.functions.ts'],
      outputs: { codePath: 'src/services/split.test.ts' },
      acceptanceCriteria: [{ given: 'Mock configurado', when: 'Rodar vitest', then: 'Passar 100%' }],
      dependencies: ['TASK-UI-01', 'TASK-ADMIN-01'],
      durationHours: 1,
    },
  ];

  describe('DAG Execution Layers & Topological Sort', () => {
    it('calculates execution layers properly (Layer 0 to Layer 3)', () => {
      const { layers, hasCycle } = calculateDagLayers(sampleTasks);
      expect(hasCycle).toBe(false);
      expect(layers.length).toBe(4);

      // Layer 0: Task without dependencies
      expect(layers[0]).toEqual(['TASK-DB-01']);
      // Layer 1: Depends on Layer 0
      expect(layers[1]).toEqual(['TASK-BFF-01']);
      // Layer 2: Depends on Layer 1 (parallel execution)
      expect(layers[2]).toContain('TASK-UI-01');
      expect(layers[2]).toContain('TASK-ADMIN-01');
      // Layer 3: Depends on Layer 2
      expect(layers[3]).toEqual(['TASK-TEST-01']);
    });

    it('detects cycles and reports cyclic nodes', () => {
      const cyclicTasks: TaskSpec[] = [
        {
          id: 'A',
          featureId: 'F1',
          name: 'Task A',
          objective: 'A',
          inputs: [],
          outputs: { codePath: 'a.ts' },
          acceptanceCriteria: [],
          dependencies: ['B'],
        },
        {
          id: 'B',
          featureId: 'F1',
          name: 'Task B',
          objective: 'B',
          inputs: [],
          outputs: { codePath: 'b.ts' },
          acceptanceCriteria: [],
          dependencies: ['A'],
        },
      ];

      const { hasCycle, cycleNodes } = calculateDagLayers(cyclicTasks);
      expect(hasCycle).toBe(true);
      expect(cycleNodes).toContain('A');
      expect(cycleNodes).toContain('B');
    });
  });

  describe('Critical Path Calculation', () => {
    it('identifies the longest sequential path in the DAG', () => {
      const criticalPath = calculateCriticalPath(sampleTasks);
      // DB (2) -> BFF (3) -> UI (4) -> TEST (1) = Total 10h (vs ADMIN that is 2h)
      expect(criticalPath).toEqual([
        'TASK-DB-01',
        'TASK-BFF-01',
        'TASK-UI-01',
        'TASK-TEST-01',
      ]);
    });
  });

  describe('MECE Validation (Mutually Exclusive, Collectively Exhaustive)', () => {
    const samplePrd: NormalizedPrd = {
      title: 'Split de Pagamentos',
      requirements: [
        { id: 'REQ-01', text: 'Cálculo de split em integer cents' },
        { id: 'REQ-02', text: 'Painel de extrato financeiro' },
      ],
    };

    const validDecomposition: DecompositionResult = {
      prdTitle: 'Split de Pagamentos',
      epics: [
        {
          id: 'EPIC-01',
          name: 'Núcleo Financeiro',
          objective: 'Liquidação de valores',
          userProblemsSolved: ['Retenção manual'],
          scope: { inScope: ['Split'], outOfScope: ['Crédito'] },
          features: [
            {
              id: 'FEAT-CORE-01',
              epicId: 'EPIC-01',
              name: 'Backend Split',
              userStory: { asA: 'Lojista', iWant: 'Split', soThat: 'Receber rápido' },
              acceptanceCriteria: [{ given: 'x', when: 'y', then: 'z' }],
              tasks: [sampleTasks[0], sampleTasks[1]],
            },
            {
              id: 'FEAT-CORE-02',
              epicId: 'EPIC-01',
              name: 'Frontend Split',
              userStory: { asA: 'Lojista', iWant: 'Painel', soThat: 'Conferir' },
              acceptanceCriteria: [{ given: 'x', when: 'y', then: 'z' }],
              tasks: [sampleTasks[2], sampleTasks[3], sampleTasks[4]],
            },
          ],
        },
      ],
      requirementMappings: {
        'REQ-01': ['TASK-DB-01', 'TASK-BFF-01'],
        'REQ-02': ['TASK-UI-01', 'TASK-ADMIN-01'],
      },
    };

    it('passes validation when MECE criteria are fully satisfied', () => {
      const validation = validateDecompositionMece(samplePrd, validDecomposition);
      expect(validation.isValid).toBe(true);
      expect(validation.coveragePercent).toBe(100);
      expect(validation.errors).toHaveLength(0);
    });

    it('fails when duplicate task ID violates Mutual Exclusivity', () => {
      const duplicateDecomp: DecompositionResult = {
        ...validDecomposition,
        epics: [
          {
            ...validDecomposition.epics[0],
            features: [
              {
                ...validDecomposition.epics[0].features[0],
                tasks: [sampleTasks[0], sampleTasks[0]], // Duplicate!
              },
            ],
          },
        ],
      };

      const validation = validateDecompositionMece(samplePrd, duplicateDecomp);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Violação de Exclusividade Mútua'))).toBe(true);
    });

    it('fails when a requirement lacks task mapping (violates Collectively Exhaustive)', () => {
      const unmappedDecomp: DecompositionResult = {
        ...validDecomposition,
        requirementMappings: {
          'REQ-01': ['TASK-DB-01'],
          // REQ-02 is omitted
        },
      };

      const validation = validateDecompositionMece(samplePrd, unmappedDecomp);
      expect(validation.isValid).toBe(false);
      expect(validation.coveragePercent).toBe(50);
      expect(validation.errors.some((e) => e.includes('Violação de Coletivamente Exaustivo'))).toBe(true);
    });
  });

  describe('Mermaid DAG & Traceability Generation', () => {
    it('generates Mermaid graph with critical path styling', () => {
      const criticalPath = ['TASK-DB-01', 'TASK-BFF-01', 'TASK-UI-01', 'TASK-TEST-01'];
      const mermaid = generateMermaidDag(sampleTasks, criticalPath);
      expect(mermaid).toContain('```mermaid');
      expect(mermaid).toContain('graph TD');
      expect(mermaid).toContain('TASK-DB-01 --> TASK-BFF-01');
      expect(mermaid).toContain('classDef critical stroke:#e11d48');
    });

    it('generates bidirectional traceability matrix', () => {
      const samplePrd: NormalizedPrd = {
        title: 'Split',
        requirements: [{ id: 'REQ-01', text: 'Cálculo integer cents' }],
      };
      const decomp: DecompositionResult = {
        prdTitle: 'Split',
        epics: [
          {
            id: 'EPIC-01',
            name: 'Financeiro',
            objective: 'Obj',
            userProblemsSolved: [],
            scope: { inScope: [], outOfScope: [] },
            features: [
              {
                id: 'FEAT-01',
                epicId: 'EPIC-01',
                name: 'Feat 1',
                userStory: { asA: '', iWant: '', soThat: '' },
                acceptanceCriteria: [],
                tasks: [sampleTasks[0]],
              },
            ],
          },
        ],
        requirementMappings: {
          'REQ-01': ['TASK-DB-01'],
        },
      };

      const matrix = generateTraceabilityMatrix(samplePrd, decomp);
      expect(matrix).toHaveLength(1);
      expect(matrix[0].requirementId).toBe('REQ-01');
      expect(matrix[0].epicId).toBe('EPIC-01');
      expect(matrix[0].featureId).toBe('FEAT-01');
      expect(matrix[0].isCovered).toBe(true);
    });
  });

  describe('Skill Artifacts, References and Templates Integrity', () => {
    const skillRoot = path.resolve(process.cwd(), '.agents/skills/decompose-prd');

    it('verifies decompose-prd SKILL.md exists with required metadata', () => {
      const skillFile = path.join(skillRoot, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, 'utf8');
      expect(content).toContain('name: decompose-prd');
      expect(content).toContain('MECE');
      expect(content).toContain('DAG');
    });

    it('verifies all 9 canonical references exist in references/', () => {
      const expectedRefs = [
        'ingestion-pipeline.md',
        'decomposition-engine.md',
        'dependency-graphs.md',
        'task-specifications.md',
        'clarification.md',
        'notion-integration.md',
        'context-management.md',
        'industry-patterns.md',
        'traceability.md',
      ];

      for (const ref of expectedRefs) {
        const filePath = path.join(skillRoot, 'references', ref);
        expect(fs.existsSync(filePath), `Missing reference file: ${ref}`).toBe(true);
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text.length).toBeGreaterThan(200);
      }
    });

    it('verifies all 7 templates exist in templates/', () => {
      const expectedTemplates = [
        'epic-template.md',
        'feature-template.md',
        'task-template.md',
        'dependency-graph.md',
        'notion-schema.md',
        'traceability-matrix.md',
        'clarification-form.md',
      ];

      for (const tpl of expectedTemplates) {
        const filePath = path.join(skillRoot, 'templates', tpl);
        expect(fs.existsSync(filePath), `Missing template file: ${tpl}`).toBe(true);
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text.length).toBeGreaterThan(100);
      }
    });
  });

  describe('AGENTS.md & BigTech Board Governance Integration', () => {
    it('verifies decompose-prd integration in AGENTS.md', () => {
      const agentsPath = path.resolve(process.cwd(), '.agents/AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf8');
      expect(content).toContain('decompose-prd');
      expect(content).toContain('28. **Mandato de Decomposição Hierárquica MECE');
      expect(content).toContain('Mandato de Decomposição Hierárquica MECE');
    });

    it('verifies decompose-prd in bigtech-board SKILL.md', () => {
      const boardPath = path.resolve(process.cwd(), '.agents/skills/bigtech-board/SKILL.md');
      const content = fs.readFileSync(boardPath, 'utf8');
      expect(content).toContain('decompose-prd');
      expect(content).toContain('DAG MECE');
    });
  });
});
