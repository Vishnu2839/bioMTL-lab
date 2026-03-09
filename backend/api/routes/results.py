"""
Results Routes — Evaluation results, model comparison, factorization data.
"""
from fastapi import APIRouter, HTTPException
from services.model_service import get_trainer

router = APIRouter(prefix="/api", tags=["results"])


@router.get("/results")
async def get_results():
    """Full evaluation results + baseline comparison."""
    trainer = get_trainer()
    if not trainer.trained or not trainer.last_results:
        raise HTTPException(status_code=400, detail="No results available. Train the model first.")
    return trainer.last_results


@router.get("/results/comparison")
async def get_comparison():
    """4-model comparison table data."""
    trainer = get_trainer()
    if not trainer.trained:
        raise HTTPException(status_code=400, detail="No results available. Train the model first.")
    
    comparison = trainer.comparison_results or {}
    
    # Build the comparison table rows
    models = []
    
    # BioMTL (our model)
    if trainer.last_results:
        biomtl = {"model": "BioMTL + Factorization", "highlight": True}
        if 'heart' in trainer.last_results:
            biomtl['heart_auc'] = trainer.last_results['heart']['auc']
            biomtl['heart_f1'] = trainer.last_results['heart']['f1']
            biomtl['heart_acc'] = trainer.last_results['heart']['accuracy']
        if 'cancer' in trainer.last_results:
            biomtl['cancer_auc'] = trainer.last_results['cancer']['auc']
            biomtl['cancer_f1'] = trainer.last_results['cancer']['f1']
            biomtl['cancer_acc'] = trainer.last_results['cancer']['accuracy']
        models.append(biomtl)
    
    # Vanilla MTL
    if 'vanilla_mtl' in comparison:
        v = comparison['vanilla_mtl']
        models.append({
            "model": "MTL No Factorization",
            "heart_auc": v.get('heart_auc'),
            "cancer_auc": v.get('cancer_auc'),
            "heart_f1": v.get('heart_f1'),
            "cancer_f1": v.get('cancer_f1'),
            "heart_acc": v.get('heart_acc'),
            "cancer_acc": v.get('cancer_acc'),
        })
    
    # Single-task baselines
    for key in ['lr_heart', 'rf_heart', 'lr_cancer', 'rf_cancer']:
        if key in comparison:
            b = comparison[key]
            row = {"model": b['model']}
            if 'heart' in key:
                row['heart_auc'] = b.get('auc')
                row['heart_f1'] = b.get('f1')
                row['heart_acc'] = b.get('accuracy')
            else:
                row['cancer_auc'] = b.get('auc')
                row['cancer_f1'] = b.get('f1')
                row['cancer_acc'] = b.get('accuracy')
            models.append(row)
    
    return {"models": models}


@router.get("/factorization")
async def get_factorization():
    """NMF W and H matrices for visualization."""
    trainer = get_trainer()
    if not trainer.trained or trainer.factorizer is None:
        raise HTTPException(status_code=400, detail="No factorization data available. Train the model first.")
    
    info = trainer.factorizer.get_factor_info()
    return info
