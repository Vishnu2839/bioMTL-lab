import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

function AnimatedCounter({ target, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count}{suffix}</span>;
}

export default function HeroStats() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.7 }}
      className="hero-stats-bar"
    >
      {[
        { value: 2, suffix: '', label: 'BIOMEDICAL TASKS' },
        { value: 871, suffix: '+', label: 'PATIENT RECORDS' },
        { value: 43, suffix: '', label: 'CLINICAL FEATURES' },
        { value: 10, suffix: '', label: 'LATENT FACTORS' },
      ].map((stat, i) => (
        <div key={i} className="hero-stat-item">
          <div className="hero-stat-value">
            <AnimatedCounter target={stat.value} suffix={stat.suffix} />
          </div>
          <div className="hero-stat-label">{stat.label}</div>
        </div>
      ))}
    </motion.div>
  );
}
