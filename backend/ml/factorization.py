"""
BioFactorizer — NMF decomposition for shared biomedical feature extraction.

Mathematical Foundation:
  X_combined = vstack([X_heart_padded, X_cancer_padded])
  X_combined ≈ W × H
  W split into shared + task-specific factors
"""
import numpy as np
from sklearn.decomposition import NMF
from sklearn.preprocessing import MinMaxScaler


class BioFactorizer:
    """Non-Negative Matrix Factorization for shared biomedical feature extraction."""

    def __init__(self, n_components=10, shared_ratio=0.6, random_state=42):
        self.n_components = n_components
        self.shared_ratio = shared_ratio
        self.random_state = random_state
        self.nmf = NMF(
            n_components=n_components,
            random_state=random_state,
            max_iter=200,
            init='random'
        )
        self.n_heart = None
        self.d_max = None
        self.d_heart = None
        self.d_cancer = None
        self.fitted = False
        self.W = None
        self.H = None

    def fit_transform(self, X_heart, X_cancer):
        """
        Fit NMF on combined (padded) data and return factorized representations.
        
        Args:
            X_heart: (n_heart, d_heart) — MinMax-scaled heart features
            X_cancer: (n_cancer, d_cancer) — MinMax-scaled cancer features
        
        Returns:
            W_heart: (n_heart, n_components) — factorized heart patient codes
            W_cancer: (n_cancer, n_components) — factorized cancer patient codes
        """
        self.n_heart = X_heart.shape[0]
        self.d_heart = X_heart.shape[1]
        self.d_cancer = X_cancer.shape[1]
        self.d_max = max(self.d_heart, self.d_cancer)

        # Pad to same dimension
        X_heart_padded = np.zeros((X_heart.shape[0], self.d_max), dtype=np.float32)
        X_heart_padded[:, :self.d_heart] = X_heart
        
        X_cancer_padded = np.zeros((X_cancer.shape[0], self.d_max), dtype=np.float32)
        X_cancer_padded[:, :self.d_cancer] = X_cancer

        # Ensure non-negative (clamp small negatives from floating point)
        X_heart_padded = np.clip(X_heart_padded, 0, None)
        X_cancer_padded = np.clip(X_cancer_padded, 0, None)

        # Stack and factorize
        X_combined = np.vstack([X_heart_padded, X_cancer_padded])
        self.W = self.nmf.fit_transform(X_combined)
        self.H = self.nmf.components_

        # Split back
        W_heart = self.W[:self.n_heart, :]
        W_cancer = self.W[self.n_heart:, :]

        self.fitted = True
        return W_heart.astype(np.float32), W_cancer.astype(np.float32)

    def fit_transform_single(self, X, dataset_type='heart'):
        """
        For single-dataset mode: fit NMF on one dataset only.
        """
        X = np.clip(X, 0, None).astype(np.float32)
        self.W = self.nmf.fit_transform(X)
        self.H = self.nmf.components_
        self.fitted = True
        if dataset_type == 'heart':
            self.n_heart = X.shape[0]
            self.d_heart = X.shape[1]
            self.d_max = X.shape[1]
        else:
            self.n_heart = 0
            self.d_cancer = X.shape[1]
            self.d_max = X.shape[1]
        return self.W.astype(np.float32)

    def transform_single(self, x, dataset_type='heart'):
        """
        Transform a single patient row for inference.
        
        Args:
            x: (1, d) — single preprocessed patient row
            dataset_type: 'heart' or 'cancer'
        
        Returns:
            w: (1, n_components) — factorized representation
        """
        if not self.fitted:
            raise RuntimeError("Factorizer not fitted yet. Train the model first.")
        
        # Pad to d_max
        if self.d_max is not None and x.shape[1] < self.d_max:
            x_padded = np.zeros((1, self.d_max), dtype=np.float32)
            x_padded[:, :x.shape[1]] = x
        else:
            x_padded = x.copy()
        
        x_padded = np.clip(x_padded, 0, None)
        w = self.nmf.transform(x_padded)
        return w.astype(np.float32)

    def get_factor_matrix(self):
        """Returns H matrix (k, d) for visualization."""
        if self.H is None:
            return None
        return self.H

    def get_shared_factor_count(self):
        """Number of shared factors."""
        return int(self.n_components * self.shared_ratio)

    def get_shared_factor_weights(self):
        """Factor-feature weights for visualization — shared factors only."""
        if self.H is None:
            return None
        k_shared = self.get_shared_factor_count()
        return self.H[:k_shared, :]

    def get_factor_info(self):
        """Return factor decomposition info for Results tab visualization."""
        k_shared = self.get_shared_factor_count()
        k_specific = self.n_components - k_shared
        
        factors = []
        for i in range(self.n_components):
            factor_type = 'shared' if i < k_shared else 'specific'
            # Get top contributing original features for this factor
            if self.H is not None:
                weights = self.H[i, :]
                top_indices = np.argsort(weights)[-5:][::-1]
                top_weights = weights[top_indices].tolist()
            else:
                top_indices = []
                top_weights = []
            
            factors.append({
                'id': i,
                'type': factor_type,
                'top_feature_indices': top_indices.tolist() if hasattr(top_indices, 'tolist') else top_indices,
                'top_weights': top_weights,
                'activation_mean': float(self.W[:, i].mean()) if self.W is not None else 0,
            })
        
        return {
            'n_components': self.n_components,
            'k_shared': k_shared,
            'k_specific': k_specific,
            'shared_ratio': self.shared_ratio,
            'factors': factors,
            'reconstruction_error': float(self.nmf.reconstruction_err_) if self.fitted else None,
        }
