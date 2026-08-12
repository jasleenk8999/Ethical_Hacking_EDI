import time
import json
import random
from typing import Dict, Any, Tuple

class SimulatedLogLookup:
    """
    Simulated Security Log Lookup Tool
    Searches internal log management / SIEM archives.
    """
    @staticmethod
    def execute(source_ip: str, target_asset: str, alert_type: str) -> Tuple[Dict[str, Any], float]:
        start_time = time.time()
        
        # Deterministic simulation based on alert parameters
        if "Brute Force" in alert_type or "Login" in alert_type:
            result = {
                "event": "failed_auth_cluster",
                "source_ip": source_ip,
                "target_host": target_asset,
                "failed_attempts": 27,
                "time_window": "5 minutes",
                "auth_protocol": "SSH/Kerberos",
                "anomalous_burst": True,
                "log_summary": f"Detected 27 consecutive failed authentication attempts from {source_ip} to {target_asset} within 5 minutes."
            }
            score = 0.82
        elif "Malware" in alert_type or "PowerShell" in alert_type:
            result = {
                "event": "encoded_process_spawn",
                "source_ip": source_ip,
                "target_host": target_asset,
                "process_tree": "powershell.exe -enc aW52b2tlLWV4cHJlc3Npb24...",
                "parent_process": "cmd.exe",
                "anomalous_burst": True,
                "log_summary": f"Suspicious encoded PowerShell command launched under host {target_asset} with parent process cmd.exe."
            }
            score = 0.88
        elif "DNS" in alert_type or "Exfiltration" in alert_type:
            result = {
                "event": "dns_tunneling_burst",
                "source_ip": source_ip,
                "target_host": target_asset,
                "queries_per_min": 450,
                "high_entropy_domains": True,
                "log_summary": f"High volume of random subdomain TXT queries (450/min) matching known DNS tunneling indicators."
            }
            score = 0.90
        elif "Benign" in alert_type or "Anomaly" in alert_type:
            result = {
                "event": "scheduled_maintenance_sync",
                "source_ip": source_ip,
                "target_host": target_asset,
                "failed_attempts": 1,
                "time_window": "1 hour",
                "auth_protocol": "HTTPS",
                "anomalous_burst": False,
                "log_summary": f"Routine automated service account sync. 1 transient network timeout logged."
            }
            score = 0.15
        else:
            result = {
                "event": "port_scan_detected",
                "source_ip": source_ip,
                "target_host": target_asset,
                "ports_probed": [22, 80, 443, 3389, 8080],
                "time_window": "2 minutes",
                "log_summary": f"Probing of 5 critical network ports recorded from IP {source_ip}."
            }
            score = 0.65

        exec_time = round((time.time() - start_time) * 1000 + random.uniform(15, 45), 2)
        return result, score

class SimulatedThreatIntel:
    """
    Simulated Threat Intelligence Lookup Tool
    Checks external threat feeds, malware databases, and IP reputation lists.
    """
    @staticmethod
    def execute(source_ip: str) -> Tuple[Dict[str, Any], float]:
        start_time = time.time()
        
        # Deterministic threat score mapping based on IP address patterns
        ip_last_octet = int(source_ip.split(".")[-1]) if source_ip and source_ip.replace(".", "").isdigit() else 45
        
        if ip_last_octet in [45, 99, 110, 200]:
            reputation = "Malicious"
            threat_score = 92
            campaign = "Credential Stuffing & APT-41 Recon"
            score = 0.95
        elif ip_last_octet in [12, 33, 77]:
            reputation = "Suspicious"
            threat_score = 64
            campaign = "Known Tor Exit Node / Residential Proxy"
            score = 0.65
        elif ip_last_octet in [5, 10, 15]:
            reputation = "Clean"
            threat_score = 5
            campaign = "Verified Internal Corporate Subnet"
            score = 0.05
        else:
            reputation = "High Risk"
            threat_score = 88
            campaign = "Automated Botnet Probe Net"
            score = 0.88

        result = {
            "query_ip": source_ip,
            "reputation": reputation,
            "threat_score": threat_score,
            "known_campaign": campaign,
            "source_feed": "Simulated ThreatIntel Global Database v4.2",
            "first_seen": "2026-06-12T04:00:00Z",
            "reports_count": 142 if reputation != "Clean" else 0
        }

        exec_time = round((time.time() - start_time) * 1000 + random.uniform(20, 60), 2)
        return result, score

class SimulatedAssetCriticality:
    """
    Simulated Asset Criticality & CMDB Lookup Tool
    Retrieves asset ownership, data sensitivity, and business risk posture.
    """
    @staticmethod
    def execute(target_asset: str) -> Tuple[Dict[str, Any], float]:
        start_time = time.time()
        
        asset_upper = target_asset.upper()
        if "FIN" in asset_upper or "PAY" in asset_upper:
            dept = "Finance & Billing"
            criticality = "Critical"
            impact = "Very High (PCI-DSS & Financial Data)"
            classification = "Confidential / Restricted"
            score = 0.90
        elif "SEC" in asset_upper or "DC" in asset_upper or "AUTH" in asset_upper:
            dept = "Identity & Security Infra"
            criticality = "Critical"
            impact = "Catastrophic (Domain Administrative Access)"
            classification = "Strictly Confidential"
            score = 0.98
        elif "WORKSTATION" in asset_upper or "LAPTOP" in asset_upper:
            dept = "Sales / Operations"
            criticality = "Medium"
            impact = "Moderate (Individual End-user Endpoint)"
            classification = "Internal"
            score = 0.45
        else:
            dept = "Engineering & Staging"
            criticality = "High"
            impact = "High (Production Web & API Infrastructure)"
            classification = "Confidential"
            score = 0.75

        result = {
            "target_asset": target_asset,
            "department": dept,
            "criticality_level": criticality,
            "business_impact": impact,
            "data_classification": classification,
            "asset_owner": "SecOps Infra Lead",
            "cmdb_verified": True
        }

        exec_time = round((time.time() - start_time) * 1000 + random.uniform(10, 30), 2)
        return result, score
