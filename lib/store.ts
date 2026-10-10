import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import type { Workspace } from './types';
const cloud=!!process.env.SUPABASE_URL&&!process.env.DEMO_DATA_DIR;
const directory=process.env.DEMO_DATA_DIR||path.join(process.cwd(),'.local');
let db:DatabaseSync|undefined;
let secret=process.env.WORKSPACE_SECRET;
if(!cloud){
 mkdirSync(directory,{recursive:true});
 const secretFile=path.join(directory,'workspace-secret');
 if(!secret&&!existsSync(secretFile))writeFileSync(secretFile,randomBytes(32).toString('hex'),{mode:0o600});
 secret??=readFileSync(secretFile,'utf8');
 db=new DatabaseSync(path.join(directory,'demo.sqlite3'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
}else if(!secret)throw new Error('WORKSPACE_SECRET must be configured.');
function signature(id:string){return createHmac('sha256',secret!).update(id).digest('hex');}
export function identify(cookie?:string){
 const [id,sig]=cookie?.split('.')??[];
 if(id&&sig&&/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(sig)&&timingSafeEqual(Buffer.from(sig),Buffer.from(signature(id))))return {id,cookie:`${id}.${sig}`};
 const fresh=randomUUID();return {id:fresh,cookie:`${fresh}.${signature(fresh)}`};
}
const empty=(id:string):Workspace=>({id,version:0,notes:[],reviews:[],inspections:[],receipts:{}});
async function rpc(name:string,args:Record<string,unknown>){
 const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY!,'Content-Type':'application/json'},body:JSON.stringify({...args,p_key:process.env.SUPABASE_BACKEND_KEY}),cache:'no-store'});
 if(!response.ok)throw new Error(`Persistent storage failed (${response.status}).`);
 return response.json();
}
function localWorkspace(id:string):Workspace {
 const row=db!.prepare('SELECT data FROM workspaces WHERE id=?').get(id) as {data:string}|undefined;
 return row?JSON.parse(row.data):empty(id);
}
export async function loadWorkspace(id:string):Promise<Workspace> {
 if(cloud)return (await rpc('philyron_load',{p_id:id}))||empty(id);
 return localWorkspace(id);
}
export async function mutate<T>(id:string,key:string,hash:string,action:(w:Workspace)=>T):Promise<T> {
 for(let attempt=0;attempt<5;attempt++){
  if(!cloud)db!.exec('BEGIN IMMEDIATE');
  try {
   const w=cloud?await loadWorkspace(id):localWorkspace(id),receipt=w.receipts[key];
   if(receipt){if(receipt.hash!==hash)throw new Error('IDEMPOTENCY_CONFLICT');if(!cloud)db!.exec('COMMIT');return receipt.value as T;}
   if(Object.keys(w.receipts).length>=200)throw new Error('WORKSPACE_LIMIT');
   const result=JSON.parse(JSON.stringify(action(w))) as T;
   const expected=w.version;w.version++;w.receipts[key]={hash,value:result};
   if(cloud){if(!await rpc('philyron_commit',{p_id:id,p_expected:expected,p_data:w}))continue;}
   else {db!.prepare('INSERT INTO workspaces VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(w));db!.exec('COMMIT');}
   return result;
  }catch(e){if(!cloud)db!.exec('ROLLBACK');throw e;}
 }
 throw new Error('CONCURRENT_UPDATE');
}
export const STORAGE_BACKEND=cloud?'supabase-postgres':'sqlite-local';
