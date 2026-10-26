import {redirect} from 'next/navigation';
import {customerUser} from '@/lib/customer-auth';
import {db,Fault} from '@/lib/db';
import {customerBookings} from '@/lib/customer-orders';
import {ROUTES} from '@/lib/customer-pricing';
import {CustomerPortal} from '@/components/customer-portal';
export const dynamic='force-dynamic';
export default async function CustomerPage(){let customer;try{customer=await customerUser();}catch(e){if(e instanceof Fault&&e.status===401)redirect('/customer/login');throw e;}const s=db();return <CustomerPortal customer={customer} bookings={customerBookings(s,customer)} products={s.all('SELECT id,name,unit,precision FROM products WHERE archived=0 ORDER BY name')} routes={ROUTES.filter(r=>s.get('SELECT 1 FROM warehouses WHERE name=?',r.warehouse))}/>;}
