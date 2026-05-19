import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { backdrop, modalBody } from '../../lib/motion';

/**
 * Modal confirmation dialog.
 *
 * Props:
 *   open          — boolean
 *   title         — string
 *   message       — string | ReactNode
 *   confirmLabel  — defaults to "Confirm"
 *   cancelLabel   — defaults to "Cancel"
 *   onConfirm()   — fires when the user clicks the confirm button
 *   onCancel()    — fires on cancel button, ESC, or backdrop click
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}) {
    useEffect(() => {
        if (!open) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') onCancel?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [open, onCancel]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    onClick={onCancel}
                    variants={backdrop}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <motion.div
                        onClick={(e) => e.stopPropagation()}
                        variants={modalBody}
                        style={{
                            background: '#0a0a0a',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: 8,
                            padding: '1.5rem',
                            maxWidth: 460,
                            width: '90%',
                            color: '#e6f2ff',
                            fontFamily: 'inherit',
                        }}
                    >
                        <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#00ffff' }}>{title}</h3>
                        <div style={{ fontSize: 14, color: '#aac4d6', marginBottom: '1.5rem' }}>{message}</div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <motion.button
                                type="button"
                                onClick={onCancel}
                                whileHover={{ y: -1, scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'transparent',
                                    border: '1px solid #555',
                                    color: '#aac4d6',
                                    cursor: 'pointer',
                                }}
                            >
                                {cancelLabel}
                            </motion.button>
                            <motion.button
                                type="button"
                                onClick={onConfirm}
                                whileHover={{ y: -1, scale: 1.02 }}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(255, 80, 80, 0.15)',
                                    border: '1px solid #ff5050',
                                    color: '#ff8585',
                                    cursor: 'pointer',
                                }}
                            >
                                {confirmLabel}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
