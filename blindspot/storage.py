"""Small SQLite store for review decisions; generated telemetry stays reproducible."""
import json
import sqlite3
from pathlib import Path

class ReviewStore:
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as db:
            db.execute("CREATE TABLE IF NOT EXISTS reviews (anomaly_id TEXT PRIMARY KEY, decision TEXT NOT NULL, failure_category TEXT, evidence_type TEXT, notes TEXT NOT NULL DEFAULT '', training_eligible INTEGER NOT NULL, reviewed_at TEXT NOT NULL)")

    def _connection(self):
        return sqlite3.connect(self.path)

    def get(self, anomaly_id: str):
        with self._connection() as db:
            db.row_factory = sqlite3.Row
            row = db.execute("SELECT * FROM reviews WHERE anomaly_id = ?", (anomaly_id,)).fetchone()
            return dict(row) if row else None

    def save(self, anomaly_id: str, decision: str, failure_category: str | None, evidence_type: str | None, notes: str, eligible: bool, reviewed_at: str):
        with self._connection() as db:
            db.execute("INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(anomaly_id) DO UPDATE SET decision=excluded.decision, failure_category=excluded.failure_category, evidence_type=excluded.evidence_type, notes=excluded.notes, training_eligible=excluded.training_eligible, reviewed_at=excluded.reviewed_at", (anomaly_id, decision, failure_category, evidence_type, notes, int(eligible), reviewed_at))
        return self.get(anomaly_id)

    def all(self):
        with self._connection() as db:
            db.row_factory = sqlite3.Row
            return [dict(row) for row in db.execute("SELECT * FROM reviews ORDER BY anomaly_id")]
