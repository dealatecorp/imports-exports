import {hashSync} from 'bcryptjs';
import {db,id} from '../lib/db';
const email=process.env.INITIAL_MANAGER_EMAIL,password=process.env.INITIAL_MANAGER_PASSWORD,name=process.env.INITIAL_MANAGER_NAME||'Operations Manager';
if(!email||!password||password.length<12||password.length>72)throw new Error('Set INITIAL_MANAGER_EMAIL and INITIAL_MANAGER_PASSWORD (12–72 characters) for this one command');
const s=db();if(s.get("SELECT 1 FROM users WHERE role='manager'"))throw new Error('A manager already exists. Use the authenticated team-management interface.');
s.run('INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,?)',id(),name,email.toLowerCase(),hashSync(password,12),'manager');
console.log('Initial manager created. Remove initial password variables from your shell. Enroll MFA locally before enabling production.');
