import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {id} from '../lib/db';

test('Add stock increases an existing item once and records the logged-in employee',()=>{
 const f=fixture();try{
 f.opening(20,0);const data={product_id:'p',location_id:'a',quantity:'5',reason:'Local delivery'},key=id();
 const result=f.call('add-stock',data,f.e,key);f.call('add-stock',data,f.e,key);
 assert.equal(f.balance('Available'),25);
 assert.equal(f.s.get('SELECT COUNT(*) AS n FROM products')!.n,1);
 const movement=f.s.get('SELECT * FROM movements WHERE id=?',result.id)!;
 assert.equal(movement.actor,f.e.id);assert.equal(movement.kind,'Stock added');assert.equal(movement.delta,5000000);
 }finally{f.s.db.close();}
});

test('Add stock rejects unknown and archived items, invalid quantities, missing batches and unauthorized warehouses',()=>{
 const f=fixture();try{
 const data={product_id:'p',location_id:'a',quantity:'5',reason:'Delivery'};
 assert.throws(()=>f.call('add-stock',{...data,product_id:'new-item',name:'New item'}),/Active product/);
 assert.throws(()=>f.call('add-stock',{...data,location_id:'c'},f.e),/assigned/);
 for(const quantity of ['0','-1','1.5'])assert.throws(()=>f.call('add-stock',{...data,quantity}));
 assert.throws(()=>f.call('add-stock',{...data,reason:''}));
 f.s.run("UPDATE products SET lot_enabled=1 WHERE id='p'");
 assert.throws(()=>f.call('add-stock',data),/registered lot/);
 f.s.run("INSERT INTO lots VALUES('lot','p','BATCH-1')");
 f.call('add-stock',{...data,lot:'BATCH-1'},f.e);
 f.s.run("UPDATE products SET archived=1 WHERE id='p'");
 assert.throws(()=>f.call('add-stock',{...data,lot:'BATCH-1'}),/Active product/);
 assert.equal(f.total(),5);assert.equal(f.s.get('SELECT COUNT(*) AS n FROM products')!.n,1);
 }finally{f.s.db.close();}
});
