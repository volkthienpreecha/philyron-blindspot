const symptomPattern = /\b(noise|noisy|noisier|rattl\w*|vibrat\w*|shak\w*|hot|heat\w*|temperature|overheat\w*|pressure|cavitat\w*|grind\w*|hum\w*|warm\w*|leak\w*)\b/gi;
export function analyzeText(text:string,component?:string) {
  const clauses=text.split(/[.;\n]|\b(?:but|however|although)\b/i).map(x=>x.trim()).filter(Boolean);
  const affirmative:string[]=[]; const symptoms:string[]=[];
  let negated=false,uncertain=false;
  let referenced=component?[component]:[];
  // A question or unresolved source is not an affirmative report, even when
  // its qualification follows the symptom in a separate sentence.
  const unresolved=/\?|\b(?:cannot tell|can't tell|not sure|unclear|unable to (?:tell|locate|identify)|could not (?:tell|locate|identify))\b/i.test(text);
  for(const clause of clauses) {
    const named=clause.toLowerCase().match(/\b(?:bearing|gearbox|pump)s?\b/g)?.map(x=>x.replace(/s$/,''))??[];
    if(named.length)referenced=[...new Set(named)];
    const found=clause.match(symptomPattern)??[];
    const neg=/\b(no|not|without|normal|none|unchanged|resolved|absent)\b|no defect/i.test(clause);
    const wrongEquipment=!!component&&(referenced.length!==1||referenced[0]!==component);
    const unsure=unresolved||wrongEquipment||/\b(maybe|possibly|unsure|uncertain|might|could|suspect)\b/i.test(clause);
    if(found.length&&neg) negated=true;
    if(found.length&&unsure) uncertain=true;
    if(found.length&&!neg&&!unsure){affirmative.push(clause);symptoms.push(...found.map(x=>x.toLowerCase()));}
  }
  const intent=affirmative.length?'issue':uncertain?'uncertain':negated?'negated':'routine';
  return {intent:intent as 'issue'|'routine'|'negated'|'uncertain',symptoms:[...new Set(symptoms)],affirmativeText:affirmative.join('. ')};
}
export function cosine(a:number[],b:number[]) { return a.reduce((s,x,i)=>s+x*(b[i]??0),0); }
