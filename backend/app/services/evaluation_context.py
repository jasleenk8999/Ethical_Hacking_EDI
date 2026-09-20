"""
Evaluation Context Management

Provides context for marking evaluation-generated records as distinct from operational data.
Each evaluation run gets a unique, stable identifier.
"""

import uuid
from datetime import datetime, timezone
from contextlib import contextmanager
from typing import Optional


class EvaluationContext:
    """Thread-local context for tracking current evaluation run."""
    
    _current_run_id: Optional[str] = None
    
    @classmethod
    def start_run(cls) -> str:
        """
        Starts a new evaluation run and returns its unique ID.
        
        Format: EVAL-YYYYMMDD-XXXXXXXX (timestamp + random suffix)
        
        Returns:
            Unique evaluation run ID
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        suffix = str(uuid.uuid4())[:8].upper()
        run_id = f"EVAL-{timestamp}-{suffix}"
        cls._current_run_id = run_id
        return run_id
    
    @classmethod
    def get_current_run_id(cls) -> Optional[str]:
        """Returns the current evaluation run ID, or None if not in evaluation context."""
        return cls._current_run_id
    
    @classmethod
    def is_in_evaluation(cls) -> bool:
        """Returns True if currently in an evaluation run context."""
        return cls._current_run_id is not None
    
    @classmethod
    def end_run(cls) -> None:
        """Ends the current evaluation run."""
        cls._current_run_id = None


@contextmanager
def evaluation_run():
    """
    Context manager for evaluation runs.
    
    Usage:
        with evaluation_run() as run_id:
            # All records created inside this block are marked as evaluation
            run_investigation_pipeline(db, alert_id)
            # run_id is the evaluation run identifier
    
    Yields:
        The unique evaluation run ID
    """
    run_id = EvaluationContext.start_run()
    try:
        yield run_id
    finally:
        EvaluationContext.end_run()
