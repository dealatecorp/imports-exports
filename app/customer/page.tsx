import {redirect} from 'next/navigation';
import {customerUser} from '@/lib/customer-auth';
import {db,Fault} from '@/lib/db';
import {customerBookings} from '@/lib/customer-orders';
import {ROUTES} from '@/lib/customer-pricing';
import {CustomerPortal} from '@/components/customer-portal';
export const dynamic='force-dynamic';
export default async function CustomerPage(){let customer;try{customer=await customerUser();}catch(e){if(e instanceof Fault&&e.status===401)redirect('/customer/login');throw e;}const s=db();return <CustomerPortal customer={customer} bookings={customerBookings(s,customer)} products={s.all("SELECT p.id,p.name,p.unit,p.precision,COALESCE(g.cargo_group,'General goods') AS cargo_group FROM products p LEFT JOIN product_cargo_groups g ON g.product_id=p.id WHERE p.archived=0 ORDER BY p.name")} routes={ROUTES.filter(r=>s.get('SELECT 1 FROM warehouses WHERE name=?',r.warehouse))}/>;}
