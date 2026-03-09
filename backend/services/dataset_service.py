"""
Dataset Service — Dataset management, storage, and auto-detection.
"""
import pandas as pd
import os
import io
from ml.preprocessor import detect_dataset_type, map_columns, HEART_COLUMNS, CANCER_COLUMNS


class DatasetService:
    """Manages uploaded datasets."""

    def __init__(self, data_dir=None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        self.heart_df = None
        self.cancer_df = None

    def load_defaults(self):
        """Load default CSVs from disk."""
        heart_path = os.path.join(self.data_dir, 'heart_disease.csv')
        cancer_path = os.path.join(self.data_dir, 'breast_cancer.csv')
        if os.path.exists(heart_path):
            self.heart_df = pd.read_csv(heart_path)
        if os.path.exists(cancer_path):
            self.cancer_df = pd.read_csv(cancer_path)

    def upload_csv(self, file_content: bytes, filename: str, dataset_type: str = None):
        """Upload and process a CSV file."""
        df = pd.read_csv(io.BytesIO(file_content))
        df = map_columns(df)

        if dataset_type is None or dataset_type == 'auto':
            dataset_type = detect_dataset_type(list(df.columns))

        if dataset_type == 'heart':
            self.heart_df = df
            save_path = os.path.join(self.data_dir, 'heart_disease.csv')
            df.to_csv(save_path, index=False)
        elif dataset_type == 'cancer':
            self.cancer_df = df
            save_path = os.path.join(self.data_dir, 'breast_cancer.csv')
            df.to_csv(save_path, index=False)

        return {
            'dataset_type': dataset_type,
            'rows': len(df),
            'cols': len(df.columns),
            'columns': list(df.columns),
            'filename': filename,
        }

    def get_info(self):
        """Return info about loaded datasets."""
        info = {}
        if self.heart_df is not None:
            info['heart'] = {
                'rows': len(self.heart_df),
                'cols': len(self.heart_df.columns),
                'columns': list(self.heart_df.columns),
                'balance': float(self.heart_df['target'].mean()) if 'target' in self.heart_df.columns else None,
                'loaded': True,
            }
        else:
            info['heart'] = {'loaded': False}
        
        if self.cancer_df is not None:
            info['cancer'] = {
                'rows': len(self.cancer_df),
                'cols': len(self.cancer_df.columns),
                'columns': list(self.cancer_df.columns),
                'balance': float(self.cancer_df['target'].mean()) if 'target' in self.cancer_df.columns else None,
                'loaded': True,
            }
        else:
            info['cancer'] = {'loaded': False}
        
        return info

    def get_preview(self, n=10):
        """Return first n rows of each dataset."""
        preview = {}
        if self.heart_df is not None:
            preview['heart'] = self.heart_df.head(n).to_dict(orient='records')
        if self.cancer_df is not None:
            preview['cancer'] = self.cancer_df.head(n).to_dict(orient='records')
        return preview

    def get_dataframe(self, dataset_type):
        """Get a dataset as DataFrame."""
        if dataset_type == 'heart':
            return self.heart_df
        elif dataset_type == 'cancer':
            return self.cancer_df
        return None


# Global singleton
_dataset_service = None

def get_dataset_service() -> DatasetService:
    global _dataset_service
    if _dataset_service is None:
        _dataset_service = DatasetService()
        _dataset_service.load_defaults()
    return _dataset_service
