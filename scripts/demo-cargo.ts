import {db,id} from '../lib/db';
import {execute} from '../lib/operations';
const s=db();
if(s.get("SELECT value FROM settings WHERE key='demo'")?.value!=='true')throw new Error('Demo database required');
const manager=s.get("SELECT * FROM users WHERE role='manager' AND active=1 ORDER BY rowid LIMIT 1")!;
const samples=[
 ['DEMO-TOMATO','Fresh tomatoes','Vegetables and fruit'],
 ['DEMO-CARROT','Fresh carrots','Vegetables and fruit'],
 ['DEMO-FISH','Packed fish','Fish and seafood'],
 ['DEMO-PRAWN','Packed prawns','Fish and seafood'],
 ['DEMO-CHICKEN','Raw chicken','Raw meat'],
 ['DEMO-RICE','Bagged rice','Dry food'],
 ['DEMO-CLEANER','Sealed cleaning liquid','Cleaning products'],
 ['DEMO-GLASS','Glass bowls','Fragile goods'],
 ['DEMO-MOTOR','Industrial motors','Heavy equipment'],
];
for(const [sku,name,cargo_group] of samples){
 if(s.get('SELECT id FROM products WHERE sku=?',sku)){console.log('Already exists: '+name);continue;}
 execute(s,manager,{action:'product',key:id(),data:{sku,name,cargo_group,unit:'carton',precision:0,lot_enabled:'false'}});
 execute(s,manager,{action:'opening-import',key:id(),data:{csv:`sku,warehouse,location,unit,quantity,state,lot\n${sku},Mumbai Gateway,A-01,carton,50,Available,\n${sku},Chennai Logistics,B-01,carton,50,Available,`,reason:'Demo stock for container separation rules'}});
 console.log(name+' | '+cargo_group+' | 50 cartons in each warehouse');
}
s.db.close();
