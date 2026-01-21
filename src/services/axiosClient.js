import axios from 'axios';
import { getToken, removeToken } from '../utils/authStorage';

const axiosClient = axios.create({
    //baseURL: import.meta.env.API_URL
    //baseURL: 'http://192.168.1.101:8080/api/',
    baseURL: 'https://backend-liquidacion-25-de-mayo.onrender.com//api/',
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

/**
 * Función helper para extraer mensajes de error del backend
 * @param {object} errorResponse - Objeto de respuesta de error de axios
 * @returns {string|null} - Mensaje de error extraído o null
 */
const extractBackendMessage = (errorResponse) => {
  if (!errorResponse?.data) {
    return null;
  }

  const data = errorResponse.data;

  // Si data es un string, usarlo directamente
  if (typeof data === 'string') {
    return data;
  }

  // Prioridad 1: campo 'message' (formato estándar del GlobalExceptionHandler)
  if (data.message) {
    return data.message;
  }

  // Prioridad 2: campo 'error'
  if (data.error) {
    return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
  }

  // Prioridad 3: campo 'exception'
  if (data.exception) {
    return data.exception;
  }

  // Prioridad 4: campo 'detail'
  if (data.detail) {
    return data.detail;
  }

  // Prioridad 5: array de errores
  if (Array.isArray(data.errors)) {
    return data.errors.join(', ');
  }

  // Prioridad 6: array de objetos con mensajes
  if (Array.isArray(data) && data.length > 0) {
    const messages = data
      .map(item => item.message || item.error || item)
      .filter(Boolean)
      .join(', ');
    if (messages) return messages;
  }

  return null;
};

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
        window.showNotification?.(
          'La petición tardó demasiado. Intenta nuevamente.',
          'error',
          8000
        );
        return Promise.reject(error);
      }
      
      // Sin respuesta (problema de red)
      if (!error.response) {
        window.showNotification?.(
          'Error de conexión: no se pudo contactar al servidor.',
          'error',
          6000
        );
        return Promise.reject(error);
      }

      // Manejar errores 401
      if (error.response.status === 401) {
        // Unauthorized - token inválido o expirado
        removeToken();

        window.showNotification?.(
          'Sesión expirada. Por favor, inicia sesión nuevamente.',
          'warning',
          6000
        );

        if(!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // Extraer mensaje del backend
      const backendMessage = extractBackendMessage(error.response);

      // Mostrar notificación con el mensaje del backend
      if (backendMessage) {
        window.showNotification?.(backendMessage, 'error', 6000);
      } else {
        // Fallback: mensaje genérico con código de estado
        const statusMessage = error.response.status === 400 
          ? 'Error de validación en los datos enviados.'
          : error.response.status === 404
          ? 'Recurso no encontrado.'
          : error.response.status >= 500
          ? 'Error interno del servidor. Por favor, intente nuevamente más tarde.'
          : `Error inesperado (${error.response.status})`;
        
        window.showNotification?.(statusMessage, 'error', 6000);
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