/**
 * ConfigContext.jsx — provides backend feature flags to the entire app.
 *
 * Phase 1.4 hardening: fetches GET /api/v1/config/public once on mount
 * and exposes the flags via useConfig(). Any panel can call useConfig()
 * to decide whether to render or show an honest "not configured" state.
 *
 * Usage:
 *   const { siem_enabled, loaded } = useConfig();
 *   if (!loaded) return <Spinner />;
 *   if (!siem_enabled) return <EmptyIntegration name="SIEM" />;
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { fetchPublicConfig } from '../api/config';

const ConfigContext = createContext(null);

/** Safe defaults — kept in sync with fetchPublicConfig()'s SAFE_DEFAULTS. */
const INITIAL_STATE = {
    siem_enabled: false,
    openvas_enabled: false,
    llm_validation_enabled: false,
    nmap_enabled: true,
    nuclei_enabled: true,
    lab_enabled: true,
    lab_traffic_intensity: 'medium',
    version: '',
    loaded: false,   // true once the fetch resolves (success or failure)
    refreshConfig: () => {},
};

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState(INITIAL_STATE);

    const loadConfig = () => {
        fetchPublicConfig().then(data =>
            setConfig(prev => ({ ...prev, ...data, loaded: true }))
        );
    };

    useEffect(() => {
        loadConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{ ...config, refreshConfig: loadConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};

/**
 * useConfig — read the backend feature flags inside any component.
 *
 * @throws {Error} if called outside <ConfigProvider>.
 * @returns {{ siem_enabled, openvas_enabled, llm_validation_enabled, version, loaded }}
 */
export const useConfig = () => {
    const ctx = useContext(ConfigContext);
    if (!ctx) {
        throw new Error('useConfig must be used within a <ConfigProvider>');
    }
    return ctx;
};
