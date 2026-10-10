import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {dataset} from './dataset';
import {embed,MODEL_VERSION} from './embedding';
import {analyzeText} from './text';
import {caseViews,complaintGroups} from './matching';
import {loadWorkspace,mutate} from './store';
import truth from '../fixtures/inspection-truth.json';
import type {Note,Workspace,Review,Inspection} from './types';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const keySchema=z.string().uuid();
export class ServiceError extends Error {constructor(public status:number,message:string){super(message);}}
const caseFor=(id:string)=>{const c=dataset.cases.find(c=>c.id===id);if(!c)throw new ServiceError(404,'Investigation not found.');return c;};
export function overview(id:string) {
 const w=loadWorkspace(id),cases=caseViews(w);
 return {datasetVersion:dataset.version,modelVersion:MODEL_VERSION,asOf:dataset.asOf,version:w.version,equipment:dataset.equipment,
  summary:{vessels:18,equipment:dataset.equipment.length,gaps:cases.filter(c=>['uncovered','partial'].includes(c.coverage)&&c.review?.decision!=='normal_behavior'&&c.review?.decision!=='confirmed_issue').length,verified:w.reviews.filter(r=>r.eligible).length,notes:dataset.notes.length+w.notes.length},
  cases:cases.map(c=>({...c,vector:undefined,telemetry:undefined,matches:undefined,similar:undefined})),groups:complaintGroups([...dataset.notes,...w.notes])};
}
export function detail(id:string,caseId:string){
 const w=loadWorkspace(id),c=caseViews(w).find(c=>c.id===caseId);if(!c)throw new ServiceError(404,'Investigation not found.');
 const strip=(n:Note)=>({...n,vector:undefined});
 return {...c,vector:undefined,matches:c.matches.map(strip),similar:c.similar.map(strip),inspection:w.inspections.find(i=>i.caseId===caseId)??null,threshold:dataset.matchThreshold,modelVersion:MODEL_VERSION};
}
const noteSchema=z.object({equipmentId:z.string(),text:z.string().trim().min(5).max(1200),observedAt:z.string().datetime({offset:true}),idempotencyKey:keySchema});
export async function addNote(id:string,input:unknown){
 const request=noteSchema.parse(input),eq=dataset.equipment.find(e=>e.id===request.equipmentId);
 if(!eq)throw new ServiceError(422,'Select known equipment.');
 if(Date.parse(request.observedAt)>Date.parse(dataset.asOf)||Date.parse(request.observedAt)<Date.parse('2026-01-01T00:00:00Z'))throw new ServiceError(422,'Choose a date within the demo history, January 1–6, 2026.');
 const digest=hash(request),existing=loadWorkspace(id).receipts[request.idempotencyKey];
 if(existing){if(existing.hash!==digest)throw new ServiceError(409,'Submission key was reused with different content.');return existing.value;}
 if(loadWorkspace(id).notes.length>=60)throw new ServiceError(429,'This workspace has reached 60 notes.');
 const analysis=analyzeText(request.text);
 if(['bearing','gearbox','pump'].some(c=>c!==eq.component&&new RegExp(`\\b${c}\\b`,'i').test(request.text))&&!new RegExp(`\\b${eq.component}\\b`,'i').test(request.text))analysis.intent='uncertain';
 const [vector]=await embed([`${eq.component}: ${analysis.affirmativeText||request.text}`]);
 const note:Note={id:randomUUID(),equipmentId:eq.id,text:request.text,observedAt:request.observedAt,ingestedAt:new Date().toISOString(),source:'Captain note · added in demo',addedDuringDemo:true,...analysis,vector,modelVersion:MODEL_VERSION};
 return mutate(id,request.idempotencyKey,digest,w=>{
  if(w.notes.length>=60)throw new ServiceError(429,'This workspace has reached 60 notes.');
  w.notes.push(note);return {note:{...note,vector:undefined},assessmentVersion:w.version+1};
 });
}
export function inspect(id:string,caseId:string,input:unknown){
 const {idempotencyKey}=z.object({idempotencyKey:keySchema}).parse(input),c=caseFor(caseId);
 if(c.split!=='train')throw new ServiceError(403,'Held-out histories are available for inspection only; reviews cannot create training labels.');
 return mutate(id,idempotencyKey,hash({caseId,action:'inspect'}),w=>{
  const prior=w.inspections.find(i=>i.caseId===caseId);if(prior)return prior;
  const result=(truth as Record<string,{failure_at:number|null;failure_category:string}>)[c.equipmentId];
  const evidence:Inspection={id:'inspection-'+randomUUID(),caseId,outcome:result.failure_at===null?'No failure found':'Failure confirmed',category:result.failure_at===null?null:result.failure_category,inspectedAt:new Date().toISOString(),source:'Simulated inspection · synthetic history'};
  w.inspections.push(evidence);return evidence;
 });
}
const reviewSchema=z.object({decision:z.enum(['confirmed_issue','normal_behavior','needs_investigation']),category:z.string().max(80).optional(),evidenceId:z.string().optional(),notes:z.string().max(1200).default(''),idempotencyKey:keySchema});
export function review(id:string,caseId:string,input:unknown){
 const request=reviewSchema.parse(input),c=caseFor(caseId);
 if(c.split!=='train')throw new ServiceError(403,'Validation and test histories cannot become training labels.');
 return mutate(id,request.idempotencyKey,hash({caseId,...request}),w=>{
  const inspection=w.inspections.find(i=>i.id===request.evidenceId&&i.caseId===caseId);
  if(request.decision==='confirmed_issue'&&(!inspection||inspection.outcome!=='Failure confirmed'||inspection.category!==request.category))throw new ServiceError(422,'A confirmed issue requires matching inspection evidence and category.');
  const r:Review={caseId,decision:request.decision,category:request.category,evidenceId:request.evidenceId,notes:request.notes,reviewedAt:new Date().toISOString(),eligible:request.decision==='confirmed_issue'&&!!inspection};
  w.reviews=w.reviews.filter(r=>r.caseId!==caseId);w.reviews.push(r);return r;
 });
}
export function labels(id:string){
 const w=loadWorkspace(id);
 return w.reviews.filter(r=>r.eligible).flatMap(r=>{
  const c=caseFor(r.caseId),i=w.inspections.find(i=>i.id===r.evidenceId);
  if(!i||i.outcome!=='Failure confirmed'||i.category!==r.category)return [];
  return c.intervals.map(interval=>({caseId:c.id,equipmentId:c.equipmentId,vesselId:c.vesselId,intervalStart:interval.start,intervalEnd:interval.end,category:r.category,evidenceId:i.id,evidenceSource:i.source,reviewedAt:r.reviewedAt,reviewer:'Demo engineer · '+w.id.slice(0,8),notes:r.notes,datasetVersion:dataset.version,embeddingModelVersion:MODEL_VERSION,labelType:'verified_issue',synthetic:true}));
 });
}
export function csv(rows:ReturnType<typeof labels>){
 const fields=['caseId','equipmentId','vesselId','intervalStart','intervalEnd','category','evidenceId','evidenceSource','reviewedAt','reviewer','notes','datasetVersion','embeddingModelVersion','labelType','synthetic'];
 const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 return [fields.join(','),...rows.map(r=>fields.map(f=>cell((r as Record<string,unknown>)[f])).join(','))].join('\r\n');
}
