import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {db,Fault,hash,audit} from '@/lib/db';
import {login,user,guard,cookieName,resetRequest,resetPassword,secureMode} from '@/lib/auth';
import {failure} from '@/lib/http';
export const runtime='nodejs';
export async function POST(req:Request){try{guard(req);const d=await req.json();if(d.action==='login'){const {token}=login(db(),d);(await cookies()).set(cookieName,token,{httpOnly:true,secure:secureMode(),sameSite:'strict',maxAge:28800,path:'/'});return NextResponse.json({message:'Signed in'});}if(d.action==='reset-request')return NextResponse.json(resetRequest(db(),d));if(d.action==='reset-password')return NextResponse.json(resetPassword(db(),d));if(d.action==='logout'){const u=await user();guard(req,u);const jar=await cookies();db().run('DELETE FROM sessions WHERE token=?',hash(jar.get(cookieName)!.value));audit(db(),u.id,'logout',u.id,{});jar.delete(cookieName);return NextResponse.json({message:'Signed out'});}throw new Fault('Unknown action');}catch(e){return failure(e);}}
