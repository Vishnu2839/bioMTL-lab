import React from 'react';
import { motion } from 'framer-motion';

export default function Loader() {
  return (
    <motion.div
      className="loader-screen"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="loader-dna" />
      <h1 className="loader-title">BioMTL Lab</h1>
      <p className="loader-subtitle">Initializing Multi-Task Framework</p>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        style={{
          height: 2,
          background: 'linear-gradient(90deg, var(--gold), var(--gold2))',
          borderRadius: 1,
          marginTop: 24,
        }}
      />
    </motion.div>
  );
}
