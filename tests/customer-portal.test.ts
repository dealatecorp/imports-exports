import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures';
import {id} from '../lib/db';
import {registerCustomer,customerLogin,customerIdentity} from '../lib/customer-auth';
import {createCustomerQuote,payDemoBooking,customerBookings} from '../lib/customer-orders';
import {ROUTES,priceBooking} from '../lib/customer-pricing';
import {identity} from '../lib/auth';
import {recordCustomerChanges,whatsappLink} from '../lib/customer-events';

function setup(){const f=fixture();f.s.run("UPDATE warehouses SET name='Mumbai Gateway' WHERE id='w'");const cid=registerCustomer(f.s,{name:'Demo customer',email:'customer@test.local',password:'CustomerDemo!2026',phone:'+910000000001',whatsapp:true}),c=f.s.get('SELECT id,name,phone,whatsapp FROM customers WHERE id=?',cid)!;return {...f,c};}
const input=()=>({key:id(),phone:'+910000000001',whatsapp:true,route:'mumbai-dubai',direction:'export',weight:100,volume:1,packages:10,service:'standard',handling:'normal',due:new Date(Date.now()+10*86400000).toISOString(),items:[{product_id:'p',quantity:'10'}]});
test('Demo quote and payment are server priced, atomic and repeat-safe; customers cannot read or pay each others bookings',()=>{
 const f=setup();try{
 const request=input(),b=createCustomerQuote(f.s,f.c,{...request,total:1});assert.equal(createCustomerQuote(f.s,f.c,request).id,b.id);assert.equal(b.total,priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:10}]).total);
 assert.throws(()=>payDemoBooking(f.s,{...f.c,id:'other'},{booking_id:b.id,key:id(),outcome:'success'}),/not found/);assert.deepEqual(customerBookings(f.s,{id:'other'}),[]);
 payDemoBooking(f.s,f.c,{booking_id:b.id,key:id(),outcome:'declined'});assert.equal(f.s.get('SELECT COUNT(*) AS n FROM orders')!.n,0);
 const payment={booking_id:b.id,key:id(),outcome:'success'},r=payDemoBooking(f.s,f.c,payment);payDemoBooking(f.s,f.c,payment);payDemoBooking(f.s,f.c,{...payment,key:id()});assert.equal(f.s.get('SELECT COUNT(*) AS n FROM orders')!.n,1);
 assert.equal(customerBookings(f.s,f.c)[0].stage,'Confirmed');assert.equal(f.s.get('SELECT order_id FROM customer_bookings WHERE id=?',b.id)!.order_id,r.order_id);
 const cancelled=createCustomerQuote(f.s,f.c,input());payDemoBooking(f.s,f.c,{booking_id:cancelled.id,key:id(),outcome:'cancelled'});assert.throws(()=>payDemoBooking(f.s,f.c,{booking_id:cancelled.id,key:id(),outcome:'success'}),/cancelled/);
 }finally{f.s.db.close();}
});
test('Customer credentials create customer sessions only; invalid dates, routes and items are rejected',()=>{
 const f=setup();try{
 const token=customerLogin(f.s,{email:'customer@test.local',password:'CustomerDemo!2026'});assert.equal(customerIdentity(f.s,token).id,f.c.id);assert.throws(()=>identity(f.s,token),/sign in/);
 assert.throws(()=>createCustomerQuote(f.s,f.c,{...input(),route:'unknown'}),/route/);assert.throws(()=>createCustomerQuote(f.s,f.c,{...input(),weight:-1}));assert.throws(()=>createCustomerQuote(f.s,f.c,{...input(),due:'2000-01-01'}),/future/);assert.throws(()=>createCustomerQuote(f.s,f.c,{...input(),items:[{product_id:'missing',quantity:'1'}]}),/existing/);
 assert.ok(priceBooking(ROUTES[0],100,1,10,'priority','fragile').total>priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:10}]).total);
 }finally{f.s.db.close();}
});
test('Staff can pack customer orders; updates persist once and WhatsApp drafts target the customer',()=>{
 const f=setup();try{
 f.call('add-stock',{product_id:'p',location_id:'a',quantity:'100',reason:'Test stock'});const b=createCustomerQuote(f.s,f.c,input()),paid=payDemoBooking(f.s,f.c,{booking_id:b.id,key:id(),outcome:'success'});
 const other=f.setup('export','10'),line=f.s.get('SELECT id FROM order_lines WHERE order_id=?',paid.order_id)!;
 const a=f.call('allocate',{line_id:line.id,container_id:other.container,location_id:'a',quantity:'10',packages:'1'},f.e);
 assert.match(a.whatsapp[0].url,/https:\/\/wa.me\/910000000001\?text=/);
 const d={shipment_id:other.shipment,container_id:other.container,stage:'Departed',place:'Mumbai',event_time:new Date(Date.now()-1000).toISOString()},key=id();f.call('tracking',d,f.e,key);const n=customerBookings(f.s,f.c)[0].updates.length;f.call('tracking',d,f.e,key);assert.equal(customerBookings(f.s,f.c)[0].updates.length,n);assert.equal(customerBookings(f.s,f.c)[0].stage,'Sent');
 assert.equal(customerBookings(f.s,f.c)[0].containers[0].items.length,1);
 
 assert.equal(new URL(whatsappLink('+910000000001','Test & update')).searchParams.get('text'),'Test & update');
 }finally{f.s.db.close();}
});

 test('Each order requires its own contact and drafts respect that order number and consent',()=>{
 const f=setup();try{
 for(const phone of ['', '9876543210', '+abc'])assert.throws(()=>createCustomerQuote(f.s,f.c,{...input(),phone}),/WhatsApp number/);
 const first=createCustomerQuote(f.s,f.c,{...input(),phone:'+910000000002'}),second=createCustomerQuote(f.s,f.c,{...input(),phone:'+910000000003',whatsapp:false});
 const a=payDemoBooking(f.s,f.c,{booking_id:first.id,key:id(),outcome:'success'}),b=payDemoBooking(f.s,f.c,{booking_id:second.id,key:id(),outcome:'success'});
 f.s.run("UPDATE customers SET phone='+910000000004',whatsapp=1 WHERE id=?",f.c.id);
 assert.match(recordCustomerChanges(f.s,'order-line',{order_id:a.order_id},{},id())[0].url,/wa.me\/910000000002\?text=/);
 assert.deepEqual(recordCustomerChanges(f.s,'order-line',{order_id:b.order_id},{},id()),[]);
 const bookings=customerBookings(f.s,f.c);assert.equal(bookings.find(x=>x.id===first.id)!.phone,'+910000000002');assert.equal(bookings.find(x=>x.id===second.id)!.phone,'+910000000003');
 }finally{f.s.db.close();}
 });

