import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {firebaseUserExport} from '../lib/firebase-user-export';

const source=new DatabaseSync(process.env.DATABASE_PATH||'./data/harbor.db',{readOnly:true});
try{
 const staff=source.prepare('SELECT id,email,name,password,role,active,mfa FROM users').all();
 const customers=source.prepare('SELECT id,email,name,password FROM customers').all();
 const exported=firebaseUserExport(staff as any,customers as any);
 const folder=resolve('data/firebase-migration');mkdirSync(folder,{recursive:true});
 // Exclusive creation avoids accidentally replacing a reviewed migration snapshot.
 writeFileSync(resolve(folder,'auth-users.json'),JSON.stringify(exported,null,2),{flag:'wx',mode:0o600});
 const profiles={staff:staff.map(({password,mfa,...profile})=>({...profile,warehouseIds:source.prepare('SELECT warehouse_id FROM assignments WHERE user_id=?').all(profile.id).map(x=>x.warehouse_id)})),customers:customers.map(({password,...profile})=>profile)};
 writeFileSync(resolve(folder,'profiles.json'),JSON.stringify(profiles,null,2),{flag:'wx',mode:0o600});
 console.log(`Prepared ${staff.length} staff and ${customers.length} customer accounts locally. Password hashes and IDs preserved. No Firebase upload performed.`);
}finally{source.close();}
