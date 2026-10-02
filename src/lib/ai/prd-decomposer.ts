/**
 * PRD Decomposition & DAG Engine
 * 
 * Implements hierarchical MECE decomposition (Epics -> Features -> Tasks),
 * topological sorting, execution layering, critical path calculation, and Mermaid DAG generation.
 * Reference: .agents/skills/decompose-prd/SKILL.md
 */

export interface PrdRequirement {
  id: string;
  text: string;
  section?: string;
  category?: 'functional' | 'non_functional' | 'security' | 'performance';
}

export interface NormalizedPrd {
  title: string;
  description?: string;
  requirements: PrdRequirement[];
  constraints?: {
    technical?: string[];
    temporal?: string[];
    budget?: string[];
  };
  metrics?: string[];
  stakeholders?: string[];
}

export interface TaskSpec {
  id: string;
  featureId: string;
  name: string;
  objective: string;
  inputs: string[];
  outputs: {
    codePath: string;
    testPath?: string;
  };
  acceptanceCriteria: Array<{
    given: string;
    when: string;
    then: string;
  }>;
  boundaryConditions?: string[];
  dependencies: string[]; // Task IDs that must complete first
  estimatedTokens?: number; // Target: 2000-4000 tokens
  durationHours?: number; // For critical path calculation
}

export interface FeatureSpec {
  id: string;
  epicId: string;
  name: string;
  userStory: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  acceptanceCriteria: Array<{
    given: string;
    when: string;
    then: string;
  }>;
  tasks: TaskSpec[];
}

export interface EpicSpec {
  id: string;
  name: string;
  objective: string;
  userProblemsSolved: string[];
  scope: {
    inScope: string[];
    outOfScope: string[];
  };
  features: FeatureSpec[];
}

export interface TraceabilityItem {
  requirementId: string;
  requirementText: string;
  epicId?: string;
  featureId?: string;
  taskIds: string[];
  isCovered: boolean;
}

export interface DecompositionResult {
  prdTitle: string;
  epics: EpicSpec[];
  requirementMappings: Record<string, string[]>; // reqId -> taskIds
}

export interface DagExecutionPlan {
  layers: string[][]; // Array of task IDs per layer
  hasCycle: boolean;
  cycleNodes?: string[];
  criticalPath: string[];
  parallelismFactor: number;
}

/**
 * Computes execution layers (Layer 0..N) using topological sort (Kahn's Algorithm).
 * Detects cycles and reports cycle members.
 */
export function calculateDagLayers(tasks: TaskSpec[]): {
  layers: string[][];
  hasCycle: boolean;
  cycleNodes?: string[];
} {
  const taskMap = new Map<string, TaskSpec>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>(); // u -> list of tasks that depend on u

  for (const t of tasks) {
    taskMap.set(t.id, t);
    inDegree.set(t.id, 0);
    adjList.set(t.id, []);
  }

  // Build edges: dep -> t.id
  for (const t of tasks) {
    for (const depId of t.dependencies) {
      if (taskMap.has(depId)) {
        adjList.get(depId)!.push(t.id);
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      }
    }
  }

  const layers: string[][] = [];
  const processed = new Set<string>();

  // Layer 0: all tasks with inDegree === 0
  let currentLayer = tasks.filter((t) => inDegree.get(t.id) === 0).map((t) => t.id);

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    const nextLayer: string[] = [];

    for (const u of currentLayer) {
      processed.add(u);
      const dependents = adjList.get(u) || [];

      for (const v of dependents) {
        const currentDeg = inDegree.get(v)! - 1;
        inDegree.set(v, currentDeg);
        if (currentDeg === 0) {
          nextLayer.push(v);
        }
      }
    }

    currentLayer = nextLayer;
  }

  const hasCycle = processed.size < tasks.length;
  const cycleNodes = hasCycle
    ? tasks.filter((t) => !processed.has(t.id)).map((t) => t.id)
    : undefined;

  return {
    layers,
    hasCycle,
    cycleNodes,
  };
}

/**
 * Calculates the critical path through the DAG (longest sequential path).
 */
