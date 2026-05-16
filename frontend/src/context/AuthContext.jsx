import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// Use sessionStorage (not localStorage) to limit XSS token-theft risk.
// Tokens are cleared when the browser tab closes.
const STORAGE = sessionStorage;

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => STORAGE.getItem('token'));
    const [user, setUser] = useState(() => {
        const saved = STORAGE.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (token) {
            STORAGE.setItem('token', token);
            if (user) STORAGE.setItem('user', JSON.stringify(user));
        } else {
            STORAGE.removeItem('token');
            STORAGE.removeItem('user');
            setUser(null);
        }
    }, [token, user]);

    const login = (newToken, email, role, id = null) => {
        setToken(newToken);
        const userData = { id, email, role };
        setUser(userData);
        STORAGE.setItem('token', newToken);
        STORAGE.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        STORAGE.removeItem('token');
        STORAGE.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
