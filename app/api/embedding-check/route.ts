import {NextResponse} from 'next/server';
import {embed,MODEL_VERSION} from '../../../lib/embedding';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(){
 try{const [v]=await embed(['Bearing is vibrating and running hot under load']);return NextResponse.json({modelVersion:MODEL_VERSION,dimensions:v.length,norm:Math.sqrt(v.reduce((s,x)=>s+x*x,0))},{headers:{'Cache-Control':'no-store'}});}
 catch(e){console.error('Embedding check failed',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'Embedding unavailable'},{status:503});}
}
