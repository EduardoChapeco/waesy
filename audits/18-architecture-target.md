# Onda 18 — Especificação da Arquitetura Alvo e Contratos de Fronteira

## 1. Contratos Fundamentais de Fronteira

A arquitetura alvo padroniza quatro contratos canônicos entre módulos:

### 1.1. Tool Contract (Registry de Ferramentas)
```typescript
export interface CanonicalToolContract<TInput = any, TOutput = any> {
  name: string;
  version: string;
  description: string;
  domain: "mining" | "commerce" | "documents" | "geo" | "ai";
  deterministic: boolean;
  side_effects: "none" | "reversible" | "external";
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
  fallback?: (input: TInput, error: Error) => Promise<TOutput>;
}
```

### 1.2. Evidence Object Contract (Groundedness Semântico)
```typescript
export interface EvidenceObject {
  claim: string;
  value: any;
  sources: Array<{
    document_id?: string;
    url: string;
    authority_score: number; // 0.0 a 1.0
    extracted_at: string;
  }>;
  status: "unverified" | "supported" | "verified" | "conflicting" | "stale";
  confidence_score: number;
}
```

### 1.3. Durable Workflow Contract (Resiliência)
```typescript
export interface DurableWorkflowContract {
  workflow_id: string;
  step_id: string;
  status: "pending" | "running" | "waiting_approval" | "completed" | "failed";
  idempotency_key: string;
  retry_count: number;
  payload: Record<string, any>;
  rollback_payload?: Record<string, any>;
}
```
