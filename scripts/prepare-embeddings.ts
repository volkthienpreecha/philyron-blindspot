import fs from 'node:fs/promises';
import { embed, MODEL_VERSION } from '../lib/embedding';
import { analyzeText, cosine } from '../lib/text';
const raw=JSON.parse(await fs.readFile('fixtures/sensor-data.json','utf8'));
const texts=[...raw.cases.map((c:any)=>c.query),...raw.notes.map((n:any)=>{
  const a=analyzeText(n.text); const eq=raw.equipment.find((e:any)=>e.id===n.equipmentId);
  return `${eq.component}: ${a.affirmativeText||n.text}`;
})];
const vectors=await embed(texts);
raw.cases=raw.cases.map((c:any,i:number)=>({...c,vector:vectors[i]}));
raw.notes=raw.notes.map((n:any,i:number)=>({...n,...analyzeText(n.text),vector:vectors[raw.cases.length+i],modelVersion:MODEL_VERSION}));
// Development calibration is kept separate from the acceptance paraphrases.
const development=[
 ['bearing increasing vibration noise and temperature under load','bearing: Bearing is shaking and running hot',true],
 ['bearing increasing vibration noise and temperature under load','bearing: Growing bearing noise and heat under load',true],
 ['pump unusual heat and temperature spike','pump: Pump temperature climbed sharply during operation',true],
 ['gearbox increasing vibration noise and temperature under load','gearbox: Gearbox rattling and heating under load',true],
 ['bearing increasing vibration noise and temperature under load','bearing: Deck navigation light is flickering',false],
 ['pump unusual heat and temperature spike','pump: Steering wheel vibrates at low speed',false],
 ['gearbox increasing vibration noise and temperature under load','gearbox: Cabin air conditioner is leaking',false],
 ['bearing increasing vibration noise and temperature under load','bearing: Pump discharge pressure is low',false],
] as const;
const devVectors=await embed(development.flatMap(x=>[x[0],x[1]]));
const scores=development.map((x,i)=>({query:x[0],text:x[1],related:x[2],score:cosine(devVectors[2*i],devVectors[2*i+1])}));
let best={threshold:.5,f1:-1,precision:0,recall:0};
const center=(Math.max(...scores.filter(x=>!x.related).map(x=>x.score))+Math.min(...scores.filter(x=>x.related).map(x=>x.score)))/2;
for(let i=35;i<=85;i++){
 const threshold=i/100,tp=scores.filter(x=>x.related&&x.score>=threshold).length,fp=scores.filter(x=>!x.related&&x.score>=threshold).length,fn=scores.filter(x=>x.related&&x.score<threshold).length;
 const precision=tp/(tp+fp||1),recall=tp/(tp+fn||1),f1=2*precision*recall/(precision+recall||1);
 if(f1>best.f1 || (f1===best.f1 && Math.abs(threshold-center)<Math.abs(best.threshold-center))) best={threshold,f1,precision,recall};
}
raw.modelVersion=MODEL_VERSION;raw.matchThreshold=best.threshold;raw.clusterThreshold=.7;
await fs.writeFile('fixtures/evidence.json',JSON.stringify(raw));
await fs.writeFile('fixtures/calibration.json',JSON.stringify({modelVersion:MODEL_VERSION,development:scores,...best,scope:'Small synthetic development set; not field validation'},null,2));
console.log({cases:raw.cases.length,notes:raw.notes.length,embeddingDimensions:vectors[0].length,calibration:best});
