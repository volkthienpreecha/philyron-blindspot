import fs from 'node:fs/promises';
const raw=JSON.parse(await fs.readFile('fixtures/sensor-data.json','utf8'));
const context=[
 'Noted during the afternoon watch as we increased engine load. Requested an engineering check at handover.',
 'Observed after departure, more noticeable at cruising speed. Passed the observation to the duty engineer.',
 'Logged on the engine-room round. The sound carried into the passageway during the loaded run.',
 'Recorded during the evening watch. Asked the next watch to check whether the pattern continues.',
 'Observed on the passage between ports. The change was more noticeable when load increased.',
 'Entered in the watch handover log. The engineer has been asked to inspect the equipment.',
];
raw.notes=raw.notes.map((n:any,i:number)=>{
 const original=n.text.split('. ')[0];
 const equipment=raw.equipment.find((e:any)=>e.id===n.equipmentId);
 const component=equipment.component;
 const variation=(Number(equipment.vesselId.slice(1))+['bearing','gearbox','pump'].indexOf(component)*2)%6;
 const variants=[
  `The ${component} is shaking and running hot under load`,
  `${component[0].toUpperCase()+component.slice(1)} vibration increased as engine load rose, and the housing felt hot`,
  `We heard a growing rattling noise from the ${component}, with rising temperature during the loaded run`,
  `More vibration and heat from the ${component} at cruising speed than on the previous round`,
  `The ${component} became noisy and noticeably hotter when we increased load`,
  `Increasing ${component} noise and heat under load`,
 ];
 const text=original.startsWith('Increasing')?variants[variation]:original;
 return {...n,text:text+'. '+(original.startsWith('Routine')?'Scheduled engine-room round completed. Logged the observation for the next watch.':original.startsWith('No ')?'Checked during the engine-room round. Recorded the current condition at handover.':context[variation]),source:'Synthetic captain log · watch '+String(Math.floor(new Date(n.observedAt).getUTCHours()/4)*4).padStart(2,'0')+'00–'+String(Math.floor(new Date(n.observedAt).getUTCHours()/4)*4+4).padStart(2,'0')+'00'};
});
raw.version='synthetic-maritime-2704-captain-logs-v2';
await fs.writeFile('fixtures/sensor-data.json',JSON.stringify(raw));
console.log('Prepared '+raw.notes.length+' synthetic watch-log excerpts.');
