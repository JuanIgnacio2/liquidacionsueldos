import axiosClient from "./axiosClient";

export const getEmployees = () =>
    axiosClient.get('empleados').then((r)=> r.data);

export const createEmployee = (dto) =>
    axiosClient.post('empleados', dto).then((r)=>r.data);

export const updateEmployee = (legajo, data) =>
    axiosClient.put(`empleados/${legajo}`, data).then((r)=> r.data);

export const updateStateEmployee = (legajo) =>
    axiosClient.put(`empleados/${legajo}/estado`).then((r)=> r.data);

export const getEmpleadoByLegajo = (legajo) =>
    axiosClient.get(`/empleados/${legajo}`).then((r)=>r.data);

export const getCountActiveEmployees = () =>
    axiosClient.get(`/empleados/count/activos`).then((r)=>r.data);

export const getCategoriaById = (id) =>
    axiosClient.get(`/categorias/${id}`).then((r)=>r.data);

export const getCategorias = () =>
    axiosClient.get(`/categorias`).then((r)=>r.data);

export const getPorcentajeArea = (idArea, idCat) =>
    axiosClient.get(`bonificaciones-variables/area/${idArea}/categoria/${idCat}`).then((r)=>r.data);

export const getConceptosLyF = () =>
    axiosClient.get(`/conceptos_lyf`).then((r)=>r.data);

export const getConceptosUocra = () =>
    axiosClient.get(`/conceptos_uocra`).then((r)=>r.data);

export const getDescuentos = () =>
    axiosClient.get(`/descuento`).then((r)=>r.data);

export const guardarLiquidacion = (dto) =>
    axiosClient.post('/liquidaciones', dto).then((r) => r.data);

export const getConceptosAsignados = (legajo) =>
    axiosClient.get(`/empleado-conceptos/por-legajo/${legajo}`).then((r)=>r.data);

export const getPagos = () =>
    axiosClient.get(`/liquidaciones`).then((r)=>r.data);

export const getDetallePago = (idPago) =>
    axiosClient.get(`/liquidaciones/${idPago}`).then((r)=>r.data);

export const getConvenios = () =>
    axiosClient.get(`/convenios`).then((r)=>r.data);

export const countConvenios = () =>
    axiosClient.get(`/convenios/count`).then((r)=>r.data);

export const getConveniosNombre = (controller) =>
    axiosClient.get(`/convenios/${controller}`).then((r)=>r.data);

export const updateBasicoLyF = (lista) =>
    axiosClient.put(`/convenios/lyf/basico`, lista).then((r)=>r.data);

export const updateBasicoUocra = (lista) =>
    axiosClient.put(`/convenios/uocra/basico`, lista).then((r)=>r.data);

export const getAreas = () =>
    axiosClient.get(`/areas`).then((r)=>r.data);

export const getZonas = () =>
    axiosClient.get(`/zonas`).then((r)=>r.data);

export const getBasicoByCatAndZona = (idCategoria, idZona) =>
    axiosClient.get(`/categorias-zonas-uocra/categoria/${idCategoria}/zona/${idZona}`).then((r)=>r.data);