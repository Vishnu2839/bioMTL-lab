"""
Claude AI Routes — Clinical explanations and hyperparameter suggestions.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional

from services.claude_service import get_clinical_explanation, suggest_hyperparameters
from services.dataset_service import get_dataset_service

router = APIRouter(prefix="/api", tags=["claude"])


class ExplainRequest(BaseModel):
    prediction: Dict[str, Any]
    features: Dict[str, Any]
    dataset_type: str
    risk_level: str


class SuggestParamsRequest(BaseModel):
    heart_n: Optional[int] = 302
    cancer_n: Optional[int] = 569
    heart_features: Optional[int] = 13
    cancer_features: Optional[int] = 30
    heart_imbalance: Optional[float] = 0.5
    cancer_imbalance: Optional[float] = 0.37


@router.post("/explain")
async def explain(req: ExplainRequest):
    """Claude generates a clinical explanation of the prediction."""
    explanation = await get_clinical_explanation(
        prediction=req.prediction,
        features=req.features,
        dataset_type=req.dataset_type,
        risk_level=req.risk_level,
    )
    return {"explanation": explanation}


@router.post("/suggest-params")
async def suggest_params(req: SuggestParamsRequest = None):
    """Claude suggests optimal hyperparameters."""
    if req is None:
        # Use current dataset stats
        svc = get_dataset_service()
        info = svc.get_info()
        stats = {
            'heart_n': info.get('heart', {}).get('rows', 302),
            'cancer_n': info.get('cancer', {}).get('rows', 569),
            'heart_features': 13,
            'cancer_features': 30,
            'heart_imbalance': info.get('heart', {}).get('balance', 0.5),
            'cancer_imbalance': info.get('cancer', {}).get('balance', 0.37),
        }
    else:
        stats = req.model_dump()
    
    result = await suggest_hyperparameters(stats)
    return result
