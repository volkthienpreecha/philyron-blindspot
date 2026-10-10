import { dataset } from './dataset';
import { cosine } from './text';
import type {SensorCase,Note,Workspace,Coverage,CaseView} from './types';
const day=24*60*60*1000;
export function intervalRelated(c:SensorCase,n:Note) {
  return c.intervals.some(i=>Date.parse(n.observedAt)>=Date.parse(i.start)-day&&Date.parse(n.observedAt)<=Date.parse(i.end)+day);
}
export function assessment(c:SensorCase,notes:Note[],original=false) {
  const visible=notes.filter(n=>n.equipmentId===c.equipmentId&&Date.parse(n.observedAt)<=Date.parse(c.asOf)&&(!original||!n.addedDuringDemo&&Date.parse(n.ingestedAt)<=Date.parse(c.detectedAt)));
  const matches=visible.map(n=>({...n,similarity:cosine(c.vector,n.vector),timing:n.addedDuringDemo||Date.parse(n.ingestedAt)>Date.parse(c.detectedAt)?'Reported later':'Known at detection'})).filter(n=>intervalRelated(c,n)).sort((a,b)=>b.similarity-a.similarity||a.id.localeCompare(b.id));
  const related=matches.filter(n=>n.intent==='issue'&&n.similarity>=dataset.matchThreshold);
  const covered=c.intervals.filter(i=>related.some(n=>Date.parse(n.observedAt)>=Date.parse(i.start)-day&&Date.parse(n.observedAt)<=Date.parse(i.end)+day)).length;
  const coverage:Coverage=!c.recordsAvailable?'insufficient_records':covered===c.intervals.length?'covered':covered?'partial':'uncovered';
  return {coverage,recordsSearched:visible.length,coveredIntervals:covered,relatedReports:related.length,lateReports:related.filter(n=>n.timing==='Reported later').length,matches};
}
export function caseViews(w:Workspace):CaseView[] {
 const notes=[...dataset.notes,...w.notes];
 return dataset.cases.map(c=>{
  const current=assessment(c,notes);
  const similar=notes.filter(n=>n.equipmentId!==c.equipmentId&&n.intent==='issue'&&Date.parse(n.observedAt)<=Date.parse(c.asOf)&&dataset.equipment.find(e=>e.id===n.equipmentId)?.component===c.component).map(n=>({...n,similarity:cosine(c.vector,n.vector),vessel:dataset.equipment.find(e=>e.id===n.equipmentId)!.vessel})).filter(n=>n.similarity>=dataset.matchThreshold).sort((a,b)=>b.similarity-a.similarity).slice(0,3);
  return {...c,...current,originalCoverage:assessment(c,notes,true).coverage,similar,review:w.reviews.find(r=>r.caseId===c.id)??null};
 }).sort((a,b)=>{
  const rank={uncovered:0,partial:1,covered:2,insufficient_records:3};
  return rank[a.coverage]-rank[b.coverage]||b.abnormalHours-a.abnormalHours||b.eventCount-a.eventCount||b.score-a.score||a.id.localeCompare(b.id);
 });
}
export function complaintGroups(notes:Note[]) {
 const sorted=notes.filter(n=>n.intent==='issue').sort((a,b)=>a.id.localeCompare(b.id));
 const groups:{component:string;representative:Note;members:Note[]}[]=[];
 for(const n of sorted){
  const component=dataset.equipment.find(e=>e.id===n.equipmentId)!.component;
  const group=groups.find(g=>g.component===component&&g.members.every(m=>cosine(n.vector,m.vector)>=dataset.clusterThreshold));
  if(group)group.members.push(n);else groups.push({component,representative:n,members:[n]});
 }
 return groups.map((g,i)=>({id:`group-${i}`,component:g.component,description:g.representative.text,count:g.members.length,members:g.members.map(n=>({id:n.id,text:n.text,equipmentId:n.equipmentId}))}));
}
