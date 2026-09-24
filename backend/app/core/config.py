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


class OpenAICompatConfig(BaseModel):
    """OpenAI-compatible provider (e.g. BharatCode, Groq, Together, any local OpenAI-API server)."""
    model: str = "gpt-4o"
    base_url: str = "https://api.openai.com/v1"
    # Optional fallback — invoked automatically on 503 / model_unavailable from the primary.
    fallback_model: Optional[str] = None
    fallback_base_url: Optional[str] = None
    fallback_api_key_env: Optional[str] = None  # env var name holding the fallback API key


class AgentConfig(BaseModel):
    provider: str = "openai_compat"   # "openai_compat" or "anthropic"
    max_iterations: int = 15
    anthropic: AnthropicConfig = AnthropicConfig()
    openai_compat: OpenAICompatConfig = OpenAICompatConfig()


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
    # Support both "openai_compat" (new) and legacy "bharatcode" key in config.yaml
    openai_compat_raw = agent_raw.pop("openai_compat", {}) if isinstance(agent_raw, dict) else {}
    if not openai_compat_raw:
        openai_compat_raw = agent_raw.pop("bharatcode", {}) if isinstance(agent_raw, dict) else {}

    # Normalise provider name: treat legacy "bharatcode" value as "openai_compat"
    if isinstance(agent_raw, dict) and agent_raw.get("provider") == "bharatcode":
        agent_raw["provider"] = "openai_compat"

    return Settings(
        database=DatabaseConfig(**db_raw),
        agent=AgentConfig(
            **{k: v for k, v in agent_raw.items() if k not in ("anthropic", "openai_compat", "bharatcode")},
            anthropic=AnthropicConfig(**anthropic_raw),
            openai_compat=OpenAICompatConfig(**openai_compat_raw),
        ),
    )
