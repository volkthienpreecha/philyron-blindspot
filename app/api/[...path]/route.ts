import {NextRequest,NextResponse} from 'next/server';
import {identify,loadWorkspace,STORAGE_BACKEND} from '../../../lib/store';
import {overview,detail,addNote,inspect,review,labels,csv,ServiceError} from '../../../lib/service';
import {embed,MODEL_VERSION} from '../../../lib/embedding';
import {ZodError} from 'zod';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
async function handle(req:NextRequest){
 const who=identify(req.cookies.get('demo_workspace')?.value),path=req.nextUrl.pathname.slice(5).split('/');
 let response:NextResponse;
 try{
  if(req.method==='POST'){
   const origin=req.headers.get('origin');
   if(origin&&origin!==req.nextUrl.origin)throw new ServiceError(403,'Use the same application origin.');
   if(Number(req.headers.get('content-length')??0)>10000)throw new ServiceError(413,'Request is too large.');
  }
  if(req.method==='GET'&&path[0]==='overview')response=NextResponse.json(await overview(who.id));
  else if(req.method==='GET'&&path[0]==='cases'&&path[1])response=NextResponse.json(await detail(who.id,path[1]));
  else if(req.method==='GET'&&path[0]==='groups')response=NextResponse.json((await overview(who.id)).groups);
  else if(req.method==='POST'&&path[0]==='notes')response=NextResponse.json(await addNote(who.id,await req.json()),{status:201});
  else if(req.method==='POST'&&path[0]==='cases'&&path[2]==='inspection')response=NextResponse.json(await inspect(who.id,path[1],await req.json()));
  else if(req.method==='POST'&&path[0]==='cases'&&path[2]==='review')response=NextResponse.json(await review(who.id,path[1],await req.json()));
  else if(req.method==='GET'&&path[0]==='labels'){
   const rows=await labels(who.id),format=req.nextUrl.searchParams.get('format');
   response=format==='csv'?new NextResponse(csv(rows),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="verified-labels.csv"'}}):NextResponse.json({synthetic:true,labels:rows},{headers:{'Content-Disposition':'attachment; filename="verified-labels.json"'}});
  }else if(req.method==='GET'&&path[0]==='health'){
   await loadWorkspace(who.id);response=NextResponse.json({status:'ok',storage:STORAGE_BACKEND,modelVersion:MODEL_VERSION,dataset:'synthetic'});
  }else if(req.method==='POST'&&path[0]==='embedding-check'){
   const [v]=await embed(['Bearing is running hot and vibrating under load']);response=NextResponse.json({modelVersion:MODEL_VERSION,dimensions:v.length,norm:Math.sqrt(v.reduce((s,x)=>s+x*x,0))});
  }else throw new ServiceError(404,'Endpoint not found.');
 }catch(e){
  const status=e instanceof ServiceError?e.status:e instanceof ZodError?422:e instanceof Error&&e.message==='INFERENCE_BUSY'?429:e instanceof Error&&e.message==='IDEMPOTENCY_CONFLICT'?409:503;
  const message=e instanceof ServiceError?e.message:e instanceof ZodError?e.issues[0].message:status===429?'Embedding model is busy. Retry shortly.':status===409?'Submission key conflicts with an earlier request.':'Could not complete the request. Retry.';
  if(status===503)console.error('Request failed',e instanceof Error?e.message:'unknown');
  response=NextResponse.json({error:message},{status});
 }
 response.headers.set('Cache-Control','no-store');
 response.cookies.set('demo_workspace',who.cookie,{httpOnly:true,sameSite:'lax',secure:req.nextUrl.protocol==='https:',path:'/',maxAge:60*60*24*30});
 return response;
}
export const GET=handle;
export const POST=handle;
