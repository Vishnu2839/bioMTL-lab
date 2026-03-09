"""
BioMTL Lab — FastAPI Backend Entry Point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

app = FastAPI(
    title="BioMTL Lab API",
    description="Factorization-Driven Multi-Task Framework for Limited Biomedical Data Analysis",
    version="1.0.0",
)
# FIXED: Added the root route for Render's health check
@app.get("/")
async def root():
    return {"message": "BioMTL Lab API is online", "docs": "/docs"}
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://biomtl-lab.vercel.app",
        "https://bio-mtl-lab.vercel.app",
        "https://*.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routes
from api.routes.data import router as data_router
from api.routes.train import router as train_router
from api.routes.predict import router as predict_router
from api.routes.results import router as results_router
from api.routes.claude import router as claude_router

app.include_router(data_router)
app.include_router(train_router)
app.include_router(predict_router)
app.include_router(results_router)
app.include_router(claude_router)


# WebSocket route mounted directly on app (not behind /api prefix)
@app.websocket("/ws/train/{job_id}")
async def websocket_train(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time training updates."""
    await websocket.accept()
    
    try:
        from api.routes.train import _training_jobs, TrainConfig
        from services.model_service import get_trainer
        from services.dataset_service import get_dataset_service
        
        config = {}
        if job_id in _training_jobs:
            config = _training_jobs[job_id].get("config", {})
            _training_jobs[job_id]["status"] = "training"
        
        # Wait for config from client if needed
        if not config:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
                config = data
            except asyncio.TimeoutError:
                config = TrainConfig().model_dump()
        
        trainer = get_trainer()
        
        # Ensure datasets are loaded
        svc = get_dataset_service()
        if svc.heart_df is not None:
            trainer.preprocessor.heart_data = svc.heart_df
        if svc.cancer_df is not None:
            trainer.preprocessor.cancer_data = svc.cancer_df
        
        # Run training with WebSocket streaming
        results = await trainer.train(config, websocket=websocket)
        
        if job_id in _training_jobs:
            _training_jobs[job_id]["status"] = "complete"
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"status": "error", "message": str(e)})
        except Exception:
            pass


@app.get("/health")
async def health():
    """Health check endpoint."""
    from services.model_service import get_trainer
    from services.dataset_service import get_dataset_service
    
    trainer = get_trainer()
    svc = get_dataset_service()
    info = svc.get_info()
    
    return {
        "status": "ok",
        "model_loaded": trainer.trained,
        "datasets": info,
    }


@app.on_event("startup")
async def startup():
    """Load default datasets and generate if missing."""
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    heart_path = os.path.join(data_dir, 'heart_disease.csv')
    cancer_path = os.path.join(data_dir, 'breast_cancer.csv')
    
    # Generate datasets if they don't exist
    if not os.path.exists(heart_path) or not os.path.exists(cancer_path):
        try:
            from generate_data import generate_heart_disease_csv, generate_breast_cancer_csv
            if not os.path.exists(heart_path):
                generate_heart_disease_csv(heart_path)
            if not os.path.exists(cancer_path):
                generate_breast_cancer_csv(cancer_path)
        except Exception as e:
            print(f"Warning: Could not generate datasets: {e}")
    
    # Load datasets
    from services.dataset_service import get_dataset_service
    svc = get_dataset_service()
    svc.load_defaults()
    print(f"BioMTL Lab API ready. Datasets: {svc.get_info()}")
