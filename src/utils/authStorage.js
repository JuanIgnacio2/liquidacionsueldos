const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const setToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export const getUser = () => {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
};

export const setUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Decodifica el payload de un token JWT
const decodeJWT = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }
        const payload = parts[1];
        // Decodificar base64
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Error al decodificar token JWT:', error);
        return null;
    }
};

// Valida si un token JWT está expirado
export const isTokenExpired = (token) => {
    if (!token) {
        return true;
    }

    try {
        const decoded = decodeJWT(token);
        if (!decoded) {
            return true;
        }

        // Verificar si tiene campo 'exp' (expiration)
        if (!decoded.exp) {
            // Si no tiene exp, considerar que no está expirado (puede ser un token sin expiración)
            return false;
        }

        // exp está en segundos, Date.now() está en milisegundos
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();

        // Considerar expirado si falta menos de 1 minuto (para evitar usar tokens que expiren inmediatamente)
        return currentTime >= (expirationTime - 60000);
    } catch (error) {
        console.error('Error al validar token:', error);
        return true; // En caso de error, considerar expirado por seguridad
    }
};