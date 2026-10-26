import {gzipSync,gunzipSync} from 'node:zlib';
import {Store,Fault,Row} from './db';

// Personal-demo storage format. SQLite remains the in-memory validation engine;
// Firestore owns the durable snapshot, committed with an optimistic version check.
export function snapshot(s:Store){
 const tables=s.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
 return Object.fromEntries(tables.map(t=>[t.name,s.all(`SELECT * FROM "${t.name}" ORDER BY rowid`)]));
}
export function encodeSnapshot(s:Store){
 const bytes=gzipSync(Buffer.from(JSON.stringify(snapshot(s))));
 if(bytes.length>850000)throw new Fault('The personal demo database is full. Export data before adding more records.',507);
 return bytes;
}
export function restoreSnapshot(bytes:Buffer){
 const data=JSON.parse(gunzipSync(bytes,{maxOutputLength:32000000}).toString()) as Record<string,Row[]>;
 const s=new Store(':memory:');s.migrate();
 try{
 const triggers=s.all("SELECT name,sql FROM sqlite_master WHERE type='trigger'");
 const tables=new Set(s.all("SELECT name FROM sqlite_master WHERE type='table'").map(t=>t.name));
 s.db.exec('PRAGMA foreign_keys=OFF;');
 for(const t of triggers)s.db.exec(`DROP TRIGGER "${t.name}"`);
 s.tx(()=>{for(const table of tables)s.db.exec(`DELETE FROM "${table}"`);
 for(const [table,rows] of Object.entries(data)){
  if(!tables.has(table))throw new Error('Unsupported snapshot table');
  const columns=new Set(s.all(`PRAGMA table_info("${table}")`).map(c=>c.name));
  for(const row of rows){const keys=Object.keys(row);if(!keys.length||keys.some(k=>!columns.has(k)))throw new Error('Unsupported snapshot columns');
   s.run(`INSERT INTO "${table}" (${keys.map(k=>'"'+k+'"').join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,...keys.map(k=>row[k]));
  }
 }});
 for(const t of triggers)s.db.exec(t.sql);
 s.db.exec('PRAGMA foreign_keys=ON;');
 if(s.all('PRAGMA foreign_key_check').length)throw new Error('Snapshot contains broken relationships');
 s.migrate();return s;
 }catch(error){s.db.close();throw error;}
}
