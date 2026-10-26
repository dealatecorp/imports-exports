import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {id} from '../lib/db';
import {waitingToReceive,receiptReview,orderProgress,orderTimeline,orderWorkspace,list} from '../lib/queries';

test('Unloaded incoming order is received atomically once and status agrees with progress',()=>{
 const f=fixture();try{
 const a=f.setup('import','10');f.allocate(a,'10');
 assert.equal(waitingToReceive(f.s,f.m).length,0);
 f.call('tracking',{shipment_id:a.shipment,stage:'Unloading',place:'Dock',event_time:'2026-01-01'});
 assert.equal(waitingToReceive(f.s,f.m).length,0);
 f.call('tracking',{shipment_id:a.shipment,stage:'Unloaded',place:'Dock',event_time:'2026-01-02'});
 const review=waitingToReceive(f.s,f.e)[0];assert.equal(review.canReceive,true);
 assert.throws(()=>f.call('receive-order',{order_id:a.order,version:review.version,checked:'false'}),/checked/);
 const request={order_id:a.order,version:review.version,checked:'true',reason:'All cartons checked'},key=id();
 f.call('receive-order',request,f.e,key);f.call('receive-order',request,f.e,key);
 assert.equal(f.balance('Available'),10);assert.equal(waitingToReceive(f.s,f.e).length,0);
 const o=f.s.get('SELECT * FROM orders WHERE id=?',a.order)!;
 assert.equal(orderProgress(f.s,o).status,'Completed');assert.equal(orderTimeline(f.s,o),8);
 assert.throws(()=>f.call('receive-order',request),/already completed/);
 assert.throws(()=>f.call('order-line',{order_id:a.order,product_id:'p',quantity:'1'}),/completed or fully received/);
 }finally{f.s.db.close();}
});

test('Receipt review rejects stale quantities and unresolved damage; warehouse access is enforced',()=>{
 const f=fixture();try{
 const a=f.setup('import','10');const aid=f.allocate(a,'10');f.call('tracking',{shipment_id:a.shipment,stage:'Unloaded',place:'Dock',event_time:'2026-01-01'});
 const before=receiptReview(f.s,f.m,a.order);f.call('order-line',{order_id:a.order,product_id:'p',quantity:'1'});
 assert.throws(()=>f.call('receive-order',{order_id:a.order,version:before.version,checked:'true'}),/Assign all/);
 const line=f.s.get('SELECT id FROM order_lines WHERE order_id=? AND id!=?',a.order,a.line)!;
 f.allocate({...a,line:line.id},'1');const reviewed=receiptReview(f.s,f.m,a.order);
 f.call('tracking',{shipment_id:a.shipment,container_id:a.container,stage:'Handover',place:'Warehouse',event_time:'2026-01-02'});
 assert.throws(()=>f.call('receive-order',{order_id:a.order,version:reviewed.version,checked:'true'}),/order changed/);
 f.call('receive',{allocation_id:aid,accepted:'8',blocked:'2'});assert.equal(receiptReview(f.s,f.m,a.order).canReceive,false);
 const east=f.setup('import','10','east','c');assert.throws(()=>receiptReview(f.s,f.e,east.order),/assigned/);
 }finally{f.s.db.close();}
});

test('Sending an export is not completion; confirmed delivery completes it without adding warehouse stock',()=>{
 const f=fixture();try{
 f.opening(100,0);const a=f.setup('export','10');const aid=f.allocate(a,'10');f.call('load',{allocation_id:aid,from:'Reserved',quantity:'10'});
 f.call('dispatch',{shipment_id:a.shipment,version:f.s.get('SELECT version FROM shipments WHERE id=?',a.shipment)!.version});
 const o=f.s.get('SELECT * FROM orders WHERE id=?',a.order)!;assert.equal(orderProgress(f.s,o).status,'Sent');assert.equal(orderTimeline(f.s,o),2);
 f.call('tracking',{shipment_id:a.shipment,stage:'Unloaded',place:'Destination',event_time:'2026-01-01'});
 const r=receiptReview(f.s,f.m,a.order),stock=f.total();f.call('receive-order',{order_id:a.order,version:r.version,checked:'true',reason:'Customer confirmed all items'});
 assert.equal(f.total(),stock);assert.equal(orderProgress(f.s,o).status,'Completed');assert.equal(orderTimeline(f.s,o),8);
 }finally{f.s.db.close();}
});


test('Handover locks editing and final receipt reconciles reserved, staged and loaded stock once',()=>{
 const f=fixture();try{
 f.opening(100,0);const a=f.setup('export','10');const aid=f.allocate(a,'10');
 f.call('stage',{allocation_id:aid,quantity:'3'});f.call('load',{allocation_id:aid,from:'Reserved',quantity:'2'});
 const o=f.s.get('SELECT * FROM orders WHERE id=?',a.order)!;
 for(const [stage,step] of [['Departed',2],['In Transit',3],['Arrived',4],['Unloading',5],['Unloaded',6],['Handover',7]] as const){f.call('tracking',{shipment_id:a.shipment,stage,place:'Destination',event_time:'2026-01-01'});assert.equal(orderTimeline(f.s,o),step);const expected=stage==='Departed'?'Sent':stage==='In Transit'?'On the way':stage==='Handover'?'Handed over':stage;assert.equal(orderWorkspace(f.s,f.m,a.order).order.status,expected);assert.equal(list(f.s,f.m,'orders',{id:a.order}).rows[0].status,expected);}
 assert.throws(()=>f.call('container',{shipment_id:a.shipment,number:'Extra',type:'40 ft',seal:'S'}),/locked|handed over|already been sent/);
 assert.throws(()=>f.call('order-line',{order_id:a.order,product_id:'p',quantity:'1'}),/handed over/);
 assert.throws(()=>f.call('load',{allocation_id:aid,from:'Reserved',quantity:'1'}),/unshipped/);
 const review=receiptReview(f.s,f.m,a.order);assert.equal(review.canReceive,true);
 const data={order_id:a.order,version:review.version,checked:'true'},key=id();f.call('receive-order',data,f.m,key);f.call('receive-order',data,f.m,key);
 assert.equal(f.total(),90);for(const state of ['Reserved','Staged','Loaded'])assert.equal(f.balance(state),0);
 assert.equal(orderProgress(f.s,o).status,'Completed');assert.equal(orderTimeline(f.s,o),8);
 assert.equal(f.s.get("SELECT COUNT(*) AS n FROM movements WHERE kind='Delivery confirmation'")!.n,3);
 }finally{f.s.db.close();}
});


test('Departure tracking prevents new containers and new shipping routes even without a dispatch entry',()=>{
 const f=fixture();try{
 f.opening(100,0);const a=f.setup('export','10');f.allocate(a,'10');
 f.call('tracking',{shipment_id:a.shipment,stage:'Departed',place:'Port',event_time:'2026-01-01'});
 assert.throws(()=>f.call('container',{shipment_id:a.shipment,number:'Extra',type:'40 ft',seal:'S'}),/already been sent/);
 assert.throws(()=>f.call('shipment',{order_id:a.order,warehouse_id:'w',direction:'export'}),/already been sent/);
 }finally{f.s.db.close();}
});
