export type EmploymentType = 'clt' | 'pj' | 'internship' | 'apprentice' | 'temporary' | 'freelancer';
export type EmployeeStatus = 'active' | 'on_leave' | 'vacation' | 'terminated' | 'suspended';
export type TimeEntryType = 'clock_in' | 'lunch_out' | 'lunch_in' | 'clock_out' | 'break_out' | 'break_in' | 'overtime_in' | 'overtime_out';
export type TimeEntrySource = 'web' | 'mobile_pwa' | 'biometric_terminal' | 'supervisor_manual';
export type TimeEntryStatus = 'verified' | 'pending_approval' | 'rejected' | 'adjusted';
export type PayslipStatus = 'draft' | 'issued' | 'paid' | 'acknowledged';
export type EmployeeRequestType = 'salary_advance' | 'leave_absence' | 'vacation' | 'time_adjustment' | 'reimbursement' | 'document_copy' | 'other';
export type EmployeeRequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
export type PinAttemptType = 'auth_success' | 'auth_failed' | 'pin_change' | 'pin_locked' | 'session_override';

export interface HrDepartment {
 id: string;
 store_id: string;
 name: string;
 description?: string | null;
 manager_id?: string | null;
 color_code: string;
 is_active: boolean;
 created_at: string;
 updated_at: string;
}

export interface HrPosition {
 id: string;
 store_id: string;
 department_id?: string | null;
 title: string;
 cbo_code?: string | null;
 description?: string | null;
 base_salary_cents: number;
 level: string;
 is_active: boolean;
 created_at: string;
 updated_at: string;
}

export interface WorkSchedule {
 weekly_hours: number;
 days: string[];
 daily_hours: number;
 flexible: boolean;
 shift_start?: string;
 shift_end?: string;
 break_duration_minutes?: number;
}

export interface Employee {
 id: string;
 store_id: string;
 profile_id?: string | null;
 full_name: string;
 cpf_masked?: string | null;
 cpf_hash?: string | null;
 email?: string | null;
 phone?: string | null;
 department_id?: string | null;
 position_id?: string | null;
 job_title: string;
 employment_type: EmploymentType;
 status: EmployeeStatus;
 base_salary_cents: number;
 hire_date: string;
 termination_date?: string | null;
 work_schedule: WorkSchedule;
 emergency_contact: Record<string, unknown>;
 metadata: Record<string, unknown>;
 created_at: string;
 updated_at: string;
 // Joins
 department?: HrDepartment | null;
 position?: HrPosition | null;
}

export interface TimeEntryGeolocation {
 latitude?: number;
 longitude?: number;
 accuracy?: number;
 altitude?: number | null;
 heading?: number | null;
 speed?: number | null;
 address?: string | null;
}

export interface EmployeeTimeEntry {
 id: string;
 store_id: string;
 employee_id: string;
 entry_type: TimeEntryType;
 recorded_at: string;
 source: TimeEntrySource;
 ip_address?: string | null;
 user_agent?: string | null;
 geolocation: TimeEntryGeolocation;
 photo_url?: string | null;
 status: TimeEntryStatus;
 adjustment_reason?: string | null;
 adjusted_by?: string | null;
 adjusted_at?: string | null;
 created_at: string;
 // Joins
 employee?: Pick<Employee, 'id' | 'full_name' | 'job_title'>;
}

export interface SalaryBreakdownItem {
 code: string;
 description: string;
 reference?: string;
 type: 'earning' | 'deduction' | 'neutral';
 amount_cents: number;
}

export interface EmployeePayslip {
 id: string;
 store_id: string;
 employee_id: string;
 reference_period: string; // 'YYYY-MM'
 gross_salary_cents: number;
 net_salary_cents: number;
 inss_discount_cents: number;
 irrf_discount_cents: number;
 fgts_provision_cents: number;
 transport_voucher_discount_cents: number;
 meal_voucher_discount_cents: number;
 other_discounts_cents: number;
 bonus_additions_cents: number;
 overtime_pay_cents: number;
 salary_breakdown: SalaryBreakdownItem[];
 pdf_document_url?: string | null;
 status: PayslipStatus;
 payment_date?: string | null;
 acknowledged_at?: string | null;
 acknowledged_ip?: string | null;
 created_at: string;
 updated_at: string;
 // Joins
 employee?: Pick<Employee, 'id' | 'full_name' | 'job_title'>;
}

export interface EmployeeRequest {
 id: string;
 store_id: string;
 employee_id: string;
 request_type: EmployeeRequestType;
 title: string;
 description: string;
 amount_cents?: number | null;
 start_date?: string | null;
 end_date?: string | null;
 attachment_urls: string[];
 status: EmployeeRequestStatus;
 reviewer_id?: string | null;
 reviewer_notes?: string | null;
 reviewed_at?: string | null;
 created_at: string;
 updated_at: string;
 // Joins
 employee?: Pick<Employee, 'id' | 'full_name' | 'job_title'>;
}

export interface EmployeePin {
 id: string;
 store_id: string;
 employee_id: string;
 pin_hash: string;
 salt: string;
 is_active: boolean;
 failed_attempts: number;
 locked_until?: string | null;
 last_used_at?: string | null;
 created_at: string;
 updated_at: string;
}

export interface EmployeeContextSession {
 id: string;
 store_id: string;
 employee_id: string;
 terminal_device_id: string;
 session_token: string;
 started_at: string;
 expires_at: string;
 is_revoked: boolean;
 revoked_at?: string | null;
}

export interface EmployeePinAuditLog {
 id: string;
 store_id: string;
 employee_id?: string | null;
 attempt_type: PinAttemptType;
 terminal_device_id?: string | null;
 ip_address?: string | null;
 user_agent?: string | null;
 details: Record<string, unknown>;
 created_at: string;
}

export interface JobPostingItem {
  id: string;
  title: string;
  department: string;
  location: string;
  work_model: "on_site" | "remote" | "hybrid";
  employment_type: "clt" | "pj" | "internship" | "temporary";
  salary_range?: string;
  description_markdown?: string;
}
