export type WmsBatchStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type WorkflowTriggerType = 'order_created' | 'order_paid' | 'lead_captured' | 'ticket_opened' | 'stock_low' | 'schedule_cron' | 'webhook';
export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'paused';
export type PwaDisplayMode = 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
export type PwaOrientation = 'portrait' | 'landscape' | 'any';
export type ReputationClaimCategory = 'atendimento' | 'entrega' | 'produto_defeituoso' | 'cobranca_indevida' | 'cancelamento_estorno' | 'outro';
export type ReputationClaimStatus = 'pending_store_response' | 'replied_by_store' | 'under_moderation' | 'resolved' | 'not_resolved' | 'cancelled';
export type { ReputationClaimCategory as ClaimCategory, ReputationClaimStatus as ClaimStatus };
export type ClaimSenderType = 'customer' | 'store_staff' | 'platform_moderator';
export type ReputationBadgeLevel = 'otimo' | 'bom' | 'regular' | 'ruim' | 'nao_recomendado' | 'sem_indice';

export interface WmsPickingBatch {
 id: string;
 store_id: string;
 batch_code: string;
 operator_id?: string | null;
 status: WmsBatchStatus;
 total_orders: number;
 total_items: number;
 total_picked: number;
 started_at?: string | null;
 completed_at?: string | null;
 created_at: string;
 updated_at: string;
}

export interface VisualWorkflowNode {
 id: string;
 type: string;
 position: { x: number; y: number };
 data: Record<string, unknown>;
}

export interface VisualWorkflowEdge {
 id: string;
 source: string;
 target: string;
 sourceHandle?: string | null;
 targetHandle?: string | null;
 label?: string | null;
}

export interface VisualWorkflow {
 id: string;
 store_id: string;
 title: string;
 description?: string | null;
 trigger_type: WorkflowTriggerType;
 nodes: VisualWorkflowNode[];
 edges: VisualWorkflowEdge[];
 is_active: boolean;
 version: number;
 metadata: Record<string, unknown>;
 created_at: string;
 updated_at: string;
}

export interface VisualWorkflowExecution {
 id: string;
 store_id: string;
 workflow_id: string;
 status: WorkflowExecutionStatus;
 trigger_event: string;
 input_payload: Record<string, unknown>;
 output_payload: Record<string, unknown>;
 execution_logs: Array<{ timestamp: string; node_id?: string; message: string; level: 'info' | 'warn' | 'error' }>;
 duration_ms: number;
 error_message?: string | null;
 started_at: string;
 finished_at?: string | null;
}

export interface StorePwaConfig {
 id: string;
 store_id: string;
 app_name: string;
 short_name: string;
 description?: string | null;
 theme_color: string;
 background_color: string;
 icon_192_url?: string | null;
 icon_512_url?: string | null;
 splash_image_url?: string | null;
 start_url: string;
 display_mode: PwaDisplayMode;
 orientation: PwaOrientation;
 custom_domain?: string | null;
 is_published: boolean;
 published_at?: string | null;
 settings: Record<string, any>;
 created_at: string;
 updated_at: string;
}

export interface StoreReputationClaim {
 id: string;
 store_id: string;
 customer_id?: string | null;
 customer_name: string;
 customer_email: string;
 customer_phone?: string | null;
 order_id?: string | null;
 title: string;
 description: string;
 category: ReputationClaimCategory;
 status: ReputationClaimStatus;
 public_token: string;
 is_public: boolean;
 satisfaction_rating?: number | null;
 would_buy_again?: boolean | null;
 resolved_at?: string | null;
 created_at: string;
 updated_at: string;
 // Joins
 messages?: StoreReputationMessage[];
}

export interface StoreReputationMessage {
 id: string;
 store_id: string;
 claim_id: string;
 sender_type: ClaimSenderType;
 sender_name: string;
 sender_id?: string | null;
 message: string;
 attachment_urls: string[];
 is_internal_note: boolean;
 created_at: string;
}

export interface StoreReputationScore {
 id: string;
 store_id: string;
 total_claims: number;
 answered_claims: number;
 resolved_claims: number;
 answered_rate_pct: number;
 solve_rate_pct: number;
 avg_response_time_hours: number;
 would_buy_again_pct: number;
 final_score: number;
 badge_level: ReputationBadgeLevel;
 updated_at: string;
}
