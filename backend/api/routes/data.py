"""
Data Routes — Upload CSV, dataset info, preview.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.dataset_service import get_dataset_service
from services.model_service import get_trainer
import pandas as pd

router = APIRouter(prefix="/api", tags=["data"])


@router.post("/upload/heart")
async def upload_heart(file: UploadFile = File(...)):
    """Upload heart disease CSV."""
    content = await file.read()
    svc = get_dataset_service()
    result = svc.upload_csv(content, file.filename, 'heart')
    # Also load into trainer preprocessor
    trainer = get_trainer()
    trainer.preprocessor.heart_data = svc.heart_df
    return result


@router.post("/upload/cancer")
async def upload_cancer(file: UploadFile = File(...)):
    """Upload breast cancer CSV."""
    content = await file.read()
    svc = get_dataset_service()
    result = svc.upload_csv(content, file.filename, 'cancer')
    trainer = get_trainer()
    trainer.preprocessor.cancer_data = svc.cancer_df
    return result


@router.post("/upload/auto")
async def upload_auto(file: UploadFile = File(...)):
    """Upload any biomedical CSV — auto-detect type."""
    content = await file.read()
    svc = get_dataset_service()
    result = svc.upload_csv(content, file.filename, 'auto')
    trainer = get_trainer()
    if result['dataset_type'] == 'heart':
        trainer.preprocessor.heart_data = svc.heart_df
    elif result['dataset_type'] == 'cancer':
        trainer.preprocessor.cancer_data = svc.cancer_df
    return result


@router.get("/datasets/info")
async def datasets_info():
    """Return info about loaded datasets."""
    svc = get_dataset_service()
    return svc.get_info()


@router.get("/datasets/preview")
async def datasets_preview():
    """Return first 10 rows of each dataset."""
    svc = get_dataset_service()
    return svc.get_preview()
