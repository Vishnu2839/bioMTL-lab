import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Microscope, Layers, Zap } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import useAppStore from '../../store/appStore';
import { containerVariants, itemVariants } from '../../utils/animations';

const HEART_FIELDS = [
  { key: 'age', label: 'Age', min: 29, max: 77, step: 1, default: 55, type: 'slider' },
  { key: 'sex', label: 'Sex', options: [{ v: 1, l: 'Male' }, { v: 0, l: 'Female' }], type: 'toggle' },
  { key: 'cp', label: 'Chest Pain Type', options: [{ v: 0, l: 'Asymptomatic' }, { v: 1, l: 'Typical' }, { v: 2, l: 'Atypical' }, { v: 3, l: 'Non-Anginal' }], type: 'select' },
  { key: 'trestbps', label: 'Resting BP (mmHg)', min: 90, max: 200, step: 1, default: 130, type: 'slider' },
  { key: 'chol', label: 'Cholesterol (mg/dL)', min: 100, max: 400, step: 1, default: 240, type: 'slider' },
  { key: 'fbs', label: 'Fasting Blood Sugar >120', options: [{ v: 0, l: 'No' }, { v: 1, l: 'Yes' }], type: 'toggle' },
  { key: 'restecg', label: 'Resting ECG', options: [{ v: 0, l: 'Normal' }, { v: 1, l: 'ST-T Abnormality' }, { v: 2, l: 'LV Hypertrophy' }], type: 'select' },
  { key: 'thalach', label: 'Max Heart Rate', min: 71, max: 202, step: 1, default: 150, type: 'slider' },
  { key: 'exang', label: 'Exercise Angina', options: [{ v: 0, l: 'No' }, { v: 1, l: 'Yes' }], type: 'toggle' },
  { key: 'oldpeak', label: 'ST Depression', min: 0, max: 6.2, step: 0.1, default: 1.0, type: 'slider' },
  { key: 'slope', label: 'ST Slope', options: [{ v: 0, l: 'Upsloping' }, { v: 1, l: 'Flat' }, { v: 2, l: 'Downsloping' }], type: 'select' },
  { key: 'ca', label: 'Vessels Colored', min: 0, max: 4, step: 1, default: 0, type: 'slider' },
  { key: 'thal', label: 'Thalassemia', options: [{ v: 1, l: 'Normal' }, { v: 2, l: 'Fixed Defect' }, { v: 3, l: 'Reversible' }], type: 'select' },
];

const CANCER_FIELDS = [
  { key: 'mean_radius', label: 'Mean Radius', min: 7, max: 28, step: 0.1, default: 14, type: 'slider' },
  { key: 'mean_texture', label: 'Mean Texture', min: 9, max: 40, step: 0.1, default: 19, type: 'slider' },
  { key: 'mean_perimeter', label: 'Mean Perimeter', min: 43, max: 190, step: 0.5, default: 92, type: 'slider' },
  { key: 'mean_area', label: 'Mean Area', min: 143, max: 2501, step: 1, default: 650, type: 'slider' },
  { key: 'mean_smoothness', label: 'Mean Smoothness', min: 0.05, max: 0.16, step: 0.001, default: 0.1, type: 'slider' },
  { key: 'mean_concavity', label: 'Mean Concavity', min: 0, max: 0.43, step: 0.005, default: 0.1, type: 'slider' },
  { key: 'worst_radius', label: 'Worst Radius', min: 7, max: 36, step: 0.1, default: 16, type: 'slider' },
  { key: 'worst_area', label: 'Worst Area', min: 185, max: 2501, step: 1, default: 880, type: 'slider' },
  { key: 'worst_concave_points', label: 'Worst Concave Points', min: 0, max: 0.3, step: 0.005, default: 0.11, type: 'slider' },
];

// Risk Gauge SVG component
function RiskGauge({ probability, color }) {
  const pct = probability * 100;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (probability * circumference);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--warm)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill={color} fontFamily="var(--font-display)">
          {Math.round(pct)}%
        </text>
        <text x="60" y="70" textAnchor="middle" fontSize="8" fill="var(--ink4)" fontFamily="var(--font-mono)" letterSpacing="1.5">
          RISK SCORE
        </text>
      </svg>
    </div>
  );
}

