import json
from sqlalchemy.orm import Session
from app.models.domain import Alert, Scenario, AuditTrail
from app.services.audit_engine import GENESIS_HASH
from app.services.investigation import run_investigation_pipeline
from app.services.evaluator import PREDEFINED_SCENARIOS, run_evaluation_harness

SAMPLE_ALERTS = [
    {
        "alert_id": "ALT-001",
        "type": "Brute Force Attack",
        "severity": "HIGH",
        "source_ip": "192.168.10.45",
        "destination_ip": "10.0.1.5",
        "target_asset": "FIN-SERVER-01",
        "user": "admin",
        "description": "Multiple failed SSH authentication attempts detected within 5-minute window.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"attempts": 27, "protocol": "SSH", "port": 22})
    },
    {
        "alert_id": "ALT-002",
        "type": "Phishing Attempt",
        "severity": "MEDIUM",
        "source_ip": "192.168.10.99",
        "destination_ip": "10.0.2.14",
        "target_asset": "WORKSTATION-08",
        "user": "j.smith",
        "description": "Inbound email containing spoofed domain login link flagged by mail gateway.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"sender": "billing@paypa1-verify.com", "attachment": "invoice.pdf.exe"})
    },
    {
        "alert_id": "ALT-003",
        "type": "Suspicious PowerShell Execution",
        "severity": "HIGH",
        "source_ip": "192.168.10.15",
        "destination_ip": "10.0.0.1",
        "target_asset": "SEC-AUTH-DC01",
        "user": "sysadmin_svc",
        "description": "Base64 encoded PowerShell script executed with elevated privileges.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"command": "powershell.exe -enc aW52b2tlLWV4cHJlc3Npb24..."})
    },
    {
        "alert_id": "ALT-004",
        "type": "Malware Detection",
        "severity": "CRITICAL",
        "source_ip": "192.168.10.45",
        "destination_ip": "10.0.1.10",
        "target_asset": "FIN-DB-MAIN",
        "user": "system",
        "description": "EDR agent detected Cobalt Strike beacon pattern in host memory.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"signature": "Win32/CobaltStrike.Gen", "process_id": 4812})
    },
    {
        "alert_id": "ALT-005",
        "type": "Data Exfiltration",
        "severity": "CRITICAL",
        "source_ip": "192.168.10.33",
        "destination_ip": "198.51.100.42",
        "target_asset": "PAYMENT-GW-01",
        "user": "db_admin",
        "description": "Unusual outbound HTTPS transfer volume exceeding 4.2 GB to external IP.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"bytes_sent": 4509715200, "protocol": "HTTPS"})
    },
    {
        "alert_id": "ALT-006",
        "type": "Port Scanning",
        "severity": "LOW",
        "source_ip": "10.0.4.12",
        "destination_ip": "10.0.4.254",
        "target_asset": "APP-ROUTER-01",
        "user": "net_mon",
        "description": "Sequential SYN probing recorded across ports 21, 22, 80, 443, 3389.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"ports_probed": [21, 22, 80, 443, 3389]})
    },
    {
        "alert_id": "ALT-007",
        "type": "Credential Stuffing",
        "severity": "HIGH",
        "source_ip": "192.168.10.200",
        "destination_ip": "10.0.1.20",
        "target_asset": "API-GATEWAY-PROD",
        "user": "multiple",
        "description": "High rate of login validation failures across 150 distinct user accounts.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"unique_users": 150, "failure_rate": "98%"})
    },
    {
        "alert_id": "ALT-008",
        "type": "Insider Threat",
        "severity": "MEDIUM",
        "source_ip": "192.168.10.77",
        "destination_ip": "10.0.3.50",
        "target_asset": "HR-VAULT-01",
        "user": "m.corporate",
        "description": "Off-hours access attempt to restricted executive compensation directory.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"access_time": "03:14:22 UTC", "resource": "/HR/Salaries/2026.xlsx"})
    },
    {
        "alert_id": "ALT-009",
        "type": "Benign Login Anomaly",
        "severity": "LOW",
        "source_ip": "192.168.10.5",
        "destination_ip": "10.0.0.12",
        "target_asset": "DEV-DESKTOP-12",
        "user": "developer_1",
        "description": "User logged in after 3 weeks of inactive remote holiday status.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"status": "verified_mfa_success"})
    },
    {
        "alert_id": "ALT-010",
        "type": "Suspicious DNS Activity",
        "severity": "MEDIUM",
        "source_ip": "192.168.10.110",
        "destination_ip": "8.8.8.8",
        "target_asset": "CORP-LAPTOP-44",
        "user": "sales_exec",
        "description": "High entropy TXT domain queries associated with potential C2 communication.",
        "status": "INGESTED",
        "raw_payload": json.dumps({"queries": 450, "high_entropy": True})
    }
]

def seed_database(db: Session):
    """
    Seeds initial realistic SOC alerts, scenarios, runs sample investigations,
    and populates evaluation metrics so the system works immediately.
    """
    # 1. Seed alerts if table empty
    if db.query(Alert).count() == 0:
        for alert_data in SAMPLE_ALERTS:
            alert = Alert(**alert_data)
            db.add(alert)
        db.commit()

    # 2. Seed scenarios if table empty
    if db.query(Scenario).count() == 0:
        for s_data in PREDEFINED_SCENARIOS:
            sc = Scenario(**s_data)
            db.add(sc)
        db.commit()

    # 3. Investigate the first 5 alerts so initial dashboard statistics are rich
    alerts_to_investigate = db.query(Alert).limit(5).all()
    for a in alerts_to_investigate:
        if a.status == "INGESTED":
            try:
                run_investigation_pipeline(db, a.alert_id)
            except Exception as e:
                print(f"Error seeding investigation for {a.alert_id}: {e}")

    # 4. Run evaluation harness for CAIRA and Baseline Agent
    try:
        run_evaluation_harness(db, agent_type="CAIRA-v1.0")
        run_evaluation_harness(db, agent_type="Baseline-Mock")
    except Exception as e:
        print(f"Error seeding evaluation harness: {e}")

    print("Database seeding completed successfully.")
