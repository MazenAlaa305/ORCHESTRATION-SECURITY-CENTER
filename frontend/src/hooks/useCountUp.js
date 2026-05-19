import { useEffect, useRef, useState } from 'react';

// Smoothly tween a numeric value when it changes.
// Returns the current animated value; respects prefers-reduced-motion.
export default function useCountUp(target, { duration = 800, decimals = 0 } = {}) {
    const [value, setValue] = useState(target ?? 0);
    const frame = useRef(0);
    const fromRef = useRef(target ?? 0);
    const startRef = useRef(0);

    useEffect(() => {
        if (target == null || Number.isNaN(target)) return;

        const reduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (reduced || duration <= 0) {
            setValue(target);
            return;
        }

        cancelAnimationFrame(frame.current);
        fromRef.current = value;
        startRef.current = performance.now();
        const delta = target - fromRef.current;

        const tick = (now) => {
            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
            const next = fromRef.current + delta * eased;
            setValue(next);
            if (t < 1) frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, duration]);

    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
