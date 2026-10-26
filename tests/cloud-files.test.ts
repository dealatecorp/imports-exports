import test from 'node:test';
import assert from 'node:assert/strict';
import {CLOUD_FILE_LIMIT,cloudFileWrites,cloudFilePath,assembleCloudFile} from '../lib/cloud-files';

test('online documents round-trip across private Firestore chunks without exceeding document size',()=>{
 const bytes=Buffer.alloc(CLOUD_FILE_LIMIT,17),writes=cloudFileWrites('test-document',bytes);
 assert.equal(writes.length,4);
 assert.ok(writes.every(write=>write.path.startsWith('harbor_files/test-document')));
 const manifest=writes[0].data as {size:number;chunks:number;sha256:string};
 const chunks=writes.slice(1).map(write=>(write.data as {bytes:Buffer}).bytes);
 assert.ok(chunks.every(chunk=>chunk.length<=400_000));
 assert.deepEqual(assembleCloudFile(manifest,chunks),bytes);
 assert.equal(cloudFilePath('test-document'),'firestore-file:test-document');
});

test('online document storage rejects oversized files, missing pieces, tampering and invalid paths',()=>{
 assert.throws(()=>cloudFileWrites('valid',Buffer.alloc(CLOUD_FILE_LIMIT+1)),/1 MB/);
 assert.throws(()=>cloudFileWrites('valid',Buffer.alloc(0)),/1 MB/);
 assert.throws(()=>cloudFilePath('../another/file'),/Invalid/);
 const writes=cloudFileWrites('valid',Buffer.from('%PDF-1.7 demo'));
 const manifest=writes[0].data as {size:number;chunks:number;sha256:string};
 assert.throws(()=>assembleCloudFile(manifest,[]),/incomplete/);
 assert.throws(()=>assembleCloudFile(manifest,[Buffer.from('%PDF-1.7 fake')]),/verified/);
 assert.throws(()=>assembleCloudFile({...manifest,chunks:500},[]),/incomplete/);
});
