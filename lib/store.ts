import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import type { Workspace } from './types';
const directory=process.env.DEMO_DATA_DIR||path.join(process.cwd(),'.local');
mkdirSync(directory,{recursive:true});
const secretFile=path.join(directory,'workspace-secret');
if(!process.env.WORKSPACE_SECRET&&!existsSync(secretFile))writeFileSync(secretFile,randomBytes(32).toString('hex'),{mode:0o600});
const secret=process.env.WORKSPACE_SECRET||readFileSync(secretFile,'utf8');
const db=new DatabaseSync(path.join(directory,'demo.sqlite3'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
function signature(id:string){return createHmac('sha256',secret).update(id).digest('hex');}
export function identify(cookie?:string){
 const [id,sig]=cookie?.split('.')??[];
 if(id&&sig&&/^[a-f0-9-]{36}$/.test(id)&&/^[a-f0-9]{64}$/.test(sig)&&timingSafeEqual(Buffer.from(sig),Buffer.from(signature(id))))return {id,cookie:`${id}.${sig}`};
 const fresh=randomUUID();return {id:fresh,cookie:`${fresh}.${signature(fresh)}`};
}
export function loadWorkspace(id:string):Workspace {
 const row=db.prepare('SELECT data FROM workspaces WHERE id=?').get(id) as {data:string}|undefined;
 return row?JSON.parse(row.data):{id,version:0,notes:[],reviews:[],inspections:[],receipts:{}};
}
export function mutate<T>(id:string,key:string,hash:string,action:(w:Workspace)=>T):T {
 db.exec('BEGIN IMMEDIATE');
 try {
  const w=loadWorkspace(id),receipt=w.receipts[key];
  if(receipt){if(receipt.hash!==hash)throw new Error('IDEMPOTENCY_CONFLICT');db.exec('COMMIT');return receipt.value as T;}
  const result=JSON.parse(JSON.stringify(action(w))) as T;w.version++;w.receipts[key]={hash,value:result};
  db.prepare('INSERT INTO workspaces VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(w));
  db.exec('COMMIT');return result;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
