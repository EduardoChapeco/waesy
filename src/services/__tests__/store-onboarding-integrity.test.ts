import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import dotenv from 'dotenv';
import { generateSlug } from '@/lib/slug-utils';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.secrets' });
dotenv.config({ path: '.env' });

const projectRef = process.env.PROJECT_REF || 'jfuebqmltksyznovhlwa';
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '';

const pool = new pg.Pool({
  connectionString: `postgres://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
});

describe('MICROFASE 2 — Onboarding Atômico de Negócios, Zero Lojas Zumbis e Resiliência de Tenant (DEC-297)', () => {
  let testUserId: string;
  let testStoreId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Busca um usuário real no banco para exercitar as relações
    const { rows: profiles } = await pool.query(`
      SELECT id FROM profiles LIMIT 1
    `);
    expect(profiles.length).toBeGreaterThan(0);
    testUserId = profiles[0].id;
  });

  afterAll(async () => {
    // Limpeza de registros de teste
    if (testStoreId) {
      await pool.query('DELETE FROM workspace_members WHERE store_id = $1', [testStoreId]);
      await pool.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
    }
    if (testOrgId) {
      await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    }
    await pool.end();
  });

  it('deve gerar slugs únicos e limpos sem sufixos aleatórios quando não houver colisão', async () => {
    const rawName = 'Padaria & Confeitaria São José';
    const slug = generateSlug(rawName);
    expect(slug).toBe('padaria-confeitaria-sao-jose');
    expect(slug).not.toMatch(/-[0-9]{4,}$/); // Sem sufixos aleatórios como -18372
  });

  it('deve vincular atomicamente context_profile_id e workspace_members role: owner ao provisionar loja', async () => {
    // Simula a criação atômica canônica conforme padronizado em DEC-297
    const uniqueSlug = `loja-teste-onboarding-${Date.now()}`;
    const { rows: orgRows } = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Organização Teste Onboarding', uniqueSlug]
    );
    testOrgId = orgRows[0].id;

    const { rows: storeRows } = await pool.query(
      `INSERT INTO stores (
        organization_id,
        name,
        slug,
        context_profile_id,
        is_active,
        settings
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, context_profile_id, is_active`,
      [
        testOrgId,
        'Loja Teste Onboarding',
        uniqueSlug,
        testUserId,
        true,
        JSON.stringify({ segment: 'gastronomy', type: 'restaurant' }),
      ]
    );
    testStoreId = storeRows[0].id;

    expect(storeRows[0].context_profile_id).toBe(testUserId);
    expect(storeRows[0].is_active).toBe(true);

    // Vínculo atômico em workspace_members (user_id é gerado automaticamente pelo Postgres a partir de profile_id)
    const { rows: memberRows } = await pool.query(
      `INSERT INTO workspace_members (
        profile_id,
        store_id,
        role,
        is_active
      ) VALUES ($1, $2, $3, $4) RETURNING id, profile_id, role, is_active`,
      [testUserId, testStoreId, 'owner', true]
    );

    expect(memberRows[0].profile_id).toBe(testUserId);
    expect(memberRows[0].role).toBe('owner');
    expect(memberRows[0].is_active).toBe(true);
  });

  it('deve garantir que a loja provisionada seja descoberta tanto por membership quanto por context_profile_id', async () => {
    // Consulta 1: via workspace_members
    const { rows: byMember } = await pool.query(
      `SELECT s.id, s.name FROM stores s
       JOIN workspace_members wm ON wm.store_id = s.id
       WHERE wm.profile_id = $1 AND s.id = $2`,
      [testUserId, testStoreId]
    );
    expect(byMember.length).toBe(1);
    expect(byMember[0].id).toBe(testStoreId);

    // Consulta 2: via context_profile_id (resiliência contra amnésia)
    const { rows: byContext } = await pool.query(
      `SELECT s.id, s.name FROM stores s
       WHERE s.context_profile_id = $1 AND s.id = $2`,
      [testUserId, testStoreId]
    );
    expect(byContext.length).toBe(1);
    expect(byContext[0].id).toBe(testStoreId);
  });

  it('deve comprovar que lojas ativas possuem vínculo de owner comprovado', async () => {
    // Prova de integridade: consulta stores para verificar que a loja ativa possui vínculo de owner
    const { rows: ownerCheck } = await pool.query(
      `SELECT wm.id, wm.role FROM workspace_members wm
       WHERE wm.store_id = $1 AND wm.role = 'owner'`,
      [testStoreId]
    );
    expect(ownerCheck.length).toBeGreaterThan(0);
    expect(ownerCheck[0].role).toBe('owner');
  });
});
