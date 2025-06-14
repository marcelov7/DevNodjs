import axios from 'axios';

// Configuração da API baseada no ambiente
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Limpar a variável de ambiente (remover "Value:" se existir)
const cleanApiUrl = (url: string | undefined): string => {
  if (!url) return '';
  // Remover "Value:" do início se existir
  return url.replace(/^Value:\s*/, '').trim();
};

const rawApiUrl = cleanApiUrl(process.env.REACT_APP_API_URL);

// URLs da API
const API_URLS = {
  development: 'http://localhost:5000/api',
  production: rawApiUrl?.endsWith('/api') 
    ? rawApiUrl 
    : (rawApiUrl || 'https://server-poy8.onrender.com') + '/api'
};

// URL base da API
export const API_BASE_URL = isProduction ? API_URLS.production : API_URLS.development;

console.log('🌐 Ambiente:', process.env.NODE_ENV);
console.log('🔧 REACT_APP_API_URL raw:', process.env.REACT_APP_API_URL);
console.log('🔧 REACT_APP_API_URL limpa:', rawApiUrl);
console.log('🔧 API_URLS.production:', API_URLS.production);
console.log('🔗 API_BASE_URL final:', API_BASE_URL);

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
    return response;
  },
  (error) => {
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