"""
Action and verdict resolution logic based on evidence-gated confidence thresholds.
"""

def resolve_action(confidence: float) -> str:
    """
    Resolves the automated action based on confidence thresholds:
    >= 0.75: isolate_host
    0.40 - 0.75: escalate
    < 0.40: none
    """
    if confidence >= 0.75:
        return "isolate_host"
    elif confidence >= 0.40:
        return "escalate"
    else:
        return "none"


def resolve_verdict(confidence: float) -> str:
    """
    Resolves the verdict classification based on confidence thresholds:
    >= 0.75: malicious
    0.40 - 0.75: uncertain
    < 0.40: benign
    """
    if confidence >= 0.75:
        return "malicious"
    elif confidence >= 0.40:
        return "uncertain"
    else:
        return "benign"
