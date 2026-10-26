import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {id} from '../lib/db';
import {orderWorkspace,containerOrders,orderTimeline} from '../lib/queries';

test('Order workspace saves shipping before containers, preserves links, supports shared containers and enforces scope',()=>{
 const f=fixture();try{
 f.opening(300,0);const a=f.setup();const b=f.setup();
 const shipping={ref:id(),order_id:a.order,warehouse_id:'w',direction:'export',kind:'FCL',carrier:'Carrier',origin:'Mumbai',destination:'Dubai',departure:'2026-10-01',eta:'2026-12-01'};
 const key=id();const result=f.call('shipment',shipping,f.m,key);assert.equal(f.call('shipment',shipping,f.m,key).id,result.id);
 assert.equal(orderWorkspace(f.s,f.e,a.order).shipments[0].id,result.id);
 const c=f.call('container',{shipment_id:result.id,number:id(),type:'40 ft',seal:'Seal'}).id;
 assert.equal(containerOrders(f.s,f.e,c)[0].id,a.order);
 f.call('link-shipment',{order_id:b.order,shipment_id:result.id});
 f.allocate({...a,container:c},'20');f.allocate({...b,container:c},'30');
 assert.equal(containerOrders(f.s,f.e,c).length,2);
 const data=orderWorkspace(f.s,f.e,a.order);assert.equal(data.allocations.length,1);assert.equal(data.allocations[0].quantity,20e6);assert.equal(data.shipments[0].shared,true);
 const east=f.setup('export','10','east','c');assert.throws(()=>orderWorkspace(f.s,f.e,east.order),/assigned/);
 assert.throws(()=>f.call('shipment',{...shipping,ref:id(),warehouse_id:'east'}),/same warehouse/);
 const incoming=f.setup('import');assert.throws(()=>f.call('link-shipment',{order_id:a.order,shipment_id:incoming.shipment}),/same warehouse and direction/);
 }finally{f.s.db.close();}
});

test('Fully received orders reject new items, assignments, shipping and containers, including stale requests',()=>{
 const f=fixture();try{
 const a=f.setup('import','10');const allocation=f.allocate(a,'10');
 f.call('receive',{allocation_id:allocation,accepted:'4',blocked:'0',reason:'Partial delivery'});
 assert.equal(orderWorkspace(f.s,f.m,a.order).order.status,'Unloading');
 f.call('receive',{allocation_id:allocation,accepted:'6',blocked:'0',reason:'Remaining delivery'});
 const before=f.s.get('SELECT COUNT(*) AS n FROM order_lines WHERE order_id=?',a.order)!.n;
 assert.throws(()=>f.call('order-line',{order_id:a.order,product_id:'p',quantity:'2'}),/completed or fully received/);
 assert.throws(()=>f.allocate(a,'1'),/completed or fully received/);
 assert.throws(()=>f.call('container',{shipment_id:a.shipment,number:id(),type:'40 ft',seal:'Seal'}),/completed or fully received/);
 assert.throws(()=>f.call('shipment',{order_id:a.order,warehouse_id:'w',direction:'import'}),/completed or fully received/);
 assert.throws(()=>f.call('link-shipment',{order_id:a.order,shipment_id:a.shipment}),/completed or fully received/);
 assert.equal(f.s.get('SELECT COUNT(*) AS n FROM order_lines WHERE order_id=?',a.order)!.n,before);
 assert.equal(orderWorkspace(f.s,f.m,a.order).order.step,8);
 }finally{f.s.db.close();}
});

test('Whole-order progress does not skip unassigned items when another container has arrived',()=>{
 const f=fixture();try{f.opening(200,0);const a=f.setup();f.allocate(a,'40');f.call('tracking',{shipment_id:a.shipment,stage:'Arrived',place:'Port',event_time:'2026-01-01',notes:'Confirmed'});
 assert.equal(orderTimeline(f.s,f.s.get('SELECT * FROM orders WHERE id=?',a.order)!),1);
 }finally{f.s.db.close();}
});
