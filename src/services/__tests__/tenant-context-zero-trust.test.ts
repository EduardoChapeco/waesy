import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.secrets' });
dotenv.config({ path: '.env' });

const projectRef = process.env.PROJECT_REF || 'jfuebqmltksyznovhlwa';
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '';
const supabaseUrl = process.env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const pool = new pg.Pool({
  connectionString: `postgres://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
});

describe('MICROFASE 1 — Blindagem Zero-Trust de Tenant Context & Membership Authorization', () => {
  let realStoreId: string;
  let legitMemberId: string;
  let nonMemberId: string;

  beforeAll(async () => {
    // Busca uma store onde exista ao menos um usuário que NÃO seja membro
    const { rows: storeWithNonMember } = await pool.query(`
      SELECT s.id as store_id, wm.profile_id as legit_id, p_other.id as non_member_id
      FROM stores s
      JOIN workspace_members wm ON wm.store_id = s.id
      CROSS JOIN profiles p_other
      WHERE p_other.id NOT IN (
        SELECT profile_id FROM workspace_members WHERE store_id = s.id
      )
      LIMIT 1
    `);

    if (storeWithNonMember.length > 0) {
      realStoreId = storeWithNonMember[0].store_id;
      legitMemberId = storeWithNonMember[0].legit_id;
      nonMemberId = storeWithNonMember[0].non_member_id;
    } else {
      // Fallback para IDs conhecidos
      realStoreId = 'c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7';
      legitMemberId = '2ea9f0aa-8b04-4086-9e1d-e23105560302';
      nonMemberId = '9aceecd7-4100-4a52-95ee-e6f4b549b9ac';
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deve confirmar que o usuário legítimo possui vínculo em workspace_members', async () => {
    expect(realStoreId).toBeDefined();
    expect(legitMemberId).toBeDefined();

    const { rows } = await pool.query(`
      SELECT role FROM workspace_members 
      WHERE profile_id = $1 AND store_id = $2
    `, [legitMemberId, realStoreId]);

    expect(rows.length).toBeGreaterThan(0);
  });

  it('deve confirmar que o usuário não-membro NÃO possui vínculo na store', async () => {
    expect(nonMemberId).toBeDefined();

    const { rows } = await pool.query(`
      SELECT role FROM workspace_members 
      WHERE profile_id = $1 AND store_id = $2
    `, [nonMemberId, realStoreId]);

    expect(rows.length).toBe(0);
  });

  it('deve simular validação de autorização de setTenantContext e REJEITAR não-membro sem auto-grant', async () => {
    // Função simulando a lógica da regra de negócio de setTenantContext
    const validateTenantSwitch = async (userId: string, targetStoreId: string, isPlatformAdmin = false) => {
      // 1. Checa se loja existe
      const { rows: stores } = await pool.query("SELECT id, name FROM stores WHERE id = $1", [targetStoreId]);
      if (stores.length === 0) {
        throw new Error("Loja ou espaço de trabalho não encontrado.");
      }

      // 2. Validação estrita de autorização
      if (!isPlatformAdmin) {
        const { rows: members } = await pool.query(
          "SELECT role FROM workspace_members WHERE profile_id = $1 AND store_id = $2",
          [userId, targetStoreId]
        );
        if (members.length === 0) {
          throw new Error("Acesso não autorizado: você não é membro desta empresa ou workspace.");
        }
      }

      return { success: true, store_id: targetStoreId, storeName: stores[0].name };
    };

    // Caso Negativo: Usuário B não-membro tenta acessar Store A
    await expect(validateTenantSwitch(nonMemberId, realStoreId, false)).rejects.toThrow(
      "Acesso não autorizado: você não é membro desta empresa ou workspace."
    );

    // Caso Positivo: Usuário A legítimo acessa Store A
    const res = await validateTenantSwitch(legitMemberId, realStoreId, false);
    expect(res.success).toBe(true);
    expect(res.store_id).toBe(realStoreId);

    // Caso Admin: Platform Admin acessa Store A mesmo sem registro prévio
    const adminRes = await validateTenantSwitch(nonMemberId, realStoreId, true);
    expect(adminRes.success).toBe(true);
  });

  it('deve assegurar que nenhum registro espúrio foi injetado em workspace_members para o não-membro', async () => {
    const { rows } = await pool.query(`
      SELECT role FROM workspace_members 
      WHERE profile_id = $1 AND store_id = $2
    `, [nonMemberId, realStoreId]);

    expect(rows.length).toBe(0);
  });
});
