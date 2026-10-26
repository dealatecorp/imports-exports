import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {hashSync,compareSync} from 'bcryptjs';
import {z} from 'zod';
import {Store,db,Fault,hash,id,now} from './db';
import {rate,productionCheck} from './auth';
export const customerCookie='harbor_customer_session';
export function registerCustomer(s:Store,raw:unknown){
 const d=z.object({name:z.string().trim().min(2).max(100),email:z.email().max(200),password:z.string().min(12).max(72),phone:z.string().regex(/^\+[1-9]\d{7,14}$/,'Use country code, for example +917981456043'),whatsapp:z.boolean()}).parse(raw);
 rate(s,'customer-register:'+hash(d.email.toLowerCase()),5);
 const key=id();s.run('INSERT INTO customers VALUES(?,?,?,?,?,?,?)',key,d.name,d.email.toLowerCase(),hashSync(d.password,12),d.phone,d.whatsapp?1:0,now());return key;
}
export function customerLogin(s:Store,raw:unknown){
 const d=z.object({email:z.email(),password:z.string().max(72)}).parse(raw),email=d.email.toLowerCase();rate(s,'customer-login:'+hash(email),8);
 const c=s.get('SELECT * FROM customers WHERE email=?',email),dummy='$2b$12$C6UzMDM.H6dfI/f/IKcEe.5rRKBj0zF8V.A8KIp0bFrN7D/JuYkQK';
 if(!compareSync(d.password,c?.password||dummy)||!c)throw new Fault('Invalid email or password',401);
 const token=randomBytes(32).toString('hex');s.run('INSERT INTO customer_sessions VALUES(?,?,?,?)',hash(token),c.id,randomBytes(24).toString('hex'),new Date(Date.now()+8*3600000).toISOString());return token;
}
export function customerIdentity(s:Store,token:string){const c=s.get('SELECT c.id,c.name,c.email,c.phone,c.whatsapp,cs.csrf FROM customer_sessions cs JOIN customers c ON c.id=cs.customer_id WHERE cs.token=? AND cs.expires>?',hash(token),now());if(!c)throw new Fault('Please sign in to your customer account',401);return c;}
export async function customerUser(){productionCheck();const token=(await cookies()).get(customerCookie)?.value;if(!token)throw new Fault('Please sign in',401);return customerIdentity(db(),token);}
