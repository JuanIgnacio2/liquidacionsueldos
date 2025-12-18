import axios from 'axios';

const axiosClient = axios.create({
    //baseURL: import.meta.env.API_URL || 'http://localhost:8080/api',
    //baseURL: 'http://localhost:8080/api/',
    //baseURL: 'http://192.168.1.101:8080/api/',
    baseURL: 'https://backend-liquidaci-n-25-de-mayo.onrender.com/api/',
    headers: {'Content-Type' : 'application/json'},
    timeout: 10_000,
});

//Interceptor para tokens JWT
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si recibimos un 401 (no autorizado), limpiar token y redirigir a login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Solo redirigir si no estamos ya en la página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;