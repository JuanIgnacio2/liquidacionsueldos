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
/*axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});*/

export default axiosClient;