import {cloudRoute} from '@/lib/cloud-store';
import {user} from '@/lib/auth';
import {db,now} from '@/lib/db';
import {list,csv} from '@/lib/queries';
import {failure} from '@/lib/http';
export const runtime='nodejs';
async function handleGET(req:Request){try{const u=await user(),url=new URL(req.url),filters=Object.fromEntries(url.searchParams);const view=filters.view||'inventory';const result=list(db(),u,view,filters,true);const timezone=db().get("SELECT value FROM settings WHERE key='timezone'")!.value;const rows=result.rows.map(r=>({...r,generated_at_utc:now(),timezone}));return new Response('\uFEFF'+csv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="harbor-${view.replace(/[^a-z-]/g,'')}.csv"`,'Cache-Control':'no-store'}});}catch(e){return failure(e);}}

export const GET=cloudRoute(handleGET);
