import uuid
from datetime import datetime
from typing import Dict, Any

def normalize_alert(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalizes heterogeneous alert formats into a standard schema.
    """
    alert_id = payload.get("alert_id") or payload.get("id") or f"ALT-{uuid.uuid4().hex[:6].upper()}"
    alert_type = payload.get("alert_type") or payload.get("type") or payload.get("event") or "Security Anomaly"
    severity = (payload.get("severity") or payload.get("priority") or "MEDIUM").upper()
    if severity not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        severity = "MEDIUM"

    source_ip = payload.get("source_ip") or payload.get("src_ip") or payload.get("ip") or "192.168.1.100"
    destination_ip = payload.get("destination_ip") or payload.get("dest_ip") or payload.get("target_ip") or "10.0.0.1"
    target_asset = payload.get("target_asset") or payload.get("host") or payload.get("hostname") or "WORKSTATION-01"
    user = payload.get("user") or payload.get("username") or payload.get("account") or "system"
    description = payload.get("description") or payload.get("summary") or f"{alert_type} detected on {target_asset}"
    timestamp = payload.get("timestamp") or datetime.utcnow().isoformat()

    return {
        "alert_id": alert_id,
        "type": alert_type,
        "severity": severity,
        "source_ip": source_ip,
        "destination_ip": destination_ip,
        "target_asset": target_asset,
        "user": user,
        "description": description,
        "timestamp": timestamp,
        "raw_payload": str(payload)
    }
