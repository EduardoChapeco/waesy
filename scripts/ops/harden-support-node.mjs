#!/usr/bin/env node
/**
 * harden-support-node.mjs — Prepara um projeto de apoio (OFFLOAD/ARCHIVE) e o PRIMARY para a federação.
 *
 * Pré-requisito: o mesmo schema (supabase/migrations) já aplicado no nó (paridade de schema).
 *
 * Em cada nó faz:
 *  1. support (offload|archive): cancela TODOS os jobs do pg_cron (zero consumo ocioso);
 *  2. support: remove FKs das tabelas que o nó hospeda para tabelas que NÃO moram no nó
 *     (as linhas referenciadas vivem no PRIMARY; sem isso todo INSERT falharia);
 *  3. primary: remove FKs de tabelas do PRIMARY para tabelas roteadas a nós de apoio
 *     (as linhas referenciadas vivem fora do PRIMARY);
 *  4. support: revoga anon/authenticated em public (somente service_role no servidor acessa);
 *  5. grava o DDL das FKs removidas em scripts/ops/generated/restore-fks-<role>.sql (reversibilidade).
 *
 * Uso: PGURL=... node scripts/ops/harden-support-node.mjs --role=offload|archive|primary [--mining] [--dry]
 */
import fs from "node:fs";
import pg from "pg";

const url = process.env.PGURL;
if (!url) throw new Error("PGURL ausente");
const role = (process.argv.find((a) => a.startsWith("--role=")) ?? "").split("=")[1];
if (!["offload", "archive", "primary"].includes(role)) throw new Error("--role=offload|archive|primary");
const withMining = process.argv.includes("--mining");
const dry = process.argv.includes("--dry");

const src = fs.readFileSync("src/lib/supabase-federation.ts", "utf8");
const list = (name) => {
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  return m ? [...m[1].matchAll(/"([a-z0-9_]+)"/g)].map((x) => x[1]) : [];
};
const appendOnly = list("OFFLOAD_TABLES_LIST");
const mining = withMining ? list("MINING_BULK_TABLES_LIST") : [];
// Nó de apoio hospeda: offload => append-only (+ mineração se não houver archive); archive => mineração.
const owned = new Set(role === "archive" ? mining : role === "offload" ? [...appendOnly, ...mining] : []);
const routedAway = new Set([...appendOnly, ...mining]); // tabelas que saem do primary

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });
await c.connect();
const report = [];
const restore = [];

const fks = (
  await c.query(`
  select con.conname, src.relname as src_table, dst.relname as dst_table,
         pg_get_constraintdef(con.oid) as def
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_namespace sn on sn.oid = src.relnamespace
  join pg_class dst on dst.oid = con.confrelid
  join pg_namespace dn on dn.oid = dst.relnamespace
  where con.contype = 'f' and sn.nspname = 'public' and dn.nspname in ('public','auth')`)
).rows;

const targets = fks.filter((f) =>
  role === "primary"
    ? routedAway.has(f.dst_table) && !routedAway.has(f.src_table)
    : owned.has(f.src_table) && !(owned.has(f.dst_table) && f.dst_table !== undefined),
);

for (const f of targets) {
  const ddl = `alter table public.${f.src_table} drop constraint ${f.conname}`;
  restore.push(`alter table public.${f.src_table} add constraint ${f.conname} ${f.def};`);
  if (!dry) await c.query(ddl);
  report.push({ acao: "drop_fk", tabela: f.src_table, constraint: f.conname, ref: f.dst_table });
}

if (role !== "primary") {
  const hasCron = (await c.query("select to_regclass('cron.job') is not null as ok")).rows[0].ok;
  if (hasCron) {
    const jobs = (await c.query("select jobid, jobname from cron.job")).rows;
    for (const j of jobs) {
      if (!dry) await c.query("select cron.unschedule($1::bigint)", [j.jobid]);
      report.push({ acao: "unschedule_cron", tabela: j.jobname ?? String(j.jobid), constraint: "", ref: "" });
    }
  }
  if (!dry) {
    await c.query(`
      revoke all on all tables in schema public from anon, authenticated;
      revoke all on all sequences in schema public from anon, authenticated;
      revoke all on all functions in schema public from anon, authenticated;
      alter default privileges in schema public revoke all on tables from anon, authenticated;
      alter default privileges in schema public revoke all on sequences from anon, authenticated;
      alter default privileges in schema public revoke all on functions from anon, authenticated;`);
  }
  report.push({ acao: "revoke_anon_authenticated", tabela: "public.*", constraint: "", ref: "" });
}

if (restore.length && !dry) {
  fs.mkdirSync("scripts/ops/generated", { recursive: true });
  fs.writeFileSync(`scripts/ops/generated/restore-fks-${role}.sql`, restore.join("\n") + "\n");
}
await c.end();
console.table(report.length ? report : [{ acao: "nada a fazer" }]);
console.log(`${dry ? "[DRY] " : ""}role=${role} FKs tratadas=${targets.length} restore=${restore.length ? `scripts/ops/generated/restore-fks-${role}.sql` : "-"}`);
