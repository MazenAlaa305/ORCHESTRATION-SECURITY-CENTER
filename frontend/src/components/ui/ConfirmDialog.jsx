import React, { useEffect } from 'react';

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

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
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
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            border: '1px solid #555',
                            color: '#aac4d6',
                            cursor: 'pointer',
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(255, 80, 80, 0.15)',
                            border: '1px solid #ff5050',
                            color: '#ff8585',
                            cursor: 'pointer',
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
