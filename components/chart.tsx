'use client';
import {reportCoversInterval} from '../lib/report-coverage';
type Point={timestamp:string;vibration:number;temperature:number;load:number;abnormal:boolean};
type Report={observedAt:string;intent:string;similarity:number};
export default function EvidenceChart({points,reports=[],threshold=.56,metric='vibration',baseline=0,compact=false,recordsAvailable=true}:{points:Point[];reports?:Report[];threshold?:number;metric?:'vibration'|'temperature';baseline?:number;compact?:boolean;recordsAvailable?:boolean}){
 if(!points.length)return <div className="empty">No sensor history available.</div>;
 const W=780,L=48,R=16,top=14,H=compact?142:205,reportY=H+42,bottom=reportY+52;
 const start=Date.parse(points[0].timestamp),end=Date.parse(points.at(-1)!.timestamp),span=end-start||1;
 const max=Math.max(...points.map(p=>p[metric]),baseline)*1.17,min=metric==='temperature'?Math.min(...points.map(p=>p.temperature))* .85:0;
 const x=(time:string)=>L+(Date.parse(time)-start)/span*(W-L-R),y=(value:number)=>top+H-(value-min)/(max-min)*(H-12);
 const line=points.map((p,i)=>`${i?'L':'M'}${x(p.timestamp).toFixed(2)},${y(p[metric]).toFixed(2)}`).join(' ');
 const intervals:{start:number;end:number}[]=[];
 points.forEach((p,i)=>{if(p.abnormal){const prev=intervals.at(-1);if(prev&&prev.end===i-1)prev.end=i;else intervals.push({start:i,end:i});}});
 const related=reports.filter(n=>n.intent==='issue'&&n.similarity>=threshold);
 return <div className={'evidence-chart '+(compact?'compact':'')}><div className="chart-row-label"><span>{metric==='vibration'?'Vibration':'Temperature'} <small>{metric==='vibration'?'mm/s RMS':'°C'}</small></span><span className="chart-key"><i/>Sensor <i className="baseline-dot"/>Baseline</span></div><svg viewBox={`0 0 ${W} ${bottom+18}`} role="img" aria-label={`${metric} sensor history and aligned captain reports. ${related.length} related reports.`}>
 {intervals.map((r,i)=>{const covered=related.some(n=>reportCoversInterval({start:points[r.start].timestamp,end:points[r.end].timestamp},n,threshold));const coverage=!recordsAvailable?'unknown':covered?'covered':'uncovered';return <rect key={i} data-coverage={coverage} x={x(points[r.start].timestamp)-2} y={top} width={Math.max(5,x(points[r.end].timestamp)-x(points[r.start].timestamp)+5)} height={reportY+28-top} fill={coverage==='covered'?'var(--covered-tint)':coverage==='unknown'?'var(--rule)':'var(--gap-tint)'}><title>{`${coverage==='covered'?'Reported interval':coverage==='unknown'?'Reporting coverage unknown':'No matching report'} · ${points[r.start].timestamp}–${points[r.end].timestamp}`}</title></rect>;})}
 {[0,1,2,3].map(i=>{const value=min+(max-min)*i/3;return <g key={i}><line x1={L} x2={W-R} y1={y(value)} y2={y(value)} stroke="var(--rule)"/><text x={L-10} y={y(value)+4} textAnchor="end">{value.toFixed(1)}</text></g>;})}
 <line x1={L} x2={W-R} y1={y(baseline)} y2={y(baseline)} stroke="var(--muted)" strokeDasharray="4 5" opacity=".5"/>
 <path d={line} fill="none" stroke="var(--teal)" strokeWidth={compact?2.4:2} strokeLinejoin="round"/>
 <text x={L} y={reportY-7} className="track-label">Related issue reports</text><line x1={L} x2={W-R} y1={reportY+20} y2={reportY+20} stroke="var(--rule)"/>
 {related.length===0&&<text x={(W+L)/2} y={reportY+15} textAnchor="middle" className="empty-track">No related reports</text>}
 {related.map((n,i)=><g key={i}><line x1={x(n.observedAt)} x2={x(n.observedAt)} y1={reportY} y2={reportY+20} stroke="var(--blue)"/><circle cx={x(n.observedAt)} cy={reportY} r="4" fill="var(--blue)"/></g>)}
 {[0,1,2,3,4,5].map(i=>{const t=start+span*i/5,px=L+(W-L-R)*i/5;return <g key={i}><line x1={px} x2={px} y1={reportY+20} y2={reportY+25} stroke="var(--rule)"/><text x={px} y={bottom} textAnchor="middle">{new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})}</text></g>;})}
 </svg><div className="coverage-legend" aria-label="Interval reporting coverage">{recordsAvailable?<><span><i className="covered"/>Reported interval</span><span><i className="uncovered"/>No matching report</span></>:<span>Reporting coverage unknown</span>}</div></div>;
}
export function Sparkline({points}:{points:number[]}){
 if(!points.length)return null;
 const min=Math.min(...points),max=Math.max(...points),span=max-min||1;
 return <svg className="sparkline" viewBox="0 0 120 32" aria-hidden="true"><path d={points.map((n,i)=>`${i?'L':'M'}${i/(points.length-1||1)*118+1},${29-(n-min)/span*25}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}
