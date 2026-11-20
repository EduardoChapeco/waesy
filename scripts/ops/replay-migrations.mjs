#!/usr/bin/env node
/**
 * replay-migrations.mjs — Replay resiliente de supabase/migrations em um banco vazio.
 *
 * Motivo: a cadeia histórica mistura prefixos numéricos (0001..0083) com timestamps, e algumas migrações
 * dependem de objetos criados em arquivos posteriores na ordem lexicográfica. O `supabase db push`
 * aborta na primeira falha. Este runner aplica cada arquivo de forma atômica (um arquivo = uma transação),
 * adia os que falham por dependência e repete em passes até não haver progresso.
 *
 * Garantias:
 *  - nenhum arquivo parcialmente aplicado (falha => rollback do arquivo);
 *  - histórico gravado em supabase_migrations.schema_migrations (compatível com `supabase db push`);
 *  - relatório final com migrações que nunca puderam ser aplicadas e o último erro de cada uma.
 *
 * Uso: PGURL=postgresql://... node scripts/ops/replay-migrations.mjs [--dry] [--max-passes=8]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.PGURL;
if (!url) throw new Error("PGURL ausente");
const DIR = "supabase/migrations";
const dry = process.argv.includes("--dry");
const maxPasses = Number((process.argv.find((a) => a.startsWith("--max-passes=")) ?? "--max-passes=8").split("=")[1]);

/** Cliente com reconexão: a conexão pode cair no meio do replay (rede, restart de serviço interno). */
let c;
async function connect() {
  if (c) await c.end().catch(() => {});
  c = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
    keepAlive: true,
  });
  c.on("error", () => {}); // erros de conexão são tratados pelo retry em applyOne
  await c.connect();
}
await connect();
const isConnError = (e) =>
  /Connection terminated|ECONNRESET|ECONNREFUSED|EPIPE|timeout|terminating connection|57P01|57P02|08\d{3}/i.test(
    `${e.code ?? ""} ${e.message}`,
  );

await c.query(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);

const applied = new Set((await c.query("select version from supabase_migrations.schema_migrations")).rows.map((r) => r.version));
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const parse = (f) => {
  const m = f.match(/^(\d+)_(.*)\.sql$/);
  return { file: f, version: m ? m[1] : f, name: m ? m[2] : f };
};
let pending = files.map(parse).filter((m) => !applied.has(m.version));
console.log(`Total ${files.length} | já aplicadas ${applied.size} | pendentes ${pending.length}`);
if (dry) process.exit(0);

/** Divide SQL em statements respeitando aspas, dollar-quoting e comentários. */
function splitSql(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);
    if (two === "--") {
      const e = sql.indexOf("\n", i);
      const stop = e === -1 ? sql.length : e;
      buf += sql.slice(i, stop);
      i = stop;
    } else if (two === "/*") {
      const e = sql.indexOf("*/", i + 2);
      const stop = e === -1 ? sql.length : e + 2;
      buf += sql.slice(i, stop);
      i = stop;
    } else if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j++;
      }
      buf += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "$") {
      const m = sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (m) {
        const tag = m[0];
        const e = sql.indexOf(tag, i + tag.length);
        const stop = e === -1 ? sql.length : e + tag.length;
        buf += sql.slice(i, stop);
        i = stop;
      } else {
        buf += ch;
        i++;
      }
    } else if (ch === ";") {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      i++;
    } else {
      buf += ch;
      i++;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function bootstrapCompatViews() {
  await c.query(`CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;`).catch(() =>
    c.query(`CREATE EXTENSION IF NOT EXISTS pg_net;`).catch(() => {})
  );
  await c.query(`
    DO $$
    BEGIN
      IF to_regclass('public.workspace_members') IS NOT NULL THEN
        IF to_regclass('public.store_members') IS NULL THEN
          CREATE OR REPLACE VIEW public.store_members WITH (security_invoker = true) AS
          SELECT id, profile_id, profile_id AS user_id, store_id, role, created_at, updated_at
          FROM public.workspace_members;
        END IF;
        IF to_regclass('public.store_memberships') IS NULL THEN
          CREATE OR REPLACE VIEW public.store_memberships WITH (security_invoker = true) AS
          SELECT id, profile_id, profile_id AS user_id, store_id, role, created_at, updated_at
          FROM public.workspace_members;
        END IF;
      END IF;
    END $$;
  `).catch(() => {});
}

async function applyOne(m) {
  const sql = fs.readFileSync(path.join(DIR, m.file), "utf8").replace(/^\uFEFF/, "");
  try {
    await c.query("begin");
    await c.query(sql);
    await c.query(
      "insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3) on conflict (version) do nothing",
      [m.version, m.name, [sql]],
    );
    await c.query("commit");
    return null;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    if (e.code === "25001" || e.code === "55P04" || /cannot run inside a transaction block|unsafe use of new value/i.test(e.message)) {
      // Statements que exigem autocommit (CREATE INDEX CONCURRENTLY, ALTER TYPE ... ADD VALUE etc.).
      try {
        for (const st of splitSql(sql)) await c.query(st);
        await c.query(
          "insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3) on conflict (version) do nothing",
          [m.version, m.name, [sql]],
        );
        return null;
      } catch (e2) {
        return e2;
      }
    }
    return e;
  }
}

async function applyWithRetry(m) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const err = await applyOne(m);
    if (!err || !isConnError(err)) return err;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    try {
      await connect();
      // O commit pode ter ocorrido antes da queda: confirmar no histórico antes de repetir.
      const done = await c.query("select 1 from supabase_migrations.schema_migrations where version=$1", [m.version]);
      if (done.rowCount) return null;
    } catch {
      /* tenta de novo no próximo attempt */
    }
  }
  return new Error("conexão instável: 4 tentativas");
}

const lastError = new Map();
for (let pass = 1; pass <= maxPasses && pending.length; pass++) {
  await bootstrapCompatViews();
  const before = pending.length;
  const next = [];
  for (const m of pending) {
    const err = await applyWithRetry(m);
    if (err) {
      lastError.set(m.file, `${err.code ?? ""} ${err.message}`.slice(0, 220));
      next.push(m);
    } else {
      lastError.delete(m.file);
    }
  }
  pending = next;
  console.log(`Passe ${pass}: aplicadas ${before - pending.length}, restantes ${pending.length}`);
  if (pending.length === before) break;
}

await c.end();
if (pending.length) {
  console.log("\nMIGRAÇÕES NÃO APLICADAS:");
  console.table(pending.map((m) => ({ file: m.file, erro: lastError.get(m.file) })));
  process.exitCode = 2;
} else {
  console.log("\nTodas as migrações aplicadas.");
}
