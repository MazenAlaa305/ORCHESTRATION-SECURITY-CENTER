import React, { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext({ addToast: () => {}, removeToast: () => {} });

export const useToast = () => useContext(ToastContext);

/**
 * addToast(message, options)
 *   options.type     — 'info' | 'success' | 'error'
 *   options.duration — ms (default 3000, 0 disables auto-dismiss)
 *   options.action   — { label, onClick } optional inline button (e.g. Undo)
 *
 * Backwards compatible with `addToast(msg, 'success' | 'error' | 'info')`.
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message, options = {}) => {
        const opts = typeof options === 'string' ? { type: options } : (options || {});
        const id = Date.now() + Math.random();
        const duration = opts.duration ?? 3000;
        setToasts(prev => [...prev, { id, message, type: opts.type || 'info', action: opts.action }]);
        if (duration > 0) setTimeout(() => removeToast(id), duration);
        return id;
    }, [removeToast]);

    const bg = (type) =>
        type === 'error'   ? 'rgba(231, 76, 60, 0.95)' :
        type === 'success' ? 'rgba(46, 204, 113, 0.95)' :
                             'rgba(30, 58, 95, 0.95)';

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications" style={{
                position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
                display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} role="status" className={`toast toast-${toast.type}`} style={{
                        padding: '12px 16px', borderRadius: '8px', background: bg(toast.type),
                        color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(6px)', animation: 'slideIn 0.25s ease-out',
                        display: 'flex', alignItems: 'center', gap: '12px', minWidth: '280px',
                    }}>
                        <span aria-hidden>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}</span>
                        <span style={{ flex: 1 }}>{toast.message}</span>
                        {toast.action && (
                            <button
                                type="button"
                                onClick={() => { toast.action.onClick(); removeToast(toast.id); }}
                                style={{
                                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white', borderRadius: '4px', padding: '4px 10px',
                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                {toast.action.label}
                            </button>
                        )}
                        <button
                            type="button"
                            aria-label="Dismiss notification"
                            onClick={() => removeToast(toast.id)}
                            style={{
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
                                cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0,
                            }}
                        >×</button>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};
