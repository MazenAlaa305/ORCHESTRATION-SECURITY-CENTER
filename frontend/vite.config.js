import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        watch: {
            usePolling: true
        }
    },
    build: {
        sourcemap: false,
        minify: 'esbuild',
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react':   ['react', 'react-dom'],
                    'vendor-query':   ['@tanstack/react-query'],
                    'vendor-charts':  ['recharts'],
                    'vendor-graph':   ['react-force-graph-2d', 'd3-force'],
                    'vendor-motion':  ['framer-motion'],
                    'vendor-zustand': ['zustand'],
                }
            }
        }
    }
})
