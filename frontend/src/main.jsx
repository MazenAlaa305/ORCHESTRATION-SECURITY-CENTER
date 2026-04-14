import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
        <QueryClientProvider client={queryClient}>
            {/* ConfigProvider fetches /api/v1/config/public once on mount.
                It must wrap RealTimeProvider so feature flags are available
                to any component that connects to the WebSocket feed. */}
            <ConfigProvider>
                <RealTimeProvider>
                    <App />
                </RealTimeProvider>
            </ConfigProvider>
        </QueryClientProvider>
    </React.StrictMode>,
)
