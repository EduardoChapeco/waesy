-- 20261029160000_services_erp_granular_architecture.sql
-- Motor Especializado de Serviços, ERP Multi-Nicho, Acordos Salão Parceiro, Insumos, Anamnese e Permissões

-- 1. Tabela de Acordos de Parceiros / Lei do Salão Parceiro
CREATE TABLE IF NOT EXISTS public.workspace_partner_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    is_partner_law BOOLEAN NOT NULL DEFAULT true,
    receives_commission BOOLEAN NOT NULL DEFAULT true,
    is_stockkeeper BOOLEAN NOT NULL DEFAULT false,
    
    -- Filtros e Regras Temporais
    date_filter_mode TEXT NOT NULL DEFAULT 'availability' CHECK (date_filter_mode IN ('competence', 'availability')),
    order_status_filter TEXT NOT NULL DEFAULT 'finalized' CHECK (order_status_filter IN ('all', 'finalized')),
    
    -- Divisão de Custos Operacionais
    gateway_fee_bearer TEXT NOT NULL DEFAULT 'proportional' CHECK (gateway_fee_bearer IN ('proportional', 'store_100', 'pro_100', 'split_50')),
    discount_bearer TEXT NOT NULL DEFAULT 'store_100' CHECK (discount_bearer IN ('proportional', 'store_100', 'pro_100', 'split_50')),
    additional_cost_deduction BOOLEAN NOT NULL DEFAULT false,
    consumed_products_deduction TEXT NOT NULL DEFAULT 'pro_commission' CHECK (consumed_products_deduction IN ('pro_commission', 'service_net', 'none')),
    consumed_products_price_basis TEXT NOT NULL DEFAULT 'none' CHECK (consumed_products_price_basis IN ('none', 'cost_price', 'sale_price', 'pro_special_price')),
    
    -- Taxa Administrativa e Recibo
    admin_fee_active BOOLEAN NOT NULL DEFAULT false,
    admin_fee_percentage NUMERIC(5,2) DEFAULT 0.00,
    admin_fee_base TEXT DEFAULT 'net' CHECK (admin_fee_base IN ('gross', 'net')),
    show_gross_value_report BOOLEAN NOT NULL DEFAULT false,
    digital_signature_url TEXT,
    declaration_template TEXT DEFAULT 'Declaro que recebi de %EMPRESA%, o valor líquido de R$ %VALOR% referente aos serviços executados.',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_employee_agreement UNIQUE (store_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_agreements_store ON public.workspace_partner_agreements (store_id);

-- 2. Ficha Técnica de Produtos Consumidos por Serviço (BOM / Insumos)
CREATE TABLE IF NOT EXISTS public.service_consumed_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    service_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity NUMERIC(10,3) NOT NULL DEFAULT 1.000,
    unit_measure TEXT NOT NULL DEFAULT 'unidade',
    tolerance_extra NUMERIC(10,3) DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_consumed_store_svc ON public.service_consumed_materials (store_id, service_id);

-- 3. Comissões Compostas e Auxiliares por Serviço
CREATE TABLE IF NOT EXISTS public.service_collaborator_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    service_id UUID NOT NULL,
    employee_id UUID, -- NULL = regra padrão para qualquer assistente
    commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent', 'fixed')),
    commission_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_source TEXT NOT NULL DEFAULT 'establishment' CHECK (discount_source IN ('establishment', 'professional', 'split')),
    establishment_split_ratio NUMERIC(5,2) DEFAULT 50.00,
    calculation_base TEXT NOT NULL DEFAULT 'gross' CHECK (calculation_base IN ('gross', 'net')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_splits_store_svc ON public.service_collaborator_splits (store_id, service_id);

-- 4. Anamneses e Questionários com Assinatura Digital
CREATE TABLE IF NOT EXISTS public.customer_anamnesis_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    template_name TEXT NOT NULL DEFAULT 'Geral',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'signed')),
    answers_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    signature_vector TEXT,
    signature_ip_address TEXT,
    signature_user_agent TEXT,
    signed_at TIMESTAMPTZ,
    public_token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_anamnesis_store_cust ON public.customer_anamnesis_records (store_id, customer_id);

-- 5. Matriz Tátil de Permissões por Cargo/Função
CREATE TABLE IF NOT EXISTS public.workspace_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    module_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_role_permissions UNIQUE (store_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_store ON public.workspace_role_permissions (store_id);

-- 6. Tabela de Documentos Fiscais em Linha (NFSe, NFe, NFCe com IBS / CBS)
CREATE TABLE IF NOT EXISTS public.order_fiscal_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('NFSe', 'NFe', 'NFCe')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'rejected', 'cancelled')),
    access_key TEXT,
    protocol_number TEXT,
    danfe_pdf_url TEXT,
    xml_url TEXT,
    rejection_reason TEXT,
    
    lc116_code TEXT,
    cnae_code TEXT,
    municipal_service_code TEXT,
    iss_rate NUMERIC(5,2),
    ibs_rate NUMERIC(5,2),
    cbs_rate NUMERIC(5,2),
    gross_amount_cents BIGINT NOT NULL DEFAULT 0,
    net_amount_cents BIGINT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_order ON public.order_fiscal_invoices (store_id, order_id);

-- RLS: Habilitar em todas as novas tabelas
ALTER TABLE public.workspace_partner_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_consumed_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_collaborator_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_anamnesis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_fiscal_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por store_id
CREATE POLICY p_partner_agreements_all ON public.workspace_partner_agreements
    FOR ALL USING (store_id = (current_setting('app.current_store_id', true))::uuid);

CREATE POLICY p_service_materials_all ON public.service_consumed_materials
    FOR ALL USING (store_id = (current_setting('app.current_store_id', true))::uuid);

CREATE POLICY p_service_splits_all ON public.service_collaborator_splits
    FOR ALL USING (store_id = (current_setting('app.current_store_id', true))::uuid);

CREATE POLICY p_customer_anamnesis_all ON public.customer_anamnesis_records
    FOR ALL USING (store_id = (current_setting('app.current_store_id', true))::uuid);

CREATE POLICY p_role_permissions_all ON public.workspace_role_permissions
    FOR ALL USING (store_id = (current_setting('app.current_store_id', true))::uuid);

CREATE POLICY p_order_fiscal_all ON public.order_fiscal_invoices
    FOR ALL USING (store_id = (current_setting('app.current_store_id', true))::uuid);
