import React, { useState, useEffect } from 'react';
import { Lock, Save, Eye, EyeOff, Users, UserPlus, Trash2, Power, PowerOff } from 'lucide-react';
import { 
    changePassword,
    getListarUsuariosAdmin,
    getUsuarioAdById,
    createUsuarioNew,
    updateUsuarioRol,
    updateUsuarioEstado,
    eliminarUsuarioAdmin
} from '../services/empleadosAPI';
import { useNotification } from '../Hooks/useNotification';
import { useAuth } from '../context/AuthContext';
import { Modal, ModalFooter } from '../Components/Modal/Modal';
import { useConfirm } from '../Hooks/useConfirm';
import '../styles/components/_configuracion.scss';

export default function Configuracion() {
    const notify = useNotification();
    const confirm = useConfirm();
    const { user } = useAuth();
    
    // Obtener el rol del usuario
    const userRole = user?.userRol || user?.rol || user?.role || user?.rolUsuario;
    const isAdministrator = userRole === 'ADMINISTRATOR';
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPasswords, setShowPasswords] = useState({
        actual: false,
        nueva: false,
        confirmacion: false
    });

    const [passwordData, setPasswordData] = useState({
        passwordActual: '',
        passwordNueva: '',
        passwordNuevaConfirmacion: ''
    });

    // Estados para administración de usuarios
    const [usuarios, setUsuarios] = useState([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({
        username: '',
        nombre: '',
        apellido: '',
        email: '',
        password: ''
    });
    const [userFormErrors, setUserFormErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        
        if (!passwordData.passwordActual) {
            newErrors.passwordActual = 'La contraseña actual es requerida';
        }
        
        if (!passwordData.passwordNueva) {
            newErrors.passwordNueva = 'La nueva contraseña es requerida';
        } else if (passwordData.passwordNueva.length < 6) {
            newErrors.passwordNueva = 'La contraseña debe tener al menos 6 caracteres';
        }
        
        if (!passwordData.passwordNuevaConfirmacion) {
            newErrors.passwordNuevaConfirmacion = 'La confirmación de contraseña es requerida';
        } else if (passwordData.passwordNueva !== passwordData.passwordNuevaConfirmacion) {
            newErrors.passwordNuevaConfirmacion = 'Las contraseñas no coinciden';
        }

        if (passwordData.passwordActual === passwordData.passwordNueva) {
            newErrors.passwordNueva = 'La nueva contraseña debe ser diferente a la actual';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
        // Limpiar error del campo cuando el usuario empiece a escribir
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await changePassword({
                passwordActual: passwordData.passwordActual,
                passwordNueva: passwordData.passwordNueva,
                passwordNuevaConfirmacion: passwordData.passwordNuevaConfirmacion
            });

            notify.success('Contraseña actualizada correctamente');
            
            // Limpiar formulario
            setPasswordData({
                passwordActual: '',
                passwordNueva: '',
                passwordNuevaConfirmacion: ''
            });
            setErrors({});
        } catch (error) {
            notify.error(error);
            const errorMessage = error.response?.data?.message || 'Error al cambiar la contraseña. Verifica los datos ingresados.';
            setErrors({ general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Funciones para administración de usuarios
    useEffect(() => {
        if (isAdministrator) {
            loadUsuarios();
        }
    }, [isAdministrator]);

    const loadUsuarios = async () => {
        setLoadingUsuarios(true);
        try {
            const data = await getListarUsuariosAdmin();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch (error) {
            notify.error('Error al cargar usuarios');
            console.error('Error al cargar usuarios:', error);
        } finally {
            setLoadingUsuarios(false);
        }
    };

    const handleOpenUserModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setUserFormData({
                username: user.username || '',
                nombre: user.nombre || '',
                apellido: user.apellido || '',
                email: user.email || '',
                password: ''
            });
        } else {
            setEditingUser(null);
            setUserFormData({
                username: '',
                nombre: '',
                apellido: '',
                email: '',
                password: ''
            });
        }
        setUserFormErrors({});
        setShowUserModal(true);
    };

    const handleCloseUserModal = () => {
        setShowUserModal(false);
        setEditingUser(null);
        setUserFormData({
            username: '',
            nombre: '',
            apellido: '',
            email: '',
            password: ''
        });
        setUserFormErrors({});
    };

    const validateUserForm = () => {
        const errors = {};
        
        if (!userFormData.username.trim()) {
            errors.username = 'El nombre de usuario es requerido';
        }
        
        if (!userFormData.nombre.trim()) {
            errors.nombre = 'El nombre es requerido';
        }
        
        if (!userFormData.apellido.trim()) {
            errors.apellido = 'El apellido es requerido';
        }
        
        if (!editingUser && !userFormData.password.trim()) {
            errors.password = 'La contraseña es requerida para nuevos usuarios';
        } else if (userFormData.password && userFormData.password.length < 6) {
            errors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        setUserFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveUser = async () => {
        if (!validateUserForm()) {
            return;
        }

        try {
            const payload = {
                username: userFormData.username.trim(),
                nombre: userFormData.nombre.trim(),
                apellido: userFormData.apellido.trim(),
                email: userFormData.email.trim() || null
            };

            if (!editingUser) {
                // Crear nuevo usuario
                payload.password = userFormData.password;
                await createUsuarioNew(payload);
                notify.success('Usuario creado exitosamente');
            } else {
                // Actualizar usuario (solo si cambió la contraseña)
                if (userFormData.password) {
                    payload.password = userFormData.password;
                }
                // Nota: La API actual no tiene un endpoint para actualizar usuario completo
                // Solo podemos actualizar rol y estado
                notify.info('Para actualizar datos del usuario, use las opciones de rol y estado');
            }
            
            handleCloseUserModal();
            loadUsuarios();
        } catch (error) {
            notify.error(error);
        }
    };

    const handleChangeRol = async (userId, nuevoRol) => {
        const confirmed = await confirm({
            title: 'Cambiar rol de usuario',
            message: `¿Está seguro de cambiar el rol a "${nuevoRol}"?`,
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            // El backend espera nuevoRol según el DTO UsuarioUpdateDTO
            await updateUsuarioRol(userId, { nuevoRol: nuevoRol });
            notify.success('Rol actualizado exitosamente');
            loadUsuarios();
        } catch (error) {
            notify.error(error);
        }
    };

    const handleToggleEstado = async (userId, estadoActual) => {
        const nuevoEstado = !estadoActual;
        const confirmed = await confirm({
            title: nuevoEstado ? 'Activar usuario' : 'Desactivar usuario',
            message: `¿Está seguro de ${nuevoEstado ? 'activar' : 'desactivar'} este usuario?`,
            type: nuevoEstado ? 'info' : 'warning'
        });

        if (!confirmed) return;

        try {
            await updateUsuarioEstado(userId, { activo: nuevoEstado });
            notify.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
            loadUsuarios();
        } catch (error) {
            notify.error(error);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        const confirmed = await confirm({
            title: 'Eliminar usuario',
            message: `¿Está seguro de eliminar al usuario "${username}"? Esta acción no se puede deshacer.`,
            type: 'danger',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            await eliminarUsuarioAdmin(userId);
            notify.success('Usuario eliminado exitosamente');
            loadUsuarios();
        } catch (error) {
            notify.error(error);
        }
    };

    const getRolDisplayName = (rol) => {
        const roles = {
            'NEW_USER': 'Nuevo Usuario',
            'USER': 'Usuario',
            'ADMINISTRATOR': 'Administrador'
        };
        return roles[rol] || rol;
    };

    return (
        <div className="configuracion">
            <div className="configuracion-header">
                <h1 className="title title-gradient animated-title">
                    Configuración
                </h1>
                <p className="subtitle">
                    {isAdministrator ? 'Administración del sistema' : 'Configuración del sistema'}
                </p>
            </div>

            <div className="configuracion-content">
                {/* Sección de Administración de Usuarios - Solo para ADMINISTRATOR */}
                {isAdministrator && (
                    <div className="config-section">
                        <div className="section-header">
                            <Users className="section-icon" />
                            <h2 className="section-title">Administración de Usuarios</h2>
                            <button
                                className="btn btn-primary btn-create-user"
                                onClick={() => handleOpenUserModal()}
                            >
                                <UserPlus className="btn-icon" />
                                Crear Usuario
                            </button>
                        </div>

                        {loadingUsuarios ? (
                            <div className="loading-message">Cargando usuarios...</div>
                        ) : usuarios.length === 0 ? (
                            <div className="empty-message">No hay usuarios registrados</div>
                        ) : (
                            <div className="users-table-wrapper">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Nombre</th>
                                            <th>Apellido</th>
                                            <th>Email</th>
                                            <th>Rol</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.map((usuario) => (
                                            <tr key={usuario.idUsuario}>
                                                <td>{usuario.username}</td>
                                                <td>{usuario.nombre || '-'}</td>
                                                <td>{usuario.apellido || '-'}</td>
                                                <td>{usuario.email || '-'}</td>
                                                <td>
                                                    <select
                                                        className="rol-select"
                                                        value={usuario.userRol || usuario.rol || 'USER'}
                                                        onChange={(e) => handleChangeRol(usuario.idUsuario, e.target.value)}
                                                    >
                                                        <option value="NEW_USER">Nuevo Usuario</option>
                                                        <option value="USER">Usuario</option>
                                                        <option value="ADMINISTRATOR">Administrador</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${usuario.activo ? 'active' : 'inactive'}`}>
                                                        {usuario.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn-action btn-toggle-state"
                                                            onClick={() => handleToggleEstado(usuario.idUsuario, usuario.activo)}
                                                            title={usuario.activo ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {usuario.activo ? (
                                                                <PowerOff className="action-icon" />
                                                            ) : (
                                                                <Power className="action-icon" />
                                                            )}
                                                        </button>
                                                        <button
                                                            className="btn-action btn-delete"
                                                            onClick={() => handleDeleteUser(usuario.idUsuario, usuario.username)}
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="action-icon" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Sección de Cambiar Contraseña - Visible para todos */}
                <div className="config-section">
                    <div className="section-header">
                        <Lock className="section-icon" />
                        <h2 className="section-title">Cambiar Contraseña</h2>
                    </div>

                    {errors.general && (
                        <div className="error-alert">
                            {errors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="password-form">
                        <div className="form-group">
                            <label className="form-label">
                                Contraseña Actual *
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.actual ? 'text' : 'password'}
                                    className={`form-input ${errors.passwordActual ? 'error' : ''}`}
                                    value={passwordData.passwordActual}
                                    onChange={(e) => handleInputChange('passwordActual', e.target.value)}
                                    placeholder="Ingresa tu contraseña actual"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('actual')}
                                    tabIndex={-1}
                                >
                                    {showPasswords.actual ? (
                                        <EyeOff className="toggle-icon" />
                                    ) : (
                                        <Eye className="toggle-icon" />
                                    )}
                                </button>
                            </div>
                            {errors.passwordActual && (
                                <span className="error-message">{errors.passwordActual}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Nueva Contraseña *
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.nueva ? 'text' : 'password'}
                                    className={`form-input ${errors.passwordNueva ? 'error' : ''}`}
                                    value={passwordData.passwordNueva}
                                    onChange={(e) => handleInputChange('passwordNueva', e.target.value)}
                                    placeholder="Ingresa tu nueva contraseña (mín. 6 caracteres)"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('nueva')}
                                    tabIndex={-1}
                                >
                                    {showPasswords.nueva ? (
                                        <EyeOff className="toggle-icon" />
                                    ) : (
                                        <Eye className="toggle-icon" />
                                    )}
                                </button>
                            </div>
                            {errors.passwordNueva && (
                                <span className="error-message">{errors.passwordNueva}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Confirmar Nueva Contraseña *
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.confirmacion ? 'text' : 'password'}
                                    className={`form-input ${errors.passwordNuevaConfirmacion ? 'error' : ''}`}
                                    value={passwordData.passwordNuevaConfirmacion}
                                    onChange={(e) => handleInputChange('passwordNuevaConfirmacion', e.target.value)}
                                    placeholder="Confirma tu nueva contraseña"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('confirmacion')}
                                    tabIndex={-1}
                                >
                                    {showPasswords.confirmacion ? (
                                        <EyeOff className="toggle-icon" />
                                    ) : (
                                        <Eye className="toggle-icon" />
                                    )}
                                </button>
                            </div>
                            {errors.passwordNuevaConfirmacion && (
                                <span className="error-message">{errors.passwordNuevaConfirmacion}</span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-save"
                            disabled={loading}
                        >
                            <Save className="btn-icon" />
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Modal para crear/editar usuario */}
            <Modal
                isOpen={showUserModal}
                onClose={handleCloseUserModal}
                title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                size="medium"
            >
                <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }}>
                    <div className="modal-form">
                        <div className="form-group">
                            <label className="form-label">
                                Nombre de Usuario *
                            </label>
                            <input
                                type="text"
                                className={`form-input ${userFormErrors.username ? 'error' : ''}`}
                                value={userFormData.username}
                                onChange={(e) => {
                                    setUserFormData({ ...userFormData, username: e.target.value });
                                    if (userFormErrors.username) {
                                        setUserFormErrors({ ...userFormErrors, username: '' });
                                    }
                                }}
                                placeholder="Ingrese el nombre de usuario"
                                disabled={!!editingUser}
                            />
                            {userFormErrors.username && (
                                <span className="error-message">{userFormErrors.username}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                className={`form-input ${userFormErrors.nombre ? 'error' : ''}`}
                                value={userFormData.nombre}
                                onChange={(e) => {
                                    setUserFormData({ ...userFormData, nombre: e.target.value });
                                    if (userFormErrors.nombre) {
                                        setUserFormErrors({ ...userFormErrors, nombre: '' });
                                    }
                                }}
                                placeholder="Ingrese el nombre"
                            />
                            {userFormErrors.nombre && (
                                <span className="error-message">{userFormErrors.nombre}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Apellido *
                            </label>
                            <input
                                type="text"
                                className={`form-input ${userFormErrors.apellido ? 'error' : ''}`}
                                value={userFormData.apellido}
                                onChange={(e) => {
                                    setUserFormData({ ...userFormData, apellido: e.target.value });
                                    if (userFormErrors.apellido) {
                                        setUserFormErrors({ ...userFormErrors, apellido: '' });
                                    }
                                }}
                                placeholder="Ingrese el apellido"
                            />
                            {userFormErrors.apellido && (
                                <span className="error-message">{userFormErrors.apellido}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Email
                            </label>
                            <input
                                type="email"
                                className="form-input"
                                value={userFormData.email}
                                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                                placeholder="Ingrese el email (opcional)"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                            </label>
                            <input
                                type="password"
                                className={`form-input ${userFormErrors.password ? 'error' : ''}`}
                                value={userFormData.password}
                                onChange={(e) => {
                                    setUserFormData({ ...userFormData, password: e.target.value });
                                    if (userFormErrors.password) {
                                        setUserFormErrors({ ...userFormErrors, password: '' });
                                    }
                                }}
                                placeholder={editingUser ? "Dejar vacío para no cambiar" : "Ingrese la contraseña (mín. 6 caracteres)"}
                            />
                            {userFormErrors.password && (
                                <span className="error-message">{userFormErrors.password}</span>
                            )}
                        </div>
                    </div>
                </form>
                <ModalFooter>
                    <button
                        className="btn btn-secondary"
                        onClick={handleCloseUserModal}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveUser}
                    >
                        <Save className="btn-icon" />
                        {editingUser ? 'Actualizar' : 'Crear'}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}