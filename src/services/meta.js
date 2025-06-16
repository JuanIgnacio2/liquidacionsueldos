import axios from './axiosClient';

export const getCategorias = async () => {
    const res = await axios.get('/api/categorias');
    return res.data;
}

export const getAreas = async () => {
    const res = await axios.get('/api/areas');
    return res.data;
}