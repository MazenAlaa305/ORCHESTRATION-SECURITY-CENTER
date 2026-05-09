import React from 'react';

/**
 * Reusable "no data" placeholder.
 *
 * Props:
 *   title    — short heading (default: "Nothing here yet")
 *   message  — secondary explanation (optional)
 *   icon     — emoji or ReactNode shown above the title
 *   action   — optional CTA element rendered below the message
 */
export default function EmptyState({
    title = 'Nothing here yet',
    message = '',
    icon = '📭',
    action = null,
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '2.5rem 1rem',
                color: '#7e8fa3',
            }}
        >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
            <div style={{ color: '#cfe1f2', fontWeight: 600 }}>{title}</div>
            {message && (
                <div style={{ marginTop: '0.25rem', fontSize: 13, maxWidth: 360 }}>
                    {message}
                </div>
            )}
            {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
        </div>
    );
}
