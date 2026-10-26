type Account={id:string;email:string;name:string;password:string;role?:string;active?:number;mfa?:string|null};

// Firebase accepts the existing bcrypt hashes; plaintext passwords are never needed.
export function firebaseUserExport(staff:Account[],customers:Account[]){
 const emails=new Set<string>(),ids=new Set<string>();
 return {users:[...staff.map(a=>({...a,kind:'staff'})),...customers.map(a=>({...a,kind:'customer'}))].map(a=>{
  const email=a.email.toLowerCase();
  if(emails.has(email))throw new Error('A staff and customer email overlap. Resolve identity mapping before importing.');
  if(ids.has(a.id))throw new Error('Duplicate account ID. Resolve identity mapping before importing.');
  if(a.mfa)throw new Error('An account has MFA enabled. Migrate its second factor before importing.');
  if(!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(a.password))throw new Error('An account has an unsupported password hash. No passwords were changed.');
  emails.add(email);ids.add(a.id);
  return {localId:a.id,email,displayName:a.name,emailVerified:false,passwordHash:Buffer.from(a.password,'utf8').toString('base64'),disabled:a.kind==='staff'&&a.active===0};
 })};
}
