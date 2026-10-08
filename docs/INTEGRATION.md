# Integration assessment — 2026-10-08

## Verdict

This repository is a working **synthetic backend demonstration**, not a deployable Philyron integration. It proves that the proposed review loop can run end to end and that its measured result can be exposed honestly. It has no connection to Philyron telemetry, CMMS, identity system, or model infrastructure. Those systems and schemas are not public.

The most credible product placement is an **internal blindspot review queue** for reliability engineers and ML staff. It would reconcile an existing sensor finding with a CMMS work order, request investigation for an unresolved case, and preserve verified outcomes for retraining. It should not create a second, unexplained alarm stream for crews.

This positioning follows Philyron's public description of its [predictive maintenance stack](https://philyron.com/predictive-maintenance/) (vibration and thermal sensors, edge fusion, CMMS history, specific failure precursors) and its [CMMS](https://philyron.com/cmms/) (work orders, notifications, closed repair history). The site describes warnings with **weeks** to act; the demo's 24-hour target does not test that claim.

## Requirement check

| Brief requirement | Current state | Evidence or gap |
| --- | --- | --- |
| 10–20 vessels, multiple components, reported and unreported failures | Demo implemented | `simulation.py`: 18 vessels, 54 equipment histories, explicit train/validation/test vessel groups, sealed synthetic truth. |
| Sensor anomaly detection without failure labels | Demo implemented | `models.py`: component-specific Isolation Forest fit and scale only on early healthy training windows. Equipment baselines use prior samples only. |
| Explain why an anomaly was flagged | Partial | Outlier score and three feature deviations are returned; no calibrated probability, waveform view, thermal image, or SHAP explanation. |
| Maintenance record matching | Demo implemented | Equipment and time gates, Sentence Transformer similarity with a documented TF-IDF fallback, report timing and status. No real CMMS connector. |
| Complaint and unexplained-anomaly clustering | Demo implemented | `/api/patterns`; toy descriptions and five fixed clusters need field validation. |
| Three human review decisions, stored | Demo implemented | SQLite stores the latest decision. No reviewer identity, evidence attachment, immutable history, or approval policy. |
| Verified cases affect enhanced training | Demo implemented with synthetic oracle | Only a matching category and actual simulated failure on a training vessel becomes a new 24-hour failure label. A real implementation needs observed outcomes from inspection and closed work orders. |
| Baseline and enhanced XGBoost on held-out vessels | Demo implemented | Same test vessels, validation-selected thresholds, measured metrics. The small synthetic test has only eight failure events, so the lift is illustrative. |
| Required eight API endpoints | Implemented | `api.py`; `/api/patterns` and `/api/health` are extra. |
| Three frontend views and integrated interactions | Deferred at user request | No frontend exists yet. |
| Real Philyron deployment | Not implemented | No sensor or CMMS contract, ingestion, event persistence, auth, model registry, deployment job, observability, or prospective validation. |

## What makes this useful to Philyron

Philyron says it already combines sensing with a CMMS. The possible gap is **label completeness and provenance**: a sensor abnormality can exist before a crew note, inspection, or closed work order; some never become structured repair labels. Blindspot Discovery could measure and close that gap. A useful internal result would be more verified failure-mode examples per engineering review hour, with fewer unresolved sensor findings and no increase in false crew alerts.

The current demo does **not** show that this gap exists in Philyron's data. It also does not show that Isolation Forest or XGBoost outperforms their existing model. Those are hypotheses to test with the company's data and team.

## Minimum production contract to request from Philyron

1. **Asset identity:** stable vessel, equipment, sensor, and work-order IDs; component hierarchy; installation and replacement dates. A gearbox bearing must map to the correct vibration and thermal channels.
2. **Sensor event feed:** event and ingest timestamps, sensor health and calibration, units, sampling rate, window boundaries, operating state/load, and versioned features. Raw 3-axis vibration and thermal imagery may stay at the edge; the review service can consume approved aggregate features and links to evidence.
3. **CMMS feed:** work-order ID, asset ID, opened/observed/closed timestamps, symptoms, inspection findings, confirmed cause, action, and reopen/correction events. An open complaint is not a verified failure label.
4. **Review writeback:** identity and role of reviewer, decision, evidence reference, failure taxonomy, timestamp, reason, and an immutable audit trail. A review should link back to the original anomaly and work order.
5. **Model contract:** existing model outputs and version, prediction horizon, alert thresholds, deployment location, and training/evaluation pipeline. Blindspot should first enrich their labels and evaluate against their existing baseline rather than assume XGBoost replaces it.
6. **Operations:** event deduplication, delayed and offline ship-to-shore sync, idempotent replays, access control, retention, encryption, failure recovery, health monitoring, and manual rollback.

## Deployment path

1. **Offline backtest:** use a de-identified historical export. Reconcile sensor intervals to closed work orders. Measure unlinked-case yield, review effort, and failure-mode mix. Use vessel-level splits and later time periods; report confidence intervals and performance by equipment type.
2. **Shadow review queue:** ingest approved events read-only. Let engineers verify cases and write decisions into a separate audit store. Do not send new crew alerts or change their production predictor.
3. **Label integration:** after Philyron approves the failure taxonomy and inspection evidence rules, write verified outcomes through a controlled CMMS/model-data interface. Keep open reports, degradation, preventive maintenance, and confirmed failures distinct.
4. **Retraining gate:** retrain offline with dataset and feature versions. Compare to the existing model at a fixed false-alert budget over a horizon that matters operationally, potentially days or weeks. Check alert lead time, precision, missed failures, and alert burden on unseen vessels.
5. **Prospective pilot:** run in shadow on a small fleet with drift checks, delayed-log handling, reviewer workload, and rollback criteria. Only then consider a production workflow in their shore dashboard or CMMS.

## Known technical limits in this repo

- The API always regenerates a fixed dataset at startup. There is no real telemetry or work-order ingestion, and only one anomaly is retained per equipment history.
- All simulated failures happen at hour 140 with similar degradation. This makes the test easier than field data and makes a 24-hour warning unrepresentative of Philyron's stated weeks-early product goal.
- Vibration kurtosis and crest factor are generated values, not features calculated from 3-axis waveforms. Temperature is a scalar, not a thermal camera stream.
- Event truth lives alongside demo code. Review uses it as a simulated inspection oracle. Production labels must be derived from dated human inspection and closed work-order evidence.
- SQLite overwrites a review; it is not an audit log. `/api/model/retrain` is synchronous and can be triggered without production authorization. There is no model artifact or controlled rollout.
- Metrics come from eight synthetic held-out failures with no uncertainty interval. They are not evidence of commercial performance or compatibility with Philyron's models.

**Go/no-go:** go for an interview demo or an architecture discussion; no-go for connection to a live vessel, crew alerts, or production retraining until the contracts and validation above exist.