export function calculateCriticalPath(tasks: TaskSpec[]): string[] {
  const taskMap = new Map<string, TaskSpec>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const { layers, hasCycle } = calculateDagLayers(tasks);
  if (hasCycle || tasks.length === 0) {
    return [];
  }

  // Dynamic programming for longest path
  const dist = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const t of tasks) {
    const cost = t.durationHours ?? 1;
    dist.set(t.id, cost);
    parent.set(t.id, null);
  }

  // Iterate in topological order (through layers)
  for (const layer of layers) {
    for (const taskId of layer) {
      const currentTask = taskMap.get(taskId)!;
      const currentCost = currentTask.durationHours ?? 1;

      for (const depId of currentTask.dependencies) {
        if (taskMap.has(depId)) {
          const candidateDist = (dist.get(depId) || 0) + currentCost;
          if (candidateDist > (dist.get(taskId) || 0)) {
            dist.set(taskId, candidateDist);
            parent.set(taskId, depId);
          }
        }
      }
    }
  }

  // Find task with maximum distance
  let maxEndTask = tasks[0].id;
  let maxDist = dist.get(maxEndTask) || 0;

  for (const [taskId, d] of dist.entries()) {
    if (d > maxDist) {
      maxDist = d;
      maxEndTask = taskId;
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = maxEndTask;

  while (curr !== null) {
    path.unshift(curr);
    curr = parent.get(curr) || null;
  }

  return path;
}

/**
 * Validates MECE principles, depth limits, and complete PRD coverage.
 */
export function validateDecompositionMece(
  prd: NormalizedPrd,
  result: DecompositionResult
): {
  isValid: boolean;
  coveragePercent: number;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check Epics count (3 to 7)
  if (result.epics.length < 1) {
    errors.push('Decomposição sem nenhum épico definido.');
  } else if (result.epics.length > 7) {
    warnings.push(`Total de épicos (${result.epics.length}) excede a recomendação de 3 a 7 por PRD.`);
  }

  const allTasks: TaskSpec[] = [];
  const taskIdSet = new Set<string>();

  for (const epic of result.epics) {
    if (epic.features.length === 0) {
      errors.push(`Épico ${epic.id} não possui funcionalidades.`);
    }

    for (const feat of epic.features) {
      if (feat.tasks.length === 0) {
        errors.push(`Funcionalidade ${feat.id} não possui tarefas.`);
      }

      for (const task of feat.tasks) {
        if (taskIdSet.has(task.id)) {
          errors.push(`Violação de Exclusividade Mútua (MECE): ID de tarefa duplicado "${task.id}".`);
        }
        taskIdSet.add(task.id);
        allTasks.push(task);

        // Check task token granularity (2000-4000)
        if (task.estimatedTokens && (task.estimatedTokens < 1000 || task.estimatedTokens > 5000)) {
          warnings.push(
            `Tarefa ${task.id} com orçamento de tokens (${task.estimatedTokens}) fora da faixa recomendada de 2000-4000 tokens.`
          );
        }

        // Check interface outputs
        if (!task.outputs?.codePath) {
          errors.push(`Tarefa ${task.id} não especifica o caminho de código de saída (codePath).`);
        }
      }
    }
  }

  // Check DAG integrity
  const { hasCycle, cycleNodes } = calculateDagLayers(allTasks);
  if (hasCycle) {
    errors.push(`Grafo de dependência contém dependência circular (ciclo) nos nós: ${cycleNodes?.join(', ')}.`);
  }

  // Check PRD Coverage
  const coveredReqs = new Set<string>();
  for (const [reqId, taskIds] of Object.entries(result.requirementMappings)) {
    if (taskIds && taskIds.length > 0) {
      coveredReqs.add(reqId);
    }
  }

  const totalReqs = prd.requirements.length;
  const coveredCount = prd.requirements.filter((r) => coveredReqs.has(r.id)).length;
  const coveragePercent = totalReqs > 0 ? Math.round((coveredCount / totalReqs) * 100) : 100;

  if (coveragePercent < 100) {
    const missing = prd.requirements.filter((r) => !coveredReqs.has(r.id)).map((r) => r.id);
    errors.push(
      `Violação de Coletivamente Exaustivo (MECE): ${missing.length} requisitos sem mapeamento de tarefas: ${missing.join(', ')}.`
    );
  }

  return {
    isValid: errors.length === 0,
    coveragePercent,
    errors,
    warnings,
  };
}

/**
 * Generates clean, human-readable Mermaid diagram of the DAG with critical path highlighting.
 */
export function generateMermaidDag(tasks: TaskSpec[], criticalPath: string[] = []): string {
  const criticalSet = new Set(criticalPath);
  const lines: string[] = ['```mermaid', 'graph TD'];

  for (const t of tasks) {
    const safeName = t.name.replace(/"/g, "'");
    lines.push(`  ${t.id}["${t.id}: ${safeName}"]`);
  }

  for (const t of tasks) {
    for (const dep of t.dependencies) {
      lines.push(`  ${dep} --> ${t.id}`);
    }
  }

  if (criticalSet.size > 0) {
    lines.push('  classDef critical stroke:#e11d48,stroke-width:2px,font-weight:bold;');
    const criticalList = tasks.filter((t) => criticalSet.has(t.id)).map((t) => t.id);
    if (criticalList.length > 0) {
      lines.push(`  class ${criticalList.join(',')} critical;`);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Builds bidirectional traceability list from PRD and decomposition result.
 */
export function generateTraceabilityMatrix(
  prd: NormalizedPrd,
  result: DecompositionResult
): TraceabilityItem[] {
  const taskToFeatureEpic = new Map<string, { featureId: string; epicId: string }>();

  for (const epic of result.epics) {
    for (const feat of epic.features) {
      for (const t of feat.tasks) {
        taskToFeatureEpic.set(t.id, { featureId: feat.id, epicId: epic.id });
      }
    }
  }

  return prd.requirements.map((req) => {
    const taskIds = result.requirementMappings[req.id] || [];
    const firstTask = taskIds[0] ? taskToFeatureEpic.get(taskIds[0]) : undefined;

    return {
      requirementId: req.id,
      requirementText: req.text,
      epicId: firstTask?.epicId,
      featureId: firstTask?.featureId,
      taskIds,
      isCovered: taskIds.length > 0,
    };
  });
}
