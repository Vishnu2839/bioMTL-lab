import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Heart, Microscope, Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import useAppStore from '../../store/appStore';
import { containerVariants, itemVariants } from '../../utils/animations';

export default function UploadTab() {
  const { uploadFile, predictBulk, getDatasetsInfo, getExplanation } = useApi();
  const { addToast, setBulkPredictions, setDatasetsInfo, modelLoaded } = useAppStore();
  const bulkPredictions = useAppStore((s) => s.bulkPredictions);
  const datasetsInfo = useAppStore((s) => s.datasetsInfo);

  const [uploadedType, setUploadedType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [explLoading, setExplLoading] = useState(false);
  const rowsPerPage = 15;

  const handleDrop = useCallback(async (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file, type);
      setUploadedType(result.dataset_type);
      await getDatasetsInfo();
      addToast({ type: 'success', message: `${result.dataset_type === 'heart' ? '❤️' : '🎗️'} ${result.dataset_type} dataset uploaded — ${result.rows} patients` });

      // Auto-run bulk predictions if model is trained
      if (modelLoaded) {
        setPredictionsLoading(true);
        try {
          const preds = await predictBulk(result.dataset_type);
          setBulkPredictions(preds);
        } catch (e) {
          // Model not trained yet — that's fine
        }
        setPredictionsLoading(false);
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Upload failed: ' + (err.response?.data?.detail || err.message) });
    }
    setUploading(false);
  }, [modelLoaded]);

  const handleFileSelect = (type) => (e) => handleDrop(e, type);

  const predictions = bulkPredictions?.predictions || [];
  const filtered = predictions.filter((p) => {
    const matchesRisk = riskFilter === 'all' || p.risk_level === riskFilter;
    const matchesSearch = !searchTerm || JSON.stringify(p).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRisk && matchesSearch;
  });
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const openPatientDetail = async (patient) => {
    setSelectedPatient(patient);
    setExplanation('');
    setExplLoading(true);
    try {
      const expl = await getExplanation(
        patient,
        patient.features || {},
        bulkPredictions?.dataset_type || 'heart',
        patient.risk_level
      );
      setExplanation(expl);
    } catch {
      setExplanation('AI explanation unavailable. Train the model and configure the API key for clinical insights.');
    }
    setExplLoading(false);
  };

  // Donut chart component
  const DonutChart = ({ data, colors, title }) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    let cumulative = 0;
    const segments = data.map((d, i) => {
      const pct = total > 0 ? d.value / total : 0;
      const start = cumulative;
      cumulative += pct;
      const startAngle = start * 360;
      const endAngle = cumulative * 360;
      const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
      const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);
      const large = pct > 0.5 ? 1 : 0;
      return pct > 0 ? (
        <path
          key={i}
          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`}
          fill={colors[i]}
          opacity={0.85}
        />
      ) : null;
    });
    return (
      <div style={{ textAlign: 'center' }}>
        <svg viewBox="0 0 100 100" width="160" height="160">
          {segments}
          <circle cx="50" cy="50" r="25" fill="var(--ivory)" />
          <text x="50" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ink)" fontFamily="var(--font-display)">
            {total}
          </text>
          <text x="50" y="58" textAnchor="middle" fontSize="5" fill="var(--ink4)" fontFamily="var(--font-mono)">
            TOTAL
          </text>
        </svg>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>{title}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i] }} />
              {d.label}: {d.value}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="container"
      style={{ paddingBottom: 80 }}
    >
      <motion.div variants={itemVariants}>
        <div className="eyebrow">Upload Data</div>
        <h2 style={{ marginBottom: 8 }}>Biomedical Dataset <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Upload</span></h2>
        <p style={{ color: 'var(--ink4)', marginBottom: 36 }}>
          Upload Heart Disease or Breast Cancer CSV files — or let the system auto-detect.
        </p>
      </motion.div>

      {/* Drop Zones */}
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
        {[
          { type: 'heart', icon: Heart, label: 'Heart Disease CSV', color: 'var(--rose)', bg: 'var(--rose-pale)' },
          { type: 'cancer', icon: Microscope, label: 'Breast Cancer CSV', color: 'var(--teal)', bg: 'var(--teal-pale)' },
          { type: 'auto', icon: FileSpreadsheet, label: 'Auto-Detect (Any CSV)', color: 'var(--gold)', bg: 'var(--gold-pale)' },
        ].map(({ type, icon: Icon, label, color, bg }) => (
          <motion.label
            key={type}
            whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(26,20,16,0.12)' }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, padding: '48px 24px', borderRadius: 18,
              border: '2px dashed rgba(26,20,16,0.12)', cursor: 'pointer',
              background: 'white', transition: 'border-color 0.3s',
            }}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = color; }}
            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(26,20,16,0.12)'; }}
            onDrop={(e) => { e.currentTarget.style.borderColor = 'rgba(26,20,16,0.12)'; handleDrop(e, type); }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={22} color={color} />
            </div>
            <span style={{ fontWeight: 500, fontSize: 14 }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Drag & drop or click to browse</span>
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelect(type)} />
          </motion.label>
        ))}
      </motion.div>

      {uploading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="loader-dna" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: 'var(--ink4)' }}>Processing dataset...</p>
        </div>
      )}

      {/* Dataset Stats */}
      {uploadedType && bulkPredictions && (
        <>
          <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
            <span className={`badge badge-${uploadedType === 'heart' ? 'heart' : 'cancer'}`} style={{ fontSize: 13, padding: '6px 16px' }}>
              {uploadedType === 'heart' ? '❤️' : '🎗️'} {uploadedType === 'heart' ? 'Heart Disease' : 'Breast Cancer'} Dataset
              · {bulkPredictions.total} Patients · Auto-Analyzed
            </span>
          </motion.div>

          {/* Stat Cards */}
          <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'TOTAL PATIENTS', value: bulkPredictions.total, color: 'var(--ink)' },
              { label: 'HIGH RISK', value: bulkPredictions.high_risk, color: 'var(--rose)' },
              { label: 'MEDIUM RISK', value: bulkPredictions.medium_risk, color: 'var(--gold)' },
              { label: 'LOW RISK', value: bulkPredictions.low_risk, color: 'var(--sage)' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </motion.div>

          {/* Donut Charts */}
          <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
            <div className="card" style={{ padding: 32 }}>
              <DonutChart
                title="Risk Distribution"
                data={[
                  { label: 'High', value: bulkPredictions.high_risk },
                  { label: 'Medium', value: bulkPredictions.medium_risk },
                  { label: 'Low', value: bulkPredictions.low_risk },
                ]}
                colors={['var(--rose)', 'var(--gold)', 'var(--sage)']}
              />
            </div>
            <div className="card" style={{ padding: 32 }}>
              <DonutChart
                title="Score Band Distribution"
                data={[
                  { label: '>65%', value: predictions.filter(p => p.probability > 0.65).length },
                  { label: '35-65%', value: predictions.filter(p => p.probability >= 0.35 && p.probability <= 0.65).length },
                  { label: '<35%', value: predictions.filter(p => p.probability < 0.35).length },
                ]}
                colors={['var(--rose)', 'var(--gold)', 'var(--sage)']}
              />
            </div>
          </motion.div>

          {/* Search & Filter */}
          <motion.div variants={itemVariants} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <Search size={14} color="var(--ink4)" />
              <input placeholder="Search patients..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="pill-selector">
              {['all', 'high', 'medium', 'low'].map((f) => (
                <button key={f} className={`pill ${riskFilter === f ? 'active' : ''}`} onClick={() => { setRiskFilter(f); setCurrentPage(1); }}>
                  {f === 'all' ? 'All Risk' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Prediction Table */}
          <motion.div variants={itemVariants} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient ID</th>
                  <th>Key Features</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, i) => {
                  const feats = p.features || {};
                  const keyFeats = uploadedType === 'heart'
                    ? `Age: ${feats.age || '-'} | Chol: ${feats.chol || '-'} | BP: ${feats.trestbps || '-'}`
                    : `Radius: ${(feats.mean_radius || 0).toFixed(1)} | Area: ${(feats.mean_area || 0).toFixed(0)} | Texture: ${(feats.mean_texture || 0).toFixed(1)}`;
                  return (
                    <tr key={i} className={`row-${p.risk_level}`}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink4)' }}>{(currentPage - 1) * rowsPerPage + i + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{p.patient_id}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)' }}>{keyFeats}</td>
                      <td style={{ width: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                            <div
                              className={`progress-bar-fill ${p.risk_level === 'high' ? 'rose' : p.risk_level === 'medium' ? 'gold' : 'sage'}`}
                              style={{ width: `${p.risk_percentage || 50}%` }}
                            />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, width: 36, textAlign: 'right' }}>{p.risk_percentage}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${p.risk_level}`}>
                          {p.risk_level === 'high' ? '⚠️' : p.risk_level === 'medium' ? '⚡' : '✅'} {p.risk_level}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => openPatientDetail(p)} style={{ fontSize: 11 }}>
                          Detail <ExternalLink size={10} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination" style={{ padding: '16px 0' }}>
                <button className="page-btn" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  return (
                    <button key={page} className={`page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  );
                })}
                <button className="page-btn" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <motion.div
            className="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h3>{selectedPatient.patient_id}</h3>
                <span className={`badge badge-${uploadedType === 'heart' ? 'heart' : 'cancer'}`} style={{ marginTop: 8, display: 'inline-flex' }}>
                  {uploadedType === 'heart' ? 'Heart Disease' : 'Breast Cancer'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700,
                  color: selectedPatient.risk_level === 'high' ? 'var(--rose)' : selectedPatient.risk_level === 'medium' ? 'var(--gold)' : 'var(--sage)',
                }}>
                  {selectedPatient.risk_percentage}%
                </div>
                <span className={`badge badge-${selectedPatient.risk_level}`}>
                  {selectedPatient.risk_level === 'high' ? '⚠️ HIGH RISK' : selectedPatient.risk_level === 'medium' ? '⚡ MEDIUM' : '✅ LOW RISK'}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Clinical Features</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Object.entries(selectedPatient.features || {}).slice(0, 12).map(([k, v]) => (
                  <div key={k} style={{ padding: '8px 12px', background: 'var(--cream)', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: 1 }}>{k}</div>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>{typeof v === 'number' ? v.toFixed(2) : v}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedPatient.top_features && (
              <div style={{ marginBottom: 24 }}>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Top Contributing Features</div>
                {selectedPatient.top_features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, width: 120 }}>{f.feature}</span>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-bar-fill gold" style={{ width: `${Math.min(100, f.contribution * 200)}%` }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink4)' }}>{f.contribution.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>🤖 Claude AI Interpretation</div>
              <div style={{
                padding: 16, background: 'var(--cream)', borderRadius: 12,
                fontSize: 13, lineHeight: 1.7, color: 'var(--ink2)',
                fontStyle: explLoading ? 'italic' : 'normal',
              }}>
                {explLoading ? 'Generating clinical interpretation...' : explanation}
              </div>
            </div>

            <button className="btn btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={() => setSelectedPatient(null)}>
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Show message when no predictions yet */}
      {uploadedType && !bulkPredictions && !predictionsLoading && (
        <motion.div variants={itemVariants} className="card" style={{ textAlign: 'center', padding: 48, marginTop: 24 }}>
          <p style={{ color: 'var(--ink4)', marginBottom: 16 }}>
            Dataset uploaded. Train the model first to see bulk predictions.
          </p>
          <button className="btn btn-gold" onClick={() => useAppStore.getState().setActiveTab('train')}>
            Go to Training →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
