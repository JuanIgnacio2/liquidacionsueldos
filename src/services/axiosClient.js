import axios from 'axios';
import { getToken, removeToken } from '../utils/authStorage';

const axiosClient = axios.create({
    //baseURL: import.meta.env.API_URL || 'http://localhost:8080/api',
    //baseURL: 'http://localhost:8080/api/',
    baseURL: 'http://192.168.1.101:8080/api/',
    //baseURL: 'https://backend-liquidaci-n-25-de-mayo.onrender.com/api/',
    headers: {'Content-Type' : 'application/json'},
    timeout: 10_000,
});

// Request interceptor JWT
axiosClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor global para errores de respuesta / timeout
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      // Detectar timeout (axios usa code 'ECONNABORTED') o mensajes que contengan 'timeout'
      const isTimeout = 
        error?.code === 'ECONNABORTED' || 
        (error?.message || '').toLowerCase().includes('timeout');
      
        if (isTimeout) {
        if (window?.showNotification) {
          window.showNotification(
            'La petición tardó demasiado. Intenta nuevamente.',
            'error',
            8000
          );
        }
      } else if (!error.response) {
        // Sin respuesta (problema de red)
        if (window?.showNotification) {
          window.showNotification(
            'Error de conexión: no se pudo contactar al servidor.',
            'error',
            6000
          );
        }
      } else if (error.response.status === 401) {
        // Unauthorized - token inválido o expirado
        removeToken();

        if (window?.showNotification) {
          window.showNotification(
            'Sesión expirada. Por favor, inicia sesión nuevamente.',
            'warning',
            6000
          );
        }
        if(!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } catch (err) {
      // No bloquear el flujo si falla la notificación
      // eslint-disable-next-line no-console
      console.error('Error en interceptor de axios:', err);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;