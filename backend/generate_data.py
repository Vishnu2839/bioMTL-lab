"""
Data generation script — creates heart_disease.csv and breast_cancer.csv
using sklearn built-in datasets and standard Cleveland heart disease format.
"""
import pandas as pd
import numpy as np
from sklearn.datasets import load_breast_cancer

def generate_heart_disease_csv(path="data/heart_disease.csv"):
    """Generate Cleveland Heart Disease dataset (302 rows, 14 columns)."""
    np.random.seed(42)
    n = 302
    
    age = np.random.randint(29, 78, n)
    sex = np.random.choice([0, 1], n, p=[0.32, 0.68])
    cp = np.random.choice([0, 1, 2, 3], n, p=[0.47, 0.17, 0.28, 0.08])
    trestbps = np.random.normal(131, 17, n).clip(94, 200).astype(int)
    chol = np.random.normal(246, 52, n).clip(126, 564).astype(int)
    fbs = np.random.choice([0, 1], n, p=[0.85, 0.15])
    restecg = np.random.choice([0, 1, 2], n, p=[0.49, 0.49, 0.02])
    thalach = np.random.normal(149, 23, n).clip(71, 202).astype(int)
    exang = np.random.choice([0, 1], n, p=[0.67, 0.33])
    oldpeak = np.abs(np.random.normal(1.04, 1.16, n)).round(1).clip(0, 6.2)
    slope = np.random.choice([0, 1, 2], n, p=[0.47, 0.46, 0.07])
    ca = np.random.choice([0, 1, 2, 3, 4], n, p=[0.58, 0.22, 0.13, 0.05, 0.02])
    thal = np.random.choice([0, 1, 2, 3], n, p=[0.02, 0.06, 0.54, 0.38])
    
    # Generate target with realistic correlations
    risk_score = (
        0.03 * (age - 40) +
        0.3 * sex +
        0.4 * (cp == 0).astype(float) +
        0.01 * (trestbps - 120) +
        0.005 * (chol - 200) +
        0.3 * fbs +
        -0.01 * (thalach - 150) +
        0.5 * exang +
        0.3 * oldpeak +
        -0.2 * (slope == 0).astype(float) +
        0.4 * ca +
        0.3 * (thal == 3).astype(float)
    )
    prob = 1 / (1 + np.exp(-risk_score + 1.5))
    target = (np.random.random(n) < prob).astype(int)
    
    df = pd.DataFrame({
        'age': age, 'sex': sex, 'cp': cp, 'trestbps': trestbps,
        'chol': chol, 'fbs': fbs, 'restecg': restecg, 'thalach': thalach,
        'exang': exang, 'oldpeak': oldpeak, 'slope': slope,
        'ca': ca, 'thal': thal, 'target': target
    })
    df.to_csv(path, index=False)
    print(f"Heart disease CSV: {len(df)} rows, target balance: {df['target'].mean():.2%}")
    return df

def generate_breast_cancer_csv(path="data/breast_cancer.csv"):
    """Generate Wisconsin Breast Cancer dataset (569 rows, 31 columns)."""
    data = load_breast_cancer()
    df = pd.DataFrame(data.data, columns=[
        'mean_radius', 'mean_texture', 'mean_perimeter', 'mean_area',
        'mean_smoothness', 'mean_compactness', 'mean_concavity',
        'mean_concave_points', 'mean_symmetry', 'mean_fractal_dimension',
        'radius_error', 'texture_error', 'perimeter_error', 'area_error',
        'smoothness_error', 'compactness_error', 'concavity_error',
        'concave_points_error', 'symmetry_error', 'fractal_dimension_error',
        'worst_radius', 'worst_texture', 'worst_perimeter', 'worst_area',
        'worst_smoothness', 'worst_compactness', 'worst_concavity',
        'worst_concave_points', 'worst_symmetry', 'worst_fractal_dimension'
    ])
    # Invert target so 1 = malignant (positive class)
    df['target'] = 1 - data.target
    df.to_csv(path, index=False)
    print(f"Breast cancer CSV: {len(df)} rows, target balance: {df['target'].mean():.2%}")
    return df

if __name__ == "__main__":
    import os
    os.makedirs("data", exist_ok=True)
    generate_heart_disease_csv()
    generate_breast_cancer_csv()
