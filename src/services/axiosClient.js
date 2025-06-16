import axios from 'axios';

const axiosClient = axios.create({
    //baseURL: import.meta.env.API_URL || 'http://localhost:8080/api',
    baseURL: 'http://localhost:8080/api',
    headers: {'Content-Type' : 'aplication/json'},
    timeout: 10_000,
});

//Interceptor para tokens JWT
/*axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});*/

export default axiosClient;