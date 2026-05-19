import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { toastVariants } from '../../lib/motion';

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
 * Toast — animated, swipe-to-dismiss notification.
 * Must be rendered inside <AnimatePresence> for exit animation to play (ToastContainer handles this).
 */
export const Toast = ({ id, message, severity = 'info', autoClose = 4000, onClose }) => {
    const cfg = COLORS[severity] || COLORS.info;

    useEffect(() => {
        if (!autoClose) return;
        const t = setTimeout(() => onClose?.(id), autoClose);
        return () => clearTimeout(t);
    }, [autoClose, onClose, id]);

    return (
        <motion.div
            layout
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.1, right: 0.6 }}
            onDragEnd={(_, info) => {
                if (info.offset.x > 90 || info.velocity.x > 500) onClose?.(id);
            }}
            whileTap={{ cursor: 'grabbing' }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl cursor-grab"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, minWidth: 280, backdropFilter: 'blur(12px)' }}
            role="alert"
        >
            <motion.span
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
                className="flex-shrink-0"
            >
                {ICONS[severity]}
            </motion.span>
            <p className="text-sm font-medium flex-1 leading-snug" style={{ color:'rgba(255,255,255,0.9)' }}>{message}</p>
            <motion.button
                onClick={() => onClose?.(id)}
                whileHover={{ opacity: 1, scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className="flex-shrink-0 opacity-50 ml-1"
            >
                <X className="h-3.5 w-3.5" />
            </motion.button>
        </motion.div>
    );
};

/**
 * ToastContainer — renders at most 3 stacked toasts with animated stacking.
 * Usage: manage via useToast hook (see hooks/useToast.js)
 */
export const ToastContainer = ({ toasts, onClose }) => (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence initial={false}>
            {toasts.slice(-3).map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast {...toast} onClose={onClose} />
                </div>
            ))}
        </AnimatePresence>
    </div>
);

export default Toast;
