"""Export observable synthetic evidence; sealed truth is kept server-side separately."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from blindspot.simulation import generate, FEATURES, SEED

sim = generate()
out = Path('fixtures')
out.mkdir(exist_ok=True)
names = ['Bay Pioneer','Harbor Light','Coastal Wind','Sea Meridian','North Star','Pacific Dawn','Ocean Grace','Cape Horizon','Silver Tide','Atlantic Rose','Blue Marlin','Port Venture','Eastern Sky','Coral Bay','Western Spirit','Island Trader','Sea Falcon','Northern Reach']
equipment, cases, logs = [], [], []
for eid, frame in sim.telemetry.groupby('equipment_id'):
    vessel = frame.vessel_id.iloc[0]
    component = frame.component.iloc[0]
    equipment.append({'id':eid,'vesselId':vessel,'vessel':names[int(vessel[1:])-1],'component':component,'name':component.title()+' 01','recordsAvailable':vessel != 'V18','split':frame.split.iloc[0]})
for component, frame in sim.telemetry.groupby('component'):
    healthy=frame[(frame.split=='train') & (frame.hour>=12) & (frame.hour<70)]
    scaler=StandardScaler().fit(healthy[FEATURES])
    detector=IsolationForest(n_estimators=120,contamination=.025,random_state=SEED,n_jobs=1).fit(scaler.transform(healthy[FEATURES]))
    threshold=float(np.quantile(-detector.decision_function(scaler.transform(healthy[FEATURES])),.99))
    scored=frame.assign(score=-detector.decision_function(scaler.transform(frame[FEATURES])))
    for eid, group in scored.groupby('equipment_id'):
        abnormal=group[(group.hour>=70)&(group.score>threshold)]
        if abnormal.empty: continue
        runs=[]
        for _, row in abnormal.iterrows():
            if not runs or row.hour>runs[-1][-1].hour+1: runs.append([])
            runs[-1].append(row)
        intervals=[{'start':r[0].timestamp,'end':r[-1].timestamp,'durationHours':len(r),'peakScore':round(max(x.score for x in r),4)} for r in runs]
        peak=abnormal.loc[abnormal.score.idxmax()]
        base=group[group.hour<70]
        changes={f:round(float((peak[f]-base[f].mean())/max(base[f].std(),.01)),2) for f in ['vibration_rms','temperature_deviation','operating_load']}
        pattern='Rising vibration and heat' if changes['vibration_rms']>1 and changes['temperature_deviation']>1 else 'Thermal excursion'
        eq=next(x for x in equipment if x['id']==eid)
        cases.append({'id':'case-'+eid, 'equipmentId':eid, **{k:eq[k] for k in ['vessel','vesselId','component','name','split','recordsAvailable']}, 'description':pattern,'query':f'{component} '+('increasing vibration, noise and temperature under load' if pattern.startswith('Rising') else 'unusual heat and temperature spike'), 'detectedAt':abnormal.iloc[0].timestamp,'asOf':group.iloc[-1].timestamp,'intervals':intervals,'eventCount':len(intervals),'abnormalHours':len(abnormal),'score':round(float(peak.score),4),'threshold':round(threshold,4),'deviations':changes,'baseline':{'vibration':round(float(base.vibration_rms.mean()),3),'temperature':round(float(base.temperature_mean.mean()),3)},'telemetry':[{'timestamp':r.timestamp,'vibration':round(r.vibration_rms,3),'temperature':round(r.temperature_mean,2),'load':round(r.operating_load,1),'abnormal':bool(r.hour>=70 and r.score>threshold)} for r in group.itertuples()]})
for _, row in sim.logs.iterrows():
    if row.hour>139: continue
    logs.append({'id':row.id,'equipmentId':row.equipment_id,'text':row.description,'observedAt':row.timestamp,'ingestedAt':row.timestamp,'source':'Captain log','addedDuringDemo':False})
# Extra routine records establish a known archive, without inventing an issue.
for eq in equipment:
    if not any(x['equipmentId']==eq['id'] for x in logs):
        logs.append({'id':'routine-'+eq['id'],'equipmentId':eq['id'],'text':f"Routine {eq['component']} service completed. No unusual noise or heat.",'observedAt':'2026-01-03T17:00:00+00:00','ingestedAt':'2026-01-03T17:00:00+00:00','source':'Captain log','addedDuringDemo':False})
dataset={'version':'synthetic-2704-v2','asOf':'2026-01-06T19:00:00+00:00','equipment':equipment,'cases':cases,'notes':logs}
(out/'sensor-data.json').write_text(json.dumps(dataset,separators=(',',':')))
# This artifact is imported only by the server inspection route, never matching or client code.
(out/'inspection-truth.json').write_text(json.dumps(sim.truth))
print(f'Exported {len(cases)} cases, {sum(c["eventCount"] for c in cases)} distinct intervals, {len(logs)} observable notes')
