"""
Predict Routes — Single prediction, bulk prediction, auto-detect prediction.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import pandas as pd

from services.model_service import get_trainer
from services.dataset_service import get_dataset_service

router = APIRouter(prefix="/api", tags=["predict"])


class HeartPredictRequest(BaseModel):
    age: float = 55
    sex: float = 1
    cp: float = 0
    trestbps: float = 140
    chol: float = 260
    fbs: float = 0
    restecg: float = 0
    thalach: float = 130
    exang: float = 1
    oldpeak: float = 2.0
    slope: float = 1
    ca: float = 1
    thal: float = 2


class CancerPredictRequest(BaseModel):
    mean_radius: float = 14.0
    mean_texture: float = 19.0
    mean_perimeter: float = 90.0
    mean_area: float = 600.0
    mean_smoothness: float = 0.1
    mean_compactness: float = 0.1
    mean_concavity: float = 0.1
    mean_concave_points: float = 0.05
    mean_symmetry: float = 0.18
    mean_fractal_dimension: float = 0.06
    radius_error: float = 0.4
    texture_error: float = 1.2
    perimeter_error: float = 2.8
    area_error: float = 40.0
    smoothness_error: float = 0.007
    compactness_error: float = 0.025
    concavity_error: float = 0.03
    concave_points_error: float = 0.01
    symmetry_error: float = 0.02
    fractal_dimension_error: float = 0.003
    worst_radius: float = 16.0
    worst_texture: float = 25.0
    worst_perimeter: float = 105.0
    worst_area: float = 800.0
    worst_smoothness: float = 0.13
    worst_compactness: float = 0.21
    worst_concavity: float = 0.22
    worst_concave_points: float = 0.12
    worst_symmetry: float = 0.28
    worst_fractal_dimension: float = 0.08


class BulkPredictRequest(BaseModel):
    dataset_type: str  # "heart" or "cancer"


class AutoPredictRequest(BaseModel):
    data: List[Dict[str, Any]]


@router.post("/predict/heart")
async def predict_heart(req: HeartPredictRequest):
    """Single heart disease prediction."""
    trainer = get_trainer()
    if not trainer.trained:
        raise HTTPException(status_code=400, detail="Model not trained yet. Please train first.")
    
    features = req.model_dump()
    result = trainer.predict_single(features, 'heart')
    return result


@router.post("/predict/cancer")
async def predict_cancer(req: CancerPredictRequest):
    """Single breast cancer prediction."""
    trainer = get_trainer()
    if not trainer.trained:
        raise HTTPException(status_code=400, detail="Model not trained yet. Please train first.")
    
    features = req.model_dump()
    result = trainer.predict_single(features, 'cancer')
    return result


@router.post("/predict/bulk")
async def predict_bulk(req: BulkPredictRequest):
    """Bulk predict entire uploaded dataset."""
    trainer = get_trainer()
    if not trainer.trained:
        raise HTTPException(status_code=400, detail="Model not trained yet. Please train first.")
    
    svc = get_dataset_service()
    df = svc.get_dataframe(req.dataset_type)
    if df is None:
        raise HTTPException(status_code=400, detail=f"No {req.dataset_type} dataset loaded.")
    
    results = trainer.predict_bulk(df, req.dataset_type)
    
    # Compute summary stats
    probs = [r.get('probability', 0.5) for r in results]
    high = sum(1 for p in probs if p > 0.65)
    medium = sum(1 for p in probs if 0.35 <= p <= 0.65)
    low = sum(1 for p in probs if p < 0.35)
    
    return {
        'dataset_type': req.dataset_type,
        'total': len(results),
        'high_risk': high,
        'medium_risk': medium,
        'low_risk': low,
        'avg_risk': round(sum(probs) / len(probs), 4) if probs else 0,
        'predictions': results,
    }


@router.post("/predict/auto")
async def predict_auto(req: AutoPredictRequest):
    """Auto-detect type and predict."""
    from ml.preprocessor import detect_dataset_type
    
    if not req.data:
        raise HTTPException(status_code=400, detail="No data provided.")
    
    columns = list(req.data[0].keys())
    dataset_type = detect_dataset_type(columns)
    
    if dataset_type == 'unknown':
        raise HTTPException(status_code=400, detail="Could not auto-detect dataset type.")
    
    trainer = get_trainer()
    if not trainer.trained:
        raise HTTPException(status_code=400, detail="Model not trained yet.")
    
    df = pd.DataFrame(req.data)
    results = trainer.predict_bulk(df, dataset_type)
    
    return {
        'dataset_type': dataset_type,
        'predictions': results,
    }
