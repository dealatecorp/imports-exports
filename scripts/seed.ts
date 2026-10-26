import {hashSync} from 'bcryptjs';
import {db,id,now} from '../lib/db';
import {execute} from '../lib/operations';
if(process.env.ALLOW_DEMO_SEED!=='true'||process.env.APP_PRODUCTION==='true')throw new Error('Demo seed requires ALLOW_DEMO_SEED=true and nonproduction mode');
const s=db();if(s.get('SELECT id FROM users LIMIT 1'))throw new Error('Seed only runs against an empty database');
const managerId=id(),employeeId=id(),mumbai=id(),chennai=id(),a=id(),b=id(),c=id();
s.tx(()=>{s.run('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)',managerId,'Alex Morgan','manager@harbor.local',hashSync('HarborDemo!2026',12),'manager');s.run('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)',employeeId,'Priya Shah','employee@harbor.local',hashSync('HarborDemo!2026',12),'employee');s.run('INSERT INTO warehouses VALUES(?,?),(?,?)',mumbai,'Mumbai Gateway',chennai,'Chennai Logistics');s.run('INSERT INTO assignments VALUES(?,?)',employeeId,mumbai);s.run('INSERT INTO locations VALUES(?,?,?),(?,?,?),(?,?,?)',a,mumbai,'A-01',b,mumbai,'Loading Bay',c,chennai,'B-01');s.run("INSERT INTO settings VALUES('demo','true')");});
const u=s.get('SELECT * FROM users WHERE id=?',managerId)!;const call=(action:string,data:Record<string,unknown>)=>execute(s,u,{action,key:id(),data});
const products=[['TXT-001','Premium cotton textiles','carton'],['SPC-002','Whole black pepper','bag'],['CER-003','Ceramic dinnerware','carton'],['MCH-004','Precision machine parts','crate'],['TEA-005','Assam black tea','carton']].map(([sku,name,unit])=>call('product',{sku,name,unit,precision:0}).id);
call('opening-import',{csv:'sku,warehouse,location,unit,quantity,state,lot\nTXT-001,Mumbai Gateway,A-01,carton,480,Available,\nTXT-001,Mumbai Gateway,A-01,carton,20,Blocked,\nSPC-002,Mumbai Gateway,A-01,bag,350,Available,\nCER-003,Mumbai Gateway,A-01,carton,210,Available,\nMCH-004,Chennai Logistics,B-01,crate,75,Available,\nTEA-005,Mumbai Gateway,A-01,carton,90,Available,',reason:'Approved demonstration opening balances'});
const date=(days:number)=>new Date(Date.now()+days*86400000).toISOString();
for(let i=0;i<4;i++){
 const inbound=i===2,warehouse=i===3?chennai:mumbai,location=i===3?c:a;
 const order=call('order',{ref:`${inbound?'IMP':'EXP'}-2026-${1041+i}`,direction:inbound?'import':'export',warehouse_id:warehouse,party:['Northstar Trading','Arabian Spice Co','Pacific Homewares','Nordic Engineering'][i],destination:['Rotterdam','Dubai','Mumbai','Hamburg'][i],due:date(i+3),product_id:products[i],quantity:String(i===3?30:100)});
 const sh=call('shipment',{ref:`SHP-${2401+i}`,direction:inbound?'import':'export',warehouse_id:warehouse,kind:'FCL',carrier:['Maersk','MSC','CMA CGM','Hapag-Lloyd'][i],vessel:['Maersk Essex','MSC Aurora','CMA CGM Loire','Hamburg Express'][i],voyage:`V${80+i}`,origin:inbound?'Singapore':i===3?'Chennai':'Mumbai',destination:['Rotterdam','Dubai','Mumbai','Hamburg'][i],departure:date(-4),eta:date(i===1?-1:i+3)});
 const container=call('container',{shipment_id:sh.id,number:`HBRU${700001+i}`,type:'40 ft high cube',seal:`SL${8101+i}`,max_weight:'24000',max_volume:'65'});
 const line=s.get('SELECT id FROM order_lines WHERE order_id=?',order.id)!;
 const allocation=call('allocate',{line_id:line.id,container_id:container.id,location_id:location,quantity:i===3?'30':'100',packages:i===3?'30':'100',weight:'2400',volume:'20',reason:'Demo shipment allocation'});
 if(i===0){call('load',{allocation_id:allocation.id,from:'Reserved',quantity:'100'});call('dispatch',{shipment_id:sh.id,version:s.get('SELECT version FROM shipments WHERE id=?',sh.id)!.version});call('tracking',{shipment_id:sh.id,stage:'In Transit',place:'Arabian Sea checkpoint',event_time:date(-1),notes:'Position supplied by operations; manually recorded.'});}
 if(i===1)call('stage',{allocation_id:allocation.id,quantity:'60'});
 if(inbound){call('tracking',{shipment_id:sh.id,stage:'Arrived',place:'Nhava Sheva port',event_time:date(-1)});call('receive',{allocation_id:allocation.id,accepted:'90',blocked:'5',reason:'Partial receipt; five cartons damaged and five outstanding'});}
}
call('count',{product_id:products[4],location_id:a,state:'Available',quantity:'88',reason:'Cycle count requires manager review'});
call('threshold',{product_id:products[4],warehouse_id:mumbai,quantity:'100'});
console.log('Demo data created. Manager: manager@harbor.local / Employee: employee@harbor.local. Local-only password: HarborDemo!2026');
