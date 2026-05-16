import React from 'react';

const STYLES = {
    ADMIN:   'bg-red-900/40 text-red-300 border-red-700/50',
    ANALYST: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    VIEWER:  'bg-gray-800/60 text-gray-400 border-gray-700/50',
};

export default function RoleBadge({ role }) {
    const cls = STYLES[role] ?? STYLES.VIEWER;
    return (
        <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cls}`}>
            {role ?? 'VIEWER'}
        </span>
    );
}
