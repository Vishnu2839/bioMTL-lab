"""
MTLNetwork — Multi-Task Learning Neural Network with shared encoder + task-specific heads.

Architecture:
  Input (k NMF factors) → Shared Encoder (k→128→64) → Heart Head (64→32→1) + Cancer Head (64→32→1)
  
Loss: λ_heart × BCE(heart) + λ_cancer × BCE(cancer) + λ_reg × L2
"""
import torch
import torch.nn as nn


class MTLNetwork(nn.Module):
    """Multi-Task Learning network with shared encoder and task-specific heads."""

    def __init__(self, input_dim=10, shared_dim=128, task_dim=32, dropout=0.3):
        super().__init__()
        
        self.shared = nn.Sequential(
            nn.Linear(input_dim, shared_dim),
            nn.BatchNorm1d(shared_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(shared_dim, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(dropout),
        )

        self.heart_head = nn.Sequential(
            nn.Linear(64, task_dim),
            nn.GELU(),
            nn.Linear(task_dim, 1),
            nn.Sigmoid(),
        )

        self.cancer_head = nn.Sequential(
            nn.Linear(64, task_dim),
            nn.GELU(),
            nn.Linear(task_dim, 1),
            nn.Sigmoid(),
        )

    def forward(self, x, task='both'):
        shared = self.shared(x)
        if task == 'heart':
            return self.heart_head(shared)
        if task == 'cancer':
            return self.cancer_head(shared)
        return self.heart_head(shared), self.cancer_head(shared)

    def get_shared_representation(self, x):
        """Get the shared encoder output for visualization."""
        return self.shared(x)


class SingleTaskNetwork(nn.Module):
    """Single-task network for baseline comparison (same capacity as one MTL head)."""

    def __init__(self, input_dim, hidden_dim=128, dropout=0.3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.GELU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x)
