import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {recordName,itemSummary,list,lookups} from '../lib/queries';
test('Friendly names stay consistent across filtered lists and form options; item totals exclude cancelled cargo',()=>{
 const f=fixture();try{
 f.opening(200,0);const a=f.setup('export','100');const first=f.allocate(a,'30');f.allocate(a,'20');
 assert.equal(recordName(f.s,'orders',a.order),'Order 1');
 assert.equal(itemSummary(f.s,'orders',a.order),'Product — 100 unit');
 assert.equal(itemSummary(f.s,'shipments',a.shipment),'Product — 50 unit');
 assert.equal(itemSummary(f.s,'containers',a.container),'Product — 50 unit');
 f.call('cancel-allocation',{allocation_id:first,reason:'Remove duplicate cargo'});
 assert.equal(itemSummary(f.s,'shipments',a.shipment),'Product — 20 unit');
 const b=f.setup('import','10');assert.equal(itemSummary(f.s,'shipments',b.shipment),'No items added yet');
 const row=list(f.s,f.m,'orders',{id:a.order}).rows[0];assert.equal(row.display_name,'Order 1');assert.equal(row.items,'Product — 100 unit');
 const options=lookups(f.s,f.m);assert.equal(options.containers.find(c=>c.id===a.container)?.display_name,'Container 1');
 assert.equal(options.orderLines.find(l=>l.order_id===a.order)?.product_name,'Product');
 assert.equal(list(f.s,f.m,'allocations',{}).rows[0].product_name,'Product');
 }finally{f.s.db.close();}
});
