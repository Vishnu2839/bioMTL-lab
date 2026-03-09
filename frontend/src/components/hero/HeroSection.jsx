import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Dna, HeartPulse, Microscope } from 'lucide-react';
import MoleculeCanvas from './MoleculeCanvas';
import HeroStats from './HeroStats';
import useAppStore from '../../store/appStore';
import { containerVariants, itemVariants } from '../../utils/animations';

export default function HeroSection() {
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="hero-section"
    >
      {/* Three.js DNA — background on all sizes */}
      <div className="hero-canvas-wrap">
        <MoleculeCanvas />
      </div>

      <div className="container hero-content">
        <div className="hero-text-block">
          <motion.div variants={itemVariants} className="eyebrow">
            Multi-Task Learning Framework
          </motion.div>

          <motion.h1 variants={itemVariants} style={{ marginBottom: 20 }}>
            <span style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Factorization-Driven</span>
            <br />
            Biomedical Data Analysis
          </motion.h1>

          <motion.p variants={itemVariants} className="hero-description">
            Simultaneously predict Heart Attack Risk and Breast Cancer Malignancy using a shared
            Multi-Task Learning model powered by NMF Matrix Factorization — achieving superior
            accuracy on limited biomedical data.
          </motion.p>

          <motion.div variants={itemVariants} className="hero-buttons">
            <motion.button
              className="btn btn-gold btn-lg"
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('upload')}
            >
              <UploadIcon size={18} />
              Get Started
              <ArrowRight size={16} />
            </motion.button>
            <motion.button
              className="btn btn-secondary btn-lg"
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('train')}
            >
              <Dna size={18} />
              Train Model
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants} className="hero-badges">
            <div className="hero-badge-item">
              <div className="hero-badge-icon" style={{ background: 'var(--rose-pale)' }}>
                <HeartPulse size={18} color="var(--rose)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Heart Disease</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>302 patients</div>
              </div>
            </div>
            <div className="hero-badge-item">
              <div className="hero-badge-icon" style={{ background: 'var(--teal-pale)' }}>
                <Microscope size={18} color="var(--teal)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Breast Cancer</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>569 patients</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <HeroStats />
    </motion.section>
  );
}

function UploadIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
