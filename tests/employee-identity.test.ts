import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';

test('Changes use the signed-in employee for audit history even when a request includes another employee ID',()=>{
 const f=fixture();try{
 const result=f.call('order',{ref:'EMPLOYEE-ORDER',direction:'import',warehouse_id:'w',party:'Test customer',destination:'West',due:'2026-12-01',product_id:'p',quantity:'10',employee_id:f.m.id},f.e);
 const saved=f.s.get("SELECT actor FROM audit WHERE action='order' AND entity=?",result.id)!;
 assert.equal(saved.actor,f.e.id);
 assert.notEqual(saved.actor,f.m.id);
 }finally{f.s.db.close();}
});
