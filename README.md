# 🧬 BioMTL Lab — Biomedical Multi-Task Learning Platform

A full-stack research-grade web application that simultaneously predicts **Heart Attack Risk** and **Breast Cancer Malignancy** using a **Multi-Task Learning (MTL)** model powered by **Non-Negative Matrix Factorization (NMF)**.

---

## 📋 Table of Contents

- [About the Project](#-about-the-project)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Setup Instructions — macOS](#-setup-instructions--macos)
- [Setup Instructions — Windows](#-setup-instructions--windows)
- [Running the Application](#-running-the-application)
- [Usage Workflow](#-usage-workflow)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)

---

## 🧠 About the Project

BioMTL Lab addresses a critical challenge in biomedical research: **limited labeled data**. By jointly training on two related clinical datasets through shared latent factors, the MTL model achieves superior accuracy compared to single-task baselines.

### How It Works

1. **NMF Factorization** — Decomposes both datasets into shared and task-specific latent factors
2. **Shared Encoder** — A neural network learns common patterns across heart disease and breast cancer
3. **Task-Specific Heads** — Separate output layers specialize in each prediction task
4. **Knowledge Transfer** — Shared factors enable cross-task learning, boosting accuracy on small datasets

### Datasets

| Dataset | Records | Features | Target |
|---------|---------|----------|--------|
| Heart Disease (Cleveland-like) | 302 | 13 clinical features | Heart attack risk (binary) |
| Breast Cancer (Wisconsin-like) | 569 | 30 cell nucleus measurements | Malignancy (binary) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│  (Vite + Three.js + Framer Motion + Zustand)    │
│                                                  │
│  Hero ─ Upload ─ Train ─ Predict ─ Results      │
└──────────────┬──────────────────────────────────┘
               │  HTTP/WebSocket (Vite Proxy)
┌──────────────▼──────────────────────────────────┐
│                FastAPI Backend                    │
│                                                  │
│  Routes: /api/upload, /api/train, /api/predict  │
│          /api/results, /api/explain              │
│          /ws/train/{job_id} (WebSocket)          │
│                                                  │
│  ML Pipeline:                                    │
│  Preprocess → NMF Factor → MTL Train → Evaluate │
│                                                  │
│  Services: Claude AI · Dataset · Model           │
└─────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.9+** | Runtime |
| **FastAPI** | REST API + WebSockets |
| **PyTorch** | MTL neural network |
| **scikit-learn** | NMF, baseline models, metrics |
| **imbalanced-learn** | SMOTE oversampling |
| **Anthropic SDK** | Claude AI explanations (optional) |
| **Pandas / NumPy** | Data processing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool + dev server |
| **Three.js / React Three Fiber** | 3D DNA helix + factor network |
| **Framer Motion** | Animations |
| **Zustand** | Global state management |
| **Axios** | API communication |
| **Lucide React** | Icon system |

---

## ✨ Features

- 🎯 **Multi-Task Learning** — Joint heart + cancer prediction via shared NMF factors
- 📊 **Real-Time Training** — Live loss chart + AUC/F1 metrics streamed via WebSocket
- 🧬 **3D Visualizations** — Interactive DNA helix (hero) + factor network (results)
- 🤖 **Claude AI Integration** — Clinical explanations + hyperparameter suggestions
- 📁 **Auto-Detect Upload** — Drop any CSV, system identifies heart vs cancer
- 🔮 **Single Patient Prediction** — Interactive sliders with animated risk gauge
- 📈 **Model Comparison** — BioMTL vs Logistic Regression vs Random Forest vs Vanilla MTL
- 🎨 **Luxury Editorial Design** — Playfair Display, gold/ivory palette, glassmorphism

---

## 📦 Prerequisites

### Both Platforms

- **Node.js** v18+ and **npm** v9+ — [Download](https://nodejs.org/)
- **Python** 3.9 or higher — [Download](https://www.python.org/downloads/)
- **Git** — [Download](https://git-scm.com/downloads)

### Verify Installation

```bash
node --version      # Should show v18.x or higher
npm --version       # Should show 9.x or higher
python3 --version   # Should show 3.9+ (macOS)
python --version    # Should show 3.9+ (Windows)
git --version
```

---

## 🍎 Setup Instructions — macOS

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bioMTL-lab.git
cd bioMTL-lab
```

### Step 2: Set Up the Backend

```bash
# Create a Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Generate the sample datasets
cd backend
python3 generate_data.py
cd ..
```

### Step 3: Set Up the Frontend

```bash
cd frontend
npm install
cd ..
```

### Step 4: Configure Environment (Optional — for Claude AI)

```bash
# Edit backend/.env and add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > backend/.env
```

> **Note**: The app works fully without an API key. Claude AI explanations will use built-in fallback text.

### Step 5: Run Both Servers

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd bioMTL-lab
source venv/bin/activate
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd bioMTL-lab/frontend
npm run dev
```

### Step 6: Open in Browser

```
http://localhost:5173
```

---

## 🪟 Setup Instructions — Windows

### Step 1: Clone the Repository

```cmd
git clone https://github.com/YOUR_USERNAME/bioMTL-lab.git
cd bioMTL-lab
```

### Step 2: Set Up the Backend

```cmd
:: Create a Python virtual environment
python -m venv venv
venv\Scripts\activate

:: Install Python dependencies
pip install -r backend\requirements.txt

:: Generate the sample datasets
cd backend
python generate_data.py
cd ..
```

> **Windows Note**: If `python` is not found, try `py` instead:
> ```cmd
> py -m venv venv
> py -m pip install -r backend\requirements.txt
> ```

### Step 3: Set Up the Frontend

```cmd
cd frontend
npm install
cd ..
```

### Step 4: Configure Environment (Optional — for Claude AI)

Create or edit the file `backend\.env`:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> **Note**: The app works fully without an API key.

### Step 5: Run Both Servers

Open **two Command Prompt / PowerShell windows**:

**Terminal 1 — Backend:**
```cmd
cd bioMTL-lab
venv\Scripts\activate
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```cmd
cd bioMTL-lab\frontend
npm run dev
```

### Step 6: Open in Browser

```
http://localhost:5173
```

---

## 🚀 Running the Application

Once both servers are running:

| Service | URL | Status |
|---------|-----|--------|
| Frontend | `http://localhost:5173` | Vite dev server |
| Backend API | `http://localhost:8000` | FastAPI + Swagger docs |
| API Docs | `http://localhost:8000/docs` | Interactive Swagger UI |
| Health Check | `http://localhost:8000/health` | Backend status |

---

## 📖 Usage Workflow

### 1. Upload Data (Upload Tab)
- Drag & drop a CSV file onto one of three drop zones: **Heart**, **Cancer**, or **Auto-Detect**
- The system auto-identifies the dataset type by column names
- Default datasets (heart: 302 rows, cancer: 569 rows) are pre-loaded on startup

### 2. Train Model (Train Tab)
- Adjust hyperparameters using the sliders:
  - **NMF Rank (k)**: Number of latent factors (5–20)
  - **Learning Rate**: Adam optimizer LR (0.0001–0.01)
  - **Epochs**: Training iterations (10–300)
  - **Dropout**: Regularization (0.1–0.6)
  - **λ Heart/Cancer Weight**: Task loss balancing
  - **Shared Factor Ratio**: % of factors shared between tasks
- Optionally click **"Ask Claude to Suggest"** for AI-recommended params
- Click **"🚀 Start Training"** — watch the live loss chart and AUC/F1 badges update in real-time

### 3. Predict (Predict Tab)
- Select prediction mode: **Both Models**, **Heart Only**, or **Cancer Only**
- Adjust patient feature sliders (age, cholesterol, tumor radius, etc.)
- Click **"Run Prediction"** to see:
  - Animated risk gauge (0–100%)
  - Risk level badge (High / Medium / Low)
  - Top contributing features
  - Claude AI clinical interpretation (typewriter effect)

### 4. Results (Results Tab)
- View stat cards: Best AUC, Best F1, Average Accuracy, vs Baseline improvement
- **Model Comparison Table**: BioMTL (NMF+MTL) vs Logistic Regression vs Random Forest vs Vanilla MTL
- Per-task metric breakdowns (AUC, F1, Accuracy, Precision, Recall)
- **3D Latent Factor Network**: Interactive Three.js visualization of shared vs task-specific factors

---

## 📂 Project Structure

```
bioMTL-lab/
├── backend/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── data.py          # Upload, dataset info, preview
│   │   │   ├── train.py         # Training initiation, status polling
│   │   │   ├── predict.py       # Single + bulk predictions
│   │   │   ├── results.py       # Evaluation results, comparisons
│   │   │   └── claude.py        # AI explanations + param suggestions
│   │   └── __init__.py
│   ├── ml/
│   │   ├── preprocessor.py      # Data cleaning, SMOTE, scaling, auto-detect
│   │   ├── factorization.py     # NMF with shared/specific factor splitting
│   │   ├── mtl_network.py       # PyTorch MTL architecture
│   │   ├── trainer.py           # Full training loop + evaluation
│   │   └── __init__.py
│   ├── services/
│   │   ├── dataset_service.py   # Dataset loading + management
│   │   ├── model_service.py     # Trainer singleton
│   │   ├── claude_service.py    # Anthropic API integration
│   │   └── __init__.py
│   ├── data/
│   │   ├── heart_disease.csv    # Generated on first run
│   │   └── breast_cancer.csv    # Generated on first run
│   ├── main.py                  # FastAPI app entry point
│   ├── generate_data.py         # Sample dataset generator
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # API keys (not committed)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── hero/
│   │   │   │   ├── HeroSection.jsx    # Full-screen landing
│   │   │   │   ├── MoleculeCanvas.jsx # Three.js DNA helix
│   │   │   │   └── HeroStats.jsx      # Animated counter bar
│   │   │   ├── upload/
│   │   │   │   └── UploadTab.jsx      # Drop zones + bulk table
│   │   │   ├── train/
│   │   │   │   └── TrainTab.jsx       # Hyperparams + live chart
│   │   │   ├── predict/
│   │   │   │   └── PredictTab.jsx     # Sliders + risk gauge
│   │   │   ├── results/
│   │   │   │   └── ResultsTab.jsx     # Comparison + 3D viz
│   │   │   ├── Navbar.jsx             # Glassmorphism nav
│   │   │   ├── Loader.jsx             # Cinematic loading screen
│   │   │   ├── Marquee.jsx            # Scrolling tech ticker
│   │   │   └── Toast.jsx              # Notification system
│   │   ├── hooks/
│   │   │   └── useApi.js              # API communication hook
│   │   ├── store/
│   │   │   └── appStore.js            # Zustand global state
│   │   ├── utils/
│   │   │   └── animations.js          # Framer Motion variants
│   │   ├── App.jsx                    # Root component
│   │   ├── main.jsx                   # React entry point
│   │   └── index.css                  # Full design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload/auto` | Upload CSV with auto-detection |
| `POST` | `/api/upload/heart` | Upload heart disease CSV |
| `POST` | `/api/upload/cancer` | Upload breast cancer CSV |
| `GET` | `/api/datasets/info` | Get loaded dataset info |
| `GET` | `/api/datasets/preview` | Preview dataset rows |
| `POST` | `/api/train` | Start training (returns job_id) |
| `GET` | `/api/train/status/{id}` | Poll training status |
| `WS` | `/ws/train/{id}` | WebSocket for live training metrics |
| `POST` | `/api/predict/heart` | Single heart prediction |
| `POST` | `/api/predict/cancer` | Single cancer prediction |
| `POST` | `/api/predict/bulk` | Bulk predictions on dataset |
| `GET` | `/api/results` | Full evaluation results |
| `GET` | `/api/results/comparison` | Model comparison data |
| `GET` | `/api/factorization` | NMF factorization details |
| `POST` | `/api/explain` | Claude AI clinical explanation |
| `POST` | `/api/suggest-params` | AI hyperparameter suggestion |
| `GET` | `/health` | Health check |

---

## ⚙️ Configuration

### Environment Variables (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | No | Anthropic API key for Claude AI features. App works without it using fallback text. |

### Backend Dependencies (`backend/requirements.txt`)

```
fastapi
uvicorn
python-multipart
websockets
torch
scikit-learn
pandas
numpy
imbalanced-learn
anthropic
python-dotenv
pydantic
joblib
```

### Frontend Dependencies (installed via `npm install`)

```
react, react-dom
vite, @vitejs/plugin-react
three, @react-three/fiber, @react-three/drei
framer-motion
zustand
axios
lucide-react
```

---

## 🔧 Troubleshooting

### `python` / `python3` not found
- **macOS**: Use `python3` (Python 2 may be the default `python`)
- **Windows**: Try `py` instead of `python`, or add Python to your PATH during installation

### `pip install` fails for PyTorch
- Visit [pytorch.org](https://pytorch.org/get-started/locally/) for platform-specific install commands
- For CPU-only (no GPU): `pip install torch --index-url https://download.pytorch.org/whl/cpu`

### WebSocket connection failed during training
- Ensure the backend is running on port `8000`
- The frontend connects via Vite proxy — both servers must be running simultaneously

### Port already in use
```bash
# macOS — kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Windows — kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### `npm install` fails
```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json   # macOS
rmdir /s /q node_modules & del package-lock.json   # Windows
npm install
```

---

## 👨‍💻 Author

**Vishnu** — Major Project

---

## 📄 License

This project is for academic and research purposes.