export default function PredictTab() {
  const { predictHeart, predictCancer, getExplanation } = useApi();
  const { addToast, setSinglePrediction, modelLoaded } = useAppStore();
  const singlePrediction = useAppStore((s) => s.singlePrediction);

  const [mode, setMode] = useState('both');
  const [heartValues, setHeartValues] = useState(
    Object.fromEntries(HEART_FIELDS.map((f) => [f.key, f.default || (f.options ? f.options[0].v : 0)]))
  );
  const [cancerValues, setCancerValues] = useState(
    Object.fromEntries(CANCER_FIELDS.map((f) => [f.key, f.default || 0]))
  );
  const [heartResult, setHeartResult] = useState(null);
  const [cancerResult, setCancerResult] = useState(null);
  const [heartExpl, setHeartExpl] = useState('');
  const [cancerExpl, setCancerExpl] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    if (!modelLoaded) {
      addToast({ type: 'warning', message: 'Train the model first before making predictions' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'both' || mode === 'heart') {
        const res = await predictHeart(heartValues);
        setHeartResult(res);
        try {
          const expl = await getExplanation(res, heartValues, 'heart', res.risk_level);
          setHeartExpl(expl);
        } catch { setHeartExpl(''); }
      }
      if (mode === 'both' || mode === 'cancer') {
        const res = await predictCancer(cancerValues);
        setCancerResult(res);
        try {
          const expl = await getExplanation(res, cancerValues, 'cancer', res.risk_level);
          setCancerExpl(expl);
        } catch { setCancerExpl(''); }
      }
      addToast({ type: 'success', message: 'Prediction complete' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.detail || 'Prediction failed' });
    }
    setLoading(false);
  };

  const FieldInput = ({ field, values, setValues }) => {
    const val = values[field.key];
    if (field.type === 'slider') {
      return (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink3)' }}>{field.label}</label>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{typeof val === 'number' && val % 1 !== 0 ? val.toFixed(2) : val}</span>
          </div>
          <input type="range" min={field.min} max={field.max} step={field.step} value={val} onChange={(e) => setValues({ ...values, [field.key]: parseFloat(e.target.value) })} />
        </div>
      );
    }
    if (field.type === 'toggle') {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink3)' }}>{field.label}</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {field.options.map((o) => (
              <button key={o.v} className={`pill ${val === o.v ? 'active' : ''}`} style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setValues({ ...values, [field.key]: o.v })}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink3)', display: 'block', marginBottom: 4 }}>{field.label}</label>
          <select className="input-control" style={{ width: '100%' }} value={val} onChange={(e) => setValues({ ...values, [field.key]: parseInt(e.target.value) })}>
            {field.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      );
    }
  };

  const ResultPanel = ({ result, explanation, color, label }) => {
    if (!result) return null;
    const gaugeColor = result.risk_level === 'high' ? 'var(--rose)' : result.risk_level === 'medium' ? 'var(--gold)' : 'var(--sage)';
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
        <RiskGauge probability={result.probability} color={gaugeColor} />
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span className={`badge badge-${result.risk_level}`} style={{ fontSize: 14, padding: '8px 20px' }}>
            {result.risk_level === 'high' ? '⚠️ High Risk' : result.risk_level === 'medium' ? '⚡ Medium Risk' : '✅ Low Risk'} — {result.risk_percentage}%
          </span>
        </div>
        {/* Feature importance */}
        {result.top_features && (
          <div style={{ marginTop: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8, fontSize: 9 }}>Top Contributing Features</div>
            {result.top_features.slice(0, 5).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, width: 100, color: 'var(--ink3)' }}>{f.feature}</span>
                <div className="progress-bar" style={{ flex: 1, height: 5 }}>
                  <div className="progress-bar-fill gold" style={{ width: `${Math.min(100, f.contribution * 250)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Claude explanation */}
        {explanation && (
          <div style={{ marginTop: 20, padding: 16, background: 'var(--cream)', borderRadius: 12, fontSize: 12, lineHeight: 1.7, color: 'var(--ink2)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'var(--gold)', marginBottom: 6, textTransform: 'uppercase' }}>🤖 AI Interpretation</div>
            <TypewriterText text={explanation} />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="container" style={{ paddingBottom: 80 }}>
      <motion.div variants={itemVariants}>
        <div className="eyebrow">Single Prediction</div>
        <h2 style={{ marginBottom: 24 }}>Patient <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Risk Assessment</span></h2>
      </motion.div>

      {/* Model Selector */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <div className="pill-selector" style={{ justifyContent: 'center' }}>
          {[
            { id: 'both', label: '🔗 Both Models', icon: Layers },
            { id: 'heart', label: '❤️ Heart Only', icon: Heart },
            { id: 'cancer', label: '🎗️ Cancer Only', icon: Microscope },
          ].map(({ id, label }) => (
            <button key={id} className={`pill ${mode === id ? 'active' : ''}`} onClick={() => setMode(id)}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Panels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mode === 'both' ? '1fr 1fr' : '1fr',
        gap: 24,
        maxWidth: mode === 'both' ? '100%' : 600,
        margin: mode !== 'both' ? '0 auto' : undefined,
      }}>
        {(mode === 'both' || mode === 'heart') && (
          <motion.div variants={itemVariants} className="card" style={{ padding: 28, borderTop: '3px solid var(--rose)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Heart size={18} color="var(--rose)" />
              <h3 style={{ fontSize: 16 }}>Heart Disease Panel</h3>
            </div>
            {HEART_FIELDS.map((f) => <FieldInput key={f.key} field={f} values={heartValues} setValues={setHeartValues} />)}
            <ResultPanel result={heartResult} explanation={heartExpl} color="var(--rose)" label="Heart" />
          </motion.div>
        )}

        {(mode === 'both' || mode === 'cancer') && (
          <motion.div variants={itemVariants} className="card" style={{ padding: 28, borderTop: '3px solid var(--teal)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Microscope size={18} color="var(--teal)" />
              <h3 style={{ fontSize: 16 }}>Breast Cancer Panel</h3>
            </div>
            {CANCER_FIELDS.map((f) => <FieldInput key={f.key} field={f} values={cancerValues} setValues={setCancerValues} />)}
            <ResultPanel result={cancerResult} explanation={cancerExpl} color="var(--teal)" label="Cancer" />
          </motion.div>
        )}
      </div>

      {/* Predict Button */}
      <motion.div variants={itemVariants} style={{ textAlign: 'center', marginTop: 32 }}>
        <motion.button
          className="btn btn-gold btn-lg"
          whileTap={{ scale: 0.97 }}
          onClick={handlePredict}
          disabled={loading}
        >
          {loading ? (
            <><div className="loader-dna" style={{ width: 16, height: 16, borderWidth: 2 }} /> Analyzing...</>
          ) : (
            <><Zap size={18} /> Run Prediction</>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// Typewriter Text Effect
function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, 15);
    return () => clearInterval(timer);
  }, [text]);
  return <span>{displayed}</span>;
}
