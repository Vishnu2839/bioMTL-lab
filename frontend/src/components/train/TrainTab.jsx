import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Brain, Play, CheckCircle2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import useAppStore from '../../store/appStore';
import { containerVariants, itemVariants } from '../../utils/animations';

export default function TrainTab() {
  const { suggestParams } = useApi();
  const store = useAppStore();
  const { addToast, setTraining, addTrainingEpoch, setTrainingComplete, resetTraining } = store;
  const isTraining = useAppStore((s) => s.isTraining);
  const trainingHistory = useAppStore((s) => s.trainingHistory);
  const trainingComplete = useAppStore((s) => s.trainingComplete);

  // Hyperparameters
  const [params, setParams] = useState({
    n_components: 10, shared_ratio: 0.6, lr: 0.001,
    epochs: 100, dropout: 0.3, lambda_heart: 0.5,
  });
  const [suggesting, setSuggesting] = useState(false);

  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const updateParam = (key, value) => setParams((p) => ({ ...p, [key]: value }));

  // Claude suggest
  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const result = await suggestParams();
      setParams({
        n_components: result.n_components || 10,
        shared_ratio: result.shared_ratio || 0.6,
        lr: result.learning_rate || 0.001,
        epochs: result.epochs || 100,
        dropout: result.dropout || 0.3,
        lambda_heart: result.lambda_heart || 0.5,
      });
      addToast({ type: 'success', message: `AI suggested params: ${result.reasoning || 'Optimized for your dataset'}` });
    } catch (err) {
      addToast({ type: 'error', message: 'Could not get AI suggestions' });
    }
    setSuggesting(false);
  };

  // Start training via WebSocket
  const handleTrain = useCallback(() => {
    resetTraining();
    setTraining(true);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    let wsUrl;
    
    // In production (Vercel connecting to Render)
    if (apiUrl.includes('onrender')) {
      wsUrl = `${apiUrl.replace('https', 'wss').replace('http', 'ws')}/ws/train/live`;
    } 
    // In local development (Vite connecting to generic backend)
    else if (apiUrl.includes('localhost:8000')) {
      wsUrl = `ws://localhost:8000/ws/train/live`;
    }
    // Fallback based on origin
    else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/train/live`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        n_components: params.n_components,
        shared_ratio: params.shared_ratio,
        lr: params.lr,
        epochs: params.epochs,
        dropout: params.dropout,
        lambda_heart: params.lambda_heart,
        lambda_cancer: 1 - params.lambda_heart,
        batch_size: 32,
      }));
      addToast({ type: 'info', message: '🚀 Training started' });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'complete' || data.status === 'early_stop') {
        setTrainingComplete(data);
        addToast({ type: 'success', message: '✨ Training complete!' });
      } else if (data.status === 'error') {
        setTraining(false);
        addToast({ type: 'error', message: data.message || 'Training failed' });
      } else {
        addTrainingEpoch(data);
      }
    };

    ws.onerror = () => {
      setTraining(false);
      addToast({ type: 'error', message: 'WebSocket connection failed. Is the backend running on port 8000?' });
    };

    ws.onclose = () => {
      if (isTraining) setTraining(false);
    };
  }, [params]);

  // Draw loss chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trainingHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(1, 1);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    const pad = { top: 40, right: 40, bottom: 60, left: 60 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const maxEpoch = trainingHistory.length;
    const allLoss = trainingHistory.flatMap((m) => [m.loss_heart || 0, m.loss_cancer || 0]);
    const maxLoss = Math.max(...allLoss, 0.1);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (plotH / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }

    // Draw lines
    const drawLine = (key, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';

      trainingHistory.forEach((m, i) => {
        const x = pad.left + (i / Math.max(maxEpoch - 1, 1)) * plotW;
        const y = pad.top + plotH - ((m[key] || 0) / maxLoss) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Gradient fill
      const lastX = pad.left + ((maxEpoch - 1) / Math.max(maxEpoch - 1, 1)) * plotW;
      ctx.lineTo(lastX, pad.top + plotH);
      ctx.lineTo(pad.left, pad.top + plotH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      grad.addColorStop(0, color.replace(')', ',0.2)').replace('rgb', 'rgba'));
      grad.addColorStop(1, color.replace(')', ',0.0)').replace('rgb', 'rgba'));
      ctx.fillStyle = grad;
      ctx.fill();
    };

    drawLine('loss_heart', 'rgb(192, 56, 56)');
    drawLine('loss_cancer', 'rgb(26, 112, 112)');

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '20px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('Epoch', W / 2, H - 10);
    ctx.save();
    ctx.translate(16, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Loss', 0, 0);
    ctx.restore();

    // Legend
    ctx.fillStyle = 'rgb(192, 56, 56)';
    ctx.fillRect(W - 200, 16, 12, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '18px DM Sans';
    ctx.textAlign = 'left';
    ctx.fillText('Heart Loss', W - 182, 28);
    ctx.fillStyle = 'rgb(26, 112, 112)';
    ctx.fillRect(W - 200, 38, 12, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Cancer Loss', W - 182, 50);
  }, [trainingHistory]);

  const latest = trainingHistory[trainingHistory.length - 1] || {};

  const SliderControl = ({ label, paramKey, min, max, step, format }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink3)' }}>
          {label}
        </label>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
          {format ? format(params[paramKey]) : params[paramKey]}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={params[paramKey]}
        onChange={(e) => updateParam(paramKey, parseFloat(e.target.value))}
        disabled={isTraining}
      />
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="container" style={{ paddingBottom: 80 }}>
      <motion.div variants={itemVariants}>
        <div className="eyebrow">Train Model</div>
        <h2 style={{ marginBottom: 36 }}>BioMTL <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Training Console</span></h2>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Panel — Hyperparameters */}
        <motion.div variants={itemVariants} className="card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 16, marginBottom: 24 }}>Hyperparameters</h3>
          <SliderControl label="NMF Rank (k)" paramKey="n_components" min={5} max={20} step={1} />
          <SliderControl label="Learning Rate" paramKey="lr" min={0.0001} max={0.01} step={0.0001} format={(v) => v.toFixed(4)} />
          <SliderControl label="Epochs" paramKey="epochs" min={10} max={300} step={5} />
          <SliderControl label="Dropout" paramKey="dropout" min={0.1} max={0.6} step={0.05} format={(v) => v.toFixed(2)} />
          <SliderControl label="λ Heart Weight" paramKey="lambda_heart" min={0.1} max={0.9} step={0.05} format={(v) => v.toFixed(2)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '8px 0', borderTop: '1px solid var(--warm)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink4)' }}>λ CANCER WEIGHT</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--teal)' }}>{(1 - params.lambda_heart).toFixed(2)}</span>
          </div>
          <SliderControl label="Shared Factor Ratio" paramKey="shared_ratio" min={0.3} max={0.8} step={0.05} format={(v) => v.toFixed(2)} />

          <motion.button
            className="btn btn-secondary" style={{ width: '100%', marginBottom: 12 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSuggest}
            disabled={suggesting || isTraining}
          >
            <Brain size={14} />
            {suggesting ? 'Asking Claude...' : '🤖 Ask Claude to Suggest'}
          </motion.button>

          <motion.button
            className="btn btn-gold" style={{ width: '100%' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleTrain}
            disabled={isTraining}
          >
            {isTraining ? (
              <><div className="loader-dna" style={{ width: 16, height: 16, borderWidth: 2 }} /> Training...</>
            ) : (
              <><Play size={14} /> 🚀 Start Training</>
            )}
          </motion.button>
        </motion.div>

        {/* Right Panel — Live Metrics + Chart */}
        <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Epoch Counter */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--gold)' }}>
                {latest.epoch || 0}<span style={{ fontSize: '1.2rem', color: 'var(--ink4)' }}>/{latest.total_epochs || params.epochs}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', letterSpacing: 2 }}>EPOCHS</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: trainingComplete ? 'var(--sage)' : isTraining ? 'var(--gold)' : 'var(--ink4)' }}>
                {trainingComplete ? '✨ Complete' : isTraining ? '⚡ Training...' : '⏸ Idle'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>
                Total Loss: <span style={{ fontWeight: 600 }}>{(latest.total_loss || 0).toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Loss Chart */}
          <div className="card-dark" style={{ borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 320, display: 'block' }}
            />
          </div>

          {/* Live Metric Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Heart AUC', value: latest.val_auc_heart, color: 'var(--rose)' },
              { label: 'Cancer AUC', value: latest.val_auc_cancer, color: 'var(--teal)' },
              { label: 'Heart F1', value: latest.val_f1_heart, color: 'var(--rose)' },
              { label: 'Cancer F1', value: latest.val_f1_cancer, color: 'var(--teal)' },
            ].map((m, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'var(--ink4)', textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: m.color, marginTop: 4 }}>
                  {m.value ? m.value.toFixed(3) : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Training complete action */}
          {trainingComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card" style={{ textAlign: 'center', padding: 28, borderLeft: '3px solid var(--sage)' }}
            >
              <CheckCircle2 size={32} color="var(--sage)" style={{ marginBottom: 8 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>Training Complete!</h3>
              <p style={{ color: 'var(--ink4)', fontSize: 13, marginBottom: 16 }}>Model is ready for predictions and evaluation.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-gold" onClick={() => useAppStore.getState().setActiveTab('predict')}>
                  Make Predictions →
                </button>
                <button className="btn btn-secondary" onClick={() => useAppStore.getState().setActiveTab('results')}>
                  View Results →
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
