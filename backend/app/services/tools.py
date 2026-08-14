import json
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.domain import LogEntry, ThreatIntelRecord, AssetRecord
from app.schemas.schemas import EvidenceItem


def log_lookup(db: Session, user: str) -> EvidenceItem:
    """
    Real SQLite-backed log lookup. Queries LogEntry for the given user.
    trust_tier = "corroborated", raw_strength derived from whether suspicious events were found.
    """
    entries = db.query(LogEntry).filter(LogEntry.user == user).all()
    if not entries:
        return EvidenceItem(
            source_tool="log_lookup",
            trust_tier="corroborated",
            content={"user": user, "note": "no record found"},
            raw_strength=0.0,
        )

    suspicious_keywords = ["failed_auth", "brute_force", "malware", "powershell", "exfiltration", "dns_tunnel"]
    suspicious = [e for e in entries if any(k in e.event.lower() for k in suspicious_keywords)]
    benign = [e for e in entries if e not in suspicious]

    if suspicious:
        raw_strength = min(1.0, 0.5 + 0.1 * len(suspicious))
        content = {
            "user": user,
            "suspicious_events": [e.event for e in suspicious],
            "benign_events": [e.event for e in benign],
            "note": "suspicious activity found in logs",
        }
    else:
        raw_strength = 0.1
        content = {
            "user": user,
            "suspicious_events": [],
            "benign_events": [e.event for e in benign],
            "note": "no suspicious activity found in logs",
        }

    return EvidenceItem(
        source_tool="log_lookup",
        trust_tier="corroborated",
        content=content,
        raw_strength=raw_strength,
    )


def threat_intel_lookup(db: Session, ip: str) -> EvidenceItem:
    """
    Real SQLite-backed threat intel lookup. Queries ThreatIntelRecord for the given ip.
    trust_tier = "verified", raw_strength = the stored confidence value.
    """
    record = db.query(ThreatIntelRecord).filter(ThreatIntelRecord.ip == ip).first()
    if not record:
        return EvidenceItem(
            source_tool="threat_intel_lookup",
            trust_tier="verified",
            content={"ip": ip, "note": "no record found"},
            raw_strength=0.0,
        )

    return EvidenceItem(
        source_tool="threat_intel_lookup",
        trust_tier="verified",
        content={
            "ip": ip,
            "malicious": record.malicious,
            "confidence": record.confidence,
        },
        raw_strength=record.confidence,
    )


def asset_criticality_lookup(db: Session, user_or_asset: str) -> EvidenceItem:
    """
    Real SQLite-backed asset criticality lookup. Queries AssetRecord.
    trust_tier = "untrusted", raw_strength = the stored criticality value.
    """
    record = db.query(AssetRecord).filter(AssetRecord.user_or_asset == user_or_asset).first()
    if not record:
        return EvidenceItem(
            source_tool="asset_criticality_lookup",
            trust_tier="untrusted",
            content={"user_or_asset": user_or_asset, "note": "no record found"},
            raw_strength=0.0,
        )

    return EvidenceItem(
        source_tool="asset_criticality_lookup",
        trust_tier="untrusted",
        content={
            "user_or_asset": user_or_asset,
            "role": record.role,
            "criticality": record.criticality,
        },
        raw_strength=record.criticality,
    )