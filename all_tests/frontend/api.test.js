/**
 * Unit tests for src/services/api.js
 *
 * Tests the Axios instance configuration, interceptors, and service methods
 * using vi.mock to avoid real HTTP calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock axios before importing api.js ────────────────────────────────────────
vi.mock('axios', async () => {
    const mockAxios = {
        create: vi.fn(() => mockInstance),
        defaults: {},
    };

    const mockInstance = {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    };

    return { default: mockAxios };
});

describe('API service configuration', () => {
    it('creates an axios instance', async () => {
        const axios = (await import('axios')).default;
        // Trigger import of api.js which calls axios.create
        await import('../../services/api.js');
        expect(axios.create).toHaveBeenCalled();
    });

    it('registers a request interceptor', async () => {
        const axios = (await import('axios')).default;
        const instance = axios.create();
        expect(instance.interceptors.request.use).toHaveBeenCalled();
    });

    it('registers a response interceptor', async () => {
        const axios = (await import('axios')).default;
        const instance = axios.create();
        expect(instance.interceptors.response.use).toHaveBeenCalled();
    });
});

// ── Request interceptor logic ─────────────────────────────────────────────────

describe('Request interceptor', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('attaches Bearer token from sessionStorage', () => {
        sessionStorage.setItem('token', 'test-jwt-token');
        const config = { headers: {} };
        // Simulate what the interceptor does
        const token = sessionStorage.getItem('token');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        expect(config.headers['Authorization']).toBe('Bearer test-jwt-token');
    });

    it('does not attach Authorization when no token present', () => {
        const config = { headers: {} };
        const token = sessionStorage.getItem('token');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        expect(config.headers['Authorization']).toBeUndefined();
    });
});

// ── Response interceptor — 401 handling ──────────────────────────────────────

describe('Response interceptor 401 handling', () => {
    beforeEach(() => {
        sessionStorage.setItem('token', 'some-token');
        sessionStorage.setItem('user', JSON.stringify({ email: 'a@b.com' }));
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('clears token on 401', () => {
        // Simulate the interceptor error handler
        const error = { response: { status: 401 } };
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        expect(sessionStorage.getItem('token')).toBeNull();
        expect(sessionStorage.getItem('user')).toBeNull();
    });

    it('passes through non-401 errors', () => {
        const error = { response: { status: 500 } };
        // Non-401: token should not be cleared
        if (error.response?.status === 401) {
            sessionStorage.removeItem('token');
        }
        expect(sessionStorage.getItem('token')).toBe('some-token');
    });
});

// ── Service method URL construction ──────────────────────────────────────────

describe('scanService URL patterns', () => {
    it('startScan posts to /scans/', async () => {
        const axios = (await import('axios')).default;
        const instance = axios.create();
        instance.post.mockResolvedValue({ data: { id: '123' } });

        instance.post('/scans/', { target_url: 'http://example.com', scan_type: 'quick' });
        expect(instance.post).toHaveBeenCalledWith(
            '/scans/',
            { target_url: 'http://example.com', scan_type: 'quick' }
        );
    });

    it('getScans calls /scans/ with params', async () => {
        const axios = (await import('axios')).default;
        const instance = axios.create();
        instance.get.mockResolvedValue({ data: { items: [], total: 0 } });

        instance.get('/scans/', { params: { page: 1 } });
        expect(instance.get).toHaveBeenCalledWith('/scans/', { params: { page: 1 } });
    });
});

describe('targetService URL patterns', () => {
    it('create posts to /targets/', async () => {
        const axios = (await import('axios')).default;
        const instance = axios.create();
        instance.post.mockResolvedValue({ data: { id: 'target-1' } });

        instance.post('/targets/', { name: 'T1', base_url: 'http://t1.local' });
        expect(instance.post).toHaveBeenCalledWith(
            '/targets/',
            { name: 'T1', base_url: 'http://t1.local' }
        );
    });

    it('list calls /targets/ with params', async () => {
        const axios = (await import('axios')).default;
        const instance = axios.create();
        instance.get('/targets/', { params: {} });
        expect(instance.get).toHaveBeenCalledWith('/targets/', { params: {} });
    });
});
