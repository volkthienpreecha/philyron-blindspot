import fs from 'node:fs/promises';
const raw=JSON.parse(await fs.readFile('fixtures/sensor-data.json','utf8'));
const watches=['0400–0800','0800–1200','1200–1600','1600–2000'];
const context=[
 'Noted during the afternoon watch as we increased engine load. Requested an engineering check at handover.',
 'Observed after departure, more noticeable at cruising speed. Passed the observation to the duty engineer.',
 'Logged on the engine-room round. The sound carried into the passageway during the loaded run.',
 'Recorded during the evening watch. Asked the next watch to check whether the pattern continues.',
 'Observed on the passage between ports. The change was more noticeable when load increased.',
 'Entered in the watch handover log. The engineer has been asked to inspect the equipment.',
];
raw.notes=raw.notes.map((n:any,i:number)=>({...n,text:n.text+'. '+(n.text.startsWith('Routine')?'Scheduled engine-room round completed. Logged the observation for the next watch.':n.text.startsWith('No ')?'Checked during the engine-room round. Recorded the current condition at handover.':context[i%context.length]),source:'Synthetic captain log · watch '+watches[i%watches.length]}));
raw.version='synthetic-maritime-2704-captain-logs-v2';
await fs.writeFile('fixtures/sensor-data.json',JSON.stringify(raw));
console.log('Prepared '+raw.notes.length+' synthetic watch-log excerpts.');
