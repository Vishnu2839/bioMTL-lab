"""
BioPreprocessor — Data loading, cleaning, normalization, SMOTE, and auto-detection.
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
import os

HEART_COLUMNS = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
                 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']
CANCER_COLUMNS = ['mean_radius', 'mean_texture', 'mean_perimeter', 'mean_area',
                  'mean_smoothness', 'mean_compactness', 'mean_concavity',
                  'mean_concave_points', 'mean_symmetry', 'mean_fractal_dimension',
                  'radius_error', 'texture_error', 'perimeter_error', 'area_error',
                  'smoothness_error', 'compactness_error', 'concavity_error',
                  'concave_points_error', 'symmetry_error', 'fractal_dimension_error',
                  'worst_radius', 'worst_texture', 'worst_perimeter', 'worst_area',
                  'worst_smoothness', 'worst_compactness', 'worst_concavity',
                  'worst_concave_points', 'worst_symmetry', 'worst_fractal_dimension']

# Column mapping for variant CSV formats
COLUMN_ALIASES = {
    'age_years': 'age', 'blood_pressure': 'trestbps', 'resting_bp': 'trestbps',
    'cholesterol': 'chol', 'max_heart_rate': 'thalach', 'max_hr': 'thalach',
    'chest_pain': 'cp', 'chest_pain_type': 'cp', 'fasting_blood_sugar': 'fbs',
    'resting_ecg': 'restecg', 'exercise_angina': 'exang',
    'st_depression': 'oldpeak', 'st_slope': 'slope', 'vessels': 'ca',
    'thalassemia': 'thal',
    'radius_mean': 'mean_radius', 'texture_mean': 'mean_texture',
    'perimeter_mean': 'mean_perimeter', 'area_mean': 'mean_area',
    'smoothness_mean': 'mean_smoothness', 'compactness_mean': 'mean_compactness',
    'concavity_mean': 'mean_concavity', 'concave_points_mean': 'mean_concave_points',
    'symmetry_mean': 'mean_symmetry', 'fractal_dimension_mean': 'mean_fractal_dimension',
    'radius_worst': 'worst_radius', 'texture_worst': 'worst_texture',
    'perimeter_worst': 'worst_perimeter', 'area_worst': 'worst_area',
    'smoothness_worst': 'worst_smoothness', 'compactness_worst': 'worst_compactness',
    'concavity_worst': 'worst_concavity', 'concave_points_worst': 'worst_concave_points',
    'symmetry_worst': 'worst_symmetry', 'fractal_dimension_worst': 'worst_fractal_dimension',
}


def detect_dataset_type(columns: list) -> str:
    """Auto-detect if CSV is heart or cancer dataset by column names."""
    cols_lower = [c.lower().strip() for c in columns]
    # Apply aliases
    mapped = []
    for c in cols_lower:
        mapped.append(COLUMN_ALIASES.get(c, c))

    heart_score = sum(1 for h in HEART_COLUMNS if h in mapped)
    cancer_score = sum(1 for c in CANCER_COLUMNS if c in mapped)

    if heart_score >= 4:
        return 'heart'
    if cancer_score >= 3:
        return 'cancer'
    # Fallback heuristics
    col_str = ' '.join(cols_lower)
    if 'radius' in col_str or 'texture' in col_str:
        return 'cancer'
    if 'chol' in col_str or 'thalach' in col_str:
        return 'heart'
    return 'unknown'


def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Map variant column names to standard names."""
    rename_map = {}
    for col in df.columns:
        key = col.lower().strip()
        if key in COLUMN_ALIASES:
            rename_map[col] = COLUMN_ALIASES[key]
    if rename_map:
        df = df.rename(columns=rename_map)
    return df


