import { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';

const RealTimeContext = createContext(null);

// ── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
    kpi: {
        overall_score: 0,
        health_score: 100,
        counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        total_assets: 0,
        last_scan_id: null,
    },
    alerts: [],
    orchestrationLog: [],
    scanStatus: 'IDLE',   // IDLE | RUNNING | COMPLETED | FAILED
    isConnected: false,
};

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
    switch (action.type) {
        case 'SET_CONNECTED':
            return { ...state, isConnected: action.payload };

        case 'INIT_SNAPSHOT':
            return { ...state, kpi: { ...state.kpi, ...action.payload } };

        case 'UPDATE_RISK':
            return {
                ...state,
                kpi: {
                    ...state.kpi,
                    overall_score: action.payload.overall_score ?? state.kpi.overall_score,
                    health_score: action.payload.health_score ?? state.kpi.health_score,
                    last_scan_id: action.payload.scan_id ?? state.kpi.last_scan_id,
                    counts: action.payload.counts ?? state.kpi.counts,
                    total_assets: action.payload.total_assets ?? state.kpi.total_assets,
                },
            };

        case 'ADD_LOG': {
            // Normalise log entry to a consistent shape
            const entry = typeof action.payload === 'string'
                ? { message: action.payload, timestamp: new Date().toISOString(), agent: 'system', level: 'info' }
                : { timestamp: new Date().toISOString(), agent: 'system', level: 'info', ...action.payload };
            return {
                ...state,
                orchestrationLog: [entry, ...state.orchestrationLog].slice(0, 200),
            };
        }

        case 'CLEAR_LOGS':
            return { ...state, orchestrationLog: [] };

        case 'ADD_ALERT':
            return {
                ...state,
                alerts: [action.payload, ...state.alerts].slice(0, 50),
            };

        case 'SET_SCAN_STATUS':
            return { ...state, scanStatus: action.payload };

        default:
            return state;
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const RealTimeProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const socketRef = useRef(null);
    const attemptRef = useRef(0);
    const pingTimerRef = useRef(null);
    const retryTimerRef = useRef(null);

    const stopPing = () => {
        if (pingTimerRef.current) {
            clearInterval(pingTimerRef.current);
            pingTimerRef.current = null;
        }
    };

    const connect = useCallback(() => {
        // Clean up any previous socket
        if (socketRef.current) {
            socketRef.current.onclose = null;  // prevent re-trigger
            socketRef.current.close();
        }
        stopPing();

        const wsUrl = import.meta.env.VITE_WS_URL || 'wss://localhost/ws/logs';
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            attemptRef.current = 0;
            dispatch({ type: 'SET_CONNECTED', payload: true });

            // Heartbeat: send a ping every 25 seconds to keep the connection alive
            pingTimerRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 25_000);
        };

        ws.onmessage = (event) => {
            // Ignore server-side pong responses
            if (event.data === 'pong') return;

            try {
                const data = JSON.parse(event.data);
                const { type, payload } = data;

                switch (type) {
                    case 'RISK_UPDATE':
                        dispatch({ type: 'UPDATE_RISK', payload });
                        dispatch({ type: 'SET_SCAN_STATUS', payload: 'COMPLETED' });
                        break;
                    case 'SCAN_STARTED':
                        dispatch({ type: 'SET_SCAN_STATUS', payload: 'RUNNING' });
                        dispatch({ type: 'CLEAR_LOGS' });
                        break;
                    case 'SCAN_STATUS':
                        dispatch({ type: 'SET_SCAN_STATUS', payload: payload.status });
                        break;
                    case 'LOG_STREAM':
                    case 'SCAN_PROGRESS':
                        dispatch({ type: 'ADD_LOG', payload });
                        break;
                    case 'ALERT_NEW':
                        dispatch({ type: 'ADD_ALERT', payload });
                        break;
                    default:
                        // Unknown structured event — treat as log
                        dispatch({ type: 'ADD_LOG', payload: { message: JSON.stringify(data) } });
                }
            } catch {
                // Raw string (legacy log line from backend)
                dispatch({ type: 'ADD_LOG', payload: { message: event.data } });
            }
        };

        ws.onerror = () => {
            // onclose will fire after onerror — reconnect logic lives there
        };

        ws.onclose = () => {
            stopPing();
            dispatch({ type: 'SET_CONNECTED', payload: false });

            // Exponential backoff: 2s → 4s → 8s … capped at 32s
            const delay = Math.min(2_000 * 2 ** attemptRef.current, 32_000);
            attemptRef.current += 1;

            retryTimerRef.current = setTimeout(connect, delay);
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            stopPing();
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            if (socketRef.current) {
                socketRef.current.onclose = null;
                socketRef.current.close();
            }
        };
    }, [connect]);

    return (
        <RealTimeContext.Provider value={{ state, dispatch }}>
            {children}
        </RealTimeContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useRealTime = () => {
    const ctx = useContext(RealTimeContext);
    if (!ctx) throw new Error('useRealTime must be used within a RealTimeProvider');
    return ctx;
};
