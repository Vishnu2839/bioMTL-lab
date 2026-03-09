import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Datasets
  heartData: null,
  cancerData: null,
  datasetsInfo: null,

  // Training
  isTraining: false,
  trainingHistory: [],
  trainingComplete: false,
  trainingResults: null,

  // Predictions
  bulkPredictions: null,
  singlePrediction: null,

  // Results
  comparisonResults: null,
  factorizationData: null,

  // UI
  activeTab: 'home',
  toasts: [],
  modelLoaded: false,

  // Actions
  setHeartData: (data) => set({ heartData: data }),
  setCancerData: (data) => set({ cancerData: data }),
  setDatasetsInfo: (info) => set({ datasetsInfo: info }),
  
  setTraining: (val) => set({ isTraining: val }),
  addTrainingEpoch: (metrics) => set((s) => ({
    trainingHistory: [...s.trainingHistory, metrics],
  })),
  resetTraining: () => set({ trainingHistory: [], trainingComplete: false, trainingResults: null }),
  setTrainingComplete: (results) => set({
    isTraining: false,
    trainingComplete: true,
    trainingResults: results,
    modelLoaded: true,
  }),

  setBulkPredictions: (preds) => set({ bulkPredictions: preds }),
  setSinglePrediction: (pred) => set({ singlePrediction: pred }),

  setComparisonResults: (results) => set({ comparisonResults: results }),
  setFactorizationData: (data) => set({ factorizationData: data }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
}));

export default useAppStore;
