import { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, isTokenExpired } from '../utils/authStorage';
import { LoadingSpinner } from '../Components/ui/LoadingSpinner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(() => getUser());
    const [token, setTokenState] = useState(() => {
        const storedToken = getToken();
        // Validar token al inicializar
        if (storedToken && isTokenExpired(storedToken)) {
            // Token expirado, limpiarlo
            removeToken();
            return null;
        }
        return storedToken;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Validar token al cargar la aplicación
        const storedToken = getToken();
        
        if (storedToken) {
            if (isTokenExpired(storedToken)) {
                // Token expirado, limpiar y redirigir al login
                removeToken();
                setTokenState(null);
                setUserState(null);
                
                // Redirigir al login si no estamos ya ahí
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        
        setLoading(false);
    }, []);

    // Validar token periódicamente (cada minuto)
    useEffect(() => {
        if (!token) {
            return;
        }

        const interval = setInterval(() => {
            const currentToken = getToken();
            if (!currentToken || isTokenExpired(currentToken)) {
                // Token expirado, limpiar y redirigir
                removeToken();
                setTokenState(null);
                setUserState(null);
                
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }, 60000); // Verificar cada minuto

        return () => clearInterval(interval);
    }, [token]);

    const login = (token, usuario) => {
        setToken(token);
        setUser(usuario);
        setTokenState(token);
        setUserState(usuario);
    };

    const logout = () => {
        removeToken();
        setTokenState(null);
        setUserState(null);
    };

    const value = {
        user,
        token,
        isAuthenticated: !!token && !isTokenExpired(token),
        login,
        logout,
    };

    if (loading) {
        return (<LoadingSpinner message="Cargando autenticación..." overlay={true} />);
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);