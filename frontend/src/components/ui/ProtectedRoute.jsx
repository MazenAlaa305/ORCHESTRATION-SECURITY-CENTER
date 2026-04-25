import React from 'react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Renders `children` only when the user is authenticated.
 * Otherwise renders `fallback` (typically <LoginPage />).
 *
 * Designed to work with the project's conditional-rendering router pattern;
 * no react-router-dom required.
 */
export default function ProtectedRoute({ children, fallback = null }) {
    const { token } = useAuth();
    if (!token) {
        return fallback;
    }
    return children;
}
