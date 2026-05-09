/**
 * config.js — fetches the public feature-flag config from the backend.
 *
 * Phase 1.4 hardening: the frontend now fetches this once on app load
 * and uses it to show/hide integration panels instead of rendering
 * fake/empty data when the backend integration is disabled.
 */
import api from '../services/api';

/** Safe defaults — used when the endpoint is unreachable so the app never crashes. */
const SAFE_DEFAULTS = {
    siem_enabled: false,
    openvas_enabled: false,
    llm_validation_enabled: false,
    nmap_enabled: true,
    nuclei_enabled: true,
    lab_enabled: true,
    lab_traffic_intensity: 'medium',
    version: 'unknown',
};

/**
 * Fetch the public config from GET /api/v1/config/public.
 * Never throws — returns SAFE_DEFAULTS on any network or parse error.
 *
 * @returns {Promise<object>} Config flags + version string.
 */
export async function fetchPublicConfig() {
    try {
        const res = await api.get('/config/public');
        return { ...SAFE_DEFAULTS, ...res.data };
    } catch (err) {
        console.warn('[ConfigAPI] Could not fetch /config/public — using safe defaults.', err?.message);
        return SAFE_DEFAULTS;
    }
}

/** Admin: fetch all flags with override metadata. */
export async function fetchAllConfig() {
    const res = await api.get('/config/all');
    return res.data;
}

/** Admin: update a single config flag. */
export async function updateConfig(key, value) {
    const res = await api.put(`/config/${key}`, { value });
    return res.data;
}

/** Poll live integration health status. */
export async function fetchIntegrationHealth() {
    const res = await api.get('/config/health');
    return res.data;
}
