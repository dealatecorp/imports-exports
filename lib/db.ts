import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export type Row = Record<string, any>;
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export class Fault extends Error { constructor(message:string, public status=400){super(message);} }
export class Store {
  db:DatabaseSync;
  constructor(path=process.env.DATABASE_PATH||'./data/harbor.db') {
    if(path!==':memory:') mkdirSync(dirname(resolve(path)),{recursive:true});
    this.db=new DatabaseSync(path); this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;');
  }
  get(sql:string,...p:SQLInputValue[]):Row|undefined{const row=this.db.prepare(sql).get(...p);return row?{...row}:undefined;}
  all(sql:string,...p:SQLInputValue[]):Row[]{return this.db.prepare(sql).all(...p).map(row=>({...row}));}
  run(sql:string,...p:SQLInputValue[]){return this.db.prepare(sql).run(...p);}
  tx<T>(fn:()=>T):T {this.db.exec('BEGIN IMMEDIATE');try {const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  migrate(){this.db.exec(schema);}
}
const schema=`
CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO schema_version VALUES(1);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('manager','employee')),active INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,mfa TEXT,mfa_last INTEGER DEFAULT -1);
CREATE TABLE IF NOT EXISTS warehouses(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS assignments(user_id TEXT REFERENCES users(id),warehouse_id TEXT REFERENCES warehouses(id),PRIMARY KEY(user_id,warehouse_id));
CREATE TABLE IF NOT EXISTS locations(id TEXT PRIMARY KEY,warehouse_id TEXT NOT NULL REFERENCES warehouses(id),name TEXT NOT NULL,UNIQUE(warehouse_id,name));
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,sku TEXT NOT NULL UNIQUE,name TEXT NOT NULL,unit TEXT NOT NULL,precision INTEGER NOT NULL DEFAULT 0 CHECK(precision BETWEEN 0 AND 6),lot_enabled INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS product_cargo_groups(product_id TEXT PRIMARY KEY REFERENCES products(id),cargo_group TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS conversions(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id),unit TEXT NOT NULL,factor INTEGER NOT NULL CHECK(factor>0),UNIQUE(product_id,unit));
CREATE TABLE IF NOT EXISTS lots(id TEXT PRIMARY KEY,product_id TEXT REFERENCES products(id),code TEXT NOT NULL,UNIQUE(product_id,code));
CREATE TABLE IF NOT EXISTS thresholds(product_id TEXT REFERENCES products(id),warehouse_id TEXT REFERENCES warehouses(id),quantity INTEGER NOT NULL CHECK(quantity>=0),PRIMARY KEY(product_id,warehouse_id));
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires TEXT NOT NULL,csrf TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reset_tokens(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires TEXT NOT NULL,used INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS login_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT OR IGNORE INTO settings VALUES('timezone','Asia/Kolkata'),('staleHours','48'),('requiredDocuments','[]'),('requireStaging','false');
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,ref TEXT UNIQUE NOT NULL,direction TEXT NOT NULL CHECK(direction IN ('export','import')),warehouse_id TEXT NOT NULL REFERENCES warehouses(id),party TEXT NOT NULL,destination TEXT NOT NULL,due TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS order_lines(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),product_id TEXT NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity>0),closed INTEGER NOT NULL DEFAULT 0 CHECK(closed>=0),version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS shipments(id TEXT PRIMARY KEY,ref TEXT UNIQUE NOT NULL,warehouse_id TEXT NOT NULL REFERENCES warehouses(id),direction TEXT NOT NULL CHECK(direction IN ('export','import')),kind TEXT NOT NULL,carrier TEXT NOT NULL,vessel TEXT NOT NULL DEFAULT '',voyage TEXT NOT NULL DEFAULT '',origin TEXT NOT NULL,destination TEXT NOT NULL,eta TEXT NOT NULL,original_eta TEXT NOT NULL,departure TEXT NOT NULL,dispatched TEXT,version INTEGER NOT NULL DEFAULT 1,cancelled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,phone TEXT NOT NULL,whatsapp INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customer_sessions(token TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id),csrf TEXT NOT NULL,expires TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customer_bookings(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id),request_key TEXT NOT NULL,warehouse_id TEXT NOT NULL REFERENCES warehouses(id),order_id TEXT UNIQUE REFERENCES orders(id),direction TEXT NOT NULL,origin TEXT NOT NULL,destination TEXT NOT NULL,due TEXT NOT NULL,quote TEXT NOT NULL,items TEXT NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'Awaiting payment',created TEXT NOT NULL,UNIQUE(customer_id,request_key));
CREATE TABLE IF NOT EXISTS demo_payments(id TEXT PRIMARY KEY,booking_id TEXT NOT NULL REFERENCES customer_bookings(id),request_key TEXT NOT NULL UNIQUE,outcome TEXT NOT NULL,amount INTEGER NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customer_updates(id TEXT PRIMARY KEY,booking_id TEXT NOT NULL REFERENCES customer_bookings(id),event_key TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL,UNIQUE(booking_id,event_key));
CREATE INDEX IF NOT EXISTS booking_customer ON customer_bookings(customer_id,created);
CREATE TABLE IF NOT EXISTS order_deletions(order_id TEXT PRIMARY KEY REFERENCES orders(id),actor TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL,reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS order_receipts(order_id TEXT PRIMARY KEY REFERENCES orders(id),actor TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL,reason TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS order_shipments(order_id TEXT NOT NULL REFERENCES orders(id),shipment_id TEXT NOT NULL REFERENCES shipments(id),PRIMARY KEY(order_id,shipment_id));
CREATE TABLE IF NOT EXISTS containers(id TEXT PRIMARY KEY,shipment_id TEXT NOT NULL REFERENCES shipments(id),number TEXT NOT NULL UNIQUE,type TEXT NOT NULL,seal TEXT NOT NULL,max_weight INTEGER,max_volume INTEGER);
CREATE TABLE IF NOT EXISTS allocations(id TEXT PRIMARY KEY,line_id TEXT NOT NULL REFERENCES order_lines(id),container_id TEXT NOT NULL REFERENCES containers(id),location_id TEXT NOT NULL REFERENCES locations(id),lot TEXT NOT NULL DEFAULT '',quantity INTEGER NOT NULL CHECK(quantity>0),reserved INTEGER NOT NULL DEFAULT 0,staged INTEGER NOT NULL DEFAULT 0,loaded INTEGER NOT NULL DEFAULT 0,dispatched INTEGER NOT NULL DEFAULT 0,received INTEGER NOT NULL DEFAULT 0,accepted INTEGER NOT NULL DEFAULT 0,blocked INTEGER NOT NULL DEFAULT 0,returned INTEGER NOT NULL DEFAULT 0,cancelled INTEGER NOT NULL DEFAULT 0,weight INTEGER,volume INTEGER,packages INTEGER,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS balances(product_id TEXT NOT NULL REFERENCES products(id),location_id TEXT NOT NULL REFERENCES locations(id),lot TEXT NOT NULL DEFAULT '',state TEXT NOT NULL CHECK(state IN ('Available','Reserved','Staged','Loaded','Blocked')),quantity INTEGER NOT NULL CHECK(quantity>=0),version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(product_id,location_id,lot,state));
CREATE TABLE IF NOT EXISTS operations(key TEXT PRIMARY KEY,actor TEXT NOT NULL REFERENCES users(id),digest TEXT NOT NULL,result TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS movements(id TEXT PRIMARY KEY,operation TEXT NOT NULL,product_id TEXT NOT NULL REFERENCES products(id),location_id TEXT NOT NULL REFERENCES locations(id),lot TEXT NOT NULL,state TEXT NOT NULL,delta INTEGER NOT NULL CHECK(delta<>0),kind TEXT NOT NULL,reference TEXT NOT NULL,actor TEXT NOT NULL REFERENCES users(id),reason TEXT NOT NULL,reversal TEXT REFERENCES movements(id),created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),location_id TEXT NOT NULL REFERENCES locations(id),lot TEXT NOT NULL,state TEXT NOT NULL,expected INTEGER NOT NULL,counted INTEGER NOT NULL,review_version INTEGER NOT NULL,reason TEXT NOT NULL,initiator TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL DEFAULT 'Pending',approver TEXT REFERENCES users(id),decision_reason TEXT,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY,allocation_id TEXT NOT NULL REFERENCES allocations(id),accepted INTEGER NOT NULL,blocked INTEGER NOT NULL,kind TEXT NOT NULL,actor TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS discrepancies(id TEXT PRIMARY KEY,allocation_id TEXT NOT NULL REFERENCES allocations(id),receipt_id TEXT REFERENCES receipts(id),kind TEXT NOT NULL,quantity INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'Open',version INTEGER NOT NULL DEFAULT 1,reason TEXT NOT NULL,outcome TEXT,owner TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL,closed_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS transfers(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),source TEXT NOT NULL REFERENCES locations(id),destination TEXT NOT NULL REFERENCES locations(id),lot TEXT NOT NULL,quantity INTEGER NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tracking(id TEXT PRIMARY KEY,shipment_id TEXT NOT NULL REFERENCES shipments(id),container_id TEXT REFERENCES containers(id),stage TEXT NOT NULL,place TEXT NOT NULL,event_time TEXT NOT NULL,recorded TEXT NOT NULL,source TEXT NOT NULL,notes TEXT NOT NULL,actor TEXT NOT NULL REFERENCES users(id),supersedes TEXT REFERENCES tracking(id));
CREATE TABLE IF NOT EXISTS eta_revisions(id TEXT PRIMARY KEY,shipment_id TEXT REFERENCES shipments(id),old_eta TEXT NOT NULL,new_eta TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT REFERENCES users(id),created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY,shipment_id TEXT NOT NULL REFERENCES shipments(id),name TEXT NOT NULL,type TEXT NOT NULL,mime TEXT NOT NULL,path TEXT NOT NULL,scan TEXT NOT NULL,restricted INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL,actor TEXT REFERENCES users(id),created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY,dedupe TEXT UNIQUE NOT NULL,warehouse_id TEXT NOT NULL REFERENCES warehouses(id),title TEXT NOT NULL,severity TEXT NOT NULL,link TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Open',created TEXT NOT NULL,updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS import_batches(id TEXT PRIMARY KEY,digest TEXT UNIQUE NOT NULL,actor TEXT REFERENCES users(id),count INTEGER NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,actor TEXT REFERENCES users(id),action TEXT NOT NULL,entity TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS movement_location ON movements(location_id,created);
CREATE INDEX IF NOT EXISTS order_warehouse ON orders(warehouse_id,due);
CREATE INDEX IF NOT EXISTS shipment_warehouse ON shipments(warehouse_id,eta);
CREATE INDEX IF NOT EXISTS tracking_shipment ON tracking(shipment_id,event_time);
CREATE TRIGGER IF NOT EXISTS container_shipment_version AFTER INSERT ON containers BEGIN UPDATE shipments SET version=version+1 WHERE id=NEW.shipment_id; END;
CREATE TRIGGER IF NOT EXISTS allocation_shipment_version_insert AFTER INSERT ON allocations BEGIN UPDATE shipments SET version=version+1 WHERE id=(SELECT shipment_id FROM containers WHERE id=NEW.container_id); END;
CREATE TRIGGER IF NOT EXISTS allocation_shipment_version_update AFTER UPDATE ON allocations BEGIN UPDATE shipments SET version=version+1 WHERE id=(SELECT shipment_id FROM containers WHERE id=NEW.container_id); END;
CREATE TRIGGER IF NOT EXISTS immutable_movements_update BEFORE UPDATE ON movements BEGIN SELECT RAISE(ABORT,'Movement history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_movements_delete BEFORE DELETE ON movements BEGIN SELECT RAISE(ABORT,'Movement history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_audit_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_audit_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
`;
const globalStore=globalThis as unknown as {harbor?:Store};
export function db(){if(!globalStore.harbor){globalStore.harbor=new Store();globalStore.harbor.migrate();}else if(Object.getPrototypeOf(globalStore.harbor)!==Store.prototype){Object.setPrototypeOf(globalStore.harbor,Store.prototype);globalStore.harbor.migrate();}return globalStore.harbor;}
export function audit(s:Store,actor:string,action:string,entity:string,detail:unknown){s.run('INSERT INTO audit VALUES(?,?,?,?,?,?)',id(),actor,action,entity,JSON.stringify(detail),now());}
export const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export function manager(u:Row){if(u.role!=='manager')throw new Fault('Manager permission required',403);}
export function access(s:Store,u:Row,warehouse:string){if(!s.get('SELECT id FROM warehouses WHERE id=?',warehouse))throw new Fault('Record not found',404);if(u.role!=='manager'&&!s.get('SELECT 1 FROM assignments WHERE user_id=? AND warehouse_id=?',u.id,warehouse))throw new Fault('Record not found or not assigned',403);}
export function location(s:Store,u:Row,loc:string){const l=s.get('SELECT * FROM locations WHERE id=?',loc);if(!l)throw new Fault('Location not found',404);access(s,u,l.warehouse_id);return l;}
export function shipment(s:Store,u:Row,key:string){const sh=s.get('SELECT * FROM shipments WHERE id=?',key);if(!sh)throw new Fault('Shipment not found',404);access(s,u,sh.warehouse_id);return sh;}
export function qty(value:string,precision=6):number {if(!/^\d+(\.\d+)?$/.test(value)||value.split('.')[1]?.length>precision)throw new Fault('Use a positive quantity with permitted precision');const [whole,decimal='']=value.split('.');const n=Number(whole)*1e6+Number(decimal.padEnd(6,'0'));if(!Number.isSafeInteger(n)||n<=0)throw new Fault('Quantity outside supported range');return n;}
export const units=(q:number)=>q/1e6;
