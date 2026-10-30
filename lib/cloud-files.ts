import {createHash} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import {Fault} from './db';
import {firebaseDatabase} from './firebase-server';

export const CLOUD_FILE_LIMIT=1_000_000;
const CHUNK_SIZE=400_000;
const PREFIX='firestore-file:';
const keyPattern=/^[a-zA-Z0-9_-]{1,80}$/;
type FileManifest={size:number;chunks:number;sha256:string};

function validateKey(key:string){if(!keyPattern.test(key))throw new Fault('Invalid document identifier',400);return key;}
export function cloudFilePath(key:string){return PREFIX+validateKey(key);}
export function isCloudFile(path:string){return path.startsWith(PREFIX);}

/** These writes must be staged in the same transaction as the order attachment record. */
export function cloudFileWrites(key:string,bytes:Buffer){
 validateKey(key);
 if(!bytes.length||bytes.length>CLOUD_FILE_LIMIT)throw new Fault('Select a file up to 1 MB for the online workspace',413);
 const chunks=Array.from({length:Math.ceil(bytes.length/CHUNK_SIZE)},(_,index)=>Buffer.from(bytes.subarray(index*CHUNK_SIZE,(index+1)*CHUNK_SIZE)));
 const manifest:FileManifest={size:bytes.length,chunks:chunks.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 return [{path:`harbor_files/${key}`,data:manifest},...chunks.map((bytes,index)=>({path:`harbor_files/${key}/chunks/${index}`,data:{bytes}}))];
}

export function assembleCloudFile(manifest:FileManifest|undefined,chunks:unknown[]){
 if(!manifest||!Number.isSafeInteger(manifest.size)||manifest.size<1||manifest.size>CLOUD_FILE_LIMIT||manifest.chunks!==Math.ceil(manifest.size/CHUNK_SIZE)||chunks.length!==manifest.chunks||!/^[a-f0-9]{64}$/.test(manifest.sha256))throw new Fault('The uploaded file is unavailable or incomplete',503);
 if(chunks.some((bytes,index)=>!Buffer.isBuffer(bytes)||bytes.length!==Math.min(CHUNK_SIZE,manifest.size-index*CHUNK_SIZE)))throw new Fault('The uploaded file is unavailable or incomplete',503);
 const bytes=Buffer.concat(chunks as Buffer[]);
 if(createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw new Fault('The uploaded file could not be verified',503);
 return bytes;
}

export async function readCloudFile(path:string,remote:Firestore=firebaseDatabase()){
 if(!isCloudFile(path))throw new Fault('This document has not been copied to the online workspace',404);
 const key=validateKey(path.slice(PREFIX.length)),ref=remote.doc(`harbor_files/${key}`),doc=await ref.get();
 if(!doc.exists)throw new Fault('The uploaded file is unavailable',404);
 const manifest=doc.data() as FileManifest;
 if(!Number.isSafeInteger(manifest.chunks)||manifest.chunks<1||manifest.chunks>Math.ceil(CLOUD_FILE_LIMIT/CHUNK_SIZE))throw new Fault('The uploaded file is unavailable or incomplete',503);
 const chunks=await remote.getAll(...Array.from({length:manifest.chunks},(_,index)=>ref.collection('chunks').doc(String(index))));
 return assembleCloudFile(manifest,chunks.map(chunk=>chunk.get('bytes')));
}
