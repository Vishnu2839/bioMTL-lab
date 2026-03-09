import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Upload, Cpu, LineChart, BarChart3 } from 'lucide-react';
import useAppStore from '../store/appStore';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Activity },
  { id: 'upload', label: 'Upload Data', icon: Upload },
  { id: 'train', label: 'Train Model', icon: Cpu },
  { id: 'predict', label: 'Predict', icon: LineChart },
  { id: 'results', label: 'Results', icon: BarChart3 },
];

export default function Navbar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 24px',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(250,248,244,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(26,20,16,0.06)' : 'none',
        transition: 'background 0.3s, backdrop-filter 0.3s, border 0.3s',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setActiveTab('home')}
      >
        <span style={{ fontSize: 24 }}>🧬</span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--ink)',
        }}>
          BioMTL<span style={{ color: 'var(--gold)' }}> Lab</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--cream)', borderRadius: 100, padding: 4 }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon size={14} />
            <span style={{ fontSize: 12 }}>{label}</span>
          </button>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink4)', letterSpacing: 2 }}>
        v1.0
      </div>
    </motion.nav>
  );
}
