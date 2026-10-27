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

describe('FASE 3 — Auditoria Cross-Tenant e RLS com Banco Real', () => {
  let userAId: string;
  let userBId: string;
  let addressBId: string;

  beforeAll(async () => {
    // 1. Busca perfis reais no banco
    const { rows: profiles } = await pool.query("SELECT id FROM profiles LIMIT 2");
    if (profiles.length >= 2) {
      userAId = profiles[0].id;
      userBId = profiles[1].id;
    } else {
      const insA = await pool.query("INSERT INTO profiles (full_name, cpf) VALUES ('User Tenant A', '11111111111') RETURNING id");
      const insB = await pool.query("INSERT INTO profiles (full_name, cpf) VALUES ('User Tenant B', '22222222222') RETURNING id");
      userAId = insA.rows[0].id;
      userBId = insB.rows[0].id;
    }

    // 2. Insere um endereço pertencente ao User B via conexão direta
    const { rows: addrRows } = await pool.query(`
      INSERT INTO user_addresses (user_id, label, street, number, neighborhood, city, state, zipcode)
      VALUES ($1, 'Casa B', 'Rua B', '100', 'Centro', 'Chapecó', 'SC', '89800000')
      RETURNING id
    `, [userBId]);
    addressBId = addrRows[0].id;
  });

  afterAll(async () => {
    if (addressBId) await pool.query("DELETE FROM user_addresses WHERE id = $1", [addressBId]);
    await pool.end();
  });

  it('deve confirmar que RLS está habilitada (relrowsecurity = true) nas tabelas transacionais no PostgreSQL', async () => {
    const { rows } = await pool.query(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('user_addresses', 'tickets', 'orders', 'financial_ledger_entries', 'mobility_requests')
    `);

    expect(rows.length).toBe(5);
    rows.forEach((r) => {
      expect(r.relrowsecurity).toBe(true);
    });
  });

  it('deve impedir que cliente anon leia endereços privados de outro usuário (retorna 0 linhas devido à RLS)', async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient
      .from('user_addresses')
      .select('*')
      .eq('id', addressBId);

    // Sem sessão do User B, a RLS do PostgreSQL filtra e retorna lista vazia
    expect(data).toBeDefined();
    expect(data!.length).toBe(0);
  });

  it('deve verificar políticas declaradas em pg_policies para user_addresses', async () => {
    const { rows } = await pool.query(`
      SELECT policyname, cmd, qual
      FROM pg_policies
      WHERE tablename = 'user_addresses'
    `);

    expect(rows.length).toBeGreaterThan(0);
    const hasOwnerRestriction = rows.some((p) => p.qual && p.qual.includes('user_id'));
    expect(hasOwnerRestriction).toBe(true);
  });

  it('deve verificar políticas declaradas em pg_policies para financial_ledger_entries', async () => {
    const { rows } = await pool.query(`
      SELECT policyname, cmd, qual
      FROM pg_policies
      WHERE tablename = 'financial_ledger_entries'
    `);

    expect(rows.length).toBeGreaterThan(0);
  });

  it('deve confirmar que tabelas com 0 policies bloqueiam acesso de leitura a clientes anônimos', async () => {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient
      .from('gift_card_events')
      .select('*')
      .limit(5);

    // RLS ativada com 0 policy = Deny All para anon/authenticated
    expect(data === null || data.length === 0).toBe(true);
  });
});
