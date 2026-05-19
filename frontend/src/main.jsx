import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { RealTimeProvider } from './context/RealTimeContext'
import { ConfigProvider } from './context/ConfigContext'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    {/* ConfigProvider fetches /api/v1/config/public once on mount.
                        It must wrap RealTimeProvider so feature flags are available
                        to any component that connects to the WebSocket feed. */}
                    <ConfigProvider>
                        <RealTimeProvider>
                            <App />
                        </RealTimeProvider>
                    </ConfigProvider>
                </AuthProvider>
            </QueryClientProvider>
        </MotionConfig>
    </React.StrictMode>,
)
