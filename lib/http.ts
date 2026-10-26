import {NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {Fault} from './db';
export function failure(e:unknown){if(e instanceof Fault)return NextResponse.json({error:e.message},{status:e.status});if(e instanceof ZodError)return NextResponse.json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});if(e instanceof Error&&/UNIQUE constraint/.test(e.message))return NextResponse.json({error:'A record with this identifier already exists.'},{status:409});if(e instanceof SyntaxError)return NextResponse.json({error:'Invalid request format'},{status:400});console.error('Request failed',e instanceof Error?e.message:'Unknown error');return NextResponse.json({error:'The operation could not be completed. Refresh and retry.'},{status:500});}
