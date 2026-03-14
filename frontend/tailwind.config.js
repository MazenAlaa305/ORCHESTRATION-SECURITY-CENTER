/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
            },
            colors: {
                cyber: {
                    dark: "#020617",
                    deep: "#0f172a",
                    light: "#1e293b",
                    accent: "#38bdf8",
                    vibrant: "#8b5cf6",
                    neon: "#22d3ee",
                    danger: "#ef4444",
                    success: "#10b981",
                    warning: "#f59e0b"
                }
            },
            backgroundImage: {
                'cyber-gradient': 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.15), transparent), radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.15), transparent)',
                'grid-pattern': 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px)',
            },
            boxShadow: {
                'neon': '0 0 20px rgba(56, 189, 248, 0.3)',
                'neon-sm': '0 0 10px rgba(56, 189, 248, 0.2)',
                'neon-lg': '0 0 40px rgba(56, 189, 248, 0.4)',
                'neon-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
                'danger-glow': '0 0 20px rgba(239, 68, 68, 0.35)',
                'success-glow': '0 0 20px rgba(16, 185, 129, 0.35)',
                'warning-glow': '0 0 20px rgba(245, 158, 11, 0.35)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            },
            backdropBlur: {
                'xs': '2px',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-in-right': 'slideInRight 0.35s ease-out',
                'slide-in-up': 'slideInUp 0.35s ease-out',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
                'scan-line': 'scanLine 2s linear infinite',
                'blink': 'blink 1s step-end infinite',
                'counter': 'counter 1s ease-out forwards',
                'risk-ring': 'riskRing 1.5s ease-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 10px rgba(56, 189, 248, 0.2)' },
                    '50%': { boxShadow: '0 0 30px rgba(56, 189, 248, 0.5)' },
                },
                scanLine: {
                    '0%': { top: '0%' },
                    '100%': { top: '100%' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                riskRing: {
                    '0%': { transform: 'scale(1)', opacity: '0.8' },
                    '100%': { transform: 'scale(2.5)', opacity: '0' },
                },
            },
        },
    },
    plugins: [],
}
