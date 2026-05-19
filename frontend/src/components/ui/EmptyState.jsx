import React from 'react';
import { motion } from 'framer-motion';

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
        <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
            <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}
            >
                {icon}
            </motion.div>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                style={{ color: '#cfe1f2', fontWeight: 600 }}
            >
                {title}
            </motion.div>
            {message && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.22, duration: 0.3 }}
                    style={{ marginTop: '0.25rem', fontSize: 13, maxWidth: 360 }}
                >
                    {message}
                </motion.div>
            )}
            {action && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    style={{ marginTop: '1rem' }}
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    );
}
