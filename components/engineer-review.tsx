'use client';
import {Check,CheckCheck,LoaderCircle,Search} from 'lucide-react';
import type {CaseView,Inspection,Review} from '../lib/types';
type Props={focus:CaseView&{inspection:Inspection|null};busy:boolean;decision:Review['decision'];reviewNotes:string;onDecision:(value:Review['decision'])=>void;onNotes:(value:string)=>void;onInspect:()=>void;onConfirm:()=>void;onSaveOther:()=>void;onExport:()=>void};
export default function EngineerReview({focus,busy,decision,reviewNotes,onDecision,onNotes,onInspect,onConfirm,onSaveOther,onExport}:Props){
 const finding=focus.inspection;
 const verified=focus.review?.eligible;
 const confirmable=finding?.outcome==='Failure confirmed'&&!!finding.category;
 return <aside className="inspector"><h2>Engineer review</h2><p className="inspector-caption">{focus.split==='train'?'Inspect → confirm → export':'Held-out history · read only'}</p>
 {focus.split==='train'&&<>
  <div className="review-step"><small>1 · Inspection evidence</small><button className="button secondary full" disabled={busy} onClick={onInspect}>{busy?<LoaderCircle className="spin" size={16}/>:<Search size={16}/>}Run demo inspection</button>
  {finding&&<div className="inspection-result"><Check size={16}/><div><strong>{finding.outcome}</strong><span>{finding.category||'No verified defect'}</span><small>Simulated inspection</small></div></div>}</div>
  <details className="review-note"><summary>Add review note</summary><textarea aria-label="Review note" placeholder="Evidence or next step" value={reviewNotes} onChange={e=>onNotes(e.target.value)} maxLength={1200}/></details>
  <div className="review-step"><small>2 · Confirm the finding</small>{verified?<button className="button primary full" onClick={onExport}><CheckCheck size={16}/>Download labels</button>:<button className="button primary full" disabled={busy||!confirmable} onClick={onConfirm}>{busy?<LoaderCircle className="spin" size={16}/>:<CheckCheck size={16}/>}Confirm &amp; export labels</button>}<p className="review-help">{verified?'Finding verified. Labels are ready to download.':!finding?'Run inspection to unlock confirmation.':confirmable?'Confirm the finding above; its category and evidence are included automatically.':'No defect found. This inspection cannot create an issue label.'}</p></div>
  {focus.review&&<p className="saved-review"><Check size={14}/>Review saved</p>}
  <details className="other-review"><summary>Other review decisions</summary><fieldset disabled={busy}><legend>Classification</legend>{([['needs_investigation','Needs inspection'],['normal_behavior','Normal operation']] as const).map(([value,label])=><label className={'radio-option '+(decision===value?'selected':'')} key={value}><input type="radio" name="decision" checked={decision===value} onChange={()=>onDecision(value)}/>{label}</label>)}</fieldset><button className="button secondary full" disabled={busy||decision==='confirmed_issue'} onClick={onSaveOther}>Save review</button></details>
 </>}
 <div className="feedback-path"><h3>Training labels</h3><p className="review-help">Inspection-backed findings for an existing ML workflow.</p><button className="text-button" onClick={onExport}>View verified labels</button></div><p className="inspector-footnote">Synthetic evidence · no automatic retraining.</p></aside>;
}
