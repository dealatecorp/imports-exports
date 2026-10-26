import {cloudRoute,stageCloudWrite} from '@/lib/cloud-store';
import {CLOUD_FILE_LIMIT,cloudFilePath,cloudFileWrites,isCloudFile,readCloudFile} from '@/lib/cloud-files';
import {firebaseDatabase} from '@/lib/firebase-server';
import {recordCustomerChanges} from '@/lib/customer-events';
import {NextResponse} from 'next/server';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {db,id,now,Fault,shipment,audit} from '@/lib/db';
import {user,guard} from '@/lib/auth';
import {failure} from '@/lib/http';
import {detectFile,readableDocument} from '@/lib/documents';
export const runtime='nodejs';

async function handlePOST(req:Request){
 try{
  const u=await user();guard(req,u);
  const cloud=process.env.DATABASE_BACKEND==='firestore',limit=cloud?CLOUD_FILE_LIMIT:10_000_000;
  const sizeLabel=cloud?'1 MB for the online demo':'10 MB';
  if(Number(req.headers.get('content-length')||0)>limit+100_000)throw new Fault(`Maximum upload size is ${sizeLabel}`,413);
  const form=await req.formData(),sh=shipment(db(),u,String(form.get('shipment_id'))),file=form.get('file');
  if(!(file instanceof File)||file.size>limit||!file.size)throw new Fault(`Select a file up to ${sizeLabel}`,413);
  const restricted=form.get('restricted')==='true'?1:0;
  if(restricted&&u.role!=='manager')throw new Fault('Manager permission required for restricted documents',403);
  const bytes=Buffer.from(await file.arrayBuffer()),mime=detectFile(bytes,file.name),key=id();
  const type=String(form.get('type')||'Other').slice(0,80),name=file.name.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120);
  let scan='Quarantined',path=cloudFilePath(key),temporaryDirectory:string|undefined,localPath:string|undefined;
  try{
   // Vercel disk is used only while scanning; Firestore stores the durable file.
   if(!cloud||process.env.SCAN_COMMAND){
    const dir=cloud?(temporaryDirectory=await mkdtemp(join(tmpdir(),'harbor-scan-'))):resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR||'data/uploads');
    await mkdir(dir,{recursive:true});localPath=resolve(dir,key);await writeFile(localPath,bytes,{mode:0o600});
    if(!cloud)path=localPath;
    if(process.env.SCAN_COMMAND){
     const result=spawnSync(process.env.SCAN_COMMAND,[localPath],{timeout:60000,windowsHide:true,shell:false,stdio:'ignore'});
     scan=result.status===0?'Clean':'Quarantined';
    }
   }
   const remote=cloud?firebaseDatabase():undefined,writes=cloud?cloudFileWrites(key,bytes):[];
   const s=db();s.tx(()=>{
    const version=s.get('SELECT COALESCE(MAX(version),0)+1 AS n FROM attachments WHERE shipment_id=? AND type=?',sh.id,type)!.n;
    s.run('INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?,?,?,?)',key,sh.id,name,type,mime,path,scan,restricted,version,u.id,now());
    audit(s,u.id,'document-upload',key,{shipment:sh.id,scan,version});
    recordCustomerChanges(s,'document-upload',{shipment_id:sh.id},{},key);
   });
   if(remote){
    stageCloudWrite(tx=>{for(const write of writes)tx.create(remote.doc(write.path),write.data);});
   }
  }catch(error){if(!cloud&&localPath)await rm(localPath,{force:true});throw error;}
  finally{if(temporaryDirectory)await rm(temporaryDirectory,{recursive:true,force:true}).catch(()=>{});}
  return NextResponse.json({message:scan==='Clean'?'Document scanned and uploaded':'File quarantined. Configure or repair the malware scanner, then upload again.',scan});
 }catch(error){return failure(error);}
}

async function handleGET(req:Request){
 try{
  const u=await user(),key=new URL(req.url).searchParams.get('id'),a=readableDocument(db(),u,key||'');
  const bytes=isCloudFile(a.path)||process.env.DATABASE_BACKEND==='firestore'?await readCloudFile(a.path):await readFile(a.path);
  audit(db(),u.id,'document-download',a.id,{});
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':a.mime,'Content-Disposition':`attachment; filename="${a.name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return failure(error);}
}

export const POST=cloudRoute(handlePOST);
export const GET=cloudRoute(handleGET);
