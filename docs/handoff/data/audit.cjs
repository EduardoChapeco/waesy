const fs=require('fs');const path=require('path');const {Client}=require('pg');
const env=fs.readFileSync('.env.secrets','utf8').match(/^SUPABASE_DB_PASSWORD=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const c=new Client({host:'db.jfuebqmltksyznovhlwa.supabase.co',port:5432,user:'postgres',password:env,database:'postgres',ssl:{rejectUnauthorized:false}});
function walk(d,o=[]){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p,o);else if(/\.(ts|tsx)$/.test(f.name)&&!/\.test\./.test(f.name))o.push(p);}return o;}
(async()=>{await c.connect();const out={};
const q=async(s)=> (await c.query(s)).rows;
const tabs=new Set((await q("select table_name from information_schema.tables where table_schema='public'")).map(r=>r.table_name));
const rpcs=new Set((await q("select routine_name from information_schema.routines where routine_schema='public'")).map(r=>r.routine_name));
const cols={};(await q("select table_name,column_name from information_schema.columns where table_schema='public'")).forEach(r=>{(cols[r.table_name]??=new Set()).add(r.column_name)});
const files=walk('src');const usedT={},usedR={};
for(const f of files){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)/g)){(usedT[m[1]]??=new Set()).add(f)}for(const m of s.matchAll(/\.rpc\(\s*['"]([a-z_0-9]+)['"]/g)){(usedR[m[1]]??=new Set()).add(f)}}
out.missingTables=Object.entries(usedT).filter(([t])=>!tabs.has(t)).map(([t,f])=>({table:t,files:[...f]}));
out.missingRpcs=Object.entries(usedR).filter(([t])=>!rpcs.has(t)).map(([t,f])=>({rpc:t,files:[...f]}));
out.rlsDisabled=(await q("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity")).map(r=>r.relname);
out.rlsNoPolicy=(await q("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)")).map(r=>r.relname);
out.secDefNoSearchPath=(await q("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and (p.proconfig is null or not exists(select 1 from unnest(p.proconfig) x where x like 'search_path=%'))")).map(r=>r.proname);
out.anonExecSecDef=(await q("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute')")).map(r=>r.proname);
out.counts={tables:tabs.size,rpcs:rpcs.size,srcFiles:files.length};
out.invalidIdx=(await q("select indexrelid::regclass::text i from pg_index where not indisvalid")).map(r=>r.i);
out.jobsFailed=await q("select 1 as x where false");
try{out.cronFailed=await q("select jobid,status,left(return_message,200) msg,start_time from cron.job_run_details where status='failed' order by start_time desc limit 20")}catch(e){out.cronFailed='n/a '+e.message}
try{out.edgeFns=await q("select 1 where false")}catch(e){}
out.bucketsNoPolicy=await q("select b.id from storage.buckets b").then(r=>r.map(x=>x.id));
out.storagePolicies=await q("select policyname,cmd from pg_policies where schemaname='storage' and tablename='objects'").then(r=>r.length);
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log(Object.keys(out).map(k=>k+':'+(Array.isArray(out[k])?out[k].length:'obj')).join(' '));await c.end()})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