test('Live quote responds to every priced order field and agrees with server calculation',()=>{
 const base=priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:1}]);
 const changes=[priceBooking(ROUTES[1],100,1,10,'standard','normal',[{name:'Item',quantity:1}]),priceBooking(ROUTES[0],101,1,10,'standard','normal',[{name:'Item',quantity:1}]),priceBooking(ROUTES[0],100,2,10,'standard','normal',[{name:'Item',quantity:1}]),priceBooking(ROUTES[0],100,1,11,'standard','normal',[{name:'Item',quantity:1}]),priceBooking(ROUTES[0],100,1,10,'priority','normal',[{name:'Item',quantity:1}]),priceBooking(ROUTES[0],100,1,10,'standard','chilled',[{name:'Item',quantity:1}]),priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:2}]),priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:1,cargo_group:'Fragile goods'}]),priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:1}],'import')];
 for(const quote of changes){assert.ok(quote.total>base.total);assert.equal(quote.lines.reduce((sum,line)=>sum+line.amount,0),quote.total);}
 const f=setup();try{f.s.run("INSERT INTO product_cargo_groups VALUES('p','Fragile goods')");const b=createCustomerQuote(f.s,f.c,{...input(),direction:'import',total:1});assert.equal(b.total,priceBooking(ROUTES[0],100,1,10,'standard','normal',[{name:'Item',quantity:10,cargo_group:'Fragile goods'}],'import').total);}finally{f.s.db.close();}
});
