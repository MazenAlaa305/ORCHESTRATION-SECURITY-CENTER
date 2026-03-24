import React, { useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const ICONS = {
    success: <CheckCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    error:   <XCircle className="h-4 w-4" />,
    info:    <Info className="h-4 w-4" />,
};
const COLORS = {
    success: { bg:'rgba(0,255,136,0.1)',  border:'rgba(0,255,136,0.4)',  color:'#00ff88' },
    warning: { bg:'rgba(255,170,0,0.1)',  border:'rgba(255,170,0,0.4)',  color:'#ffaa00' },
    error:   { bg:'rgba(255,0,85,0.12)',  border:'rgba(255,0,85,0.45)',  color:'#ff0055' },
    info:    { bg:'rgba(0,255,255,0.08)', border:'rgba(0,255,255,0.35)', color:'#00ffff' },
};

/**
 * Toast — slide-in notification with auto-dismiss.
 */
export const Toast = ({ message, severity = 'info', autoClose = 4000, onClose }) => {
    const cfg = COLORS[severity] || COLORS.info;

    useEffect(() => {
        if (!autoClose) return;
        const t = setTimeout(onClose, autoClose);
        return () => clearTimeout(t);
    }, [autoClose, onClose]);

    return (
        <div
            className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-slide-in"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, minWidth: 280 }}
            role="alert"
        >
            <span className="flex-shrink-0">{ICONS[severity]}</span>
            <p className="text-sm font-medium flex-1 leading-snug" style={{ color:'rgba(255,255,255,0.9)' }}>{message}</p>
            <button onClick={onClose} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1">
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};

/**
 * ToastContainer — renders at most 3 stacked toasts.
 * Usage: manage via useToast hook (see hooks/useToast.js)
 */
export const ToastContainer = ({ toasts, onClose }) => (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end">
        {toasts.slice(-3).map((toast, i) => (
            <div key={toast.id} style={{ marginBottom: i * 4 }}>
                <Toast {...toast} onClose={() => onClose(toast.id)} />
            </div>
        ))}
    </div>
);

export default Toast;
