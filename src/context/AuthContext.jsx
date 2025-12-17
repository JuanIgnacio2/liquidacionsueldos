import { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, removeToken, getUser, setUser } from '../utils/authStorage';
import { LoadingSpinner } from '../Components/ui/LoadingSpinner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(() => getUser());
    const [token, setTokenState] = useState(() => getToken());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simular carga inicial (por ejemplo, verificar token con el servidor)
        setLoading(false);
    }, []);

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
        isAuthenticated: !!token,
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