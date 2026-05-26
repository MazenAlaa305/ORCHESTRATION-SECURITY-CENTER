import { usePermission } from './usePermission';
import { useToast } from '../components/ToastProvider';

/**
 * Single source of truth for "is this user allowed to perform this action?"
 * checks at button-click time. When a viewer clicks an action that requires
 * analyst or admin rights, we emit a toast that names the action and the
 * required role rather than silently doing nothing.
 *
 * Usage:
 *   const { guard } = useActionGuard();
 *   const onClick = () => {
 *       if (!guard({ action: 'start a scan' })) return;
 *       startScan();
 *   };
 */
export function useActionGuard() {
    const { isAnalyst, isAdmin, role } = usePermission();
    const { addToast } = useToast();

    const guard = ({ action = 'perform this action', level = 'analyst' } = {}) => {
        const allowed = level === 'admin' ? isAdmin : isAnalyst;
        if (allowed) return true;
        const required = level === 'admin' ? 'admin' : 'analyst or admin';
        addToast(
            `Read-only access — you're signed in as ${role}. ${action.charAt(0).toUpperCase() + action.slice(1)} requires ${required} role.`,
            { type: 'error', duration: 4500 }
        );
        return false;
    };

    return { guard, role, isAnalyst, isAdmin };
}
