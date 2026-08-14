"""
CAIRA Settings — loaded from config.yaml at the backend root.
Pydantic-based for type-safety and nested model support.
"""
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml
from pydantic import BaseModel


# ── Nested config models ───────────────────────────────────────────────────────

class AnthropicConfig(BaseModel):
    model: str = "claude-3-5-sonnet-20240620"


class BharatcodeConfig(BaseModel):
    model: str = "bharatcode:qwen36-35b-q6-256k-vision"
    base_url: str = "https://bharatcode.ai/api/model/v1"


class AgentConfig(BaseModel):
    provider: str = "bharatcode"
    max_iterations: int = 15
    anthropic: AnthropicConfig = AnthropicConfig()
    bharatcode: BharatcodeConfig = BharatcodeConfig()


class DatabaseConfig(BaseModel):
    url: str = "sqlite:///./caira.db"


class Settings(BaseModel):
    database: DatabaseConfig = DatabaseConfig()
    agent: AgentConfig = AgentConfig()


# ── Loader ─────────────────────────────────────────────────────────────────────

def _find_config_yaml() -> Path:
    """Walk up from this file's location to find config.yaml."""
    here = Path(__file__).resolve()
    for parent in [here.parent, here.parent.parent, here.parent.parent.parent]:
        candidate = parent / "config.yaml"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "config.yaml not found. Expected at backend/config.yaml."
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and cache settings from config.yaml."""
    config_path = _find_config_yaml()
    with open(config_path, "r") as f:
        raw = yaml.safe_load(f) or {}

    # Build nested models from raw dict
    db_raw = raw.get("database", {})
    agent_raw = raw.get("agent", {})

    anthropic_raw = agent_raw.pop("anthropic", {}) if isinstance(agent_raw, dict) else {}
    bharatcode_raw = agent_raw.pop("bharatcode", {}) if isinstance(agent_raw, dict) else {}

    return Settings(
        database=DatabaseConfig(**db_raw),
        agent=AgentConfig(
            **{k: v for k, v in agent_raw.items() if k not in ("anthropic", "bharatcode")},
            anthropic=AnthropicConfig(**anthropic_raw),
            bharatcode=BharatcodeConfig(**bharatcode_raw),
        ),
    )
