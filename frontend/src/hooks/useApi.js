import axios from 'axios';
import useAppStore from '../store/appStore';

const api = axios.create({ baseURL: '/api' });

export function useApi() {
  const store = useAppStore();

  const uploadFile = async (file, type = 'auto') => {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = type === 'auto' ? '/upload/auto' : `/upload/${type}`;
    const res = await api.post(endpoint, formData);
    store.addToast({ type: 'success', message: `Uploaded ${res.data.dataset_type} dataset (${res.data.rows} rows)` });
    return res.data;
  };

  const getDatasetsInfo = async () => {
    const res = await api.get('/datasets/info');
    store.setDatasetsInfo(res.data);
    return res.data;
  };

  const getDatasetsPreview = async () => {
    const res = await api.get('/datasets/preview');
    return res.data;
  };

  const startTraining = async (config) => {
    const res = await api.post('/train', config);
    return res.data;
  };

  const predictHeart = async (features) => {
    const res = await api.post('/predict/heart', features);
    return res.data;
  };

  const predictCancer = async (features) => {
    const res = await api.post('/predict/cancer', features);
    return res.data;
  };

  const predictBulk = async (datasetType) => {
    const res = await api.post('/predict/bulk', { dataset_type: datasetType });
    return res.data;
  };

  const getResults = async () => {
    const res = await api.get('/results');
    return res.data;
  };

  const getComparison = async () => {
    const res = await api.get('/results/comparison');
    return res.data;
  };

  const getFactorization = async () => {
    const res = await api.get('/factorization');
    return res.data;
  };

  const getExplanation = async (prediction, features, datasetType, riskLevel) => {
    const res = await api.post('/explain', { prediction, features, dataset_type: datasetType, risk_level: riskLevel });
    return res.data.explanation;
  };

  const suggestParams = async (stats) => {
    const res = await api.post('/suggest-params', stats || {});
    return res.data;
  };

  return {
    uploadFile, getDatasetsInfo, getDatasetsPreview,
    startTraining, predictHeart, predictCancer, predictBulk,
    getResults, getComparison, getFactorization,
    getExplanation, suggestParams,
  };
}