class BioPreprocessor:
    """Full preprocessing pipeline for biomedical datasets."""

    def __init__(self, data_dir=None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.data_dir = data_dir
        self.heart_scaler = MinMaxScaler()
        self.cancer_scaler = MinMaxScaler()
        self.heart_data = None
        self.cancer_data = None
        self.heart_features = HEART_COLUMNS.copy()
        self.cancer_features = CANCER_COLUMNS.copy()
        self.fitted = False

    def load_default_datasets(self):
        """Load the built-in heart and cancer CSV files."""
        heart_path = os.path.join(self.data_dir, 'heart_disease.csv')
        cancer_path = os.path.join(self.data_dir, 'breast_cancer.csv')
        
        if os.path.exists(heart_path):
            self.heart_data = pd.read_csv(heart_path)
        if os.path.exists(cancer_path):
            self.cancer_data = pd.read_csv(cancer_path)
        
        return {
            'heart_loaded': self.heart_data is not None,
            'cancer_loaded': self.cancer_data is not None,
            'heart_rows': len(self.heart_data) if self.heart_data is not None else 0,
            'cancer_rows': len(self.cancer_data) if self.cancer_data is not None else 0,
        }

    def load_csv(self, df: pd.DataFrame, dataset_type: str = None):
        """Load a CSV dataframe, auto-detect type if not specified."""
        df = map_columns(df.copy())
        
        if dataset_type is None:
            dataset_type = detect_dataset_type(list(df.columns))
        
        if dataset_type == 'heart':
            self.heart_data = df
        elif dataset_type == 'cancer':
            self.cancer_data = df
        
        return dataset_type

    def _clean_dataset(self, df: pd.DataFrame, feature_cols: list) -> pd.DataFrame:
        """Handle missing values: median for numerical, mode for categorical."""
        df = df.copy()
        available = [c for c in feature_cols if c in df.columns]
        
        for col in available:
            if df[col].dtype in ['float64', 'float32', 'int64', 'int32']:
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna(df[col].mode().iloc[0] if len(df[col].mode()) > 0 else 0)
        
        # Ensure target is binary
        if 'target' in df.columns:
            df['target'] = df['target'].astype(int).clip(0, 1)
        
        return df

    def preprocess(self, apply_smote=True, test_size=0.2, random_state=42):
        """Full preprocessing: clean → scale → SMOTE → split → pad."""
        results = {}

        if self.heart_data is not None:
            hdf = self._clean_dataset(self.heart_data, HEART_COLUMNS)
            h_features = [c for c in HEART_COLUMNS if c in hdf.columns]
            X_heart = hdf[h_features].values.astype(np.float32)
            y_heart = hdf['target'].values.astype(np.float32) if 'target' in hdf.columns else np.zeros(len(hdf), dtype=np.float32)
            
            X_heart = self.heart_scaler.fit_transform(X_heart)
            
            X_h_train, X_h_test, y_h_train, y_h_test = train_test_split(
                X_heart, y_heart, test_size=test_size, random_state=random_state, stratify=y_heart
            )
            
            if apply_smote and len(np.unique(y_h_train)) > 1:
                try:
                    sm = SMOTE(random_state=random_state, k_neighbors=min(5, min(np.bincount(y_h_train.astype(int))) - 1))
                    X_h_train, y_h_train = sm.fit_resample(X_h_train, y_h_train)
                except Exception:
                    pass  # Skip SMOTE if not enough samples
            
            results['heart'] = {
                'X_train': X_h_train.astype(np.float32),
                'X_test': X_h_test.astype(np.float32),
                'y_train': y_h_train.astype(np.float32),
                'y_test': y_h_test.astype(np.float32),
                'feature_names': h_features,
                'n_features': len(h_features),
            }

        if self.cancer_data is not None:
            cdf = self._clean_dataset(self.cancer_data, CANCER_COLUMNS)
            c_features = [c for c in CANCER_COLUMNS if c in cdf.columns]
            X_cancer = cdf[c_features].values.astype(np.float32)
            y_cancer = cdf['target'].values.astype(np.float32) if 'target' in cdf.columns else np.zeros(len(cdf), dtype=np.float32)
            
            X_cancer = self.cancer_scaler.fit_transform(X_cancer)
            
            X_c_train, X_c_test, y_c_train, y_c_test = train_test_split(
                X_cancer, y_cancer, test_size=test_size, random_state=random_state, stratify=y_cancer
            )
            
            if apply_smote and len(np.unique(y_c_train)) > 1:
                try:
                    sm = SMOTE(random_state=random_state, k_neighbors=min(5, min(np.bincount(y_c_train.astype(int))) - 1))
                    X_c_train, y_c_train = sm.fit_resample(X_c_train, y_c_train)
                except Exception:
                    pass
            
            results['cancer'] = {
                'X_train': X_c_train.astype(np.float32),
                'X_test': X_c_test.astype(np.float32),
                'y_train': y_c_train.astype(np.float32),
                'y_test': y_c_test.astype(np.float32),
                'feature_names': c_features,
                'n_features': len(c_features),
            }

        self.fitted = True
        return results

    def transform_single(self, features: dict, dataset_type: str) -> np.ndarray:
        """Transform a single patient record for prediction."""
        if dataset_type == 'heart':
            cols = [c for c in HEART_COLUMNS if c in features or c in self.heart_features]
            values = []
            for c in cols:
                values.append(float(features.get(c, 0)))
            arr = np.array(values, dtype=np.float32).reshape(1, -1)
            if self.heart_scaler.n_features_in_ == arr.shape[1]:
                arr = self.heart_scaler.transform(arr)
            return arr
        else:
            cols = [c for c in CANCER_COLUMNS if c in features or c in self.cancer_features]
            values = []
            for c in cols:
                values.append(float(features.get(c, 0)))
            arr = np.array(values, dtype=np.float32).reshape(1, -1)
            if self.cancer_scaler.n_features_in_ == arr.shape[1]:
                arr = self.cancer_scaler.transform(arr)
            return arr

    def get_dataset_stats(self) -> dict:
        """Return statistics about loaded datasets."""
        stats = {}
        if self.heart_data is not None:
            stats['heart'] = {
                'rows': len(self.heart_data),
                'cols': len(self.heart_data.columns),
                'features': len([c for c in HEART_COLUMNS if c in self.heart_data.columns]),
                'balance': float(self.heart_data['target'].mean()) if 'target' in self.heart_data.columns else None,
            }
        if self.cancer_data is not None:
            stats['cancer'] = {
                'rows': len(self.cancer_data),
                'cols': len(self.cancer_data.columns),
                'features': len([c for c in CANCER_COLUMNS if c in self.cancer_data.columns]),
                'balance': float(self.cancer_data['target'].mean()) if 'target' in self.cancer_data.columns else None,
            }
        return stats
