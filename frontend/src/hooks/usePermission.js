import { useAuth } from '../context/AuthContext';

const ROLE_RANK = { VIEWER: 0, ANALYST: 1, ADMIN: 2 };

export function usePermission() {
    const { user } = useAuth();
    const role = user?.role ?? 'VIEWER';
    const rank = ROLE_RANK[role] ?? 0;

    return {
        role,
        isAdmin:         rank >= ROLE_RANK.ADMIN,
        isAnalyst:       rank >= ROLE_RANK.ANALYST,
        isViewer:        rank >= ROLE_RANK.VIEWER,
        canManageUsers:  rank >= ROLE_RANK.ADMIN,
        canTriggerScan:  rank >= ROLE_RANK.ANALYST,
        canDeleteTarget: rank >= ROLE_RANK.ADMIN,
        canExportReport: rank >= ROLE_RANK.ANALYST,
        canEditVuln:     rank >= ROLE_RANK.ANALYST,
    };
}
