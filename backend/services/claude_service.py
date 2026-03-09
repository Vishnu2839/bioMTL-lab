"""
Claude AI Service — Clinical explanations and hyperparameter suggestions via Anthropic API.
"""
import os
import json
from dotenv import load_dotenv

load_dotenv()

try:
    import anthropic
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    CLAUDE_AVAILABLE = bool(os.getenv("ANTHROPIC_API_KEY"))
except Exception:
    client = None
    CLAUDE_AVAILABLE = False


async def get_clinical_explanation(prediction: dict, features: dict, dataset_type: str, risk_level: str) -> str:
    """Generate a clinical explanation of the prediction using Claude."""
    if not CLAUDE_AVAILABLE or client is None:
        return _fallback_explanation(prediction, features, dataset_type, risk_level)

    feature_str = ", ".join([f"{k}: {v}" for k, v in features.items()])
    top_features_str = ""
    if prediction.get('top_features'):
        top_features_str = ", ".join([f"{f['feature']} ({f['contribution']:.2f})" for f in prediction['top_features'][:5]])

    prompt = f"""You are a clinical AI assistant explaining a machine learning prediction to a physician.

Dataset Type: {dataset_type} prediction
Patient Features: {feature_str}
Model Prediction: {prediction['probability']:.1%} risk probability
Risk Level: {risk_level.upper()}
Top Contributing Features: {top_features_str or 'N/A'}

Write exactly 3 sentences:
1. What the risk level means clinically for this patient profile
2. Which specific patient features contributed most to this prediction and why
3. What clinical action the physician should consider next

Rules:
- Be specific to the actual feature values (mention real numbers)
- Use plain medical language (no ML jargon)
- Be direct and actionable
- Do NOT start with "I" or mention the AI model
- Do NOT add disclaimers about AI limitations"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=250,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as e:
        return _fallback_explanation(prediction, features, dataset_type, risk_level)


async def suggest_hyperparameters(dataset_stats: dict) -> dict:
    """Ask Claude to suggest optimal hyperparameters."""
    if not CLAUDE_AVAILABLE or client is None:
        return _fallback_hyperparams(dataset_stats)

    prompt = f"""You are an ML expert. Given these biomedical dataset statistics, 
suggest optimal hyperparameters for a Multi-Task NMF+Neural Network model.

Dataset Stats:
- Heart disease samples: {dataset_stats.get('heart_n', 0)}
- Breast cancer samples: {dataset_stats.get('cancer_n', 0)}
- Heart features: {dataset_stats.get('heart_features', 13)}
- Cancer features: {dataset_stats.get('cancer_features', 30)}
- Heart class imbalance ratio: {dataset_stats.get('heart_imbalance', 0.5):.2f}
- Cancer class imbalance ratio: {dataset_stats.get('cancer_imbalance', 0.37):.2f}

Respond ONLY with valid JSON, no markdown, no explanation:
{{
  "n_components": <int between 5-20>,
  "shared_ratio": <float 0.4-0.8>,
  "learning_rate": <float>,
  "dropout": <float 0.2-0.5>,
  "lambda_heart": <float 0.3-0.7>,
  "epochs": <int 50-200>,
  "reasoning": "<one sentence explaining key choices>"
}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(message.content[0].text)
    except Exception:
        return _fallback_hyperparams(dataset_stats)


def _fallback_explanation(prediction, features, dataset_type, risk_level):
    """Fallback explanation when Claude API is unavailable."""
    prob = prediction.get('probability', 0.5)
    risk_pct = int(prob * 100)
    
    if dataset_type == 'heart':
        if risk_level == 'high':
            return (
                f"This patient shows a {risk_pct}% probability of heart disease, placing them in the high-risk category requiring immediate clinical attention. "
                f"Key contributing factors include elevated cholesterol, age, and exercise-induced ST depression patterns that collectively suggest significant cardiovascular strain. "
                f"Recommend comprehensive cardiac workup including stress testing, lipid panel, and consideration of preventive pharmacotherapy."
            )
        elif risk_level == 'medium':
            return (
                f"With a {risk_pct}% risk score, this patient falls in the moderate risk range for heart disease, warranting closer monitoring. "
                f"Several risk factors are present at borderline levels, suggesting early intervention could prevent progression. "
                f"Recommend lifestyle modification counseling and follow-up cardiac screening within 3-6 months."
            )
        else:
            return (
                f"This patient's {risk_pct}% risk score indicates low probability of heart disease based on current clinical features. "
                f"Favorable indicators include normal exercise tolerance and absence of significant ECG abnormalities. "
                f"Standard preventive care with annual cardiovascular screening is appropriate."
            )
    else:
        if risk_level == 'high':
            return (
                f"The model predicts a {risk_pct}% probability of malignancy, indicating this breast mass has features highly consistent with cancer. "
                f"Notable factors include increased cell radius, area, and concavity measurements that suggest aggressive cellular morphology. "
                f"Immediate biopsy and oncology referral are strongly recommended."
            )
        elif risk_level == 'medium':
            return (
                f"At {risk_pct}% malignancy probability, this case presents uncertain features that require further investigation. "
                f"Some cellular measurements are elevated but not definitively malignant, suggesting atypical or borderline pathology. "
                f"Recommend core needle biopsy and close imaging follow-up to establish definitive diagnosis."
            )
        else:
            return (
                f"With a {risk_pct}% malignancy probability, features of this mass are consistent with a benign classification. "
                f"Cell morphology measurements including smoothness and symmetry fall within normal ranges. "
                f"Routine follow-up imaging in 6 months is recommended to confirm stability."
            )


def _fallback_hyperparams(dataset_stats):
    """Rule-based hyperparameter suggestion when Claude is unavailable."""
    heart_n = dataset_stats.get('heart_n', 302)
    cancer_n = dataset_stats.get('cancer_n', 569)
    total = heart_n + cancer_n

    n_comp = min(15, max(5, int(total / 60)))
    shared = 0.6
    lr = 0.001 if total > 500 else 0.002
    dropout = 0.3 if total > 400 else 0.2
    lambda_h = round(cancer_n / total, 2)  # Weight smaller dataset more

    return {
        "n_components": n_comp,
        "shared_ratio": shared,
        "learning_rate": lr,
        "dropout": dropout,
        "lambda_heart": lambda_h,
        "epochs": min(150, max(50, total // 5)),
        "reasoning": f"Balanced config for {total} total samples — higher weight on smaller dataset, moderate regularization."
    }
