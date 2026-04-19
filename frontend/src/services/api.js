import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Auth interceptor (Phase 3.1) ──────────────────────────────────────────────
// Attach the JWT from sessionStorage to every request.
// On 401 responses, clear the stale token and redirect to /login.
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            // Redirect to login page if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ============================================================================
// LEGACY SERVICES (backward compatibility)
// ============================================================================

export const scanService = {
    startScan: (target, type = 'quick') => api.post('/scans/', { target_url: target, scan_type: type }),
    getScans: () => api.get('/scans/'),
    getScanDetails: (id) => api.get(`/scans/${id}`),
    getReport: (id) => api.get(`/reports/${id}`),
    generateReport: (scanId) => api.post(`/reports/${scanId}/generate`),
    getReportMeta: (reportId) => api.get(`/reports/${reportId}/meta`),
    downloadReportPDF: (reportId) => api.get(`/reports/${reportId}/pdf`, { responseType: 'blob' }),
};

export const networkService = {
    getAssets: (status = null) => api.get('/network/assets', { params: { status } }),
    getNewDevices: () => api.get('/network/assets/new'),
    getAssetDetail: (assetId) => api.get(`/network/assets/${assetId}`),
    getActivity: (limit = 20) => api.get('/network/activity', { params: { limit } }),
};

// ============================================================================
// PENTESTERFLOW SERVICES
// ============================================================================

export const targetService = {
    // Create a new target
    create: (data) => api.post('/targets/', data),

    // List all targets
    list: (params = {}) => api.get('/targets/', { params }),

    // Get target details
    get: (id) => api.get(`/targets/${id}`),

    // Update target
    update: (id, data) => api.patch(`/targets/${id}`, data),

    // Discovery
    discover: (domain) => api.post('/targets/discover', null, { params: { domain } }),

    // Delete target
    delete: (id) => api.delete(`/targets/${id}`),
};

export const pentesterService = {
    /**
     * found 404 API Service
     * Handles all communication with the backend
     */
    startAIScan: (targetId, config = {}) => api.post('/scans/ai', {
        target_id: targetId,
        scan_type: 'full',
        configuration: config
    }),

    // Start AI scan with URL directly
    startAIScanByUrl: (url, config = {}) => api.post('/scans/ai', {
        target_url: url,
        scan_type: 'full',
        configuration: config
    }),

    // Get scan with agent logs
    getScanWithLogs: (scanId) => api.get(`/scans/${scanId}`),

    // Get agent logs only
    getAgentLogs: (scanId) => api.get(`/scans/${scanId}/logs`),

    // Stop a running scan
    stopScan: (scanId) => api.post(`/scans/${scanId}/stop`),
};

export const vulnerabilityService = {
    // List vulnerabilities with filters
    list: (params = {}) => api.get('/vulnerabilities/', { params }),

    // Get vulnerability details
    get: (id) => api.get(`/vulnerabilities/${id}`),

    // Update vulnerability status
    update: (id, data) => api.patch(`/vulnerabilities/${id}`, data),

    // Update Workflow (Ticket, Assignee, Status)
    updateWorkflow: (id, { ticket_id, assigned_to, status }) => api.patch(`/vulnerabilities/${id}/workflow`, null, {
        params: { ticket_id, assigned_to, status }
    }),

    // Get proof of concept
    getPoc: (id) => api.get(`/vulnerabilities/${id}/poc`),

    // Re-validate with AI
    revalidate: (id) => api.post(`/vulnerabilities/${id}/revalidate`),

    // Mark as false positive
    markFalsePositive: (id) => api.patch(`/vulnerabilities/${id}`, { status: 'false_positive' }),

    // Mark as fixed
    markFixed: (id) => api.patch(`/vulnerabilities/${id}`, { status: 'fixed' }),
};

export const openvasService = {
    startQuickScan: (targetIp, targetName) => api.post('/openvas/scan/quick', { target_ip: targetIp, target_name: targetName }),
    getScanStatus: (taskId) => api.get(`/openvas/status/${taskId}`),
    getScanResults: (taskId) => api.get(`/openvas/results/${taskId}`),
    scheduleScan: (data) => api.post('/openvas/schedule', data),
};

export const dashboardService = {
    getRiskOverview: () => api.get('/dashboard/risk-overview'),
    getKpiSnapshot: () => api.get('/dashboard/kpi-snapshot'),
    getActionItems: () => api.get('/dashboard/actions'),
    refreshRiskScores: () => api.post('/dashboard/refresh-risk'),
};

export const findingsService = {
    // List deduplicated findings with framework/compliance filtering
    list: (params = {}) => api.get('/findings', { params }),
};

export const labService = {
    // Get lab environment status (containers, network, telemetry)
    getStatus: () => api.get('/lab/status'),

    // Seed lab targets into dashboard database
    seedTargets: () => api.post('/lab/seed'),

    // Get recent lab events from Elasticsearch
    getEvents: (limit = 50, category = null) =>
        api.get('/lab/events', { params: { limit, category } }),

    // Get lab target definitions (vulnerability profiles)
    getTargets: () => api.get('/lab/targets'),

    // Get telemetry stats
    getTelemetry: () => api.get('/lab/telemetry'),
};

export default api;
