import React, { useEffect, useRef } from 'react';

/**
 * GaugeRing — animated circular arc gauge rendered on a <canvas>.
 * The arc sweeps from the previous score to the new one over ~900ms.
 * Props:
 *   score   number  (0–100)
 *   max     number  (default 100)
 *   size    number  canvas px (default 200)
 *   label   string  (default "SCORE")
 *   color   string  CSS hex/rgba
 */
export const GaugeRing = ({ score = 0, max = 100, size = 200, label = 'SCORE', color }) => {
    const canvasRef = useRef(null);
    const prevScoreRef = useRef(0);
    const animFrameRef = useRef(0);

    const resolvedColor = color || (
        score >= 70 ? '#00ff88' :
        score >= 40 ? '#ffaa00' :
        '#ff0055'
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width  = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width  = `${size}px`;
        canvas.style.height = `${size}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const cx = size / 2;
        const cy = size / 2;
        const r  = size / 2 - 22;
        const startAngle = -Math.PI / 2;

        const drawAt = (currentScore) => {
            const progress = Math.min(Math.max(currentScore, 0), max) / max;
            ctx.clearRect(0, 0, size, size);

            // Outer ring decoration
            ctx.beginPath();
            ctx.arc(cx, cy, r + 14, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Track arc
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + 2 * Math.PI, false);
            ctx.strokeStyle = 'rgba(255,255,255,0.07)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Progress arc
            if (progress > 0) {
                const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
                grad.addColorStop(0, resolvedColor);
                grad.addColorStop(1, resolvedColor + 'aa');

                ctx.beginPath();
                ctx.arc(cx, cy, r, startAngle, startAngle + progress * 2 * Math.PI, false);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 10;
                ctx.lineCap = 'round';
                ctx.shadowColor = resolvedColor;
                ctx.shadowBlur = 18;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Score text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.font = `900 ${Math.floor(size * 0.22)}px Syne, sans-serif`;
            ctx.fillStyle = resolvedColor;
            ctx.fillText(Math.round(currentScore), cx, cy - 8);

            ctx.font = `600 ${Math.floor(size * 0.07)}px Outfit, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillText(label, cx, cy + Math.floor(size * 0.14));
        };

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (reduced) {
            drawAt(score);
            prevScoreRef.current = score;
            return;
        }

        // Tween from previous score → new score
        const from = prevScoreRef.current;
        const to = score;
        const duration = 900;
        const start = performance.now();

        cancelAnimationFrame(animFrameRef.current);
        const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            drawAt(from + (to - from) * eased);
            if (t < 1) animFrameRef.current = requestAnimationFrame(tick);
            else prevScoreRef.current = to;
        };
        animFrameRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(animFrameRef.current);
    }, [score, max, size, resolvedColor, label]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="w-full h-auto"
            title={`${label}: ${score}/${max}`}
        />
    );
};

export default GaugeRing;
