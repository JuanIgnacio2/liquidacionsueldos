import React, { useState } from 'react';
import { Lock, Save, Eye, EyeOff } from 'lucide-react';
import { changePassword } from '../services/empleadosAPI';
import { useNotification } from '../Hooks/useNotification';
import '../styles/components/_configuracion.scss';

export default function Configuracion() {
    const notify = useNotification();
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
            const errorMessage = error.response?.data?.message || 'Error al cambiar la contraseña. Verifica los datos ingresados.';
            notify.error(errorMessage);
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

    return (
        <div className="configuracion">
            <div className="configuracion-header">
                <h1 className="title title-gradient animated-title">
                    Configuración
                </h1>
                <p className="subtitle">
                    Configuración del sistema
                </p>
            </div>

            <div className="configuracion-content">
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
                                <Lock className="label-icon" />
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
                                <Lock className="label-icon" />
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
                                <Lock className="label-icon" />
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
        </div>
    );
}