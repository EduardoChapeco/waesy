const fs=require('fs');const {Client}=require('pg');
const pw=fs.readFileSync('.env.secrets','utf8').match(/^SUPABASE_DB_PASSWORD=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const c=new Client({host:'db.jfuebqmltksyznovhlwa.supabase.co',port:5432,user:'postgres',password:pw,database:'postgres',ssl:{rejectUnauthorized:false}});
const vers=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).filter(Boolean);
(async()=>{await c.connect();const res=[];
// cumulative dry-run in ONE transaction, savepoint per file, always ROLLBACK
await c.query('begin');await c.query("set local statement_timeout='120s'");
for(const v of vers){const fl=fs.readdirSync('supabase/migrations').filter(f=>f.startsWith(v)&&f.endsWith('.sql'));
 for(const f of fl){const sql=fs.readFileSync('supabase/migrations/'+f,'utf8');await c.query('savepoint s');
  try{await c.query(sql);await c.query('release savepoint s');res.push({f,ok:true})}catch(e){await c.query('rollback to savepoint s');res.push({f,ok:false,err:e.message,pos:e.position,where:(e.where||'').slice(0,160)})}}}
await c.query('rollback');fs.writeFileSync(process.argv[3],JSON.stringify(res,null,1));res.forEach(r=>console.log(r.ok?'OK  ':'FAIL',r.f,r.err||''));await c.end()})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
