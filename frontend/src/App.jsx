import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from './utils/api';
import Navbar from './components/Navbar';
import Loader from './components/Loader';
import Marquee from './components/Marquee';
import Toast from './components/Toast';
import HeroSection from './components/hero/HeroSection';
import UploadTab from './components/upload/UploadTab';
import TrainTab from './components/train/TrainTab';
import PredictTab from './components/predict/PredictTab';
import ResultsTab from './components/results/ResultsTab';
import useAppStore from './store/appStore';

function App() {
  const [loading, setLoading] = useState(true);
  const activeTab = useAppStore((s) => s.activeTab);
  const toasts = useAppStore((s) => s.toasts);

  useEffect(() => {
   //wake up render where frontend wakes backend through api
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/health`)
      .then(r => r.json())
      .then(() => console.log('✅ Backend is awake'))
      .catch(() => console.log('⏳ Backend waking up...'));

    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'upload': return <UploadTab />;
      case 'train': return <TrainTab />;
      case 'predict': return <PredictTab />;
      case 'results': return <ResultsTab />;
      default: return <HeroSection />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {loading && <Loader key="loader" />}
      </AnimatePresence>

      {!loading && (
        <>
          <Navbar />
          <main>
            <AnimatePresence mode="wait">
              {activeTab === 'home' && <HeroSection key="hero" />}
            </AnimatePresence>
            {activeTab === 'home' && <Marquee />}
            <AnimatePresence mode="wait">
              {activeTab !== 'home' && (
                <motion.div 
                  key={activeTab} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ minHeight: '80vh', paddingTop: 100 }}
                >
                  {renderTab()}
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <Toast toasts={toasts} />
        </>
      )}
    </>
  );
}

export default App;
