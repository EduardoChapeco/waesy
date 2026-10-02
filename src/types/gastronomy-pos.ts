export type TableStatus = 'available' | 'occupied' | 'reserved' | 'billing' | 'cleaning' | 'blocked';
export type TableZone = 'salao' | 'varanda' | 'mezanino' | 'externo' | 'bar';
export type ServiceType = 'dine_in' | 'takeout' | 'delivery' | 'drive_thru';
export type KdsPriority = 'low' | 'normal' | 'high' | 'urgent';
export type KdsOrderStatus = 'pending' | 'in_preparation' | 'ready' | 'collected' | 'cancelled';
export type KdsItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type MultiPaymentMethod = 'cash' | 'pix' | 'credit_card' | 'debit_card' | 'meal_voucher' | 'store_credit' | 'cryptocurrency' | 'other';
export type PosPaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
export type { PosPaymentStatus as PaymentStatus };

export interface KdsStation {
 id: string;
 store_id: string;
 name: string;
 slug: string;
 color_code: string;
 icon: string;
 target_prep_time_minutes: number;
 warning_threshold_minutes: number;
 critical_threshold_minutes: number;
 is_active: boolean;
 assigned_categories: string[];
 created_at: string;
 updated_at: string;
}

export interface RestaurantTable {
 id: string;
 store_id: string;
 table_number: number;
 table_name?: string | null;
 zone: TableZone | string;
 capacity: number;
 status: TableStatus;
 active_order_id?: string | null;
 assigned_waiter_id?: string | null;
 pos_x: number;
 pos_y: number;
 current_guests_count: number;
 opened_at?: string | null;
 metadata: Record<string, any>;
 created_at: string;
 updated_at: string;
}

export interface KdsOrderItem {
 id: string;
 store_id: string;
 kds_order_id: string;
 station_id?: string | null;
 product_id?: string | null;
 product_name: string;
 quantity: number;
 notes?: string | null;
 modifiers: Array<{ name: string; price_cents?: number }>;
 status: KdsItemStatus;
 started_at?: string | null;
 finished_at?: string | null;
 prep_time_seconds?: number | null;
 created_at: string;
 // Joins
 station?: KdsStation | null;
}

export interface KdsOrder {
 id: string;
 store_id: string;
 order_id?: string | null;
 table_id?: string | null;
 daily_ticket_number: number;
 comanda_identifier: string;
 service_type: ServiceType;
 priority: KdsPriority;
 status: KdsOrderStatus;
 waiter_name?: string | null;
 customer_notes?: string | null;
 prep_started_at?: string | null;
 prep_completed_at?: string | null;
 collected_at?: string | null;
 total_prep_time_seconds?: number | null;
 created_at: string;
 updated_at: string;
 // Joins
 items?: KdsOrderItem[];
 table?: RestaurantTable | null;
}

export interface PosMultiPayment {
 id: string;
 store_id: string;
 order_id: string;
 cash_register_id?: string | null;
 payment_method: MultiPaymentMethod;
 amount_cents: number;
 change_cents: number;
 installments: number;
 card_brand?: string | null;
 authorization_code?: string | null;
 payer_name?: string | null;
 payer_document_masked?: string | null;
 status: PosPaymentStatus;
 received_by?: string | null;
 metadata: Record<string, any>;
 created_at: string;
}
