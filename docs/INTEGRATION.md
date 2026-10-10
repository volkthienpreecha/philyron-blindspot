# Integration boundaries

The demo reconciles existing sensor evidence with unstructured captain records, prioritizes poorly covered patterns, and preserves verified findings for an existing training workflow. It does not replace a predictor or prove Philyron currently has reporting gaps. Data is synthetic; there is no proprietary connection.

## Requirement audit

| Requirement | Implementation |
| --- | --- |
| Sustained anomalies | export-fixtures.py groups contiguous intervals with duration, deviations, load and detector score |
| Real added-note inference | embedding.ts uses pinned q8 MiniLM, normalized 384-dimensional vectors; no lexical fallback |
| Complaint grouping | matching.ts uses category-compatible deterministic complete-link similarity |
| Coverage gates | Same equipment and ±24 hours before affirmative semantic coverage |
| Negation and routine notes | text.ts conservatively classifies clauses; complex language needs field validation |
| Other-vessel complaints | Context only, never local coverage |
| Missing archives | Insufficient records, not an unreported assertion |
| Historical assessment | Observation and ingestion timestamps; original coverage and later coverage preserved |
| Evidence-backed review | service.ts requires matching inspection and category for confirmation |
| Verified-label export | JSON/CSV with interval, category, evidence ID, provenance, dataset/model versions |
| Persistence and isolation | Signed anonymous cookie; SQLite locally or private Postgres tables with protected atomic RPC |
| Hosted operation | Next.js APIs and bundled inference; no laptop or request-time Python training |

## Production contracts still required

1. Stable vessel/equipment IDs and category mappings.
2. Existing sensor intervals, time/units/load, detector versions and evidence references.
3. Captain and CMMS records with original text, asset IDs, observation/ingestion dates and archive completeness.
4. Real inspections, failure taxonomy, authenticated reviewer identity, corrections and immutable audit policy.
5. Approved label-import contract, retention policy and authorization.

Backtest on historical exports with vessel/time splits; calibrate semantics and negation on real maritime language. Measure useful findings per review hour and false investigation burden. Run a read-only shadow queue before label writeback; assess retraining separately against the existing model.

Scalar synthetic telemetry is not waveform processing, thermal imagery, a production alarm threshold or failure probability. The inspection action uses explicitly labeled synthetic truth; production evidence must come from inspection and closed work orders. Anonymous demo isolation is for synthetic visitors; real fleets require authentication and audit retention.
