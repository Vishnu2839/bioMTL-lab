"""
BioMTLTrainer — Full training loop with evaluation, early stopping, and baseline comparison.
"""
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import (
    roc_auc_score, f1_score, accuracy_score,
    precision_score, recall_score, confusion_matrix
)
import json
import asyncio

from .factorization import BioFactorizer
from .mtl_network import MTLNetwork, SingleTaskNetwork
from .preprocessor import BioPreprocessor


class BioMTLTrainer:
    """Full training loop with NMF factorization + MTL network."""

    def __init__(self):
        self.preprocessor = BioPreprocessor()
        self.factorizer = None
        self.model = None
        self.trained = False
        self.last_results = None
        self.training_history = []
        self.comparison_results = None

    async def train(self, config: dict, websocket=None):
        """
        Full training pipeline: preprocess → factorize → train MTL → evaluate → baselines.
        
        config keys: n_components, shared_ratio, lr, epochs, dropout, lambda_heart, lambda_cancer, batch_size
        """
        # Defaults
        n_components = config.get('n_components', 10)
        shared_ratio = config.get('shared_ratio', 0.6)
        lr = config.get('lr', 0.001)
        epochs = config.get('epochs', 100)
        dropout = config.get('dropout', 0.3)
        lambda_heart = config.get('lambda_heart', 0.5)
        lambda_cancer = config.get('lambda_cancer', 0.5)
        batch_size = config.get('batch_size', 32)

        # Step 1: Load and preprocess
        self.preprocessor.load_default_datasets()
        data = self.preprocessor.preprocess()

        has_heart = 'heart' in data
        has_cancer = 'cancer' in data

        if not has_heart and not has_cancer:
            msg = {"status": "error", "message": "No datasets loaded"}
            if websocket:
                await websocket.send_json(msg)
            return msg

        # Step 2: NMF Factorization
        self.factorizer = BioFactorizer(
            n_components=n_components,
            shared_ratio=shared_ratio,
        )

        if has_heart and has_cancer:
            # Joint factorization
            W_h_train, W_c_train = self.factorizer.fit_transform(
                data['heart']['X_train'], data['cancer']['X_train']
            )
            W_h_test = self.factorizer.nmf.transform(
                np.pad(data['heart']['X_test'], ((0, 0), (0, self.factorizer.d_max - data['heart']['X_test'].shape[1])), 'constant')
            ).astype(np.float32)
            W_c_test = self.factorizer.nmf.transform(
                np.pad(data['cancer']['X_test'], ((0, 0), (0, self.factorizer.d_max - data['cancer']['X_test'].shape[1])), 'constant')
            ).astype(np.float32)
        elif has_heart:
            W_h_train = self.factorizer.fit_transform_single(data['heart']['X_train'], 'heart')
            W_h_test = self.factorizer.nmf.transform(
                np.clip(data['heart']['X_test'], 0, None)
            ).astype(np.float32)
            W_c_train = W_c_test = None
        else:
            W_c_train = self.factorizer.fit_transform_single(data['cancer']['X_train'], 'cancer')
            W_c_test = self.factorizer.nmf.transform(
                np.clip(data['cancer']['X_test'], 0, None)
            ).astype(np.float32)
            W_h_train = W_h_test = None

        # Step 3: Build MTL Network
        self.model = MTLNetwork(
            input_dim=n_components,
            shared_dim=128,
            task_dim=32,
            dropout=dropout,
        )

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=10, factor=0.5)
        criterion = nn.BCELoss()

        # Build DataLoaders
        heart_loader = cancer_loader = None
        if has_heart and W_h_train is not None:
            heart_ds = TensorDataset(
                torch.FloatTensor(W_h_train),
                torch.FloatTensor(data['heart']['y_train']),
            )
            heart_loader = DataLoader(heart_ds, batch_size=batch_size, shuffle=True)

        if has_cancer and W_c_train is not None:
            cancer_ds = TensorDataset(
                torch.FloatTensor(W_c_train),
                torch.FloatTensor(data['cancer']['y_train']),
            )
            cancer_loader = DataLoader(cancer_ds, batch_size=batch_size, shuffle=True)

        # Step 4: Training loop
        self.training_history = []
        best_val_loss = float('inf')
        patience_counter = 0
        patience = 7

        self.model.train()
        for epoch in range(epochs):
            epoch_loss_heart = 0.0
            epoch_loss_cancer = 0.0
            n_heart_batches = 0
            n_cancer_batches = 0

            # Train heart batches
            if heart_loader:
                for X_batch, y_batch in heart_loader:
                    optimizer.zero_grad()
                    pred = self.model(X_batch, task='heart').squeeze()
                    loss = lambda_heart * criterion(pred, y_batch)
                    loss.backward()
                    optimizer.step()
                    epoch_loss_heart += loss.item()
                    n_heart_batches += 1

            # Train cancer batches
            if cancer_loader:
                for X_batch, y_batch in cancer_loader:
                    optimizer.zero_grad()
                    pred = self.model(X_batch, task='cancer').squeeze()
                    loss = lambda_cancer * criterion(pred, y_batch)
                    loss.backward()
                    optimizer.step()
                    epoch_loss_cancer += loss.item()
                    n_cancer_batches += 1

            avg_h_loss = epoch_loss_heart / max(n_heart_batches, 1)
            avg_c_loss = epoch_loss_cancer / max(n_cancer_batches, 1)
            total_loss = avg_h_loss + avg_c_loss

            # Validation metrics
            metrics = {"epoch": epoch + 1, "total_epochs": epochs}
            metrics["loss_heart"] = round(avg_h_loss, 4)
            metrics["loss_cancer"] = round(avg_c_loss, 4)
            metrics["total_loss"] = round(total_loss, 4)

            self.model.eval()
            with torch.no_grad():
                if has_heart and W_h_test is not None:
                    h_pred = self.model(torch.FloatTensor(W_h_test), task='heart').squeeze().numpy()
                    h_true = data['heart']['y_test']
                    metrics["val_auc_heart"] = round(float(roc_auc_score(h_true, h_pred)), 4)
                    metrics["val_f1_heart"] = round(float(f1_score(h_true, (h_pred > 0.5).astype(int))), 4)
                    metrics["val_acc_heart"] = round(float(accuracy_score(h_true, (h_pred > 0.5).astype(int))), 4)

                if has_cancer and W_c_test is not None:
                    c_pred = self.model(torch.FloatTensor(W_c_test), task='cancer').squeeze().numpy()
                    c_true = data['cancer']['y_test']
                    metrics["val_auc_cancer"] = round(float(roc_auc_score(c_true, c_pred)), 4)
                    metrics["val_f1_cancer"] = round(float(f1_score(c_true, (c_pred > 0.5).astype(int))), 4)
                    metrics["val_acc_cancer"] = round(float(accuracy_score(c_true, (c_pred > 0.5).astype(int))), 4)

            self.model.train()

            # Early stopping
            if total_loss < best_val_loss:
                best_val_loss = total_loss
                patience_counter = 0
            else:
                patience_counter += 1

            metrics["status"] = "training"
            if patience_counter >= patience:
                metrics["status"] = "early_stop"

            self.training_history.append(metrics)

            # Send via WebSocket
            if websocket:
                try:
                    await websocket.send_json(metrics)
                    await asyncio.sleep(0.01)
                except Exception:
                    pass

            scheduler.step(total_loss)

            if metrics["status"] == "early_stop":
                break

        # Step 5: Final evaluation
        self.model.eval()
        final_results = {"status": "complete"}

        if has_heart and W_h_test is not None:
            final_results["heart"] = self._evaluate_task(W_h_test, data['heart']['y_test'], 'heart')
        if has_cancer and W_c_test is not None:
            final_results["cancer"] = self._evaluate_task(W_c_test, data['cancer']['y_test'], 'cancer')

        # Step 6: Baseline comparison
        self.comparison_results = self._run_baselines(data, has_heart, has_cancer)
        final_results["comparison"] = self.comparison_results
        final_results["factorization"] = self.factorizer.get_factor_info()

        self.trained = True
        self.last_results = final_results

        if websocket:
            try:
                await websocket.send_json(final_results)
            except Exception:
                pass

        return final_results

    def _evaluate_task(self, X_test, y_test, task):
        """Evaluate a single task and return all metrics."""
        with torch.no_grad():
            pred = self.model(torch.FloatTensor(X_test), task=task).squeeze().numpy()
        
        y_pred_binary = (pred > 0.5).astype(int)
        y_true = y_test.astype(int)

        cm = confusion_matrix(y_true, y_pred_binary)

        return {
            "auc": round(float(roc_auc_score(y_true, pred)), 4),
            "f1": round(float(f1_score(y_true, y_pred_binary)), 4),
            "accuracy": round(float(accuracy_score(y_true, y_pred_binary)), 4),
            "precision": round(float(precision_score(y_true, y_pred_binary, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred_binary, zero_division=0)), 4),
            "confusion_matrix": cm.tolist(),
        }

    def _run_baselines(self, data, has_heart, has_cancer):
        """Train baseline models for comparison."""
        from sklearn.linear_model import LogisticRegression
        from sklearn.ensemble import RandomForestClassifier

        comparison = {}

        # Single-task baselines on raw features
        if has_heart:
            X_tr, X_te = data['heart']['X_train'], data['heart']['X_test']
            y_tr, y_te = data['heart']['y_train'], data['heart']['y_test']
            
            # Logistic Regression
            lr_h = LogisticRegression(max_iter=200, random_state=42)
            lr_h.fit(X_tr, y_tr)
            lr_h_pred = lr_h.predict_proba(X_te)[:, 1]
            comparison["lr_heart"] = {
                "model": "Logistic Regression (Heart)",
                "auc": round(float(roc_auc_score(y_te, lr_h_pred)), 4),
                "f1": round(float(f1_score(y_te, (lr_h_pred > 0.5).astype(int))), 4),
                "accuracy": round(float(accuracy_score(y_te, (lr_h_pred > 0.5).astype(int))), 4),
            }

            # Random Forest
            rf_h = RandomForestClassifier(n_estimators=20, random_state=42)
            rf_h.fit(X_tr, y_tr)
            rf_h_pred = rf_h.predict_proba(X_te)[:, 1]
            comparison["rf_heart"] = {
                "model": "Random Forest (Heart)",
                "auc": round(float(roc_auc_score(y_te, rf_h_pred)), 4),
                "f1": round(float(f1_score(y_te, (rf_h_pred > 0.5).astype(int))), 4),
                "accuracy": round(float(accuracy_score(y_te, (rf_h_pred > 0.5).astype(int))), 4),
            }

        if has_cancer:
            X_tr, X_te = data['cancer']['X_train'], data['cancer']['X_test']
            y_tr, y_te = data['cancer']['y_train'], data['cancer']['y_test']

            lr_c = LogisticRegression(max_iter=200, random_state=42)
            lr_c.fit(X_tr, y_tr)
            lr_c_pred = lr_c.predict_proba(X_te)[:, 1]
            comparison["lr_cancer"] = {
                "model": "Logistic Regression (Cancer)",
                "auc": round(float(roc_auc_score(y_te, lr_c_pred)), 4),
                "f1": round(float(f1_score(y_te, (lr_c_pred > 0.5).astype(int))), 4),
                "accuracy": round(float(accuracy_score(y_te, (lr_c_pred > 0.5).astype(int))), 4),
            }

            rf_c = RandomForestClassifier(n_estimators=20, random_state=42)
            rf_c.fit(X_tr, y_tr)
            rf_c_pred = rf_c.predict_proba(X_te)[:, 1]
            comparison["rf_cancer"] = {
                "model": "Random Forest (Cancer)",
                "auc": round(float(roc_auc_score(y_te, rf_c_pred)), 4),
                "f1": round(float(f1_score(y_te, (rf_c_pred > 0.5).astype(int))), 4),
                "accuracy": round(float(accuracy_score(y_te, (rf_c_pred > 0.5).astype(int))), 4),
            }

        # Vanilla MTL baseline (no factorization)
        if has_heart and has_cancer:
            comparison["vanilla_mtl"] = self._train_vanilla_mtl(data)

        return comparison

    def _train_vanilla_mtl(self, data):
        """Train MTL network without NMF factorization for baseline comparison."""
        X_h_dim = data['heart']['X_train'].shape[1]
        X_c_dim = data['cancer']['X_train'].shape[1]
        d_max = max(X_h_dim, X_c_dim)

        # Pad to same dimension
        X_h_train = np.pad(data['heart']['X_train'], ((0, 0), (0, d_max - X_h_dim)), 'constant')
        X_h_test = np.pad(data['heart']['X_test'], ((0, 0), (0, d_max - X_h_dim)), 'constant')
        X_c_train = np.pad(data['cancer']['X_train'], ((0, 0), (0, d_max - X_c_dim)), 'constant')
        X_c_test = np.pad(data['cancer']['X_test'], ((0, 0), (0, d_max - X_c_dim)), 'constant')

        model = MTLNetwork(input_dim=d_max, shared_dim=128, task_dim=32, dropout=0.3)
        optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-4)
        criterion = nn.BCELoss()

        heart_loader = DataLoader(
            TensorDataset(torch.FloatTensor(X_h_train), torch.FloatTensor(data['heart']['y_train'])),
            batch_size=32, shuffle=True
        )
        cancer_loader = DataLoader(
            TensorDataset(torch.FloatTensor(X_c_train), torch.FloatTensor(data['cancer']['y_train'])),
            batch_size=32, shuffle=True
        )

        model.train()
        for epoch in range(15):
            for X_b, y_b in heart_loader:
                optimizer.zero_grad()
                pred = model(X_b, task='heart').squeeze()
                loss = criterion(pred, y_b)
                loss.backward()
                optimizer.step()
            for X_b, y_b in cancer_loader:
                optimizer.zero_grad()
                pred = model(X_b, task='cancer').squeeze()
                loss = criterion(pred, y_b)
                loss.backward()
                optimizer.step()

        model.eval()
        with torch.no_grad():
            h_pred = model(torch.FloatTensor(X_h_test), task='heart').squeeze().numpy()
            c_pred = model(torch.FloatTensor(X_c_test), task='cancer').squeeze().numpy()

        return {
            "model": "Vanilla MTL (No Factorization)",
            "heart_auc": round(float(roc_auc_score(data['heart']['y_test'], h_pred)), 4),
            "cancer_auc": round(float(roc_auc_score(data['cancer']['y_test'], c_pred)), 4),
            "heart_f1": round(float(f1_score(data['heart']['y_test'], (h_pred > 0.5).astype(int))), 4),
            "cancer_f1": round(float(f1_score(data['cancer']['y_test'], (c_pred > 0.5).astype(int))), 4),
            "heart_acc": round(float(accuracy_score(data['heart']['y_test'], (h_pred > 0.5).astype(int))), 4),
            "cancer_acc": round(float(accuracy_score(data['cancer']['y_test'], (c_pred > 0.5).astype(int))), 4),
        }

    def predict_single(self, features: dict, dataset_type: str) -> dict:
        """Predict for a single patient."""
        if not self.trained:
            raise RuntimeError("Model not trained yet")

        # Preprocess single row
        x = self.preprocessor.transform_single(features, dataset_type)
        # Factorize
        w = self.factorizer.transform_single(x, dataset_type)

        self.model.eval()
        with torch.no_grad():
            pred = self.model(torch.FloatTensor(w), task=dataset_type).squeeze().item()

        risk_level = "high" if pred > 0.65 else ("medium" if pred > 0.35 else "low")

        # Approximate feature importance from factorization weights
        H = self.factorizer.get_factor_matrix()
        w_vec = w.flatten()
        feature_importance = np.abs(w_vec * H.mean(axis=1)[:len(w_vec)])
        
        feature_names = list(features.keys())
        top_k = min(5, len(feature_names))
        # Map factor importance back to input features approximately
        top_features = []
        sorted_indices = np.argsort(feature_importance)[::-1][:top_k]
        for i, idx in enumerate(sorted_indices):
            fname = feature_names[min(idx, len(feature_names) - 1)]
            top_features.append({
                "feature": fname,
                "value": features.get(fname, 0),
                "contribution": round(float(feature_importance[idx]), 4),
                "direction": "increases" if feature_importance[idx] > 0 else "decreases",
            })

        k_shared = self.factorizer.get_shared_factor_count()
        shared_activation = float(np.mean(np.abs(w_vec[:k_shared])))
        task_activation = float(np.mean(np.abs(w_vec[k_shared:])))

        return {
            "probability": round(float(pred), 4),
            "risk_level": risk_level,
            "risk_percentage": int(round(pred * 100)),
            "confidence": round(1.0 - abs(pred - 0.5) * 2, 4),
            "top_features": top_features,
            "shared_factor_activation": round(shared_activation, 4),
            "task_factor_activation": round(task_activation, 4),
        }

    def predict_bulk(self, df, dataset_type: str) -> list:
        """Predict for an entire dataframe."""
        if not self.trained:
            raise RuntimeError("Model not trained yet")

        results = []
        for idx, row in df.iterrows():
            features = row.to_dict()
            # Remove target if present
            features.pop('target', None)
            try:
                pred = self.predict_single(features, dataset_type)
                pred['patient_id'] = f"P-{idx:04d}"
                pred['features'] = features
                results.append(pred)
            except Exception as e:
                results.append({
                    'patient_id': f"P-{idx:04d}",
                    'probability': 0.5,
                    'risk_level': 'unknown',
                    'risk_percentage': 50,
                    'error': str(e),
                })
        return results
