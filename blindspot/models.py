"""Leakage-aware anomaly discovery and held-out model comparison."""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from .simulation import FEATURES, Simulation, SEED

HORIZON = 24

def supervised_labels(frame: pd.DataFrame, sim: Simulation, verified: set[str] | None = None, oracle: bool = False) -> np.ndarray:
    verified = verified or set()
    events = frame.equipment_id.map(lambda x: sim.truth[x]["failure_at"])
    future = events.notna() & ((events - frame.hour) > 0) & ((events - frame.hour) <= HORIZON)
    if oracle:
        return future.astype(int).to_numpy()
    confirmed = set(sim.logs.loc[sim.logs.confirmed_cause.notna(), "equipment_id"])
    known = frame.equipment_id.map(lambda x: x in confirmed or x in verified)
    return (future & known).astype(int).to_numpy()

def detect_anomalies(sim: Simulation) -> list[dict]:
    frame = sim.telemetry
    result = []
    for component, component_frame in frame.groupby("component"):
        healthy = component_frame[(component_frame.split == "train") & (component_frame.hour >= 12) & (component_frame.hour < 70)]
        scaler = StandardScaler().fit(healthy[FEATURES])
        forest = IsolationForest(n_estimators=120, contamination=0.025, random_state=SEED, n_jobs=1).fit(scaler.transform(healthy[FEATURES]))
        scores = -forest.decision_function(scaler.transform(component_frame[FEATURES]))
        healthy_scores = -forest.decision_function(scaler.transform(healthy[FEATURES]))
        threshold = float(np.quantile(healthy_scores, 0.99))
        candidates = component_frame.assign(anomaly_score=scores)
        candidates = candidates[(candidates.hour >= 100) & (candidates.anomaly_score > threshold)]
        for equipment_id, group in candidates.groupby("equipment_id"):
            peak = group.loc[group.anomaly_score.idxmax()]
            elevated = group[(group.hour >= peak.hour - 24) & (group.hour <= peak.hour)]
            comparable = healthy[(healthy.operating_load - peak.operating_load).abs() <= 10]
            if len(comparable) < 20:
                comparable = healthy
            changes = {feature: float((peak[feature] - comparable[feature].mean()) / max(float(comparable[feature].std()), 0.01)) for feature in FEATURES}
            ranked = sorted(changes, key=lambda x: abs(changes[x]), reverse=True)[:3]
            description = ("Rising vibration and temperature on " if changes["vibration_rms"] > 1 and changes["temperature_deviation"] > 1 else "Unusual sensor pattern on ") + f"{peak.component} under {peak.operating_load:.0f}% load"
            result.append({"id": f"A-{equipment_id}", "vessel_id": peak.vessel_id, "equipment_id": equipment_id, "component": peak.component, "split": peak.split, "timestamp": peak.timestamp, "hour": int(peak.hour), "observation_cutoff_hour": int(frame.hour.max()), "start_hour": int(elevated.hour.min()), "end_hour": int(elevated.hour.max()), "anomaly_score": round(float(peak.anomaly_score), 4), "threshold": round(threshold, 4), "description": description, "deviations": {x: round(changes[x], 2) for x in ranked}, "severity": "high" if peak.anomaly_score > threshold + 0.12 else "medium"})
    return sorted(result, key=lambda x: x["anomaly_score"], reverse=True)

def _model(train: pd.DataFrame, labels: np.ndarray) -> XGBClassifier:
    positives = max(1, int(labels.sum()))
    negatives = len(labels) - positives
    model = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.07, subsample=0.85, colsample_bytree=0.85, min_child_weight=8, scale_pos_weight=min(8, negatives / positives), objective="binary:logistic", eval_metric="logloss", tree_method="hist", random_state=SEED, n_jobs=1)
    model.fit(train[FEATURES], labels)
    return model

def _threshold(model: XGBClassifier, validation: pd.DataFrame, labels: np.ndarray) -> float:
    probabilities = model.predict_proba(validation[FEATURES])[:, 1]
    choices = np.arange(0.10, 0.91, 0.05)
    ranked = [(f1_score(labels, probabilities >= cutoff, zero_division=0), -abs(cutoff - 0.5), float(cutoff)) for cutoff in choices]
    return max(ranked)[2]

def _metrics(test: pd.DataFrame, labels: np.ndarray, probabilities: np.ndarray, threshold: float, sim: Simulation) -> dict:
    predictions = probabilities >= threshold
    scored = test[["equipment_id", "vessel_id", "hour"]].copy()
    scored["alert"] = predictions
    scored["positive"] = labels.astype(bool)
    false_episodes = 0
    for _, group in scored.groupby("equipment_id"):
        false = group.alert & ~group.positive
        false_episodes += int((false & ~false.shift(fill_value=False)).sum())
    lead_times = []
    failures_detected = 0
    failures_total = 0
    for equipment_id, group in scored.groupby("equipment_id"):
        event = sim.truth[equipment_id]["failure_at"]
        if event is None:
            continue
        failures_total += 1
        hit = group[group.alert & group.positive]
        if len(hit):
            failures_detected += 1
            lead_times.append(int(event - hit.hour.min()))
    return {"failure_detection_recall": round(failures_detected / failures_total, 4) if failures_total else None, "window_precision": round(float(precision_score(labels, predictions, zero_division=0)), 4), "window_recall": round(float(recall_score(labels, predictions, zero_division=0)), 4), "false_alarm_episodes_per_vessel_per_scored_period": round(false_episodes / test.vessel_id.nunique(), 3), "scored_period_hours": int(test.hour.nunique()), "mean_detection_lead_hours": round(float(np.mean(lead_times)), 2) if lead_times else None, "detected_failures": failures_detected, "total_failures": failures_total, "alert_threshold": round(threshold, 2)}

def compare_models(sim: Simulation, verified: set[str]) -> dict:
    frame = sim.telemetry[sim.telemetry.hour >= 12]
    train = frame[frame.split == "train"]
    validation = frame[frame.split == "validation"]
    test = frame[frame.split == "test"]
    validation_truth = supervised_labels(validation, sim, oracle=True)
    test_truth = supervised_labels(test, sim, oracle=True)
    baseline_labels = supervised_labels(train, sim)
    enhanced_labels = supervised_labels(train, sim, verified=verified)
    baseline = _model(train, baseline_labels)
    enhanced = _model(train, enhanced_labels)
    baseline_cutoff = _threshold(baseline, validation, validation_truth)
    enhanced_cutoff = _threshold(enhanced, validation, validation_truth)
    return {"dataset": "synthetic", "seed": SEED, "prediction_horizon_hours": HORIZON, "split": {"train_vessels": 10, "validation_vessels": 4, "test_vessels": 4}, "verified_failure_histories_added": len(verified), "verified_training_windows_added": int(enhanced_labels.sum() - baseline_labels.sum()), "baseline": _metrics(test, test_truth, baseline.predict_proba(test[FEATURES])[:, 1], baseline_cutoff, sim), "enhanced": _metrics(test, test_truth, enhanced.predict_proba(test[FEATURES])[:, 1], enhanced_cutoff, sim)}
