import axiosClient from "./axiosClient";

export const getEmployees = () =>
    axiosClient.get('empleados').then((r)=> r.data);

export const getEmployeesPaginated = (page = 0, size = 10, gremio = null, estado = null, search = null) => {
    const params = { page, size };
    if (gremio) params.gremio = gremio;
    if (estado) params.estado = estado;
    if (search) params.search = search;
    return axiosClient.get('empleados/paginado', { params }).then((r) => r.data);
};

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
    axiosClient.get(`/conceptos/lyf`).then((r)=>r.data);

export const getTitulosLyF = () =>
    axiosClient.get(`/titulos/lyf`).then((r)=>r.data);

export const getConceptosUocra = () =>
    axiosClient.get(`/uocra/conceptos`).then((r)=>r.data);

export const getHorasExtrasLyF = () =>
    axiosClient.get(`/horas-extras-lyf`).then((r)=>r.data);

export const getDescuentos = () =>
    axiosClient.get(`/descuentos`).then((r)=>r.data);

export const getDescuentosLyF = () =>
    axiosClient.get(`/descuentos/lyf`).then((r)=>r.data);

export const getDescuentosUocra = () =>
    axiosClient.get(`/descuentos/uocra`).then((r)=>r.data);

export const getConceptosGenerales = () =>
    axiosClient.get(`/conceptos/generales`).then((r)=>r.data);

export const getConceptosGeneralesById = (id) =>
    axiosClient.get(`/conceptos/generales/${id}`).then((r)=>r.data);

export const createConceptoGeneral = (dto) =>
    axiosClient.post(`/conceptos/generales`, dto).then((r)=>r.data);

export const updateConceptoGeneral = (id, dto) =>
    axiosClient.put(`/conceptos/generales/${id}`, dto).then((r)=>r.data);

export const getConceptosManualesLyF = () =>
    axiosClient.get(`/conceptos/manuales-lyf`).then((r)=>r.data);

export const createConceptoManualLyF = (dto) =>
    axiosClient.post(`/conceptos/manuales-lyf`, dto).then((r)=>r.data);

export const updateConceptoManualLyF = (id, dto) =>
    axiosClient.put(`/conceptos/manuales-lyf/${id}`, dto).then((r)=>r.data);

export const guardarLiquidacion = (dto) =>
    axiosClient.post('/pagos', dto).then((r) => r.data);

export const completarPago = (idPago) =>
    axiosClient.patch(`/pagos/${idPago}/completar`).then((r) => r.data);

export const completarPagoMasivo = (periodo, fechaPago) =>
    axiosClient.patch(`/pagos/completar-masivo`, { periodo, fechaPago: fechaPago ?? null }).then((r)=>r.data);

export const getConceptosAsignados = (legajo) =>
    axiosClient.get(`/empleado-conceptos/por-legajo/${legajo}`).then((r)=>r.data);

export const getPagos = () =>
    axiosClient.get(`/pagos`).then((r)=>r.data);

export const getPagosPaginated = (page = 0, size = 10, gremio = null, periodoDesde = null, periodoHasta = null) => {
    const params = { page, size };
    if (gremio) params.gremio = gremio;
    if (periodoDesde) params.periodoDesde = periodoDesde;
    if (periodoHasta) params.periodoHasta = periodoHasta;
    return axiosClient.get('/pagos/paginado', { params }).then((r) => r.data);
};

export const getPagosByEmpleado = (legajo) =>
    axiosClient.get(`/pagos/empleado/${legajo}`).then((r)=>r.data);

export const getUltimosPagos = () =>
    axiosClient.get(`/pagos/ultimos`).then((r)=>r.data);

export const getDetallePago = (idPago) =>
    axiosClient.get(`/pagos/${idPago}`).then((r)=>r.data);

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

export const getPagosByPeriodo = (periodo) =>
    axiosClient.get(`/pagos/periodo/${periodo}`).then((r)=>r.data);

export const getDashboardStats = () =>
    axiosClient.get(`/pagos/dashboard/mes-actual`).then((r)=>r.data);

export const getResumeMonth = () =>
    axiosClient.get(`/pagos/resumen-conceptos/mes-actual`).then((r)=>r.data);

export const getResumeCustomMonth = (periodo) =>
    axiosClient.get(`/pagos/resumen-conceptos/${periodo}`).then((r)=>r.data);

export const getResumenEmpleado = (legajo, anio = null) => {
    const params = anio ? { anio } : {};
    return axiosClient.get(`/pagos/resumen-conceptos/empleado/${legajo}`, { params }).then((r)=>r.data);
};

export const getResumenGremio = (gremio) =>
    axiosClient.get(`/pagos/resumen-conceptos/gremio/${gremio}`).then((r)=>r.data);

export const registrarActividad = (dto) =>
    axiosClient.post(`/actividad`, dto).then((r)=>r.data);

export const getActividadesRecientes = () =>
    axiosClient.get(`/actividad/reciente`).then((r)=>r.data);

export const getActividadesRecientesTipo = (tipo) =>
    axiosClient.get(`/actividad/reciente/tipo/${tipo}`).then((r)=>r.data);

export const getActividadesRecientesUsuario = (usuario) =>
    axiosClient.get(`/actividad/reciente/usuario/${usuario}`).then((r)=>r.data);

export const loginUser = (usuario, password) =>
    axiosClient.post('/login', { usuario, password }).then((r)=>r.data);

export const registerUser = (dto) =>
    axiosClient.post('/auth/registro', dto).then((r)=>r.data);
