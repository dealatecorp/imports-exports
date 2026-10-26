import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {encodeSnapshot,restoreSnapshot,snapshot} from '../lib/store-snapshot';
import {db,requestStore} from '../lib/db';

test('cloud snapshot preserves inventory, permissions and immutable history across requests',()=>{
 const f=fixture();f.opening();const order=f.setup();f.allocate(order,'40');
 const bytes=encodeSnapshot(f.s), restored=restoreSnapshot(bytes);
 try{
  assert.deepEqual(snapshot(restored),snapshot(f.s));
  assert.deepEqual(encodeSnapshot(restored),bytes);
  assert.throws(()=>restored.run("DELETE FROM movements"));
  assert.throws(()=>restored.run("DELETE FROM audit"));
  assert.equal(restored.get("SELECT warehouse_id FROM assignments WHERE user_id='e'")?.warehouse_id,'w');
 }finally{restored.db.close();f.s.db.close();}
});

test('request databases remain isolated across concurrent asynchronous work',async()=>{
 const a=fixture(),b=fixture();
 a.s.run("UPDATE users SET name='First' WHERE id='m'");
 b.s.run("UPDATE users SET name='Second' WHERE id='m'");
 try{
  const results=await Promise.all([a,b].map(f=>requestStore.run(f.s,async()=>{
   await new Promise(resolve=>setTimeout(resolve,5));return db().get("SELECT name FROM users WHERE id='m'")?.name;
  })));
  assert.deepEqual(results,['First','Second']);
 }finally{a.s.db.close();b.s.db.close();}
});
