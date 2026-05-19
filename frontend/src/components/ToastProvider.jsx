import React, { useState, useCallback, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
                display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none',
            }}>
                <AnimatePresence initial={false}>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, x: 60, scale: 0.92 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.1, right: 0.6 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.x > 90 || info.velocity.x > 500) removeToast(toast.id);
                            }}
                            role="status"
                            className={`toast toast-${toast.type}`}
                            style={{
                                padding: '12px 16px', borderRadius: '8px', background: bg(toast.type),
                                color: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex', alignItems: 'center', gap: '12px', minWidth: '280px',
                                pointerEvents: 'auto', cursor: 'grab',
                            }}
                        >
                            <motion.span
                                initial={{ rotate: -15, scale: 0.7 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.06 }}
                                aria-hidden
                            >
                                {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
                            </motion.span>
                            <span style={{ flex: 1 }}>{toast.message}</span>
                            {toast.action && (
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { toast.action.onClick(); removeToast(toast.id); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white', borderRadius: '4px', padding: '4px 10px',
                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    {toast.action.label}
                                </motion.button>
                            )}
                            <motion.button
                                type="button"
                                aria-label="Dismiss notification"
                                onClick={() => removeToast(toast.id)}
                                whileHover={{ scale: 1.2, color: 'rgba(255,255,255,1)' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0,
                                }}
                            >×</motion.button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
