import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {id} from '../lib/db';
import {list,orderWorkspace,waitingToReceive,lookups} from '../lib/queries';

test('Only a current manager can delete an order; deletion is confirmed, audited and idempotent',()=>{
 const f=fixture();try{
 const a=f.setup('import','10'),data={order_id:a.order,confirm:'true',reason:'Duplicate order'},key=id();
 assert.throws(()=>f.call('delete-order',data,{...f.e,role:'manager'}),/Manager/);
 assert.throws(()=>f.call('delete-order',{...data,confirm:'false'}),/Confirm/);
 assert.equal(list(f.s,f.m,'orders').count,1);
 f.call('delete-order',data,f.m,key);f.call('delete-order',data,f.m,key);
 assert.equal(list(f.s,f.m,'orders').count,0);assert.equal(list(f.s,f.e,'orders').count,0);
 assert.equal(lookups(f.s,f.m).orderLines.length,0);assert.equal(waitingToReceive(f.s,f.m).length,0);
 assert.throws(()=>orderWorkspace(f.s,f.m,a.order),/not found/);
 assert.throws(()=>f.call('order-line',{order_id:a.order,product_id:'p',quantity:'1'}),/cannot be added/);
 assert.equal(f.s.get("SELECT actor FROM audit WHERE action='delete-order' AND entity=?",a.order)!.actor,f.m.id);
 f.s.run("UPDATE users SET role='employee' WHERE id=?",f.m.id);
 assert.throws(()=>f.call('delete-order',data,f.m,key),/Manager/);
 }finally{f.s.db.close();}
});

test('Active stock prevents deletion, while completed order deletion preserves stock and history',()=>{
 const f=fixture();try{
 f.opening(100,0);const a=f.setup('export','10');f.allocate(a,'10');
 assert.throws(()=>f.call('delete-order',{order_id:a.order,confirm:'true',reason:'Test'}),/unfinished/);
 assert.equal(f.balance('Reserved'),10);assert.equal(list(f.s,f.m,'orders').count,1);
 const b=f.setup('import','10'),allocation=f.allocate(b,'10');f.call('receive',{allocation_id:allocation,accepted:'10',blocked:'0'});
 const stock=f.total(),movements=f.s.get('SELECT COUNT(*) AS n FROM movements')!.n;
 f.call('delete-order',{order_id:b.order,confirm:'true',reason:'Remove completed demo order'});
 assert.equal(f.total(),stock);assert.equal(f.s.get('SELECT COUNT(*) AS n FROM movements')!.n,movements);
 assert.equal(list(f.s,f.m,'orders').count,1);
 }finally{f.s.db.close();}
});
