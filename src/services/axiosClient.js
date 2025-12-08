import axios from 'axios';
import { getToken, removeToken } from '../utils/authStorage';

const axiosClient = axios.create({
    baseURL: 'https://backend-liquidacion-25-de-mayo.onrender.com/api/',
    headers: {'Content-Type' : 'application/json'},
    timeout: 10_000,
});

// Interceptor global para errores de respuesta / timeout
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      // Detectar timeout (axios usa code 'ECONNABORTED') o mensajes que contengan 'timeout'
      const isTimeout = error?.code === 'ECONNABORTED' || (error?.message || '').toLowerCase().includes('timeout');
      if (isTimeout) {
        if (window && typeof window.showNotification === 'function') {
          window.showNotification('La petición tardó demasiado. Intenta nuevamente.', 'error', 8000);
        }
      } else if (!error.response) {
        // Sin respuesta (problema de red)
        if (window && typeof window.showNotification === 'function') {
          window.showNotification('Error de conexión: no se pudo contactar al servidor.', 'error', 6000);
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

//Interceptor para tokens JWT
/*axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});*/

export default axiosClient;