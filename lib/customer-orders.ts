import {z} from 'zod';
import {Store,Row,Fault,id,now,qty} from './db';
import {ROUTES,priceBooking} from './customer-pricing';
import {customerEvent} from './customer-events';
import {orderTimeline,recordName} from './queries';
import {ORDER_STEPS} from './order-steps';

const quoteInput=z.object({key:z.string().min(8).max(120),route:z.string(),direction:z.enum(['import','export']),weight:z.coerce.number().positive().max(1000000),volume:z.coerce.number().positive().max(5000),packages:z.coerce.number().int().min(1).max(100000),service:z.enum(['standard','priority']),handling:z.enum(['normal','fragile','chilled']),due:z.string(),items:z.array(z.object({product_id:z.string(),quantity:z.string()})).min(1).max(30)});
export function createCustomerQuote(s:Store,c:Row,raw:unknown){
 const d=quoteInput.parse(raw);return s.tx(()=>{
 const prior=s.get('SELECT * FROM customer_bookings WHERE customer_id=? AND request_key=?',c.id,d.key);if(prior)return prior;
 const route=ROUTES.find(r=>r.id===d.route);if(!route)throw new Fault('Choose an available route');const warehouse=s.get('SELECT id FROM warehouses WHERE name=?',route.warehouse);if(!warehouse)throw new Fault('This route is not currently available');
 const due=Date.parse(d.due);if(!Number.isFinite(due)||due<Date.now()||due>Date.now()+365*86400000)throw new Fault('Choose a future needed-by date within one year');
 if(new Set(d.items.map(i=>i.product_id)).size!==d.items.length)throw new Fault('List each item once and combine its quantities');
 const items=d.items.map(i=>{const p=s.get('SELECT * FROM products WHERE id=? AND archived=0',i.product_id);if(!p)throw new Fault('Choose an existing active item');return {product_id:p.id,name:p.name,unit:p.unit,quantity:qty(i.quantity,p.precision)};});
 const quote=priceBooking(route,d.weight,d.volume,d.packages,d.service,d.handling),booking=id(),origin=d.direction==='export'?route.port:route.overseas,destination=d.direction==='export'?route.overseas:route.port;
 s.run('INSERT INTO customer_bookings(id,customer_id,request_key,warehouse_id,direction,origin,destination,due,quote,items,total,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',booking,c.id,d.key,warehouse.id,d.direction,origin,destination,new Date(due).toISOString(),JSON.stringify(quote),JSON.stringify(items),quote.total,now());
 customerEvent(s,booking,'quote:'+booking,'Your quote is ready. Complete demo checkout to submit your order. No real money will be charged.');return s.get('SELECT * FROM customer_bookings WHERE id=?',booking)!;
 });
}
export function payDemoBooking(s:Store,c:Row,raw:unknown){
 if(process.env.APP_PRODUCTION==='true')throw new Fault('Demo checkout is disabled in production',403);
 const d=z.object({booking_id:z.string(),key:z.string().min(8).max(120),outcome:z.enum(['success','declined','cancelled'])}).parse(raw);
 return s.tx(()=>{
 const b=s.get('SELECT * FROM customer_bookings WHERE id=? AND customer_id=?',d.booking_id,c.id);if(!b)throw new Fault('Booking not found',404);
 const previous=s.get('SELECT * FROM demo_payments WHERE request_key=?',d.key);if(previous){if(previous.booking_id!==b.id||previous.outcome!==d.outcome)throw new Fault('Payment request already used',409);return {outcome:previous.outcome,order_id:b.order_id};}
 if(b.status==='Paid (demo)')return {outcome:'success',order_id:b.order_id};if(b.status==='Cancelled')throw new Fault('This booking was cancelled');
 if(Date.now()-Date.parse(b.created)>86400000)throw new Fault('This quote expired. Create a new quote.');if(Date.parse(b.due)<=Date.now())throw new Fault('The needed-by date has passed. Create a new quote.');
 const payment=id();s.run('INSERT INTO demo_payments VALUES(?,?,?,?,?,?)',payment,b.id,d.key,d.outcome,b.total,now());
 if(d.outcome==='success'){
 const items:Row[]=JSON.parse(b.items);for(const item of items)if(!s.get('SELECT 1 FROM products WHERE id=? AND archived=0',item.product_id))throw new Fault('An item is no longer available. Request a new quote.');
 const order=id();s.run('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?)',order,'WEB-'+b.id,b.direction,b.warehouse_id,c.name,b.destination,b.due,now());for(const item of items)s.run('INSERT INTO order_lines(id,order_id,product_id,quantity) VALUES(?,?,?,?)',id(),order,item.product_id,item.quantity);
 s.run("UPDATE customer_bookings SET order_id=?,status='Paid (demo)' WHERE id=?",order,b.id);customerEvent(s,b.id,'payment:'+payment,'Demo payment approved. '+recordName(s,'orders',order)+' is confirmed and ready for the operations team. No money was charged.');return {outcome:'success',order_id:order};
 }
 if(d.outcome==='cancelled')s.run("UPDATE customer_bookings SET status='Cancelled' WHERE id=?",b.id);
 customerEvent(s,b.id,'payment:'+payment,d.outcome==='declined'?'Demo payment declined. You can retry checkout. No money was charged.':'Demo checkout cancelled. No money was charged.');return {outcome:d.outcome};
 });
}
export function customerBookings(s:Store,c:Row){return s.all('SELECT * FROM customer_bookings WHERE customer_id=? ORDER BY created DESC',c.id).map(b=>{
 const o=b.order_id?s.get('SELECT * FROM orders WHERE id=?',b.order_id):null,step=o?orderTimeline(s,o):0;
 const containers=o?s.all(`SELECT DISTINCT c.id,c.number,c.type FROM containers c JOIN allocations a ON a.container_id=c.id JOIN order_lines ol ON ol.id=a.line_id WHERE ol.order_id=? AND a.cancelled=0`,o.id).map(container=>({...container,name:recordName(s,'containers',container.id),items:s.all('SELECT p.name,p.unit,a.quantity FROM allocations a JOIN order_lines ol ON ol.id=a.line_id JOIN products p ON p.id=ol.product_id WHERE a.container_id=? AND ol.order_id=? AND a.cancelled=0',container.id,o.id)})):[];
 return {id:b.id,status:b.status,orderName:o?recordName(s,'orders',o.id):'Booking request',stage:o?ORDER_STEPS[step]:b.status,step,origin:b.origin,destination:b.destination,direction:b.direction,due:b.due,total:b.total,quote:JSON.parse(b.quote),items:JSON.parse(b.items),containers,updates:s.all('SELECT id,message,created FROM customer_updates WHERE booking_id=? ORDER BY rowid DESC',b.id)};
 });}
