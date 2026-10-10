export const REPORT_WINDOW_MS=24*60*60*1000;
export function inReportWindow(interval:{start:string;end:string},observedAt:string){
 const observed=Date.parse(observedAt);
 return observed>=Date.parse(interval.start)-REPORT_WINDOW_MS&&observed<=Date.parse(interval.end)+REPORT_WINDOW_MS;
}
export function reportCoversInterval(interval:{start:string;end:string},report:{observedAt:string;intent:string;similarity:number},threshold:number){
 return report.intent==='issue'&&report.similarity>=threshold&&inReportWindow(interval,report.observedAt);
}
