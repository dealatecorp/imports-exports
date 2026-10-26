import {DatabaseSync} from 'node:sqlite';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import type {Firestore} from 'firebase-admin/firestore';
import {Fault} from '../lib/db';
import {encodeSnapshot,restoreSnapshot} from '../lib/store-snapshot';
import {CLOUD_FILE_LIMIT,cloudFileWrites,cloudFilePath,isCloudFile} from '../lib/cloud-files';
import {firebaseDatabase} from '../lib/firebase-server';

type FileWrite=ReturnType<typeof cloudFileWrites>[number];
export type MigrationPlan={snapshot:Buffer;files:FileWrite[];summary:{staff:number;customers:number;orders:number;attachments:number;clearedSessions:number;clearedResetTokens:number;clearedLoginLimits:number}};
const MAX_WRITES=500,MAX_TRANSACTION_BYTES=8_000_000;

function estimatedBytes(value:unknown):number{
 if(Buffer.isBuffer(value))return value.length;
 if(typeof value==='string')return Buffer.byteLength(value);
 if(value&&typeof value==='object')return Object.entries(value).reduce((size,[key,child])=>size+Buffer.byteLength(key)+estimatedBytes(child)+32,0);
 return 16;
}
export function validateMigrationSize(plan:Pick<MigrationPlan,'snapshot'|'files'>){
 const writes=plan.files.length+1;
 const bytes=plan.snapshot.length+1024+plan.files.reduce((sum,write)=>sum+Buffer.byteLength(write.path)+estimatedBytes(write.data)+1024,0);
 if(writes>MAX_WRITES)throw new Fault(`Migration needs ${writes} writes; the safe single-transaction limit is ${MAX_WRITES}. No data was uploaded.`);
 if(bytes>MAX_TRANSACTION_BYTES)throw new Fault('Migration exceeds the 8 MB single-transaction safety limit. No data was uploaded.');
 return {writes,estimatedBytes:bytes};
}

export function prepareCloudMigration(sourcePath=process.env.DATABASE_PATH||'./data/harbor.db',uploadDirectory=process.env.UPLOAD_DIR||'data/uploads'):MigrationPlan{
 // The source is never migrated or opened for writing. A single read transaction
 // gives all tables the same SQLite snapshot while the local app is running.
 const source=new DatabaseSync(resolve(sourcePath),{readOnly:true});let compressed:Buffer;
 try{
  source.exec('BEGIN');
  const tables=source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const data=Object.fromEntries(tables.map(table=>{
   const name=String(table.name),quoted='"'+name.replaceAll('"','""')+'"';
   return [name,source.prepare(`SELECT * FROM ${quoted} ORDER BY rowid`).all()];
  }));
  compressed=gzipSync(Buffer.from(JSON.stringify(data)));source.exec('COMMIT');
 }finally{source.close();}
 const copied=restoreSnapshot(compressed),files:FileWrite[]=[];
 try{
  const count=(table:string)=>Number(copied.get(`SELECT COUNT(*) AS count FROM ${table}`)!.count);
  const summary={staff:count('users'),customers:count('customers'),orders:count('orders'),attachments:count('attachments'),clearedSessions:count('sessions')+count('customer_sessions'),clearedResetTokens:count('reset_tokens'),clearedLoginLimits:count('login_limits')};
  copied.tx(()=>{for(const table of ['sessions','customer_sessions','reset_tokens','login_limits'])copied.run(`DELETE FROM ${table}`);});
  const attachments=copied.all('SELECT id,path FROM attachments ORDER BY rowid');
  const uploadRoot=attachments.length?realpathSync(resolve(uploadDirectory)):undefined;
  for(const attachment of attachments){
   if(isCloudFile(attachment.path))throw new Fault('The source already contains cloud documents. Use the original local database for a first migration.');
   const actual=realpathSync(resolve(attachment.path)),within=relative(uploadRoot!,actual);
   if(!within||within==='..'||within.startsWith('..\\')||within.startsWith('../')||isAbsolute(within))throw new Fault('An attachment is outside UPLOAD_DIR. Set UPLOAD_DIR to its original upload directory and retry.');
   const stat=statSync(actual);
   if(!stat.isFile()||stat.size<1||stat.size>CLOUD_FILE_LIMIT)throw new Fault('An attachment exceeds the online demo limit of 1 MB or is not a readable file. No data was uploaded.');
   files.push(...cloudFileWrites(attachment.id,readFileSync(actual)));
   copied.run('UPDATE attachments SET path=? WHERE id=?',cloudFilePath(attachment.id),attachment.id);
  }
  const plan={snapshot:encodeSnapshot(copied),files,summary};validateMigrationSize(plan);return plan;
 }finally{copied.db.close();}
}

export async function applyCloudMigration(plan:MigrationPlan,remote:Firestore){
 validateMigrationSize(plan);
 const state=remote.doc('harbor_private/state');
 await remote.runTransaction(async tx=>{
  const existing=await tx.get(state);
  if(existing.exists)throw new Fault('The cloud database already exists. Migration refused to avoid overwriting online data.',409);
  const timestamp=new Date().toISOString();
  // create() preconditions also reject pre-existing/orphaned file documents.
  for(const write of plan.files)tx.create(remote.doc(write.path),write.data);
  tx.create(state,{snapshot:plan.snapshot,version:1,created:timestamp,updated:timestamp});
 });
}

export async function main(args=process.argv.slice(2)){
 if(args.some(arg=>!['--apply','--help'].includes(arg)))throw new Fault('Usage: node --env-file-if-exists=.env.local --import tsx scripts/migrate-cloud.ts [--apply]');
 if(args.includes('--help')){console.log('Dry run by default. --apply creates the first Firestore snapshot and documents; it never overwrites an existing cloud database. DATABASE_PATH and UPLOAD_DIR select the local source.');return;}
 const plan=prepareCloudMigration(),limits=validateMigrationSize(plan);
 console.log(`Prepared ${plan.summary.staff} staff, ${plan.summary.customers} customers, ${plan.summary.orders} orders and ${plan.summary.attachments} documents. Account IDs and password hashes preserved.`);
 console.log(`Cleared ${plan.summary.clearedSessions} sessions, ${plan.summary.clearedResetTokens} reset tokens and ${plan.summary.clearedLoginLimits} login limits in the copy only.`);
 console.log(`Snapshot: ${plan.snapshot.length} bytes. Transaction: ${limits.writes} writes, approximately ${limits.estimatedBytes} bytes.`);
 if(!args.includes('--apply')){console.log('Dry run complete. No Firebase connection or upload was performed; local data is unchanged.');return;}
 if(!process.env.FIREBASE_PROJECT_ID)throw new Fault('Set FIREBASE_PROJECT_ID before applying the migration.');
 await applyCloudMigration(plan,firebaseDatabase());
 console.log(`Migration completed for ${process.env.FIREBASE_PROJECT_ID}. Existing login details are unchanged.`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Fault?error.message:'Migration failed; inspect the source paths, Firebase credentials and database access before retrying.');process.exitCode=1;});
}
