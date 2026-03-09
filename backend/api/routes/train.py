"""
Train Routes — Start training, status polling, WebSocket streaming.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
import asyncio
import uuid

from services.model_service import get_trainer
from services.dataset_service import get_dataset_service

router = APIRouter(prefix="/api", tags=["train"])

# Track training jobs
_training_jobs = {}


class TrainConfig(BaseModel):
    n_components: int = 10
    shared_ratio: float = 0.6
    lr: float = 0.001
    epochs: int = 100
    dropout: float = 0.3
    lambda_heart: float = 0.5
    lambda_cancer: float = 0.5
    batch_size: int = 32


@router.post("/train")
async def start_training(config: TrainConfig):
    """Start training (runs async). Returns job_id."""
    job_id = str(uuid.uuid4())[:8]
    _training_jobs[job_id] = {"status": "pending", "config": config.model_dump()}
    
    # Ensure datasets are loaded
    svc = get_dataset_service()
    trainer = get_trainer()
    if svc.heart_df is not None:
        trainer.preprocessor.heart_data = svc.heart_df
    if svc.cancer_df is not None:
        trainer.preprocessor.cancer_data = svc.cancer_df
    
    return {"job_id": job_id, "status": "pending"}


@router.get("/train/status/{job_id}")
async def train_status(job_id: str):
    """Poll training status."""
    if job_id not in _training_jobs:
        return {"status": "not_found"}
    
    trainer = get_trainer()
    job = _training_jobs[job_id]
    
    if trainer.trained and trainer.last_results:
        return {
            "status": "complete",
            "results": trainer.last_results,
            "history": trainer.training_history[-5:] if trainer.training_history else [],
        }
    
    return {
        "status": job.get("status", "unknown"),
        "history": trainer.training_history[-5:] if trainer.training_history else [],
    }

