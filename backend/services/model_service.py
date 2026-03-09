"""
Model Service — Global model/trainer singleton for the application.
"""
from ml.trainer import BioMTLTrainer

# Global trainer instance
_trainer = None


def get_trainer() -> BioMTLTrainer:
    """Get or create the global trainer singleton."""
    global _trainer
    if _trainer is None:
        _trainer = BioMTLTrainer()
    return _trainer


def reset_trainer():
    """Reset the trainer (e.g., when re-uploading data)."""
    global _trainer
    _trainer = BioMTLTrainer()
    return _trainer
