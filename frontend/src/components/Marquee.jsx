import React from 'react';

const ITEMS = [
  'PyTorch', 'NMF Factorization', 'Multi-Task Learning', 'FastAPI',
  'React', 'Three.js', 'scikit-learn', 'SMOTE', 'Claude AI',
  'Biomedical Analysis', 'Heart Disease', 'Breast Cancer', 'Deep Learning',
  'Feature Extraction', 'Shared Encoder', 'Clinical AI',
];

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee-wrapper">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
