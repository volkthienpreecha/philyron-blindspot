import os
os.environ["BLINDSPOT_SEMANTIC_BACKEND"] = "tfidf"

from fastapi.testclient import TestClient
from blindspot.api import create_app
from blindspot.simulation import generate
from blindspot.models import supervised_labels

def test_splits_and_labels_are_sealed():
    sim = generate()
    vessels = sim.telemetry.groupby("split").vessel_id.nunique().to_dict()
    assert vessels == {"train": 10, "validation": 4, "test": 4}
    train = sim.telemetry[sim.telemetry.split == "train"]
    baseline = supervised_labels(train, sim)
    underreported = next(equipment for equipment, truth in sim.truth.items() if truth["split"] == "train" and truth["failure_at"] and not truth["reported"])
    reviewed = supervised_labels(train, sim, verified={underreported})
    assert reviewed.sum() > baseline.sum()
    assert (reviewed >= baseline).all()

def test_review_retraining_and_held_out_metrics(tmp_path):
    client = TestClient(create_app(str(tmp_path / "reviews.sqlite3")))
    before = client.get("/api/model-comparison").json()
    assert before["baseline"] == before["enhanced"]
    anomalies = client.get("/api/anomalies").json()
    candidate = next(a for a in anomalies if a["split"] == "train" and a["reporting_status"] == "unreported_candidate" and a["component"] == "bearing" and a["vessel_id"] == "V02")
    detail = client.get(f"/api/anomalies/{candidate['id']}").json()
    assert len(detail["telemetry"]) > 10
    assert detail["score_interpretation"].startswith("Isolation Forest")
    review = client.post(f"/api/anomalies/{candidate['id']}/review", json={"decision": "confirmed_issue", "failure_category": "bearing wear", "evidence_type": "actual_failure", "notes": "Simulated bearing inspection"})
    assert review.status_code == 200
    assert review.json()["training_eligible"] is True
    after = client.post("/api/model/retrain").json()
    assert after["verified_failure_histories_added"] == 1
    assert after["verified_training_windows_added"] == 24
    assert after["baseline"] == before["baseline"]
    assert client.get("/api/model-comparison").json() == after
    assert client.get("/api/patterns").status_code == 200

def test_false_alarm_and_validation(tmp_path):
    client = TestClient(create_app(str(tmp_path / "reviews.sqlite3")))
    anomalies = client.get("/api/anomalies").json()
    assert client.post(f"/api/anomalies/{anomalies[0]['id']}/review", json={"decision": "confirmed_issue"}).status_code == 422
    assert client.get("/api/anomalies/does-not-exist").status_code == 404
    filters = client.get("/api/anomalies", params={"component": "bearing", "reporting_status": "unreported_candidate"}).json()
    assert filters and all(a["component"] == "bearing" and a["reporting_status"] == "unreported_candidate" for a in filters)
