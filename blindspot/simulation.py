"""Deterministic, explicitly synthetic vessel histories and sealed event truth."""
from dataclasses import dataclass
import numpy as np
import pandas as pd

SEED = 2704
FEATURES = ["temperature_mean", "temperature_max", "temperature_deviation", "heating_rate", "vibration_rms", "vibration_kurtosis", "vibration_crest_factor", "operating_load"]
COMPONENTS = ("bearing", "gearbox", "pump")

@dataclass
class Simulation:
    telemetry: pd.DataFrame
    logs: pd.DataFrame
    truth: dict[str, dict]

def generate() -> Simulation:
    rng = np.random.default_rng(SEED)
    rows, logs, truth = [], [], {}
    start = pd.Timestamp("2026-01-01T00:00:00Z")
    for vessel in range(1, 19):
        split = "train" if vessel <= 10 else "validation" if vessel <= 14 else "test"
        for component_index, component in enumerate(COMPONENTS):
            equipment_id = f"V{vessel:02d}-{component.upper()}-01"
            # Every split contains reported, unreported, and healthy histories.
            kind = (vessel + component_index) % 3
            failure_at = 140 if kind != 0 else None
            reported = kind == 1
            truth[equipment_id] = {"failure_at": failure_at, "reported": reported, "failure_category": "bearing wear" if component == "bearing" else "gear wear" if component == "gearbox" else "pump cavitation", "split": split}
            equipment_offset = rng.normal(0, 0.8)
            for hour in range(140):
                load = float(np.clip(58 + 19 * np.sin(hour / 11 + vessel) + rng.normal(0, 6), 22, 98))
                baseline = 44 + 3 * component_index + equipment_offset + 0.15 * load
                degradation = max(0, hour - 80) / 60 if failure_at else 0
                spike = 7 if failure_at is None and hour in (105, 106) and vessel % 4 == 0 else 0
                temp = baseline + rng.normal(0, 0.65) + degradation * (5 if reported else 3.6) + spike
                vib = 1.25 + 0.006 * load + rng.normal(0, 0.09) + degradation * (1.8 if reported else 2.1)
                if spike:
                    vib += 0.05
                rows.append({"vessel_id": f"V{vessel:02d}", "equipment_id": equipment_id, "component": component, "split": split, "hour": hour, "timestamp": (start + pd.Timedelta(hours=hour)).isoformat(), "temperature_mean": float(temp), "temperature_max": float(temp + 1.4 + abs(rng.normal(0, 0.35))), "vibration_rms": float(vib), "vibration_kurtosis": float(3 + degradation * 3 + rng.normal(0, 0.25)), "vibration_crest_factor": float(2.6 + degradation * 1.7 + rng.normal(0, 0.17)), "operating_load": load})
            if reported:
                symptoms = f"Increasing {component} noise and heat under load"
                logs.append({"id": f"L-{equipment_id}-FAIL", "vessel_id": f"V{vessel:02d}", "equipment_id": equipment_id, "hour": 128, "timestamp": (start + pd.Timedelta(hours=128)).isoformat(), "description": symptoms, "symptoms": "noise, heat", "suspected_failure_mode": truth[equipment_id]["failure_category"], "confirmed_cause": None, "maintenance_action": "inspection requested", "is_failure_report": True})
                logs.append({"id": f"L-{equipment_id}-CLOSED", "vessel_id": f"V{vessel:02d}", "equipment_id": equipment_id, "hour": 140, "timestamp": (start + pd.Timedelta(hours=140)).isoformat(), "description": f"{component} failure confirmed during repair", "symptoms": "noise, heat", "suspected_failure_mode": truth[equipment_id]["failure_category"], "confirmed_cause": truth[equipment_id]["failure_category"], "maintenance_action": "component replaced; work order closed", "is_failure_report": True})
            if vessel % 2 == 0:
                logs.append({"id": f"L-{equipment_id}-ROUTINE", "vessel_id": f"V{vessel:02d}", "equipment_id": equipment_id, "hour": 65, "timestamp": (start + pd.Timedelta(hours=65)).isoformat(), "description": f"Routine {component} inspection; no defect found", "symptoms": "none", "suspected_failure_mode": None, "confirmed_cause": None, "maintenance_action": "routine inspection", "is_failure_report": False})
    df = pd.DataFrame(rows).sort_values(["equipment_id", "hour"]).reset_index(drop=True)
    # At each hour, fit the equipment baseline from earlier observations only.
    # Calibration freezes after the first 70 healthy hours; no future sample
    # can affect an earlier feature value.
    deviations = np.zeros(len(df), dtype=float)
    for _, history in df.groupby("equipment_id"):
        loads, temperatures = [], []
        for row in history.itertuples():
            if len(loads) >= 12:
                slope, intercept = np.polyfit(loads, temperatures, 1)
                deviations[row.Index] = row.temperature_mean - slope * row.operating_load - intercept
            if row.hour < 70:
                loads.append(row.operating_load)
                temperatures.append(row.temperature_mean)
    df["temperature_deviation"] = deviations
    df["heating_rate"] = df.groupby("equipment_id")["temperature_mean"].diff().fillna(0)
    return Simulation(df, pd.DataFrame(logs), truth)
