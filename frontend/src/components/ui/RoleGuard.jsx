import React from 'react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Conditionally renders `children` only if the current user's role is in
 * `allow`. When the role does not match, renders `fallback` (default null).
 *
 * Usage:
 *   <RoleGuard allow={['ADMIN']}>
 *     <DangerButton />
 *   </RoleGuard>
 */
export default function RoleGuard({ allow = [], children, fallback = null }) {
    const { user } = useAuth();
    const role = user?.role;
    if (!role || !allow.includes(role)) {
        return fallback;
    }
    return children;
}
