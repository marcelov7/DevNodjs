import axios from 'axios';

// Configuração da API baseada no ambiente
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

console.log('🌐 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 isDevelopment:', isDevelopment);
console.log('🔍 isProduction:', isProduction);
console.log('🔍 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

// URLs da API
const API_URLS = {
  development: 'http://localhost:5000/api',
  production: (process.env.REACT_APP_API_URL || 'https://server-poy8.onrender.com') + '/api'
};

console.log('🔍 API_URLS:', API_URLS);

// URL base da API
export const API_BASE_URL = isProduction ? API_URLS.production : API_URLS.development;

console.log('🌐 Ambiente:', process.env.NODE_ENV);
console.log('🔗 API URL FINAL:', API_BASE_URL);

// Configuração do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    console.log('🚀 REQUEST:', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''));
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    console.log('✅ RESPONSE:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ ERROR:', error.response?.status, error.config?.url, error.message);
    // Se token expirou, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 