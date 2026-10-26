import {db,id} from '../lib/db';
import {registerCustomer} from '../lib/customer-auth';
import {createCustomerQuote,payDemoBooking} from '../lib/customer-orders';
const s=db();if(s.get("SELECT value FROM settings WHERE key='demo'")?.value!=='true'||process.env.APP_PRODUCTION==='true')throw new Error('Local demo database required');
const email='customer@harbor.local';let c=s.get('SELECT * FROM customers WHERE email=?',email);
if(!c){const key=registerCustomer(s,{name:'Demo Customer',email,password:'HarborDemo!2026',phone:'+910000000001',whatsapp:false});c=s.get('SELECT * FROM customers WHERE id=?',key)!;}
if(!s.get('SELECT 1 FROM customer_bookings WHERE customer_id=?',c.id)){
 const product=s.get("SELECT id FROM products WHERE sku='DEMO-RICE' AND archived=0")||s.get('SELECT id FROM products WHERE archived=0 LIMIT 1');if(!product)throw new Error('Add a product first');
 const b=createCustomerQuote(s,c,{key:id(),phone:c.phone,whatsapp:false,route:'mumbai-dubai',direction:'export',weight:120,volume:1,packages:10,service:'standard',handling:'normal',due:new Date(Date.now()+10*86400000).toISOString(),items:[{product_id:product.id,quantity:'10'}]});payDemoBooking(s,c,{booking_id:b.id,key:id(),outcome:'success'});
}
console.log('Demo customer ready: customer@harbor.local / HarborDemo!2026. Sample contact is a placeholder; WhatsApp is disabled for this demo account.');s.db.close();
