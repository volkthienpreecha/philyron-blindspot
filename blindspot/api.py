"""Backend for the Blindspot Discovery demonstration."""
from datetime import datetime, timezone
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, model_validator
from .simulation import generate
from .models import compare_models, detect_anomalies
from .matching import match_logs, cluster_patterns
from .storage import ReviewStore

class ReviewRequest(BaseModel):
    decision: str
    failure_category: str | None = None
    evidence_type: str | None = None
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def validate_decision(self):
        if self.decision not in {"confirmed_issue", "normal_behavior", "needs_investigation"}:
            raise ValueError("Unsupported review decision")
        if self.decision == "confirmed_issue" and (not self.failure_category or self.evidence_type not in {"actual_failure", "degradation", "preventive_maintenance"}):
            raise ValueError("Confirmed issues require failure_category and evidence_type")
        return self

def create_app(db_path: str | None = None) -> FastAPI:
    app = FastAPI(title="Philyron Blindspot Discovery API", version="0.1.0")
    sim = generate()
    anomalies = detect_anomalies(sim)
    anomaly_by_id = {a["id"]: a for a in anomalies}
    store = ReviewStore(db_path or os.getenv("BLINDSPOT_DB", str(Path("data") / "reviews.sqlite3")))
    comparison = {"value": None}

    def get_anomaly(anomaly_id: str) -> dict:
        anomaly = anomaly_by_id.get(anomaly_id)
        if not anomaly:
            raise HTTPException(404, "Unknown anomaly")
        return anomaly

    def enriched(anomaly: dict) -> dict:
        matched = match_logs(anomaly, sim.logs)
        review = store.get(anomaly["id"])
        return {**anomaly, "reporting_status": matched["reporting_status"], "review_status": review["decision"] if review else "awaiting_investigation", "review_allowed": anomaly["split"] == "train"}

    @app.get("/api/overview")
    def overview():
        items = [enriched(a) for a in anomalies]
        return {"dataset": "synthetic", "vessels": sim.telemetry.vessel_id.nunique(), "equipment": sim.telemetry.equipment_id.nunique(), "detected_anomalies": len(items), "matched_reports": sum(a["reporting_status"] in {"reported", "later_reported"} for a in items), "later_reported": sum(a["reporting_status"] == "later_reported" for a in items), "potentially_unreported": sum(a["reporting_status"] == "unreported_candidate" for a in items), "awaiting_investigation": sum(a["review_status"] == "awaiting_investigation" for a in items), "reviewed": len(items) - sum(a["review_status"] == "awaiting_investigation" for a in items)}

    @app.get("/api/vessels")
    def vessels():
        return [{"id": vessel, "equipment_count": int(group.equipment_id.nunique()), "split": group.split.iloc[0]} for vessel, group in sim.telemetry.groupby("vessel_id")]

    @app.get("/api/anomalies")
    def list_anomalies(vessel: str | None = None, component: str | None = None, severity: str | None = None, reporting_status: str | None = None, start: str | None = None, end: str | None = None):
        items = [enriched(a) for a in anomalies]
        for key, value in (("vessel_id", vessel), ("component", component), ("severity", severity), ("reporting_status", reporting_status)):
            if value:
                items = [a for a in items if a[key] == value]
        if start:
            items = [a for a in items if a["timestamp"] >= start]
        if end:
            items = [a for a in items if a["timestamp"] <= end]
        return items

    @app.get("/api/anomalies/{anomaly_id}")
    def anomaly_detail(anomaly_id: str):
        anomaly = get_anomaly(anomaly_id)
        frame = sim.telemetry[(sim.telemetry.equipment_id == anomaly["equipment_id"]) & (sim.telemetry.hour >= anomaly["start_hour"] - 24) & (sim.telemetry.hour <= anomaly["end_hour"])]
        columns = ["hour", "timestamp", "temperature_mean", "temperature_max", "temperature_deviation", "vibration_rms", "operating_load"]
        normal = sim.telemetry[(sim.telemetry.equipment_id == anomaly["equipment_id"]) & (sim.telemetry.hour < 70)]
        return {**enriched(anomaly), "telemetry": frame[columns].to_dict(orient="records"), "normal_baseline": {"temperature_deviation": 0, "vibration_rms": round(float(normal.vibration_rms.mean()), 3)}, "score_interpretation": "Isolation Forest outlier score; not a failure probability", "review": store.get(anomaly_id)}

    @app.get("/api/anomalies/{anomaly_id}/matches")
    def anomaly_matches(anomaly_id: str):
        return match_logs(get_anomaly(anomaly_id), sim.logs)

    @app.get("/api/patterns")
    def patterns():
        unexplained = [a for a in anomalies if match_logs(a, sim.logs)["reporting_status"] == "unreported_candidate"]
        return cluster_patterns(unexplained, sim.logs)

    @app.post("/api/anomalies/{anomaly_id}/review")
    def review_anomaly(anomaly_id: str, request: ReviewRequest):
        anomaly = get_anomaly(anomaly_id)
        if anomaly["split"] != "train":
            raise HTTPException(403, "Validation and test histories cannot be reviewed in this demonstration")
        sealed_truth = sim.truth[anomaly["equipment_id"]]
        eligible = request.decision == "confirmed_issue" and request.evidence_type == "actual_failure" and request.failure_category == sealed_truth["failure_category"] and sealed_truth["failure_at"] is not None and not sealed_truth["reported"]
        review = store.save(anomaly_id, request.decision, request.failure_category, request.evidence_type, request.notes, eligible, datetime.now(timezone.utc).isoformat())
        return {"review": review, "simulated_inspection": "failure event confirmed" if sealed_truth["failure_at"] is not None else "no failure event in simulated history", "training_eligible": eligible, "training_note": "Only verified, initially unreported training-vessel failure histories enter retraining. Validation and test vessels remain held out."}

    @app.get("/api/model-comparison")
    def model_comparison():
        if comparison["value"] is None:
            comparison["value"] = compare_models(sim, set())
        return comparison["value"]

    @app.post("/api/model/retrain")
    def retrain():
        verified = {a["equipment_id"] for a in anomalies if (review := store.get(a["id"])) and review["training_eligible"]}
        comparison["value"] = compare_models(sim, verified)
        return comparison["value"]

    @app.get("/api/health")
    def health():
        return {"status": "ok", "dataset": "synthetic"}

    return app

app = create_app()
