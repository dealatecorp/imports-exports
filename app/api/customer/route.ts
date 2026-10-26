import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {db,Fault,hash} from '@/lib/db';
import {guard,secureMode,rate} from '@/lib/auth';
import {customerCookie,customerLogin,customerUser,registerCustomer} from '@/lib/customer-auth';
import {createCustomerQuote,payDemoBooking} from '@/lib/customer-orders';
import {failure} from '@/lib/http';
export const runtime='nodejs';
export async function POST(req:Request){try{
 guard(req);const text=await req.text();if(text.length>30000)throw new Fault('Request too large',413);const d=JSON.parse(text),s=db();
 if(d.action==='login'||d.action==='register'){
 if(d.action==='register'){rate(s,'customer-registration-global',30);registerCustomer(s,d);}
 const token=customerLogin(s,d);(await cookies()).set(customerCookie,token,{httpOnly:true,secure:secureMode(),sameSite:'strict',maxAge:28800,path:'/'});return NextResponse.json({message:'Signed in'});
 }
 const c=await customerUser();guard(req,c);
 if(d.action==='logout'){const jar=await cookies();s.run('DELETE FROM customer_sessions WHERE token=?',hash(jar.get(customerCookie)!.value));jar.delete(customerCookie);return NextResponse.json({message:'Signed out'});}
 if(d.action==='quote'){rate(s,'customer-quotes:'+c.id,30);const b=createCustomerQuote(s,c,d);return NextResponse.json({id:b.id,total:b.total,quote:JSON.parse(b.quote)});}
 if(d.action==='pay')return NextResponse.json(payDemoBooking(s,c,d));
 throw new Fault('Unknown customer action');
 }catch(e){return failure(e);}}
