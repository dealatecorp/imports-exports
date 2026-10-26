import {Store,id,Row} from '../lib/db';
import {execute} from '../lib/operations';
export function fixture(path=':memory:'){
 const s=new Store(path);s.migrate();s.run("INSERT INTO users(id,name,email,password,role) VALUES('m','Manager','m@test.local','unused','manager'),('e','Employee','e@test.local','unused','employee')");s.run("INSERT INTO warehouses VALUES('w','West'),('east','East')");s.run("INSERT INTO locations VALUES('a','w','A'),('b','w','B'),('c','east','C')");s.run("INSERT INTO assignments VALUES('e','w')");s.run("INSERT INTO products VALUES('p','SKU','Product','unit',0,0,0)");const m=s.get("SELECT * FROM users WHERE id='m'")!,e=s.get("SELECT * FROM users WHERE id='e'")!;
 const call=(action:string,data:Row,u=m,key=id())=>execute(s,u,{action,data,key});
 const opening=(available=80,blocked=20)=>call('opening-import',{csv:`sku,warehouse,location,unit,quantity,state,lot\nSKU,West,A,unit,${available},Available,${blocked?`\nSKU,West,A,unit,${blocked},Blocked,`:''}`});
 const setup=(direction='export',quantity='100',warehouse='w',location='a')=>{const order=call('order',{ref:id(),direction,warehouse_id:warehouse,party:'Partner',destination:'Destination',due:'2026-12-01',product_id:'p',quantity});const sh=call('shipment',{ref:id(),direction,warehouse_id:warehouse,kind:'FCL',carrier:'Carrier',origin:'Mumbai',destination:'Dubai',departure:'2026-10-01',eta:'2026-12-01'});const c=call('container',{shipment_id:sh.id,number:id(),type:'40 ft',seal:'SEALED',max_weight:'1000',max_volume:'50'});const line=s.get('SELECT id FROM order_lines WHERE order_id=?',order.id)!.id;return {order:order.id,shipment:sh.id,container:c.id,line,location};};
 const allocate=(setup:Row,n='60')=>call('allocate',{line_id:setup.line,container_id:setup.container,location_id:setup.location,quantity:n,packages:'5',weight:'10',volume:'2'}).id;
 const balance=(state:string,location='a')=>s.get('SELECT quantity FROM balances WHERE product_id=? AND location_id=? AND state=?','p',location,state)?.quantity/1e6||0;
 const total=()=>s.get('SELECT COALESCE(SUM(quantity),0)/1000000.0 AS n FROM balances')!.n;
 return {s,m,e,call,opening,setup,allocate,balance,total};
}
