import api from '../services/axiosClient';
import { removeToken, setToken } from '../utils/authStorage';

export const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const token = response.data.token;
    if (token) {
        setToken(token);
    }
    return response.data;
};

export const register = async (username, password, nombre, apellido, correo) => {
    const response = await api.post('/auth/register', { 
        username, 
        password, 
        nombre, 
        apellido, 
        correo 
    });
    const token = response.data.token;
    if (token) {
        setToken(token);
    }
    return response.data;
};

export const logout = () => {
    removeToken();
};