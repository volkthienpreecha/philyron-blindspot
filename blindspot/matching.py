"""Equipment/time gated maintenance matching with semantic similarity."""
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import AgglomerativeClustering

_encoder = None
_encoder_checked = False

def similarities(query: str, descriptions: list[str]) -> tuple[list[float], str]:
    global _encoder, _encoder_checked
    if not descriptions:
        return [], "none"
    if not _encoder_checked and os.getenv("BLINDSPOT_SEMANTIC_BACKEND", "sentence-transformers") != "tfidf":
        _encoder_checked = True
        try:
            from sentence_transformers import SentenceTransformer
            _encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        except (ImportError, OSError, RuntimeError):
            _encoder = None
    if _encoder is not None:
        vectors = _encoder.encode([query, *descriptions], normalize_embeddings=True)
        return [float(x) for x in vectors[1:] @ vectors[0]], "sentence-transformers/all-MiniLM-L6-v2"
    matrix = TfidfVectorizer(ngram_range=(1, 2)).fit_transform([query, *descriptions])
    return [float(x) for x in cosine_similarity(matrix[0], matrix[1:])[0]], "tfidf-fallback"

def cluster_patterns(anomalies: list[dict], logs) -> dict:
    """Cluster unexplained anomaly descriptions together with complaint text."""
    candidates = [{"source": "anomaly", "id": a["id"], "text": a["description"]} for a in anomalies]
    candidates += [{"source": "maintenance_log", "id": row.id, "text": row.description} for _, row in logs.iterrows()]
    if len(candidates) < 2:
        return {"patterns": [], "semantic_backend": "none"}
    texts = [x["text"] for x in candidates]
    # Trigger the same lazy backend selection used for report matching.
    similarities(texts[0], texts[1:2])
    if _encoder is not None:
        vectors = _encoder.encode(texts, normalize_embeddings=True)
        backend = "sentence-transformers/all-MiniLM-L6-v2"
    else:
        vectors = TfidfVectorizer(ngram_range=(1, 2)).fit_transform(texts).toarray()
        backend = "tfidf-fallback"
    labels = AgglomerativeClustering(n_clusters=min(5, len(candidates)), linkage="average", metric="cosine").fit_predict(vectors)
    patterns = []
    for label in sorted(set(labels)):
        members = [item for item, assigned in zip(candidates, labels) if assigned == label]
        patterns.append({"id": f"P-{label + 1}", "representative_description": members[0]["text"], "anomaly_count": sum(x["source"] == "anomaly" for x in members), "maintenance_log_count": sum(x["source"] == "maintenance_log" for x in members), "members": [{"source": x["source"], "id": x["id"]} for x in members]})
    return {"patterns": patterns, "semantic_backend": backend}

def match_logs(anomaly: dict, logs) -> dict:
    eligible = logs[(logs.equipment_id == anomaly["equipment_id"]) & (logs.hour <= anomaly["observation_cutoff_hour"]) & ((logs.hour - anomaly["hour"]).abs() <= 24)]
    descriptions = eligible.description.tolist()
    scores, backend = similarities(anomaly["description"], descriptions)
    matches = []
    for (_, log), score in zip(eligible.iterrows(), scores):
        # Identity and time are hard gates. A report is confirmed only if its structured
        # failure field says so; semantic similarity alone never confirms a failure.
        matches.append({"id": log.id, "timestamp": log.timestamp, "description": log.description, "similarity": round(score, 3), "match_status": "confirmed_record_match" if log.is_failure_report else "possible_semantic_match", "timing": "later_reported" if log.hour > anomaly["hour"] else "known_at_detection", "failure_verified": bool(log.confirmed_cause), "maintenance_action": log.maintenance_action})
    matches.sort(key=lambda x: x["similarity"], reverse=True)
    related = [x for x in matches if x["match_status"] == "confirmed_record_match"]
    status = "reported" if any(x["timing"] == "known_at_detection" for x in related) else "later_reported" if related else "unreported_candidate"
    return {"matches": matches, "reporting_status": status, "semantic_backend": backend}
