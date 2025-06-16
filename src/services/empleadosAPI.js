import axiosClient from "./axiosClient";

export const getEmployees = () =>
    axiosClient.get('/empleados').then((r)=> r.data);

export const createEmployee = (data) =>
    axiosClient.post('/empleados', data).then((r)=>r.data);

export const updateEmployee = (legajo, data) =>
    axiosClient.put(`/empleados/${legajo}`).then((r)=> r.data);

export const deleteEmployee = (legajo) =>
    axiosClient.delete(`/empleados/${legajo}`);