import test from 'node:test';
import assert from 'node:assert/strict';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {NextResponse} from 'next/server';
import {fixture} from './fixtures';
import {db,Fault,Store} from '../lib/db';
import {rate} from '../lib/auth';
import {refreshAlerts} from '../lib/queries';
import {encodeSnapshot,restoreSnapshot} from '../lib/store-snapshot';
import {cloudRoute,firestoreBackend,runCloudStore,stageCloudWrite,CloudState} from '../lib/cloud-store';

function memoryFirestore(snapshot:Buffer){
 let state:CloudState={snapshot,version:1},commits=0,tail=Promise.resolve();
 const files=new Map<unknown,unknown>();
 const view=()=>({exists:true,get:(key:string)=>state[key as keyof CloudState]});
 const ref={get:async()=>view()};
 const remote={
  doc:()=>ref,
  async runTransaction(work:(tx:Transaction)=>Promise<void>){
   const previous=tail;let release!:()=>void;
   tail=new Promise<void>(resolve=>{release=resolve;});await previous;
   let update:CloudState|undefined;const fileWrites=new Map<unknown,unknown>();
   const transaction={get:async()=>view(),update:(_ref:unknown,next:CloudState)=>{update=next;},set:(key:unknown,value:unknown)=>{fileWrites.set(key,value);}};
   try{await work(transaction as unknown as Transaction);if(update)state=update;for(const [key,value] of fileWrites)files.set(key,value);commits++;}finally{release();}
  }
 } as unknown as Firestore;
 return {backend:firestoreBackend(remote),state:()=>state,commits:()=>commits,files};
}
function seededCloud(){const f=fixture();const remote=memoryFirestore(encodeSnapshot(f.s));f.s.db.close();return remote;}

test('cloud reads make no writes and close their isolated database',async()=>{
 const remote=seededCloud();let opened:Store|undefined;
 assert.equal(await runCloudStore(remote.backend,async()=>{opened=db();return opened.get("SELECT name FROM users WHERE id='m'")!.name;}),'Manager');
 assert.equal(remote.commits(),0);
 assert.throws(()=>opened!.get('SELECT 1'),/not open|closed/i);
});

test('concurrent cloud changes never overwrite another saved request',async()=>{
 const remote=seededCloud();let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});let ready!:()=>void;
 const waiting=new Promise<void>(resolve=>{ready=resolve;});let calls=0;
 const first=runCloudStore(remote.backend,async()=>{calls++;db().run("UPDATE users SET name='First' WHERE id='m'");ready();await gate;return 'first';});
 await waiting;
 assert.equal(await runCloudStore(remote.backend,async()=>{db().run("UPDATE users SET name='Second' WHERE id='m'");return 'second';}),'second');
 release();await assert.rejects(first,(error:unknown)=>error instanceof Fault&&error.status===409);
 const saved=restoreSnapshot(remote.state().snapshot);
 try{assert.equal(saved.get("SELECT name FROM users WHERE id='m'")!.name,'Second');}finally{saved.db.close();}
 assert.equal(calls,1);assert.equal(remote.commits(),1);assert.equal(remote.state().version,2);
});

test('failed cloud commit drops response cookies and staged file writes',async()=>{
 const remote=seededCloud(),fileRef={path:'file'};
 const route=cloudRoute(async()=>{
  db().run("UPDATE users SET name='Uncommitted' WHERE id='m'");
  stageCloudWrite(tx=>{tx.set(fileRef as never,{data:'private upload'});});
  // Another request commits before this response is ready to persist.
  await runCloudStore(remote.backend,async()=>{db().run("UPDATE users SET name='Saved' WHERE id='m'");});
  const result=NextResponse.json({message:'Signed in'});result.cookies.set('harbor_session','uncommitted-session');return result;
 },work=>runCloudStore(remote.backend,work));
 const result=await route(new Request('https://demo.test/api/auth',{method:'POST'}));
 assert.equal(result.status,409);assert.equal(result.headers.get('set-cookie'),null);assert.equal(remote.files.size,0);
});

test('staged file bytes commit with their database change and roll back on thrown failures',async()=>{
 const remote=seededCloud(),fileRef={path:'file'};
 await runCloudStore(remote.backend,async()=>{
  db().run("UPDATE users SET name='With file' WHERE id='m'");
  stageCloudWrite(tx=>{tx.set(fileRef as never,{data:'stored upload'});});
 });
 assert.deepEqual(remote.files.get(fileRef),{data:'stored upload'});
 const bytes=remote.state().snapshot;
 await assert.rejects(runCloudStore(remote.backend,async()=>{
  db().run("UPDATE users SET name='Failed' WHERE id='m'");
  stageCloudWrite(tx=>{tx.set(fileRef as never,{data:'discarded upload'});});
  throw new Error('Invalid upload');
 }),/Invalid upload/);
 assert.deepEqual(remote.state().snapshot,bytes);assert.deepEqual(remote.files.get(fileRef),{data:'stored upload'});assert.equal(remote.commits(),1);
 assert.throws(()=>stageCloudWrite(()=>{}),/active request/);
});

test('handled authentication failures still save rate limits',async()=>{
 const remote=seededCloud(),fileRef={path:'rejected-upload'};
 const response=await runCloudStore(remote.backend,async()=>{rate(db(),'failed-login');stageCloudWrite(tx=>{tx.set(fileRef as never,{data:'rejected'});});return Response.json({error:'Invalid email or password'},{status:401});});
 assert.equal(response.status,401);assert.equal(remote.commits(),1);assert.equal(remote.files.size,0);
 const restored=restoreSnapshot(remote.state().snapshot);
 try{assert.equal(restored.get("SELECT count FROM login_limits WHERE key='failed-login'")!.count,1);}finally{restored.db.close();}
});

test('unchanged alerts and acknowledged alerts do not rewrite the cloud snapshot',()=>{
 const f=fixture();
 try{
  f.s.run("INSERT INTO thresholds VALUES('p','w',1)");
  refreshAlerts(f.s,f.m);const initial=encodeSnapshot(f.s);
  refreshAlerts(f.s,f.m);assert.deepEqual(encodeSnapshot(f.s),initial);
  f.s.run("UPDATE alerts SET status='Acknowledged',updated='2000-01-01'");
  const acknowledged=encodeSnapshot(f.s);refreshAlerts(f.s,f.m);assert.deepEqual(encodeSnapshot(f.s),acknowledged);
  f.s.run("UPDATE alerts SET status='Closed',updated='2000-01-01'");
  refreshAlerts(f.s,f.m);assert.equal(f.s.get('SELECT severity FROM alerts')!.severity,'Escalated');
  const escalated=encodeSnapshot(f.s);refreshAlerts(f.s,f.m);assert.deepEqual(encodeSnapshot(f.s),escalated);
  f.s.run('DELETE FROM thresholds');refreshAlerts(f.s,f.m);
  const closed=encodeSnapshot(f.s);refreshAlerts(f.s,f.m);assert.deepEqual(encodeSnapshot(f.s),closed);
 }finally{f.s.db.close();}
});
