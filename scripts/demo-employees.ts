import {db} from '../lib/db';
import {admin} from '../lib/auth';

const s=db();
if(s.get("SELECT value FROM settings WHERE key='demo'")?.value!=='true')throw new Error('Demo employees can only be added to the demo database');
const manager=s.get("SELECT * FROM users WHERE role='manager' AND active=1 ORDER BY rowid LIMIT 1");
if(!manager)throw new Error('An active manager is required');
const people=[
 ['Aarav Kumar','aarav.demo@harbor.local','Mumbai Gateway'],
 ['Meera Patel','meera.demo@harbor.local','Mumbai Gateway'],
 ['Rohan Sharma','rohan.demo@harbor.local','Mumbai Gateway'],
 ['Ananya Rao','ananya.demo@harbor.local','Chennai Logistics'],
 ['Vikram Singh','vikram.demo@harbor.local','Chennai Logistics'],
];
for(const [name,email,warehouse] of people){
 const wh=s.get('SELECT id FROM warehouses WHERE name=?',warehouse);
 if(!wh)throw new Error('Missing warehouse: '+warehouse);
 if(s.get('SELECT id FROM users WHERE email=?',email)){console.log('Already exists: '+email);continue;}
 admin(s,manager,'user-create',{name:name+' (Demo)',email,password:'HarborDemo!2026',role:'employee'});
 const employee=s.get('SELECT id FROM users WHERE email=?',email)!;
 admin(s,manager,'user-access',{user_id:employee.id,warehouse_id:wh.id,assigned:'true'});
 console.log(name+' | '+email+' | '+warehouse);
}
s.db.close();
