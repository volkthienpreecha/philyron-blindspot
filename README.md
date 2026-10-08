# Philyron Blindspot Discovery — backend demo

This is an independent, **synthetic** demonstration of a possible blindspot discovery feature. It is not Philyron software or proprietary data. The frontend is intentionally deferred.

## Run

Python 3.11–3.13 is recommended.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn blindspot.api:app --reload
```

Open `http://127.0.0.1:8000/docs` for the interactive API. Review decisions persist in `data/reviews.sqlite3`. Delete that file to reset the demo. The synthetic telemetry regenerates deterministically from seed 2704.

Sentence Transformers uses `all-MiniLM-L6-v2` and downloads the model on first semantic matching request. For offline use or tests, set `BLINDSPOT_SEMANTIC_BACKEND=tfidf`; the response reports which semantic backend was used. The fallback is lexical TF-IDF and should not be presented as embedding similarity.

## Demonstration flow

1. `GET /api/overview` and `GET /api/anomalies?reporting_status=unreported_candidate` reveal cases with unusual telemetry and no matching failure report.
2. Open `GET /api/anomalies/A-V02-BEARING-01` and its `/matches` endpoint to inspect the bearing timeline, outlier score, feature deviations, and maintenance evidence.
3. `POST /api/anomalies/A-V02-BEARING-01/review` with `{"decision":"confirmed_issue","failure_category":"bearing wear","evidence_type":"actual_failure","notes":"Simulated engineer inspection"}`. The synthetic inspection checks sealed truth. Only a true, previously unreported training-vessel failure becomes training eligible.
4. `POST /api/model/retrain`, then `GET /api/model-comparison`. Both models are scored on the same untouched test vessels. The result may improve, stay flat, or worsen.

Other review decisions: `normal_behavior` and `needs_investigation`. A confirmed issue requires a failure category and evidence type of `actual_failure`, `degradation`, or `preventive_maintenance`. A review can be changed later, and a subsequent retrain uses the current saved decisions.

## Design and metric definitions

- 18 vessels × 3 components × 140 hourly samples. Vessels 1–10 train, 11–14 validate, and 15–18 test. Each split includes reported failures, underreported failures, and healthy equipment. Some healthy histories contain harmless sensor spikes.
- Each equipment baseline is estimated from prior operating-load and temperature observations, then frozen after its first 70 healthy hours. No future measurement affects an earlier feature. Degradation begins later. Isolation Forest trains only on early healthy windows from training vessels, after scaling those training windows. Its score measures unusual behavior, **not** failure probability.
- Maintenance matching requires the same equipment and a ±24 hour window, using only records available by the current synthetic telemetry cutoff. Similarity ranks eligible descriptions. A structured issue report is distinct from a possible semantic match, and a report filed after detection is marked `later_reported`. A report is **not** a verified failure until a closed work order records the cause. `/api/patterns` clusters unexplained anomaly descriptions with maintenance complaints.
- XGBoost predicts a verified failure within the next 24 simulated operating hours. Baseline training sees failures with closed work orders. Its unreported failure windows are label noise. Enhanced training changes labels only for failure histories admitted through saved engineer reviews. Ground truth never enters anomaly fitting or baseline training. Validation and test anomalies are viewable for demonstration but cannot be reviewed into the training set.
- Both XGBoost models use the same features and fixed hyperparameters. A threshold is selected on validation vessels by window F1, then each model is evaluated once on test vessels. The comparison endpoint gives measured values from these predictions, not preset improvement figures.
- `failure_detection_recall`: fraction of held-out failure events with at least one alert in the prior 24 hours. `window_precision` and `window_recall`: predictions for a failure in the next 24 hours. `false_alarm_episodes_per_vessel_per_scored_period`: starts of consecutive false-alert runs, divided by four test vessels; `scored_period_hours` is 128. `mean_detection_lead_hours`: mean hours from first correct alert to failure, among detected failures.

The demo has intentionally small, stylized data and no confidence intervals. Its measured comparison illustrates the workflow; it does not establish real fleet performance. The API currently exposes synthetic split labels for transparency. A production system would not expose sealed event truth, and engineer verification would rely on actual inspection evidence.

See [Integration assessment](docs/INTEGRATION.md) for the requirement-by-requirement audit, fit with Philyron's public product description, and the work needed before a deployment into its stack.

## API

`GET /api/overview`, `GET /api/vessels`, `GET /api/anomalies`, `GET /api/anomalies/{id}`, `GET /api/anomalies/{id}/matches`, `POST /api/anomalies/{id}/review`, `GET /api/patterns`, `GET /api/model-comparison`, `POST /api/model/retrain`, `GET /api/health`.

`GET /api/anomalies` supports `vessel`, `component`, `severity`, `reporting_status`, `start`, and `end` filters.

## Tests

```powershell
$env:BLINDSPOT_SEMANTIC_BACKEND='tfidf'
python -m pytest -q --basetemp .pytest-temp
```
