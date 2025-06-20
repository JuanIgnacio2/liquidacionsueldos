import axiosClient from "./axiosClient";

export const getEmployees = () =>
    axiosClient.get('empleados').then((r)=> r.data);

export const createEmployee = (dto) =>
    axiosClient.post('empleados', dto).then((r)=>r.data);

export const updateEmployee = (legajo, data) =>
    axiosClient.put(`empleados/${legajo}`).then((r)=> r.data);

export const deleteEmployee = (legajo) =>
    axiosClient.delete(`empleados/${legajo}`);

export const getEmpleadoByLegajo = (legajo) =>
    axiosClient.get(`/empleados/${legajo}`).then((r)=>r.data);

export const getCategoriaById = (id) =>
    axiosClient.get(`/categorias/${id}`).then((r)=>r.data);

export const getPorcentajeArea = (idArea, idCat) =>
    axiosClient.get(`bonificaciones-variables/area/${idArea}/categoria/${idCat}`).then((r)=>r.data);

export const getConceptos = () =>
    axiosClient.get(`/bonificaciones-fijas`).then((r)=>r.data);

export const guardarLiquidacion = (dto) =>
  axiosClient.post('/liquidaciones', dto).then((r) => r.data);