import {Store} from '../lib/db';
import {execute} from '../lib/operations';
const [path,json]=process.argv.slice(2);const s=new Store(path);const u=s.get("SELECT * FROM users WHERE id='e'")!;
try{execute(s,u,JSON.parse(json));process.stdout.write('OK');}catch{process.stdout.write('CONFLICT');}finally{s.db.close();}
