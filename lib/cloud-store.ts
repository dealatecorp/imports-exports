import {AsyncLocalStorage} from 'node:async_hooks';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {requestStore,Fault} from './db';
import {encodeSnapshot,restoreSnapshot} from './store-snapshot';
import {firebaseDatabase} from './firebase-server';
import {failure} from './http';

export type CloudWrite=(transaction:Transaction)=>void;
export type CloudState={snapshot:Buffer;version:number};
export interface CloudBackend{
 read:()=>Promise<CloudState>;
 commit:(version:number,snapshot:Buffer,writes:CloudWrite[])=>Promise<void>;
}
const pendingWrites=new AsyncLocalStorage<CloudWrite[]>();

// Register only transaction writes, with no network calls or other side effects:
// Firestore may replay this callback while retrying its transaction.
export function stageCloudWrite(write:CloudWrite){
 const writes=pendingWrites.getStore();
 if(!writes)throw new Fault('Cloud changes require an active request',503);
 writes.push(write);
}

export function firestoreBackend(remote:Firestore):CloudBackend{
 const ref=remote.doc('harbor_private/state');
 return {
  async read(){
   const current=await ref.get();
   if(!current.exists)throw new Fault('The cloud demo database has not been initialized',503);
   return {snapshot:current.get('snapshot'),version:current.get('version')};
  },
  async commit(version,snapshot,writes){
   await remote.runTransaction(async tx=>{
    const latest=await tx.get(ref);
    if(!latest.exists||latest.get('version')!==version)throw new Fault('Another user updated the workspace. Refresh and retry; your change was not saved.',409);
    for(const write of writes)write(tx);
    tx.update(ref,{snapshot,version:version+1,updated:new Date().toISOString()});
   });
  }
 };
}

// Business operations execute once against a private request snapshot. Only the
// version comparison and atomic writes retry, never the request body or action.
export async function runCloudStore<T>(backend:CloudBackend,work:()=>Promise<T>):Promise<T>{
 const {snapshot:before,version}=await backend.read();
 if(!Buffer.isBuffer(before)||!Number.isSafeInteger(version)||version<1||version===Number.MAX_SAFE_INTEGER)throw new Fault('The cloud database snapshot is invalid',503);
 const local=restoreSnapshot(before),writes:CloudWrite[]=[];
 try{
  const result=await pendingWrites.run(writes,()=>requestStore.run(local,work));
  // Rejected API requests may retain rate-limit counters, but never file uploads.
  if(result instanceof Response&&!result.ok)writes.length=0;
  const after=encodeSnapshot(local);
  if(!before.equals(after)||writes.length)await backend.commit(version,after,writes);
  return result;
 }finally{local.db.close();}
}

export async function withCloudStore<T>(work:()=>Promise<T>):Promise<T>{
 if(process.env.DATABASE_BACKEND!=='firestore')return work();
 return runCloudStore(firestoreBackend(firebaseDatabase()),work);
}
export function cloudRoute(handler:(req:Request)=>Promise<Response>,run:(work:()=>Promise<Response>)=>Promise<Response>=withCloudStore){return async(req:Request)=>{
 try{return await run(()=>handler(req));}catch(error){return failure(error);}
};}
