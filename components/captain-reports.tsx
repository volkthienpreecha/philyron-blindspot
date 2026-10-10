'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,FileText,Search,LoaderCircle} from 'lucide-react';
import type {CaseView,Note} from '../lib/types';
type Report=Omit<Note,'vector'>&{vessel:string;component:string;equipmentName:string;caseId:string|null;similarity?:number};
const when=(s:string)=>new Date(s).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const intentLabels={issue:'Issue reported',routine:'Routine observation',negated:'No symptoms reported',uncertain:'Needs clarification'};
export function Excerpt({text,symptoms=[]}:{text:string;symptoms?:string[]}){
 const words=[...new Set(symptoms)].filter(Boolean).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 if(!words.length)return <>{text}</>;
 const expression=new RegExp('('+words.join('|')+')','gi');
 return <>{text.split(expression).map((part,i)=>i%2?<mark key={i}>{part}</mark>:part)}</>;
}
export function ReportFlow({focus,onExample}:{focus:CaseView&{threshold:number};onExample:()=>void}){
 const local=focus.matches.find(n=>n.intent==='issue'&&n.similarity>=focus.threshold)||focus.matches[0];
 const related=focus.similar[0];
 return <section className="report-flow" aria-label="How captain reports relate to sensor evidence">
  <div className="flow-step"><div className="step-label"><span>01</span>Captain’s log</div>{local?<><p className="log-excerpt"><Excerpt text={local.text} symptoms={local.symptoms}/></p><small>{focus.vessel} · {when(local.observedAt)} UTC</small><span className="intent-label">{intentLabels[local.intent]}</span></>:<><p>No captain record in this equipment’s matching window.</p><small>{focus.vessel} · {focus.name}</small></>}</div>
  <ArrowRight className="flow-arrow" size={18}/>
  <div className="flow-step"><div className="step-label"><span>02</span>Similar complaint</div>{related?<><p className="log-excerpt"><Excerpt text={related.text} symptoms={related.symptoms}/></p><small>{related.vessel} · {Math.round(related.similarity*100)}% pattern similarity</small><span className="intent-label">Other vessel, context only</span></>:<p>No similar affirmative complaint found.</p>}</div>
  <ArrowRight className="flow-arrow" size={18}/>
  <div className="flow-step coverage-step" key={focus.coveredIntervals}><div className="step-label"><span>03</span>Compare with sensors</div><p className="coverage-result">{focus.coverage==='insufficient_records'?'Records unavailable':focus.coverage==='covered'?'Pattern reported':focus.relatedReports?'Some intervals still lack reports':'Sensor pattern, no matching issue report'}</p><small>{focus.coverage==='insufficient_records'?'Reporting coverage unknown':`${focus.coveredIntervals} of ${focus.eventCount} abnormal intervals covered`}</small><span className="intent-label">{focus.coverage==='insufficient_records'?'Check archive completeness':focus.coverage==='covered'?'No reporting gap in this window':'Investigation candidate, not a diagnosis'}</span></div>
  <div className="flow-action"><Link href="/reports"><FileText size={15}/>Read captain reports</Link><button onClick={onExample}>Try a matching report <ArrowRight size={15}/></button></div>
 </section>;
}
export default function CaptainReports(){
 const [records,setRecords]=useState<Report[]>([]),[results,setResults]=useState<Report[]|null>(null),[query,setQuery]=useState(''),[submitted,setSubmitted]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[showAll,setShowAll]=useState(false);
 const [catalogError,setCatalogError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setCatalogError('');fetch('/api/reports',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Reports could not load.');const records=await r.json();if(!controller.signal.aborted)setRecords(records);}).catch(e=>{if(!controller.signal.aborted)setCatalogError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[loadAttempt]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 async function search(value:string){if(value.trim().length<2||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');try{const r=await fetch('/api/reports/search',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({query:value})});const data=await r.json();if(!r.ok)throw Error(data.error||'Search failed. Retry.');if(!controller.signal.aborted){setResults(data.results);setSubmitted(value);}}catch(e){if(!controller.signal.aborted)setError((e as Error).message);}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 function resetSearch(){pending.current?.abort();pending.current=null;setBusy(false);setError('');setResults(null);setQuery('');setSubmitted('');}
 const displayed=results??records;
 return <main className="reports-main"><div className="page-heading"><div><h1>Captain reports</h1><p className="heading-sub">Different words. The same equipment complaint.</p></div><span className="reports-count">{catalogError?'Records unavailable':loading?'Loading records…':`${records.length} synthetic log entries`}</span></div>
 <form className="semantic-search" onSubmit={e=>{e.preventDefault();search(query);}}><label htmlFor="report-query">Search by meaning</label><div><Search size={20}/><input id="report-query" placeholder="Try ‘bearing heating during a loaded run’" value={query} onChange={e=>setQuery(e.target.value)} minLength={2} maxLength={240} required/><button className="button primary" disabled={busy||loading}>{busy?<LoaderCircle className="spin" size={16}/>:null}{busy?'Searching…':'Find reports'}</button></div><p>Uses the same MiniLM embeddings as reporting coverage. Similar wording alone does not confirm a failure.</p></form>
 <div className="query-examples"><span>Try:</span>{['Bearing noise and heat under load','Pump pressure and vibration','No vibration found'].map(q=><button disabled={busy||loading} key={q} onClick={()=>{setQuery(q);search(q);}}>{q}</button>)}</div>
 {error&&<p className="form-error" role="alert">{error}</p>}
 <div className="reports-list-heading"><h2>{results?'Matching reports':'Watch log'}</h2><div>{results&&<><span>{displayed.length===9?'Top ':''}{displayed.length} results for “{submitted}”</span><button className="text-button" onClick={resetSearch}>Show all logs</button></>}</div></div>
 {!results&&catalogError?<div className="empty"><p className="form-error" role="alert">{catalogError} Reporting completeness is unknown.</p><button className="button secondary" onClick={()=>setLoadAttempt(n=>n+1)}>Retry reports</button></div>:loading?<div className="skeleton hero-skeleton" aria-label="Loading captain reports"/>:!displayed.length?<div className="empty"><h3>{results?'No related reports found':'No captain records available'}</h3><p>{results?'Try describing the symptom or equipment differently.':'Reporting completeness is unknown.'}</p></div>:<div className="log-list">{displayed.slice(0,showAll?displayed.length:9).map(n=><article className="log-entry" key={n.id}><div className="log-meta"><span><strong>{n.vessel}</strong> / {n.equipmentName}</span><time dateTime={n.observedAt}>{when(n.observedAt)} UTC</time></div><p><Excerpt text={n.text} symptoms={n.symptoms}/></p><div className="log-bottom"><span>{intentLabels[n.intent]}{n.addedDuringDemo?' · Added in demo':''}</span>{n.similarity!==undefined&&<span>{Math.round(n.similarity*100)}% query similarity</span>}{n.caseId&&<Link href={'/investigation/'+n.caseId}>Compare sensor evidence <ArrowRight size={14}/></Link>}</div><details className="report-source"><summary>Source details</summary><p>{n.source}<br/>{n.equipmentId} · Received {when(n.ingestedAt)} UTC<br/>Synthetic text; highlighted phrases are extracted symptoms, not verified faults.</p></details></article>)}</div>}
 {!results&&records.length>9&&<button className="button secondary" onClick={()=>setShowAll(!showAll)}>{showAll?'Show fewer logs':'Show all '+records.length+' logs'}</button>}
 </main>;
}
