import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Target, Award, Sparkles } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useApi } from '../../hooks/useApi';
import useAppStore from '../../store/appStore';
import { containerVariants, itemVariants } from '../../utils/animations';

// 3D Factor Network Visualization
function FactorNode({ position, color, label, size = 0.3 }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1;
    }
  });
  return (
    <Float speed={1.5} floatIntensity={0.3}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.7} roughness={0.3} />
      </mesh>
    </Float>
  );
}

function FactorEdge({ start, end }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#ffffff" opacity={0.12} transparent />
    </line>
  );
}

function FactorNetwork({ data }) {
  const groupRef = useRef();
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
  });

  const nodes = useMemo(() => {
    if (!data?.factors) return [];
    return data.factors.map((f, i) => {
      const angle = (i / data.factors.length) * Math.PI * 2;
      const r = f.type === 'shared' ? 1.5 : 2.5;
      return {
        pos: [Math.cos(angle) * r, (Math.random() - 0.5) * 2, Math.sin(angle) * r],
        color: f.type === 'shared' ? '#c9963a' : (i % 2 === 0 ? '#c03838' : '#1a7070'),
        size: f.type === 'shared' ? 0.35 : 0.22,
        label: `F${f.id}`,
        type: f.type,
      };
    });
  }, [data]);

  const edges = useMemo(() => {
    const result = [];
    const shared = nodes.filter(n => n.type === 'shared');
    const specific = nodes.filter(n => n.type !== 'shared');
    shared.forEach((s) => {
      specific.forEach((sp) => {
        if (Math.random() > 0.3) result.push({ start: s.pos, end: sp.pos });
      });
    });
    shared.forEach((s, i) => {
      if (i > 0) result.push({ start: shared[i - 1].pos, end: s.pos });
    });
    return result;
  }, [nodes]);

  return (
    <group ref={groupRef}>
      {edges.map((e, i) => <FactorEdge key={`e-${i}`} start={e.start} end={e.end} />)}
      {nodes.map((n, i) => <FactorNode key={`n-${i}`} position={n.pos} color={n.color} size={n.size} label={n.label} />)}
      {/* Floating particles */}
      {Array.from({ length: 30 }, (_, i) => (
        <Float key={`p-${i}`} speed={2} floatIntensity={0.5}>
          <mesh position={[(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#c9963a" opacity={0.5} transparent />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function ResultsTab() {
  const { getResults, getComparison, getFactorization } = useApi();
  const store = useAppStore();
  const trainingResults = useAppStore((s) => s.trainingResults);
  const [results, setResults] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [factData, setFactData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, comp, fact] = await Promise.all([
          getResults().catch(() => trainingResults),
          getComparison().catch(() => null),
          getFactorization().catch(() => null),
        ]);
        setResults(res);
        setComparison(comp);
        setFactData(fact);
      } catch (e) {
        // Use trainingResults from store if API fails
        if (trainingResults) setResults(trainingResults);
      }
      setLoading(false);
    };
    load();
  }, [trainingResults]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 80 }}>
        <div className="loader-dna" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: 16, color: 'var(--ink4)' }}>Loading results...</p>
      </div>
    );
  }

  if (!results && !trainingResults) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: 80 }}>
        <Trophy size={48} color="var(--ink4)" style={{ marginBottom: 16 }} />
        <h3>No Results Yet</h3>
        <p style={{ color: 'var(--ink4)', marginTop: 8, marginBottom: 24 }}>Train the model first to see evaluation results.</p>
        <button className="btn btn-gold" onClick={() => useAppStore.getState().setActiveTab('train')}>
          Train Model →
        </button>
      </div>
    );
  }

  const r = results || trainingResults || {};
  const heart = r.heart || {};
  const cancer = r.cancer || {};
  const models = comparison?.models || [];

  const bestAuc = Math.max(heart.auc || 0, cancer.auc || 0);
  const bestF1 = Math.max(heart.f1 || 0, cancer.f1 || 0);
  const avgAcc = ((heart.accuracy || 0) + (cancer.accuracy || 0)) / (heart.accuracy && cancer.accuracy ? 2 : 1);

  // Calculate improvement
  const baselines = r.comparison || {};
  const lrHeartAuc = baselines.lr_heart?.auc || 0;
  const improvement = lrHeartAuc > 0 ? (((heart.auc || 0) - lrHeartAuc) / lrHeartAuc * 100).toFixed(1) : 'N/A';

  const MetricBar = ({ label, value, color, max = 1 }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ink4)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color }}>{(value || 0).toFixed(4)}</span>
      </div>
      <div className="progress-bar" style={{ height: 6 }}>
        <motion.div
          className={`progress-bar-fill ${color === 'var(--rose)' ? 'rose' : color === 'var(--teal)' ? 'teal' : 'gold'}`}
          initial={{ width: 0 }}
          animate={{ width: `${((value || 0) / max) * 100}%` }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </div>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ paddingBottom: 80 }}>
      <div className="container">
        <motion.div variants={itemVariants}>
          <div className="eyebrow">Evaluation Results</div>
          <h2 style={{ marginBottom: 36 }}>Model <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Performance</span></h2>
        </motion.div>

        {/* Top Stat Cards */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'BEST AUC', value: bestAuc.toFixed(4), icon: Trophy, color: 'var(--gold)' },
            { label: 'BEST F1', value: bestF1.toFixed(4), icon: Target, color: 'var(--gold)' },
            { label: 'AVG ACCURACY', value: (avgAcc * 100).toFixed(1) + '%', icon: TrendingUp, color: 'var(--ink)' },
            { label: 'VS BASELINE', value: improvement === 'N/A' ? 'N/A' : `+${improvement}%`, icon: Award, color: 'var(--sage)' },
          ].map((s, i) => (
            <motion.div key={i} className="stat-card" whileHover={{ y: -4, boxShadow: '0 24px 80px rgba(26,20,16,0.16)' }}>
              <s.icon size={20} color={s.color} />
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Model Comparison Table */}
        {models.length > 0 && (
          <motion.div variants={itemVariants} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 48 }}>
            <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(26,20,16,0.06)' }}>
              <h3 style={{ fontSize: 16 }}>Model Comparison</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Heart AUC</th>
                  <th>Cancer AUC</th>
                  <th>Heart F1</th>
                  <th>Cancer F1</th>
                  <th>Avg Acc</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => {
                  const avgAcc = ((m.heart_acc || 0) + (m.cancer_acc || 0)) / ((m.heart_acc ? 1 : 0) + (m.cancer_acc ? 1 : 0) || 1);
                  return (
                    <tr key={i} style={m.highlight ? { background: 'rgba(201,150,58,0.06)', borderLeft: '3px solid var(--gold)' } : {}}>
                      <td style={{ fontWeight: m.highlight ? 700 : 400 }}>
                        {m.highlight && <Sparkles size={12} color="var(--gold)" style={{ marginRight: 6 }} />}
                        {m.model}
                      </td>
                      <td>
                        {m.heart_auc != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ width: 60, height: 5 }}>
                              <div className={`progress-bar-fill ${m.highlight ? 'gold' : 'rose'}`} style={{ width: `${m.heart_auc * 100}%` }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: m.highlight ? 700 : 400 }}>{m.heart_auc.toFixed(3)}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {m.cancer_auc != null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-bar" style={{ width: 60, height: 5 }}>
                              <div className={`progress-bar-fill ${m.highlight ? 'gold' : 'teal'}`} style={{ width: `${m.cancer_auc * 100}%` }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: m.highlight ? 700 : 400 }}>{m.cancer_auc.toFixed(3)}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: m.highlight ? 700 : 400 }}>{m.heart_f1 != null ? m.heart_f1.toFixed(3) : '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: m.highlight ? 700 : 400 }}>{m.cancer_f1 != null ? m.cancer_f1.toFixed(3) : '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: m.highlight ? 700 : 400 }}>{(avgAcc * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Per-Task Metric Cards */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
          {heart.auc != null && (
            <div className="card" style={{ padding: 28, borderTop: '3px solid var(--rose)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>❤️</span> Heart Disease Metrics
              </h3>
              <MetricBar label="AUC" value={heart.auc} color="var(--rose)" />
              <MetricBar label="F1 Score" value={heart.f1} color="var(--rose)" />
              <MetricBar label="Accuracy" value={heart.accuracy} color="var(--rose)" />
              <MetricBar label="Precision" value={heart.precision} color="var(--rose)" />
              <MetricBar label="Recall" value={heart.recall} color="var(--rose)" />
            </div>
          )}
          {cancer.auc != null && (
            <div className="card" style={{ padding: 28, borderTop: '3px solid var(--teal)' }}>
              <h3 style={{ fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🎗️</span> Breast Cancer Metrics
              </h3>
              <MetricBar label="AUC" value={cancer.auc} color="var(--teal)" />
              <MetricBar label="F1 Score" value={cancer.f1} color="var(--teal)" />
              <MetricBar label="Accuracy" value={cancer.accuracy} color="var(--teal)" />
              <MetricBar label="Precision" value={cancer.precision} color="var(--teal)" />
              <MetricBar label="Recall" value={cancer.recall} color="var(--teal)" />
            </div>
          )}
        </motion.div>
      </div>

      {/* 3D Factorization Visualization */}
      <motion.div
        variants={itemVariants}
        style={{
          background: 'var(--ink-deep)',
          padding: '64px 0',
        }}
      >
        <div className="container">
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>Factorization</div>
          <h2 style={{ color: 'var(--ivory)', marginBottom: 32 }}>Latent Factor <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Network</span></h2>

          <div style={{ height: 400, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.3} />
              <pointLight position={[5, 5, 5]} intensity={0.6} color="#c9963a" />
              <pointLight position={[-5, -3, 2]} intensity={0.3} color="#1a7070" />
              <FactorNetwork data={factData || r.factorization || { factors: Array.from({ length: 10 }, (_, i) => ({ id: i, type: i < 6 ? 'shared' : 'specific' })) }} />
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.3} />
            </Canvas>
          </div>

          {/* Factor stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
            {[
              { label: 'NMF RANK', value: factData?.n_components || r.factorization?.n_components || 10 },
              { label: 'SHARED FACTORS', value: `${((factData?.shared_ratio || 0.6) * 100).toFixed(0)}%` },
              { label: 'DATASETS', value: '2' },
              { label: 'AUC LIFT', value: improvement === 'N/A' ? 'N/A' : `+${improvement}%` },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.04)',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
