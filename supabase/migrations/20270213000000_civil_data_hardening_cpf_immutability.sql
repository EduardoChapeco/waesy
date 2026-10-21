-- ============================================================================
-- Migration: 20270213000000_civil_data_hardening_cpf_immutability.sql
-- Descrição: Blindagem Civil de Identidade Única (1 CPF = 1 Conta Civil Única)
--            e Trava Permanente de Imutabilidade para CPF e Data de Nascimento.
-- ============================================================================

-- 1. Índice Único Funcional sobre os dígitos limpos do CPF em profiles
-- Impede duplicidades independentemente de pontuação (ex: 123.456.789-01 vs 12345678901)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_clean_unique_idx
  ON public.profiles (regexp_replace(cpf, '\D', '', 'g'))
  WHERE cpf IS NOT NULL AND regexp_replace(cpf, '\D', '', 'g') != '';

-- 2. Função de Trigger: Imutabilidade Estrita de Dados Civis
CREATE OR REPLACE FUNCTION public.enforce_civil_data_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_old_cpf_clean text;
  v_new_cpf_clean text;
BEGIN
  -- Extrair role do JWT quando disponível
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  -- 2.1. Trava de Imutabilidade do CPF
  -- Se o perfil já possuía CPF registrado (11 dígitos válidos), não é permitido alterar
  IF OLD.cpf IS NOT NULL AND trim(OLD.cpf) != '' THEN
    v_old_cpf_clean := regexp_replace(OLD.cpf, '\D', '', 'g');
    v_new_cpf_clean := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');

    -- Se o CPF já continha dígitos e o novo valor tentar alterar para outro diferente
    IF length(v_old_cpf_clean) = 11 AND v_new_cpf_clean <> v_old_cpf_clean THEN
      -- Somente service_role (Admin Master em ações extraordinárias) pode sobrepor
      IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'O CPF cadastrado é um dado civil único e imutável após registro na plataforma. Retificações judiciais requerem ouvidoria oficial.';
      END IF;
    END IF;
  END IF;

  -- 2.2. Trava de Imutabilidade da Data de Nascimento
  IF OLD.birth_date IS NOT NULL THEN
    IF NEW.birth_date IS DISTINCT FROM OLD.birth_date THEN
      IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'A data de nascimento civil é imutável após registrada na plataforma.';
      END IF;
    END IF;
  END IF;

  -- 2.3. Trava de Identidade Verificada (KYC / Facial / Documental)
  -- Se a conta estiver oficialmente verificada (is_verified = true), o nome completo civil não pode ser alterado diretamente
  IF OLD.is_verified = true THEN
    IF NEW.full_name IS DISTINCT FROM OLD.full_name AND trim(COALESCE(NEW.full_name, '')) <> trim(COALESCE(OLD.full_name, '')) THEN
      IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Este perfil possui verificação oficial de identidade (KYC). A alteração do nome civil requer revalidação documental pela ouvidoria.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Aplicação do Trigger na tabela public.profiles
DROP TRIGGER IF EXISTS trg_enforce_civil_data_immutability ON public.profiles;
CREATE TRIGGER trg_enforce_civil_data_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_civil_data_immutability();

COMMENT ON FUNCTION public.enforce_civil_data_immutability() IS
  'Garante que CPF e data de nascimento civil sejam estritamente imutáveis após o primeiro registro, e que contas com KYC aprovado não alterem nome civil sem auditoria.';
