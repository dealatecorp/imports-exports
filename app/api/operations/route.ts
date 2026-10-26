import {cloudRoute} from '@/lib/cloud-store';
import {NextResponse} from 'next/server';
import {user,guard,admin} from '@/lib/auth';
import {db,Fault} from '@/lib/db';
import {execute,previewImport} from '@/lib/operations';
import {failure} from '@/lib/http';
export const runtime='nodejs';
async function handlePOST(req:Request){try{const u=await user();guard(req,u);const text=await req.text();if(text.length>1100000)throw new Fault('Request too large',413);const payload=JSON.parse(text);if(payload.action==='preview-import')return NextResponse.json(previewImport(db(),u,payload.data.csv));if(['user-create','user-access','user-active','mfa-enroll'].includes(payload.action))return NextResponse.json(admin(db(),u,payload.action,payload.data));return NextResponse.json(execute(db(),u,payload));}catch(e){return failure(e);}}

export const POST=cloudRoute(handlePOST);
