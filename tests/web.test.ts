import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReportFlow} from '../components/captain-reports';
process.env.DEMO_DATA_DIR=mkdtempSync(path.join(tmpdir(),'philyron-tests-'));
const {dataset}=await import('../lib/dataset');
const {embed}=await import('../lib/embedding');
const {analyzeText,cosine}=await import('../lib/text');
const {assessment,caseViews,complaintGroups}=await import('../lib/matching');
const {identify,loadWorkspace}=await import('../lib/store');
const {addNote,review,inspect,labels,csv}=await import('../lib/service');
const target=dataset.cases.find(c=>c.equipmentId==='V02-BEARING-01')!;
const request=(text:string)=>({equipmentId:target.equipmentId,text,observedAt:target.asOf,idempotencyKey:randomUUID()});
test('sealed evidence, distinct intervals and snapshot boundaries',()=>{
 assert(!JSON.stringify(dataset).includes('failure_at'));
 for(const c of dataset.cases){
  assert(c.intervals.every(i=>Date.parse(i.end)<=Date.parse(c.asOf)));
  assert.equal(c.eventCount,c.intervals.length);
  assert(c.abnormalHours>=c.eventCount);
 }
 assert(dataset.notes.every(n=>Date.parse(n.observedAt)<=Date.parse(dataset.asOf)));
 assert(dataset.cases.some(c=>c.abnormalHours>c.eventCount*5));
});
test('negation, uncertain statements, mixed clauses',()=>{
 assert.equal(analyzeText('No bearing noise or unusual heat.').intent,'negated');
 assert.equal(analyzeText('Maybe the bearing is heating.').intent,'uncertain');
 assert.equal(analyzeText('Routine service completed.').intent,'routine');
 const mixed=analyzeText('No bearing noise; but the bearing is overheating.');
 assert.equal(mixed.intent,'issue');assert(!mixed.symptoms.includes('noise'));
});
test('uncertainty expressed after a symptom does not become affirmative coverage',async()=>{
 const id=identify().id;
 for(const text of ['Bearing is overheating? Cannot tell yet.','Bearing is vibrating. Not sure whether this is real.']){
  const result=await addNote(id,request(text)) as {note:NoteForTest};
  assert.equal(result.note.intent,'uncertain');
 }
 assert.equal(caseViews(await loadWorkspace(id)).find(c=>c.id===target.id)!.coveredIntervals,0);
});
type NoteForTest={intent:string;affirmativeText:string};
test('everyday captain wording reaches semantic matching instead of being discarded as routine',async()=>{
 const id=identify().id;
 const result=await addNote(id,request('The bearing runs hotter when loaded and squeals on the passage.')) as {note:NoteForTest};
 assert.equal(result.note.intent,'issue');
 assert(caseViews(await loadWorkspace(id)).find(c=>c.id===target.id)!.coveredIntervals>0);
 assert.equal(analyzeText('No hotter bearing or squealing found.').intent,'negated');
});
test('symptoms on other equipment cannot cover a selected healthy bearing',async()=>{
 const id=identify().id;
 for(const text of ['Bearing normal. Pump vibration and temperature are rising under load.','Bearing has no noise but pump is overheating and vibrating.','Pump and bearing vibration increasing; unable to locate the source.']){
  await addNote(id,request(text));
  assert.equal(caseViews(await loadWorkspace(id)).find(c=>c.id===target.id)!.coveredIntervals,0,text);
 }
 await addNote(id,request('Pump is normal. Bearing vibration and temperature are rising under load.'));
 assert(caseViews(await loadWorkspace(id)).find(c=>c.id===target.id)!.coveredIntervals>0);
});
test('real embeddings match held-out paraphrases and reject unrelated text',async()=>{
 const texts=['bearing: Bearing has started rattling and is hotter while working','bearing: Chart table light has stopped working'];
 const [positive,negative]=await embed(texts);
 assert.equal(positive.length,384);
 assert(Math.abs(cosine(positive,positive)-1)<.001);
 assert(cosine(target.vector,positive)>=dataset.matchThreshold);
 assert(cosine(target.vector,negative)<dataset.matchThreshold);
});
test('notes update coverage, persist idempotently and stay isolated',async()=>{
 const first=identify(),second=identify();
 assert.equal(identify(first.cookie).id,first.id);
 assert.notEqual(identify(first.cookie+'a').id,first.id);
 const before=assessment(target,dataset.notes);
 assert.equal(before.coverage,'uncovered');
 await addNote(first.id,request('No unusual bearing noise or heat.'));
 assert.equal(caseViews(await loadWorkspace(first.id)).find(c=>c.id===target.id)!.coverage,'uncovered');
 await addNote(first.id,request('Maybe the bearing is running hot.'));
 assert.equal(caseViews(await loadWorkspace(first.id)).find(c=>c.id===target.id)!.coverage,'uncovered');
 await addNote(first.id,request('Pump is vibrating and hot under load.'));
 assert.equal(caseViews(await loadWorkspace(first.id)).find(c=>c.id===target.id)!.coverage,'uncovered');
 const req=request('Bearing vibration and temperature are rising under load.'),res=await addNote(first.id,req);
 assert.deepEqual(await addNote(first.id,req),res);
 assert.equal((await loadWorkspace(first.id)).notes.length,4);
 await assert.rejects(()=>addNote(first.id,{...req,text:'Changed content'}));
 const after=caseViews(await loadWorkspace(first.id)).find(c=>c.id===target.id)!;
 assert(after.relatedReports>0);assert(after.coveredIntervals>0);assert.equal(after.originalCoverage,'uncovered');assert(after.lateReports>0);
 assert.equal(caseViews(await loadWorkspace(second.id)).find(c=>c.id===target.id)!.coverage,'uncovered');
 assert(complaintGroups([...dataset.notes,...(await loadWorkspace(first.id)).notes]).some(g=>g.count>1));
});
test('cross-asset and future reports never create coverage; missing archives remain unknown',()=>{
 const n=dataset.notes.find(n=>n.intent==='issue'&&n.equipmentId!==target.equipmentId)!;
 assert.equal(assessment(target,[n]).relatedReports,0);
 assert.equal(assessment(target,[{...n,equipmentId:target.equipmentId,observedAt:'2027-01-01T00:00:00Z'}]).relatedReports,0);
 const unknown=dataset.cases.find(c=>!c.recordsAvailable)!;
 assert.equal(assessment(unknown,dataset.notes).coverage,'insufficient_records');
});
test('covered patterns are not presented as reporting-gap investigation candidates',()=>{
 const covered=caseViews({id:'render',version:0,notes:[],reviews:[],inspections:[],receipts:{}}).find(c=>c.coverage==='covered')!;
 const html=renderToStaticMarkup(createElement(ReportFlow,{focus:{...covered,threshold:dataset.matchThreshold},onExample:()=>{}}));
 assert(!html.includes('Investigation candidate'),'Fully reported patterns must not be labeled as reporting gaps');
 const unknown=caseViews({id:'render',version:0,notes:[],reviews:[],inspections:[],receipts:{}}).find(c=>c.coverage==='insufficient_records')!;
 const missing=renderToStaticMarkup(createElement(ReportFlow,{focus:{...unknown,threshold:dataset.matchThreshold},onExample:()=>{}}));
 assert(!missing.includes('abnormal intervals covered'),'Unavailable archives cannot establish reporting completeness');
});
test('verification needs matching evidence; labels and CSV retain provenance',async()=>{
 const id=identify().id;
 await assert.rejects(()=>review(id,target.id,{decision:'confirmed_issue',category:'bearing wear',idempotencyKey:randomUUID()}));
 assert.equal((await labels(id)).length,0);
 const ev=await inspect(id,target.id,{idempotencyKey:randomUUID()});
 await assert.rejects(()=>review(id,target.id,{decision:'confirmed_issue',category:'pump cavitation',evidenceId:ev.id,idempotencyKey:randomUUID()}));
 await review(id,target.id,{decision:'confirmed_issue',category:ev.category,evidenceId:ev.id,notes:'=FORMULA',idempotencyKey:randomUUID()});
 const exported=await labels(id);assert.equal(exported.length,target.eventCount);assert(exported.every(r=>r.evidenceId===ev.id&&r.synthetic));
 assert(csv(exported).includes("'=FORMULA"));
 const other=identify().id;assert.equal((await labels(other)).length,0);
 const heldout=dataset.cases.find(c=>c.split==='test')!;
 await assert.rejects(()=>inspect(id,heldout.id,{idempotencyKey:randomUUID()}));
 await review(id,target.id,{decision:'normal_behavior',idempotencyKey:randomUUID()});assert.equal((await labels(id)).length,0);
});

test('semantic report search retrieves source records and isolates visitor additions',async()=>{
 const {reports,searchReports}=await import('../lib/service');
 const id=identify().id, other=identify().id;
 const catalog=await reports(id);
 assert.equal(catalog.length,dataset.notes.length);
 assert(catalog.every(n=>!('vector' in n)&&n.vessel&&n.observedAt));
 const query='bearing vibrating and running hot under load';
 const found=await searchReports(id,{query});
 assert(found.results.length>0);
 assert(found.results.some(n=>n.component==='bearing'&&n.intent==='issue'));
 assert(found.results.every(n=>!('vector' in n)&&Number.isFinite(n.similarity)));
 const unique='Bearing vibration and temperature rising under load during the midnight watch';
 const added=await addNote(id,request(unique)) as {note:{id:string}};
 assert((await searchReports(id,{query:unique})).results.some(n=>n.id===added.note.id));
 assert(!(await searchReports(other,{query:unique})).results.some(n=>n.id===added.note.id));
 await assert.rejects(()=>searchReports(id,{query:'x'}));
});
