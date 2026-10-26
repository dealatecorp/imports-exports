import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {fixture} from './fixtures';
import {encodeSnapshot,restoreSnapshot} from '../lib/store-snapshot';
import {prepareCloudMigration,applyCloudMigration,validateMigrationSize} from '../scripts/migrate-cloud';
import {assembleCloudFile} from '../lib/cloud-files';

function migrationFixture(){
 const parent=resolve('data');mkdirSync(parent,{recursive:true});
 const folder=mkdtempSync(join(parent,'migration-test-')),path=join(folder,'source.db'),uploads=join(folder,'uploads');mkdirSync(uploads);
 const f=fixture(path);const setup=f.setup();
 f.s.run("UPDATE users SET password='original-password-hash' WHERE id='m'");
 f.s.run("INSERT INTO customers VALUES('customer-original','Demo Customer','demo@example.test','customer-password-hash','911234567890',1,'2026-10-26')");
 f.s.run("INSERT INTO sessions VALUES('staff-session','m','2099-01-01','staff-csrf')");
 f.s.run("INSERT INTO customer_sessions VALUES('customer-session','customer-original','customer-csrf','2099-01-01')");
 f.s.run("INSERT INTO reset_tokens VALUES('reset-secret','m','2099-01-01',0)");
 f.s.run("INSERT INTO login_limits VALUES('limited',2,'2099-01-01')");
 const bytes=Buffer.from('%PDF-1.7 demo document'),file=join(uploads,'document-original');writeFileSync(file,bytes);
 f.s.run('INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?,?,?,?)','document-original',setup.shipment,'invoice.pdf','Invoice','application/pdf',file,'Quarantined',1,1,'m','2026-10-26');
 return {...f,path,folder,uploads,bytes,cleanup(){f.s.db.close();const absolute=resolve(folder);if(!absolute.startsWith(parent+sep))throw new Error('Unsafe test cleanup');rmSync(absolute,{recursive:true,force:true});}};
}

test('cloud migration preserves accounts and operations while clearing only copied access tokens',()=>{
 const f=migrationFixture();const before=encodeSnapshot(f.s);
 try{
  const plan=prepareCloudMigration(f.path,f.uploads),copy=restoreSnapshot(plan.snapshot);
  try{
   assert.equal(copy.get("SELECT password FROM users WHERE id='m'")!.password,'original-password-hash');
   assert.equal(copy.get("SELECT password FROM customers WHERE id='customer-original'")!.password,'customer-password-hash');
   for(const table of ['sessions','customer_sessions','reset_tokens','login_limits'])assert.equal(copy.get(`SELECT COUNT(*) AS n FROM ${table}`)!.n,0);
   assert.deepEqual(copy.all('SELECT * FROM orders'),f.s.all('SELECT * FROM orders'));
   const attachment=copy.get("SELECT * FROM attachments WHERE id='document-original'")!;
   assert.equal(attachment.path,'firestore-file:document-original');assert.equal(attachment.scan,'Quarantined');assert.equal(attachment.restricted,1);
   assert.deepEqual(assembleCloudFile(plan.files[0].data as {size:number;chunks:number;sha256:string},plan.files.slice(1).map(file=>(file.data as {bytes:Buffer}).bytes)),f.bytes);
   assert.deepEqual(plan.summary,{staff:2,customers:1,orders:1,attachments:1,clearedSessions:2,clearedResetTokens:1,clearedLoginLimits:1});
  }finally{copy.db.close();}
  assert.deepEqual(encodeSnapshot(f.s),before);
 }finally{f.cleanup();}
});

test('migration is dry-run by default and prints counts without credentials',()=>{
 const f=migrationFixture();const before=encodeSnapshot(f.s);
 try{
  const run=spawnSync(process.execPath,['--import','tsx','scripts/migrate-cloud.ts'],{cwd:resolve('.'),env:{...process.env,DATABASE_PATH:f.path,UPLOAD_DIR:f.uploads,FIREBASE_PROJECT_ID:'not-used-for-dry-run',FIREBASE_SERVICE_ACCOUNT_JSON:'invalid-on-purpose'},encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/Dry run complete/);assert.doesNotMatch(run.stdout+run.stderr,/original-password-hash|customer-password-hash|staff-session|reset-secret|invalid-on-purpose/);
  assert.deepEqual(encodeSnapshot(f.s),before);
 }finally{f.cleanup();}
});

test('migration refuses existing state and uses create-only writes for an empty cloud database',async()=>{
 const f=migrationFixture();
 try{
  const plan=prepareCloudMigration(f.path,f.uploads);const writes:{path:string;data:unknown}[]=[];let exists=true;
  const remote={doc:(path:string)=>({path}),runTransaction:async(work:(tx:Transaction)=>Promise<void>)=>work({get:async()=>({exists}),create:(ref:{path:string},data:unknown)=>{writes.push({path:ref.path,data});}} as unknown as Transaction)} as unknown as Firestore;
  await assert.rejects(applyCloudMigration(plan,remote),/already exists/);assert.equal(writes.length,0);
  exists=false;await applyCloudMigration(plan,remote);
  assert.equal(writes.length,plan.files.length+1);const state=writes.find(write=>write.path==='harbor_private/state')!.data as {version:number;snapshot:Buffer};
  assert.equal(state.version,1);assert.deepEqual(state.snapshot,plan.snapshot);
 }finally{f.cleanup();}
});

test('migration rejects unsafe source document paths and oversized transactions',()=>{
 const f=migrationFixture();
 try{
  const outside=join(f.folder,'outside.pdf');writeFileSync(outside,f.bytes);f.s.run('UPDATE attachments SET path=?',outside);
  assert.throws(()=>prepareCloudMigration(f.path,f.uploads),/outside UPLOAD_DIR/);
  const dummy={path:'harbor_files/test',data:{size:1,chunks:1,sha256:'0'.repeat(64)}};
  assert.throws(()=>validateMigrationSize({snapshot:Buffer.alloc(10),files:Array.from({length:500},()=>dummy)}),/500/);
  assert.throws(()=>validateMigrationSize({snapshot:Buffer.alloc(8_000_001),files:[]}),/8 MB/);
 }finally{f.cleanup();}
});
